//! AI provider abstraction. Backend for the /chat module described in
//! docs/DATAFORSEO_VECDOOR_AI_CHAT_PLAN.md.

pub mod anthropic;
pub mod context;
pub mod openai;
pub mod prompts;

use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct TokenUsage {
    pub input_tokens: i32,
    pub output_tokens: i32,
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct ChatResponse {
    pub content: String,
    pub usage: TokenUsage,
    pub model: String,
}

#[async_trait]
pub trait AiClient: Send + Sync {
    fn provider_name(&self) -> &'static str;
    fn model(&self) -> &str;
    async fn chat(&self, messages: &[ChatMessage]) -> Result<ChatResponse>;

    /// Per-call system prompt — preferred over storing the system as a
    /// persistent message so that mid-session Quick Actions can replace
    /// the system instructions without polluting the chat history. Default
    /// impl prepends as a Role::System message; provider-specific impls
    /// can map onto their native top-level field (Anthropic does this).
    async fn chat_with_system(
        &self,
        system: Option<&str>,
        messages: &[ChatMessage],
    ) -> Result<ChatResponse> {
        match system {
            None => self.chat(messages).await,
            Some(s) => {
                let mut combined = Vec::with_capacity(messages.len() + 1);
                combined.push(ChatMessage { role: Role::System, content: s.to_string() });
                combined.extend(messages.iter().cloned());
                self.chat(&combined).await
            }
        }
    }
}

/// Runtime-swappable AI client. The active provider is held in an RwLock
/// so the Settings page can switch providers without app restart.
pub struct AiRegistry {
    active: Arc<RwLock<Option<Arc<dyn AiClient>>>>,
}

impl AiRegistry {
    pub fn new() -> Self {
        Self { active: Arc::new(RwLock::new(None)) }
    }

    pub async fn set(&self, client: Arc<dyn AiClient>) {
        *self.active.write().await = Some(client);
    }

    pub async fn clear(&self) {
        *self.active.write().await = None;
    }

    pub async fn get(&self) -> Option<Arc<dyn AiClient>> {
        self.active.read().await.clone()
    }
}

impl Default for AiRegistry {
    fn default() -> Self {
        Self::new()
    }
}
