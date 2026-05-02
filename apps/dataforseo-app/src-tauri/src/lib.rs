pub mod api;
pub mod commands;
pub mod domain;
pub mod errors;
pub mod ratelimit;
pub mod secrets;
pub mod state;
pub mod store;
pub mod tasks;
pub mod telemetry;

use state::AppState;
use tauri::Manager;

pub fn run() {
    telemetry::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let dir = app
                .path()
                .app_local_data_dir()
                .expect("app_local_data_dir resolves on supported platforms");
            let db_path = dir.join("dataforseo-app.duckdb");
            let state = AppState::new(db_path);
            let api = state.api.clone();
            let store = state.store.clone();
            app.manage(state);
            tauri::async_runtime::spawn(async move {
                tasks::poller::run(api, store).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::test_connection,
            commands::auth::save_credentials,
            commands::auth::clear_credentials,
            commands::ledger::estimate_cost,
            commands::ledger::get_recent_calls,
            commands::ledger::get_usage_summary,
            commands::keywords::keywords_search_volume,
            commands::keywords::keywords_suggestions,
            commands::keywords::keywords_related,
            commands::keywords::keywords_for_domain,
            commands::keywords::keywords_ranked,
            commands::serp::serp_live,
            commands::serp::serp_task_create,
            commands::serp::serp_task_status,
            commands::serp::serp_task_recent_batches,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
