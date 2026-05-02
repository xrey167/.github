pub mod ai;
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
            // One-shot cache eviction at startup. We evict response_cache
            // rows older than 60 days — every endpoint's TTL is much
            // shorter than that, so anything that old is guaranteed dead.
            // Spawned non-blocking so a slow disk doesn't delay app start.
            let evict_store = store.clone();
            tauri::async_runtime::spawn(async move {
                let _ = tokio::task::spawn_blocking(move || {
                    let _ = evict_store.with_conn(|c| {
                        store::response_cache::evict_older_than(c, chrono::Duration::days(60))
                    });
                })
                .await;
            });
            let tracker_api = api.clone();
            let tracker_store = store.clone();
            app.manage(state);
            tauri::async_runtime::spawn(async move {
                tasks::poller::run(api, store).await;
            });
            tauri::async_runtime::spawn(async move {
                tasks::tracker::run(tracker_api, tracker_store).await;
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
            commands::ledger::get_ai_recent_calls,
            commands::ledger::get_ai_usage_summary,
            commands::ledger::get_budget_status,
            commands::ledger::set_budget,
            commands::ledger::clear_budget,
            commands::keywords::keywords_search_volume,
            commands::keywords::keywords_suggestions,
            commands::keywords::keywords_related,
            commands::keywords::keywords_for_domain,
            commands::keywords::keywords_ranked,
            commands::keywords::labs_domain_rank_overview,
            commands::keywords::labs_bulk_keyword_difficulty,
            commands::keywords::labs_serp_competitors,
            commands::keywords::labs_competitors_domain,
            commands::keywords::labs_domain_intersection,
            commands::keywords::labs_bulk_search_volume,
            commands::keywords::keyword_gap,
            commands::serp::serp_live,
            commands::serp::serp_ads_live,
            commands::serp::serp_news_live,
            commands::serp::serp_maps_live,
            commands::serp::serp_task_create,
            commands::serp::serp_task_status,
            commands::serp::serp_task_recent_batches,
            commands::backlinks::backlinks_summary,
            commands::backlinks::backlinks_detail,
            commands::backlinks::backlinks_referring_domains,
            commands::backlinks::backlinks_anchors,
            commands::backlinks::backlinks_history,
            commands::backlinks::backlinks_domain_intersection,
            commands::domain_analytics::whois_overview,
            commands::domain_analytics::domain_technologies,
            commands::on_page::on_page_instant,
            commands::on_page::on_page_lighthouse,
            commands::tracking::tracking_add,
            commands::tracking::tracking_list,
            commands::tracking::tracking_remove,
            commands::tracking::tracking_history,
            commands::tracking::tracking_run_now,
            commands::ai::ai_provider_status,
            commands::ai::ai_save_provider_key,
            commands::ai::ai_clear_provider_key,
            commands::ai::ai_set_active_provider,
            commands::ai::ai_prompt_templates,
            commands::ai::chat_new_session,
            commands::ai::chat_list_sessions,
            commands::ai::chat_history,
            commands::ai::chat_send,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
