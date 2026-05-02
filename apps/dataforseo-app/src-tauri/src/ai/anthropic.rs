//! Anthropic Claude implementation of AiClient. Talks to the Messages API.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::ai::{AiClient, ChatMessage, ChatResponse, Role, TokenUsage};
use crate::errors::{AppError, Result};

const ANTHROPIC_API: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";

/// Per-1M-token pricing (USD) for Claude Sonnet 4.6.
const SONNET_INPUT_PER_M: f64 = 3.0;
const SONNET_OUTPUT_PER_M: f64 = 15.0;

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

    fn estimate_cost(&self, input_tokens: i32, output_tokens: i32) -> f64 {
        let i = input_tokens.max(0) as f64;
        let o = output_tokens.max(0) as f64;
        (i / 1_000_000.0) * SONNET_INPUT_PER_M + (o / 1_000_000.0) * SONNET_OUTPUT_PER_M
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
        // Anthropic separates the system prompt from the message list.
        let system = messages
            .iter()
            .find(|m| matches!(m.role, Role::System))
            .map(|m| m.content.as_str());

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

        let usage = TokenUsage {
            input_tokens: parsed.usage.input_tokens,
            output_tokens: parsed.usage.output_tokens,
            cost_usd: self.estimate_cost(parsed.usage.input_tokens, parsed.usage.output_tokens),
        };

        Ok(ChatResponse { content, usage, model: parsed.model })
    }
}
