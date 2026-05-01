use serde::Serialize;
use tauri::State;
use ts_rs::TS;

use crate::errors::{AppError, Result};
use crate::secrets::{self, Credentials};
use crate::state::AppState;

#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../src/lib/types/")]
pub struct UserInfo {
    pub login: String,
    pub balance: f64,
}

#[tauri::command]
#[tracing::instrument(skip(state, password))]
pub async fn save_credentials(
    state: State<'_, AppState>,
    login: String,
    password: String,
) -> Result<()> {
    secrets::save(&login, &password)?;
    *state.credentials.write().await = Some(Credentials { login, password });
    Ok(())
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn clear_credentials(state: State<'_, AppState>) -> Result<()> {
    secrets::clear()?;
    *state.credentials.write().await = None;
    Ok(())
}

#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn test_connection(state: State<'_, AppState>) -> Result<UserInfo> {
    let body = state.api.user_data().await?;

    let login = body
        .pointer("/tasks/0/result/0/login")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Api {
            status_code: 200,
            message: "missing login in user_data response".into(),
        })?
        .to_string();

    let balance = body
        .pointer("/tasks/0/result/0/money/balance")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    Ok(UserInfo { login, balance })
}
