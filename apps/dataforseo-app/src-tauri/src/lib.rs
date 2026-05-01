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

pub fn run() {
    telemetry::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::auth::test_connection,
            commands::auth::save_credentials,
            commands::auth::clear_credentials,
            commands::ledger::estimate_cost,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
