//! Integration tests for the API client layer.
//!
//! Each test spins up a local wiremock server, creates an `ApiClient` pointing
//! at it, exercises a method, and asserts the parsed response matches the canned
//! fixture.  No network access; no DataForSEO credentials needed.

use std::sync::Arc;

use dataforseo_app_lib::api::client::ApiClient;
use dataforseo_app_lib::api::keywords_data::SearchVolumeRequest;
use dataforseo_app_lib::ratelimit::Scheduler;
use dataforseo_app_lib::secrets::Credentials;
use tokio::sync::RwLock;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn creds() -> Arc<RwLock<Option<Credentials>>> {
    Arc::new(RwLock::new(Some(Credentials {
        login: "test@example.com".into(),
        password: "secret".into(),
    })))
}

fn scheduler() -> Arc<Scheduler> {
    Arc::new(Scheduler::new())
}

fn client(base_url: String) -> ApiClient {
    ApiClient::new_with_base_url(base_url, creds(), scheduler())
}

/// Wraps a DataForSEO-shaped response with a single result array item.
fn dfs_response_single(cost: f64, result: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "status_code": 20000,
        "status_message": "Ok.",
        "cost": cost,
        "tasks": [{
            "id": "test-task-id",
            "status_code": 20000,
            "cost": cost,
            "result": [result]
        }]
    })
}

/// Wraps a DataForSEO-shaped response where result is a flat array of items.
fn dfs_response_items(cost: f64, items: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "status_code": 20000,
        "status_message": "Ok.",
        "cost": cost,
        "tasks": [{
            "id": "test-task-id",
            "status_code": 20000,
            "cost": cost,
            "result": items
        }]
    })
}

// ── SERP organic ─────────────────────────────────────────────────────────────

#[tokio::test]
async fn serp_organic_live_parses_items() {
    let server = MockServer::start().await;
    let body = dfs_response_single(0.002, serde_json::json!({
        "keyword": "rust programming",
        "items": [
            {
                "type": "organic",
                "rank_absolute": 1,
                "url": "https://www.rust-lang.org/",
                "title": "Rust Programming Language",
                "description": "A language empowering everyone.",
                "domain": "rust-lang.org"
            },
            {
                "type": "featured_snippet",
                "rank_absolute": 0,
                "url": "https://en.wikipedia.org/wiki/Rust",
                "title": "Rust (programming language)",
                "description": "Rust is a multi-paradigm, general-purpose language.",
                "domain": "en.wikipedia.org"
            }
        ]
    }));
    Mock::given(method("POST"))
        .and(path("/v3/serp/google/organic/live/regular"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&body))
        .mount(&server)
        .await;

    let api = client(server.uri());
    let resp = api
        .serp_google_organic_live("rust programming", 2840, "en", 10)
        .await
        .expect("serp call should succeed");

    assert_eq!(resp.keyword, "rust programming");
    assert_eq!(resp.items.len(), 2);
    assert_eq!(resp.items[0].kind, "organic");
    assert_eq!(resp.items[0].domain.as_deref(), Some("rust-lang.org"));
    assert_eq!(resp.items[1].kind, "featured_snippet");
    assert!((resp.cost - 0.002).abs() < 1e-9, "cost should be 0.002");
}

#[tokio::test]
async fn serp_organic_live_propagates_api_error() {
    let server = MockServer::start().await;
    let body = serde_json::json!({
        "status_code": 40000,
        "status_message": "You can not make this request.",
        "cost": 0.0,
        "tasks": []
    });
    Mock::given(method("POST"))
        .and(path("/v3/serp/google/organic/live/regular"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&body))
        .mount(&server)
        .await;

    let api = client(server.uri());
    let err = api
        .serp_google_organic_live("keyword", 2840, "en", 10)
        .await
        .expect_err("should propagate API-level error");
    let msg = format!("{err:?}");
    assert!(msg.contains("40000"), "error should carry status code 40000, got: {msg}");
}

// ── Backlinks summary ─────────────────────────────────────────────────────────

#[tokio::test]
async fn backlinks_summary_live_parses_summary() {
    let server = MockServer::start().await;
    let body = dfs_response_single(0.02, serde_json::json!({
        "target": "example.com",
        "backlinks": 12345,
        "referring_domains": 456,
        "referring_main_domains": 300,
        "referring_pages": 12345,
        "dofollow_backlinks": 10000,
        "nofollow_backlinks": 2345,
        "broken_backlinks": 10,
        "broken_pages": 5,
        "rank": 42
    }));
    Mock::given(method("POST"))
        .and(path("/v3/backlinks/summary/live"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&body))
        .mount(&server)
        .await;

    let api = client(server.uri());
    let resp = api
        .backlinks_summary_live("example.com")
        .await
        .expect("backlinks summary should succeed");

    assert_eq!(resp.summary.target, "example.com");
    assert_eq!(resp.summary.backlinks, Some(12345));
    assert_eq!(resp.summary.referring_domains, Some(456));
    assert_eq!(resp.summary.dofollow_backlinks, Some(10000));
    assert_eq!(resp.summary.rank, Some(42));
    assert!((resp.cost - 0.02).abs() < 1e-9, "cost should be 0.02");
}

// ── Keywords search volume ────────────────────────────────────────────────────

#[tokio::test]
async fn keywords_search_volume_parses_items() {
    let server = MockServer::start().await;
    // search_volume result is an array of SearchVolumeItem at tasks[0].result
    let body = dfs_response_items(0.0001, serde_json::json!([
        {
            "keyword": "seo tools",
            "search_volume": 22200,
            "competition": "HIGH",
            "competition_index": 95,
            "cpc": 12.5
        }
    ]));
    Mock::given(method("POST"))
        .and(path("/v3/keywords_data/google_ads/search_volume/live"))
        .respond_with(ResponseTemplate::new(200).set_body_json(&body))
        .mount(&server)
        .await;

    let keywords = vec!["seo tools".to_string()];
    let api = client(server.uri());
    let resp = api
        .google_ads_search_volume_live(SearchVolumeRequest {
            keywords: &keywords,
            location_code: 2840,
            language_code: "en",
        })
        .await
        .expect("search volume call should succeed");

    assert_eq!(resp.items.len(), 1);
    assert_eq!(resp.items[0].keyword, "seo tools");
    assert_eq!(resp.items[0].search_volume, Some(22200));
    assert!((resp.cost - 0.0001).abs() < 1e-9, "cost mismatch");
}

#[tokio::test]
async fn keywords_search_volume_empty_keywords_returns_empty() {
    let api = client("http://localhost:9999".into()); // never reached
    let resp = api
        .google_ads_search_volume_live(SearchVolumeRequest {
            keywords: &[],
            location_code: 2840,
            language_code: "en",
        })
        .await
        .expect("empty keywords should return early with empty result");
    assert!(resp.items.is_empty());
    assert_eq!(resp.cost, 0.0);
}
