//! Cache-key canonicalization + TTL constants.
//!
//! params_hash is just a deterministic JSON serialization with sorted
//! object keys. Cryptographic strength isn't needed — collisions across
//! different endpoints are prevented by the `endpoint` column, and
//! collisions within an endpoint require two different params blobs to
//! produce the same canonical string, which is structurally impossible.
//!
//! Keeping the canonical form readable also makes debugging stale cache
//! hits trivial: just SELECT params_hash FROM response_cache WHERE ...
//! and you can read what got cached.

use chrono::Duration;

/// Canonical JSON string of a params blob, with all object keys sorted
/// alphabetically and consistent escaping. Two params blobs that are
/// semantically identical produce the same string.
pub fn hash_params(params: &serde_json::Value) -> String {
    serde_json::to_string(&canonicalize(params)).unwrap_or_default()
}

fn canonicalize(v: &serde_json::Value) -> serde_json::Value {
    match v {
        serde_json::Value::Object(m) => {
            // BTreeMap sorts keys lexicographically, so the resulting
            // serde_json::Value::Object preserves that order on serialize.
            let bmap: std::collections::BTreeMap<String, serde_json::Value> = m
                .iter()
                .map(|(k, vv)| (k.clone(), canonicalize(vv)))
                .collect();
            serde_json::to_value(bmap).unwrap_or_else(|_| serde_json::Value::Null)
        }
        serde_json::Value::Array(a) => {
            serde_json::Value::Array(a.iter().map(canonicalize).collect())
        }
        _ => v.clone(),
    }
}

/// Recommended TTLs by data volatility. Per-endpoint caps are picked
/// against how often the underlying signal actually changes. Quoted
/// figures below are observation, not contract — bump as needed.
pub fn ttl_long() -> Duration {
    // 30 days — for things that rarely move (WHOIS, per-keyword bulk
    // difficulty score, search volume).
    Duration::days(30)
}

pub fn ttl_medium() -> Duration {
    // 7 days — Labs aggregates that update daily-ish but rarely move
    // by enough to matter (suggestions, related, keywords_for_site,
    // technologies, competitors_domain).
    Duration::days(7)
}

pub fn ttl_short() -> Duration {
    // 3 days — competitive snapshots where a fresh-ish view matters
    // (domain_rank_overview, serp_competitors, domain_intersection).
    Duration::days(3)
}

pub fn ttl_volatile() -> Duration {
    // 1 day — ranking-sensitive data (ranked_keywords).
    Duration::days(1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_params_is_order_independent() {
        let a = serde_json::json!({"b": 1, "a": 2});
        let b = serde_json::json!({"a": 2, "b": 1});
        assert_eq!(hash_params(&a), hash_params(&b));
    }

    #[test]
    fn hash_params_distinguishes_values() {
        let a = serde_json::json!({"k": 1});
        let b = serde_json::json!({"k": 2});
        assert_ne!(hash_params(&a), hash_params(&b));
    }

    #[test]
    fn hash_params_handles_nested_objects() {
        let a = serde_json::json!({"outer": {"b": 1, "a": 2}});
        let b = serde_json::json!({"outer": {"a": 2, "b": 1}});
        assert_eq!(hash_params(&a), hash_params(&b));
    }

    #[test]
    fn hash_params_preserves_array_order() {
        // Arrays carry meaning by position; reordering changes the hash.
        let a = serde_json::json!([1, 2, 3]);
        let b = serde_json::json!([3, 2, 1]);
        assert_ne!(hash_params(&a), hash_params(&b));
    }
}
