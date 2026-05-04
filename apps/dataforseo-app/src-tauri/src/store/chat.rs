//! Persistence for chat sessions and messages. Schema in
//! migrations/v0002_ai_chat.sql.

use duckdb::{params, Connection};
use serde::Serialize;
use ts_rs::TS;

use crate::errors::Result;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct ChatSession {
    pub id: i64,
    pub title: Option<String>,
    pub provider: String,
    pub model: String,
    pub attachment_summary: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
pub struct StoredChatMessage {
    pub id: i64,
    pub session_id: i64,
    pub role: String,
    pub content: String,
    pub prompt_template_id: Option<String>,
    pub input_tokens: Option<i32>,
    pub output_tokens: Option<i32>,
    pub cost_usd: Option<f64>,
    pub created_at: Option<String>,
}

pub fn create_session(
    conn: &mut Connection,
    provider: &str,
    model: &str,
    attachment_summary: Option<&str>,
    attachment_json: Option<&serde_json::Value>,
) -> Result<i64> {
    let json_str = attachment_json
        .map(|v| serde_json::to_string(v).unwrap_or_default());
    conn.query_row(
        "INSERT INTO chat_sessions (provider, model, attachment_summary, attachment_json)
         VALUES ($1, $2, $3, $4)
         RETURNING id",
        params![provider, model, attachment_summary, json_str],
        |row| row.get::<_, i64>(0),
    )
    .map_err(Into::into)
}

#[allow(clippy::too_many_arguments)]
pub fn append_message(
    conn: &mut Connection,
    session_id: i64,
    role: &str,
    content: &str,
    prompt_template_id: Option<&str>,
    input_tokens: Option<i32>,
    output_tokens: Option<i32>,
    cost_usd: Option<f64>,
) -> Result<i64> {
    let id = conn.query_row(
        "INSERT INTO chat_messages
            (session_id, role, content, prompt_template_id,
             input_tokens, output_tokens, cost_usd)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id",
        params![
            session_id,
            role,
            content,
            prompt_template_id,
            input_tokens,
            output_tokens,
            cost_usd,
        ],
        |row| row.get::<_, i64>(0),
    )?;
    conn.execute(
        "UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        params![session_id],
    )?;
    Ok(id)
}

pub fn set_title(conn: &mut Connection, session_id: i64, title: &str) -> Result<()> {
    conn.execute(
        "UPDATE chat_sessions SET title = $2 WHERE id = $1",
        params![session_id, title],
    )?;
    Ok(())
}

pub fn list_sessions(conn: &mut Connection, limit: u32) -> Result<Vec<ChatSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, provider, model, attachment_summary, created_at, updated_at
           FROM chat_sessions
          ORDER BY updated_at DESC
          LIMIT $1",
    )?;
    let rows = stmt.query_map([limit as i64], |row| {
        Ok(ChatSession {
            id: row.get(0)?,
            title: row.get(1)?,
            provider: row.get(2)?,
            model: row.get(3)?,
            attachment_summary: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;
    Ok(rows.collect::<duckdb::Result<Vec<_>>>()?)
}

pub fn get_session(conn: &mut Connection, session_id: i64) -> Result<Option<ChatSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, provider, model, attachment_summary, created_at, updated_at
           FROM chat_sessions WHERE id = $1",
    )?;
    let mut rows = stmt.query([session_id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(ChatSession {
            id: row.get(0)?,
            title: row.get(1)?,
            provider: row.get(2)?,
            model: row.get(3)?,
            attachment_summary: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn list_messages(conn: &mut Connection, session_id: i64) -> Result<Vec<StoredChatMessage>> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, role, content, prompt_template_id,
                input_tokens, output_tokens, cost_usd, created_at
           FROM chat_messages
          WHERE session_id = $1
          ORDER BY id",
    )?;
    let rows = stmt.query_map([session_id], |row| {
        Ok(StoredChatMessage {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            prompt_template_id: row.get(4)?,
            input_tokens: row.get(5)?,
            output_tokens: row.get(6)?,
            cost_usd: row.get(7)?,
            created_at: row.get(8)?,
        })
    })?;
    Ok(rows.collect::<duckdb::Result<Vec<_>>>()?)
}

pub fn load_attachment(conn: &mut Connection, session_id: i64) -> Result<Option<serde_json::Value>> {
    let mut stmt = conn.prepare(
        "SELECT attachment_json FROM chat_sessions WHERE id = $1",
    )?;
    let mut rows = stmt.query([session_id])?;
    if let Some(row) = rows.next()? {
        let json: Option<String> = row.get(0)?;
        Ok(json.and_then(|s| serde_json::from_str(&s).ok()))
    } else {
        Ok(None)
    }
}

#[allow(clippy::too_many_arguments)]
pub fn record_ai_call(
    conn: &mut Connection,
    provider: &str,
    model: &str,
    purpose: &str,
    input_tokens: i32,
    output_tokens: i32,
    cost_usd: f64,
    duration_ms: Option<i64>,
    error: Option<&str>,
) -> Result<()> {
    conn.execute(
        "INSERT INTO ai_calls
            (provider, model, purpose, input_tokens, output_tokens,
             cost_usd, duration_ms, error)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        params![provider, model, purpose, input_tokens, output_tokens, cost_usd, duration_ms, error],
    )?;
    Ok(())
}
