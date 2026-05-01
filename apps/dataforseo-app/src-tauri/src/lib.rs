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
            app.manage(AppState::new(db_path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::test_connection,
            commands::auth::save_credentials,
            commands::auth::clear_credentials,
            commands::ledger::estimate_cost,
            commands::keywords::keywords_search_volume,
            commands::keywords::keywords_suggestions,
            commands::keywords::keywords_related,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
