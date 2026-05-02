//! OpenAI implementation of AiClient. Talks to /v1/chat/completions.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::ai::{AiClient, ChatMessage, ChatResponse, Role, TokenUsage};
use crate::errors::{AppError, Result};

const OPENAI_API: &str = "https://api.openai.com/v1/chat/completions";

/// Per-1M-token pricing keyed by model id prefix. Order matters —
/// longer / more specific prefixes first.
const PRICING: &[(&str, f64, f64)] = &[
    ("gpt-4o-mini",   0.15,  0.60),
    ("gpt-4o",        2.50, 10.00),
    ("gpt-4.1-mini",  0.40,  1.60),
    ("gpt-4.1",       2.00,  8.00),
    ("o4-mini",       1.10,  4.40),
];

const FALLBACK_INPUT_PER_M: f64 = 2.50;
const FALLBACK_OUTPUT_PER_M: f64 = 10.00;

fn pricing_for(model: &str) -> (f64, f64) {
    for (prefix, input, output) in PRICING {
        if model.starts_with(prefix) {
            return (*input, *output);
        }
    }
    tracing::warn!(
        model,
        "no pricing entry for OpenAI model; falling back to gpt-4o rates",
    );
    (FALLBACK_INPUT_PER_M, FALLBACK_OUTPUT_PER_M)
}

pub struct OpenAiClient {
    http: reqwest::Client,
    api_key: String,
    model: String,
    max_tokens: u32,
}

impl OpenAiClient {
    pub fn new(api_key: String, model: String) -> Self {
        let http = reqwest::Client::builder()
            .user_agent(concat!("dataforseo-app/", env!("CARGO_PKG_VERSION")))
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .expect("reqwest client builds with default config");
        Self { http, api_key, model, max_tokens: 4096 }
    }

    async fn call(
        &self,
        system: Option<&str>,
        messages: &[ChatMessage],
    ) -> Result<ChatResponse> {
        // OpenAI puts the system message in the same array as user/assistant
        // turns (unlike Anthropic). Prepend the per-call system, then append
        // the rest of the history filtered for stray Role::System rows.
        let mut chat_messages: Vec<OpenAiMessage> = Vec::with_capacity(messages.len() + 1);
        if let Some(s) = system {
            chat_messages.push(OpenAiMessage { role: "system", content: s });
        }
        for m in messages {
            let role = match m.role {
                Role::User => "user",
                Role::Assistant => "assistant",
                // Skip embedded system rows — the per-call `system` arg is
                // the source of truth.
                Role::System => continue,
            };
            chat_messages.push(OpenAiMessage { role, content: &m.content });
        }

        if chat_messages.iter().all(|m| m.role == "system") {
            return Err(AppError::Validation(
                "chat requires at least one user/assistant message".into(),
            ));
        }

        let body = OpenAiRequest {
            model: &self.model,
            max_tokens: self.max_tokens,
            messages: chat_messages,
        };

        let resp = self
            .http
            .post(OPENAI_API)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError::Api {
                status_code: status.as_u16() as u32,
                message: text,
            });
        }

        let parsed: OpenAiResponse = resp.json().await?;

        let content = parsed
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .unwrap_or_default();

        let (in_per_m, out_per_m) = pricing_for(&self.model);
        let cost = (parsed.usage.prompt_tokens.max(0) as f64 / 1_000_000.0) * in_per_m
            + (parsed.usage.completion_tokens.max(0) as f64 / 1_000_000.0) * out_per_m;

        let usage = TokenUsage {
            input_tokens: parsed.usage.prompt_tokens,
            output_tokens: parsed.usage.completion_tokens,
            cost_usd: cost,
        };

        Ok(ChatResponse { content, usage, model: parsed.model })
    }
}

#[derive(Serialize)]
struct OpenAiMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct OpenAiRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    messages: Vec<OpenAiMessage<'a>>,
}

#[derive(Deserialize)]
struct OpenAiResponse {
    model: String,
    choices: Vec<OpenAiChoice>,
    usage: OpenAiUsage,
}

#[derive(Deserialize)]
struct OpenAiChoice {
    message: OpenAiResponseMessage,
}

#[derive(Deserialize)]
struct OpenAiResponseMessage {
    content: String,
}

#[derive(Deserialize)]
struct OpenAiUsage {
    prompt_tokens: i32,
    completion_tokens: i32,
}

#[async_trait]
impl AiClient for OpenAiClient {
    fn provider_name(&self) -> &'static str {
        "openai"
    }

    fn model(&self) -> &str {
        &self.model
    }

    async fn chat(&self, messages: &[ChatMessage]) -> Result<ChatResponse> {
        let system = messages
            .iter()
            .find(|m| matches!(m.role, Role::System))
            .map(|m| m.content.clone());
        self.call(system.as_deref(), messages).await
    }

    async fn chat_with_system(
        &self,
        system: Option<&str>,
        messages: &[ChatMessage],
    ) -> Result<ChatResponse> {
        self.call(system, messages).await
    }
}
