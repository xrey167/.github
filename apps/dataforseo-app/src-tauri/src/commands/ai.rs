use std::sync::Arc;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use tokio::task;
use ts_rs::TS;

use crate::ai::anthropic::AnthropicClient;
use crate::ai::context::build_attachment_context;
use crate::ai::prompts::{self, PromptTemplate, SYSTEM_PREAMBLE};
use crate::ai::{ChatMessage, Role};
use crate::errors::{AppError, Result};
use crate::secrets;
use crate::state::AppState;
use crate::store::chat::{self, ChatSession, StoredChatMessage};

/// Default Anthropic model. The hyphen-only `claude-sonnet-4-6` is the
/// stable alias for the current Sonnet 4.6 release (per Anthropic's 2026
/// catalogue) — not a typo for `claude-3-5-sonnet-latest`. Override per
/// provider via the Settings page once a model picker exists.
const DEFAULT_ANTHROPIC_MODEL: &str = "claude-sonnet-4-6";

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct AiProviderStatus {
    pub provider: &'static str,
    pub configured: bool,
    pub model: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn ai_provider_status(state: State<'_, AppState>) -> Result<Vec<AiProviderStatus>> {
    let active = state.ai.get().await;
    let anthropic_configured = active
        .as_ref()
        .map(|c| c.provider_name() == "anthropic")
        .unwrap_or(false)
        || secrets::load_ai_key("anthropic")?.is_some();
    let model = active.as_ref().map(|c| c.model().to_string());
    Ok(vec![AiProviderStatus {
        provider: "anthropic",
        configured: anthropic_configured,
        model,
    }])
}

#[tauri::command]
#[tracing::instrument(skip(state, api_key))]
pub async fn ai_save_provider_key(
    state: State<'_, AppState>,
    provider: String,
    api_key: String,
) -> Result<()> {
    if provider != "anthropic" {
        return Err(AppError::Validation(format!(
            "provider {provider} not implemented yet — only 'anthropic' for now"
        )));
    }
    secrets::save_ai_key(&provider, &api_key)?;
    let client = AnthropicClient::new(api_key, DEFAULT_ANTHROPIC_MODEL.to_string());
    state.ai.set(Arc::new(client)).await;
    Ok(())
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn ai_clear_provider_key(state: State<'_, AppState>, provider: String) -> Result<()> {
    secrets::clear_ai_key(&provider)?;
    state.ai.clear().await;
    Ok(())
}

#[tauri::command]
pub fn ai_prompt_templates() -> Result<Vec<PromptTemplate>> {
    Ok(prompts::PROMPT_TEMPLATES.to_vec())
}

#[derive(Debug, Deserialize)]
pub struct ChatNewSessionArgs {
    pub attachment_summary: Option<String>,
    pub attachment_json: Option<Value>,
}

#[tauri::command]
#[tracing::instrument(skip(state, args))]
pub async fn chat_new_session(
    state: State<'_, AppState>,
    args: ChatNewSessionArgs,
) -> Result<i64> {
    let client = state
        .ai
        .get()
        .await
        .ok_or_else(|| AppError::Auth("no AI provider configured".into()))?;
    let provider = client.provider_name().to_string();
    let model = client.model().to_string();
    let store = state.store.clone();
    let summary = args.attachment_summary;
    let attachment = args.attachment_json;
    task::spawn_blocking(move || -> Result<i64> {
        store.with_conn(|c| {
            chat::create_session(c, &provider, &model, summary.as_deref(), attachment.as_ref())
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn chat_list_sessions(
    state: State<'_, AppState>,
    limit: u32,
) -> Result<Vec<ChatSession>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| chat::list_sessions(c, limit))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn chat_history(
    state: State<'_, AppState>,
    session_id: i64,
) -> Result<Vec<StoredChatMessage>> {
    let store = state.store.clone();
    task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| chat::list_messages(c, session_id))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[derive(Debug, Deserialize)]
pub struct ChatSendArgs {
    pub session_id: i64,
    pub user_content: String,
    pub prompt_template_id: Option<String>,
}

#[tauri::command]
#[tracing::instrument(skip(state, args))]
pub async fn chat_send(
    state: State<'_, AppState>,
    args: ChatSendArgs,
) -> Result<StoredChatMessage> {
    let client = state
        .ai
        .get()
        .await
        .ok_or_else(|| AppError::Auth("no AI provider configured".into()))?;

    let session_id = args.session_id;
    let template = args
        .prompt_template_id
        .as_deref()
        .and_then(prompts::find_template);

    // Pull existing history + attachment in one DB hit. We never persist
    // the system message — it's rebuilt fresh per turn from the latest
    // template + attachment, so mid-session Quick Actions take effect
    // immediately and we don't pile up stale system rows in chat_messages.
    let store = state.store.clone();
    let (existing, attachment) = task::spawn_blocking(move || -> Result<_> {
        store.with_conn(|c| {
            let history = chat::list_messages(c, session_id)?;
            let attachment = chat::load_attachment(c, session_id)?;
            Ok((history, attachment))
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    let system_prompt = build_system_prompt(template, attachment.as_ref());

    // Persist the user turn before the API call so it survives a failure.
    let store = state.store.clone();
    let user_content = args.user_content.clone();
    let template_id = template.map(|t| t.id.to_string());
    task::spawn_blocking({
        let template_id = template_id.clone();
        let user_content = user_content.clone();
        move || -> Result<()> {
            store.with_conn(|c| {
                chat::append_message(
                    c,
                    session_id,
                    "user",
                    &user_content,
                    template_id.as_deref(),
                    None,
                    None,
                    None,
                )?;
                Ok(())
            })
        }
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    // Build the canonical message list in memory: prior history (no
    // system rows by construction) + the user turn we just persisted.
    let mut send_messages: Vec<ChatMessage> = existing
        .iter()
        .filter_map(|m| {
            let role = match m.role.as_str() {
                "user" => Role::User,
                "assistant" => Role::Assistant,
                _ => return None, // any stray "system" row is ignored
            };
            Some(ChatMessage { role, content: m.content.clone() })
        })
        .collect();
    send_messages.push(ChatMessage { role: Role::User, content: user_content });

    let start = std::time::Instant::now();
    let result = client
        .chat_with_system(Some(&system_prompt), &send_messages)
        .await;
    let duration_ms = start.elapsed().as_millis() as i64;

    let provider_name = client.provider_name().to_string();
    let model = client.model().to_string();

    match result {
        Ok(resp) => {
            let store = state.store.clone();
            let content = resp.content.clone();
            let usage = resp.usage.clone();
            let assistant_id = task::spawn_blocking({
                let template_id = template_id.clone();
                move || -> Result<i64> {
                    store.with_conn(|c| {
                        let id = chat::append_message(
                            c,
                            session_id,
                            "assistant",
                            &content,
                            template_id.as_deref(),
                            Some(usage.input_tokens),
                            Some(usage.output_tokens),
                            Some(usage.cost_usd),
                        )?;
                        chat::record_ai_call(
                            c,
                            &provider_name,
                            &model,
                            "chat",
                            usage.input_tokens,
                            usage.output_tokens,
                            usage.cost_usd,
                            Some(duration_ms),
                            None,
                        )?;
                        Ok(id)
                    })
                }
            })
            .await
            .map_err(|e| AppError::Internal(e.to_string()))??;

            Ok(StoredChatMessage {
                id: assistant_id,
                session_id,
                role: "assistant".into(),
                content: resp.content,
                prompt_template_id: template_id,
                input_tokens: Some(resp.usage.input_tokens),
                output_tokens: Some(resp.usage.output_tokens),
                cost_usd: Some(resp.usage.cost_usd),
                created_at: None,
            })
        }
        Err(e) => {
            let msg = e.to_string();
            let store = state.store.clone();
            task::spawn_blocking(move || -> Result<()> {
                store.with_conn(|c| {
                    chat::record_ai_call(
                        c,
                        &provider_name,
                        &model,
                        "chat",
                        0,
                        0,
                        0.0,
                        Some(duration_ms),
                        Some(&msg),
                    )
                })
            })
            .await
            .map_err(|e| AppError::Internal(e.to_string()))??;
            Err(e)
        }
    }
}

/// Compose the per-turn system prompt: standing safety preamble + the
/// (optional) currently-selected Quick Action template + the (optional)
/// attached table wrapped in <user_data>. Keeping this stateless means
/// the user can switch templates mid-session and the next turn picks it
/// up immediately.
fn build_system_prompt(
    template: Option<&PromptTemplate>,
    attachment: Option<&Value>,
) -> String {
    let mut out = String::from(SYSTEM_PREAMBLE);
    if let Some(t) = template {
        out.push_str("\n\n");
        out.push_str(t.system);
    }
    if let Some(att) = attachment {
        out.push_str("\n\n<user_data>\n");
        out.push_str(&build_attachment_context(att));
        out.push_str("\n</user_data>");
    }
    out
}
