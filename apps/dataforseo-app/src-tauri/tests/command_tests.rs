//! Integration tests for the command-layer cache helpers.
//!
//! Exercises `commands::cached::{lookup, store_view, CachedOutcome}` against
//! an in-memory DuckDB database so every test is isolated and fast.

use std::sync::Arc;

use chrono::Duration;
use dataforseo_app_lib::commands::cached::{lookup, store_view, CachedOutcome};
use dataforseo_app_lib::store::Store;
use serde::{Deserialize, Serialize};

fn store() -> Arc<Store> {
    Arc::new(Store::open_in_memory().expect("in-memory store should initialise"))
}

/// A minimal serialisable/deserialisable view struct mirroring the real ones.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct DummyView {
    value: i64,
    label: String,
}

// ── cold cache (Miss) ─────────────────────────────────────────────────────────

#[tokio::test]
async fn lookup_returns_miss_on_empty_cache() {
    let s = store();
    let params = serde_json::json!({"keyword": "rust"});

    let outcome: CachedOutcome<DummyView> =
        lookup(s, "test/endpoint", &params, Duration::days(7), true)
            .await
            .expect("lookup should not error");

    assert!(
        matches!(outcome, CachedOutcome::Miss),
        "empty cache should yield Miss"
    );
}

#[tokio::test]
async fn lookup_returns_miss_when_use_cache_false() {
    // Even with data in the cache, use_cache=false forces a miss.
    let s = store();
    let params = serde_json::json!({"keyword": "bypass"});
    let view = DummyView { value: 99, label: "cached".into() };

    store_view(s.clone(), "test/bypass", &params, &view, 0.0)
        .await
        .unwrap();

    let outcome: CachedOutcome<DummyView> =
        lookup(s, "test/bypass", &params, Duration::days(7), false)
            .await
            .unwrap();

    assert!(
        matches!(outcome, CachedOutcome::Miss),
        "use_cache=false should bypass the cache"
    );
}

// ── warm cache (Hit) ──────────────────────────────────────────────────────────

#[tokio::test]
async fn store_view_then_lookup_returns_hit() {
    let s = store();
    let params = serde_json::json!({"target": "example.com", "location": 2840});
    let original = DummyView { value: 42, label: "hello".into() };

    store_view(s.clone(), "test/domain", &params, &original, 0.03)
        .await
        .expect("store_view should succeed");

    let outcome: CachedOutcome<DummyView> =
        lookup(s, "test/domain", &params, Duration::days(30), true)
            .await
            .expect("lookup should succeed");

    match outcome {
        CachedOutcome::Hit { view, fetched_at } => {
            assert_eq!(view, original, "deserialized view should match original");
            assert!(!fetched_at.is_empty(), "fetched_at should be populated");
        }
        CachedOutcome::Miss => panic!("expected Hit, got Miss"),
    }
}

#[tokio::test]
async fn lookup_respects_different_params_hashes() {
    // Two calls with different params must not cross-contaminate.
    let s = store();
    let params_a = serde_json::json!({"target": "site-a.com"});
    let params_b = serde_json::json!({"target": "site-b.com"});

    let view_a = DummyView { value: 1, label: "a".into() };
    let view_b = DummyView { value: 2, label: "b".into() };

    store_view(s.clone(), "test/multi", &params_a, &view_a, 0.0)
        .await
        .unwrap();
    store_view(s.clone(), "test/multi", &params_b, &view_b, 0.0)
        .await
        .unwrap();

    let hit_a: CachedOutcome<DummyView> =
        lookup(s.clone(), "test/multi", &params_a, Duration::days(1), true)
            .await
            .unwrap();
    let hit_b: CachedOutcome<DummyView> =
        lookup(s.clone(), "test/multi", &params_b, Duration::days(1), true)
            .await
            .unwrap();

    let CachedOutcome::Hit { view: va, .. } = hit_a else {
        panic!("expected Hit for params_a")
    };
    let CachedOutcome::Hit { view: vb, .. } = hit_b else {
        panic!("expected Hit for params_b")
    };

    assert_eq!(va, view_a);
    assert_eq!(vb, view_b);
    assert_ne!(va, vb, "separate params should yield separate cached views");
}

// ── TTL expiry ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn lookup_misses_when_ttl_is_zero() {
    // TTL of 0 means the entry is already stale the instant it's read.
    let s = store();
    let params = serde_json::json!({"q": "expired"});
    let view = DummyView { value: 7, label: "stale".into() };

    store_view(s.clone(), "test/ttl", &params, &view, 0.0)
        .await
        .unwrap();

    let outcome: CachedOutcome<DummyView> =
        lookup(s, "test/ttl", &params, Duration::zero(), true)
            .await
            .unwrap();

    assert!(
        matches!(outcome, CachedOutcome::Miss),
        "zero TTL should treat the entry as expired"
    );
}
