//! Anthropic Claude implementation of AiClient. Talks to the Messages API.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::ai::{AiClient, ChatMessage, ChatResponse, Role, TokenUsage};
use crate::errors::{AppError, Result};

const ANTHROPIC_API: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

/// Per-1M-token pricing (USD) keyed by model id prefix. Sourced from
/// Anthropic's pricing page at PR-time; update as new models ship.
/// Order matters: longer / more specific prefixes first.
const PRICING: &[(&str, f64, f64)] = &[
    // (prefix, input_per_M, output_per_M)
    ("claude-opus-4",   15.0, 75.0),
    ("claude-sonnet-4",  3.0, 15.0),
    ("claude-haiku-4",   1.0,  5.0),
    // Older 3.x family kept for backward compat if a user pins an old id.
    ("claude-3-5-sonnet", 3.0, 15.0),
    ("claude-3-5-haiku",  0.8,  4.0),
    ("claude-3-opus",    15.0, 75.0),
];

const FALLBACK_INPUT_PER_M: f64 = 3.0;
const FALLBACK_OUTPUT_PER_M: f64 = 15.0;

fn pricing_for(model: &str) -> (f64, f64) {
    for (prefix, input, output) in PRICING {
        if model.starts_with(prefix) {
            return (*input, *output);
        }
    }
    tracing::warn!(
        model,
        "no pricing entry for model; falling back to Sonnet rates — ai_calls cost may be wrong",
    );
    (FALLBACK_INPUT_PER_M, FALLBACK_OUTPUT_PER_M)
}

pub struct AnthropicClient {
    http: reqwest::Client,
    api_key: String,
    model: String,
    max_tokens: u32,
}

impl AnthropicClient {
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
        let chat_messages: Vec<AnthropicMessage> = messages
            .iter()
            .filter(|m| !matches!(m.role, Role::System))
            .map(|m| AnthropicMessage {
                role: match m.role {
                    Role::User => "user",
                    Role::Assistant => "assistant",
                    Role::System => unreachable!("filtered above"),
                },
                content: &m.content,
            })
            .collect();

        if chat_messages.is_empty() {
            return Err(AppError::Validation(
                "chat requires at least one user/assistant message".into(),
            ));
        }

        let body = AnthropicRequest {
            model: &self.model,
            max_tokens: self.max_tokens,
            system,
            messages: chat_messages,
        };

        let resp = self
            .http
            .post(ANTHROPIC_API)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
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

        let parsed: AnthropicResponse = resp.json().await?;

        let content = parsed
            .content
            .into_iter()
            .filter(|b| b.kind == "text")
            .map(|b| b.text)
            .collect::<Vec<_>>()
            .join("\n");

        let (in_per_m, out_per_m) = pricing_for(&self.model);
        let cost = (parsed.usage.input_tokens.max(0) as f64 / 1_000_000.0) * in_per_m
            + (parsed.usage.output_tokens.max(0) as f64 / 1_000_000.0) * out_per_m;

        let usage = TokenUsage {
            input_tokens: parsed.usage.input_tokens,
            output_tokens: parsed.usage.output_tokens,
            cost_usd: cost,
        };

        Ok(ChatResponse { content, usage, model: parsed.model })
    }
}

#[derive(Serialize)]
struct AnthropicMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct AnthropicRequest<'a> {
    model: &'a str,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<&'a str>,
    messages: Vec<AnthropicMessage<'a>>,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    model: String,
    content: Vec<AnthropicContentBlock>,
    usage: AnthropicUsage,
}

#[derive(Deserialize)]
struct AnthropicContentBlock {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    text: String,
}

#[derive(Deserialize)]
struct AnthropicUsage {
    input_tokens: i32,
    output_tokens: i32,
}

#[async_trait]
impl AiClient for AnthropicClient {
    fn provider_name(&self) -> &'static str {
        "anthropic"
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

    /// Override of the default trait impl: maps onto Anthropic's native
    /// per-call `system` field instead of prepending a Role::System
    /// message to the user/assistant turn list.
    async fn chat_with_system(
        &self,
        system: Option<&str>,
        messages: &[ChatMessage],
    ) -> Result<ChatResponse> {
        self.call(system, messages).await
    }
}
