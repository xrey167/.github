//! Integration tests for the response_cache store layer.
//!
//! Uses an in-memory DuckDB database with the full schema applied so
//! every test starts from a clean state without touching the filesystem.

use chrono::Duration;
use dataforseo_app_lib::store::Store;

fn store() -> Store {
    Store::open_in_memory().expect("in-memory store should initialise")
}

// ── put / get round-trip ──────────────────────────────────────────────────────

#[test]
fn cache_hit_returns_stored_value() {
    let s = store();
    let payload = serde_json::json!({"items": [1, 2, 3], "cost": 0.005});

    s.with_conn(|c| {
        dataforseo_app_lib::store::response_cache::put(
            c,
            "serp/organic",
            "hash-abc",
            &payload,
            0.005,
        )
    })
    .expect("put should succeed");

    let hit = s
        .with_conn(|c| {
            dataforseo_app_lib::store::response_cache::get(
                c,
                "serp/organic",
                "hash-abc",
                Duration::days(7),
            )
        })
        .expect("get should succeed");

    let hit = hit.expect("entry should be found within TTL");
    assert_eq!(hit.response["cost"], 0.005);
    assert_eq!(hit.response["items"][0], 1);
    assert!((hit.cost_usd - 0.005).abs() < 1e-9);
}

#[test]
fn cache_miss_on_wrong_hash() {
    let s = store();
    let payload = serde_json::json!({"x": 1});

    s.with_conn(|c| {
        dataforseo_app_lib::store::response_cache::put(
            c,
            "serp/organic",
            "hash-aaa",
            &payload,
            0.001,
        )
    })
    .unwrap();

    let hit = s
        .with_conn(|c| {
            dataforseo_app_lib::store::response_cache::get(
                c,
                "serp/organic",
                "hash-bbb", // different hash
                Duration::days(7),
            )
        })
        .unwrap();

    assert!(hit.is_none(), "wrong hash should not match");
}

#[test]
fn cache_miss_when_ttl_is_zero() {
    // A TTL of zero seconds means every entry is already expired at read time.
    let s = store();
    let payload = serde_json::json!({"result": "ok"});

    s.with_conn(|c| {
        dataforseo_app_lib::store::response_cache::put(
            c,
            "keywords/volume",
            "hash-xyz",
            &payload,
            0.0,
        )
    })
    .unwrap();

    let hit = s
        .with_conn(|c| {
            dataforseo_app_lib::store::response_cache::get(
                c,
                "keywords/volume",
                "hash-xyz",
                Duration::zero(), // zero TTL → treat as expired
            )
        })
        .unwrap();

    assert!(hit.is_none(), "entry should be expired with zero TTL");
}

// ── upsert (overwrite) ────────────────────────────────────────────────────────

#[test]
fn put_overwrites_existing_entry() {
    let s = store();
    let first = serde_json::json!({"version": 1});
    let second = serde_json::json!({"version": 2});

    s.with_conn(|c| {
        dataforseo_app_lib::store::response_cache::put(
            c,
            "backlinks/summary",
            "hash-ow",
            &first,
            0.01,
        )
    })
    .unwrap();

    s.with_conn(|c| {
        dataforseo_app_lib::store::response_cache::put(
            c,
            "backlinks/summary",
            "hash-ow",
            &second,
            0.02,
        )
    })
    .unwrap();

    let hit = s
        .with_conn(|c| {
            dataforseo_app_lib::store::response_cache::get(
                c,
                "backlinks/summary",
                "hash-ow",
                Duration::days(30),
            )
        })
        .unwrap()
        .expect("should find updated entry");

    assert_eq!(hit.response["version"], 2, "overwrite should have taken effect");
    assert!((hit.cost_usd - 0.02).abs() < 1e-9);
}

// ── evict_older_than ──────────────────────────────────────────────────────────

#[test]
fn evict_removes_stale_entries() {
    let s = store();
    let payload = serde_json::json!({"ok": true});

    s.with_conn(|c| {
        dataforseo_app_lib::store::response_cache::put(
            c,
            "labs/overview",
            "hash-evict",
            &payload,
            0.0,
        )
    })
    .unwrap();

    // evict everything older than 0 seconds → catches the just-inserted row
    let deleted = s
        .with_conn(|c| {
            dataforseo_app_lib::store::response_cache::evict_older_than(c, Duration::zero())
        })
        .expect("evict should succeed");

    assert_eq!(deleted, 1, "one stale row should be removed");

    // Confirm the row is gone
    let hit = s
        .with_conn(|c| {
            dataforseo_app_lib::store::response_cache::get(
                c,
                "labs/overview",
                "hash-evict",
                Duration::days(30),
            )
        })
        .unwrap();

    assert!(hit.is_none(), "row should have been evicted");
}

#[test]
fn evict_with_long_max_age_removes_nothing() {
    let s = store();
    let payload = serde_json::json!({"fresh": true});

    s.with_conn(|c| {
        dataforseo_app_lib::store::response_cache::put(
            c,
            "serp/news",
            "hash-keep",
            &payload,
            0.0,
        )
    })
    .unwrap();

    let deleted = s
        .with_conn(|c| {
            dataforseo_app_lib::store::response_cache::evict_older_than(c, Duration::days(90))
        })
        .unwrap();

    assert_eq!(deleted, 0, "fresh entry should not be evicted");
}
