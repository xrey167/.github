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

    let mut builder = tauri::Builder::default().plugin(tauri_plugin_shell::init());

    // Auto-updater plugin — gated behind the `updater` Cargo feature so
    // default builds don't pull in the dep until release infrastructure
    // (pubkey + signed-release feed) is provisioned. See docs/AUTOUPDATE.md.
    #[cfg(feature = "updater")]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
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
                    // Drop old completed audits too — they're large
                    // (one summary + N page rows each) and the user
                    // rarely needs week-old crawls.
                    let _ = evict_store.with_conn(|c| {
                        store::audits::evict_completed_older_than(c, chrono::Duration::days(90))
                    });
                    // Backfill projects for any pre-existing tracked
                    // keywords / audit runs. Idempotent — re-runs are
                    // a single SELECT + zero updates after the first
                    // post-upgrade boot.
                    let _ = evict_store.with_conn(store::projects::backfill);
                })
                .await;
            });
            let tracker_api = api.clone();
            let tracker_store = store.clone();
            let audit_api = api.clone();
            let audit_store = store.clone();
            let reporter_store = store.clone();
            let docs_dir = app.path().document_dir().ok();
            app.manage(state);
            tauri::async_runtime::spawn(async move {
                tasks::poller::run(api, store).await;
            });
            tauri::async_runtime::spawn(async move {
                tasks::tracker::run(tracker_api, tracker_store).await;
            });
            tauri::async_runtime::spawn(async move {
                tasks::audit_poller::run(audit_api, audit_store).await;
            });
            tauri::async_runtime::spawn(async move {
                tasks::reporter::run(reporter_store, docs_dir).await;
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
            commands::keywords::clickstream_bulk_search_volume,
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
            commands::backlinks::backlinks_domain_pages,
            commands::backlinks::backlinks_page_intersection,
            commands::backlinks::backlinks_bulk_backlinks,
            commands::backlinks::backlinks_bulk_referring_domains,
            commands::backlinks::backlinks_bulk_ranks,
            commands::backlinks::backlinks_bulk_spam_score,
            commands::backlinks::backlinks_bulk_new_lost,
            commands::backlinks::backlinks_referring_networks,
            commands::backlinks::backlinks_domain_pages_summary,
            commands::backlinks::backlinks_available_filters,
            commands::keywords::labs_historical_rank_overview,
            commands::keywords::labs_subdomains,
            commands::keywords::labs_relevant_pages,
            commands::keywords::labs_page_intersection,
            commands::keywords::labs_keyword_ideas,
            commands::keywords::labs_top_searches,
            commands::keywords::labs_categories_for_keywords,
            commands::on_page::on_page_pages_get,
            commands::on_page::on_page_pages_by_resource_get,
            commands::on_page::on_page_resources_get,
            commands::on_page::on_page_duplicate_tags_get,
            commands::on_page::on_page_duplicate_content_get,
            commands::on_page::on_page_links_get,
            commands::on_page::on_page_non_indexable_get,
            commands::on_page::on_page_redirect_chains_get,
            commands::on_page::on_page_microdata_get,
            commands::on_page::on_page_keyword_density_get,
            commands::on_page::on_page_content_parsing_command,
            commands::on_page::on_page_lighthouse_audits_get,
            commands::domain_analytics::domain_analytics_domains_by_technology,
            commands::domain_analytics::domain_analytics_aggregation_technologies,
            commands::brand::brand_rating_distribution,
            commands::brand::brand_phrase_trends,
            commands::brand::brand_category_trends,
            commands::ledger::appendix_status,
            commands::ledger::appendix_errors,
            commands::app_data::app_data_google_play_app_searches,
            commands::app_data::app_data_apple_app_searches,
            commands::app_data::app_data_google_play_app_reviews,
            commands::app_data::app_data_apple_app_reviews,
            commands::projects::projects_list,
            commands::projects::projects_create,
            commands::projects::projects_rename,
            commands::projects::projects_delete,
            commands::keywords::labs_keyword_overview,
            commands::keywords::labs_search_intent,
            commands::keywords::google_trends_explore,
            commands::keywords::labs_categories_for_domain,
            commands::topic::topic_research,
            commands::serp::serp_autocomplete,
            commands::serp::serp_ai_overview,
            commands::serp::serp_ai_mode_live,
            commands::serp::serp_bing_organic_live,
            commands::keywords::google_ads_keywords_for_site,
            commands::keywords::google_ads_keywords_for_keywords,
            commands::brand::brand_search,
            commands::brand::brand_summary,
            commands::brand::brand_sentiment,
            commands::domain_analytics::whois_overview,
            commands::domain_analytics::domain_technologies,
            commands::on_page::on_page_instant,
            commands::on_page::on_page_lighthouse,
            commands::tracking::tracking_add,
            commands::tracking::tracking_list,
            commands::tracking::tracking_remove,
            commands::tracking::tracking_history,
            commands::tracking::tracking_run_now,
            commands::audit::audit_start,
            commands::audit::audit_list,
            commands::audit::audit_get,
            commands::audit::audit_pages,
            commands::audit::audit_delete,
            commands::ai::ai_provider_status,
            commands::ai::ai_save_provider_key,
            commands::ai::ai_clear_provider_key,
            commands::ai::ai_set_active_provider,
            commands::ai::ai_prompt_templates,
            commands::ai::chat_new_session,
            commands::ai::chat_list_sessions,
            commands::ai::chat_history,
            commands::ai::chat_send,
            commands::reports::reports_list_schedules,
            commands::reports::reports_create_schedule,
            commands::reports::reports_toggle_schedule,
            commands::reports::reports_delete_schedule,
            commands::reports::reports_list_runs,
            commands::import::semrush_import,
            commands::import::semrush_list_imports,
            commands::content_strategy::planned_posts_list,
            commands::content_strategy::planned_posts_create,
            commands::content_strategy::planned_posts_update,
            commands::content_strategy::planned_posts_delete,
            commands::content_strategy::topic_clusters_list,
            commands::content_strategy::topic_clusters_create,
            commands::content_strategy::topic_clusters_update,
            commands::content_strategy::topic_clusters_delete,
            commands::content_strategy::content_brief_generate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
