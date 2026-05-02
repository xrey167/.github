//! Three-tier context strategy for "chat with this table" attachments.
//! See docs/DATAFORSEO_VECDOOR_AI_CHAT_PLAN.md Teil 4.3 / 4.4a for the
//! reasoning. Cluster pre-processing for the > 1000-row tier is intentionally
//! deferred — we down-sample instead and call out the truncation inline.

use serde_json::Value;

const SMALL_TIER: usize = 100;
const MEDIUM_TIER: usize = 1000;
const TOP_K: usize = 50;
const SAMPLE_K: usize = 10;

/// Produce a string ready to drop into a `<user_data>` tag. Prefers full
/// fidelity for ≤ 100 rows; otherwise returns a representative sample.
pub fn build_attachment_context(attachment: &Value) -> String {
    let Some(arr) = attachment.as_array() else {
        // Non-array attachments go in verbatim. Frontend currently only
        // sends arrays, but keep this defensive in case a single-row
        // object lands here in future.
        return serde_json::to_string_pretty(attachment).unwrap_or_default();
    };
    let n = arr.len();
    if n <= SMALL_TIER {
        return serde_json::to_string_pretty(&Value::Array(arr.clone())).unwrap_or_default();
    }
    let (top, sample) = sample_rows(arr);
    let mut out = format!(
        "// Attached table truncated for token-budget reasons.\n\
         // Full size: {n} rows. Showing top {} by search_volume + a {SAMPLE_K}-row random sample.\n\n",
        top.len()
    );
    out.push_str("// Top by search_volume:\n");
    out.push_str(&serde_json::to_string_pretty(&Value::Array(top)).unwrap_or_default());
    out.push_str("\n\n// Random sample of long-tail:\n");
    out.push_str(&serde_json::to_string_pretty(&Value::Array(sample)).unwrap_or_default());
    out
}

/// Pull TOP_K rows by `search_volume`, then SAMPLE_K random others (skipping
/// the top set). Deterministic-ish — uses `len()` as a stride so the sample
/// is reproducible without a PRNG dependency.
fn sample_rows(arr: &[Value]) -> (Vec<Value>, Vec<Value>) {
    let mut indexed: Vec<(usize, &Value)> = arr.iter().enumerate().collect();
    indexed.sort_by(|a, b| {
        let av = a.1.pointer("/search_volume").and_then(Value::as_i64).unwrap_or(0);
        let bv = b.1.pointer("/search_volume").and_then(Value::as_i64).unwrap_or(0);
        bv.cmp(&av)
    });

    let take_n = if arr.len() > MEDIUM_TIER { TOP_K } else { TOP_K.min(arr.len()) };
    let top_indices: std::collections::HashSet<usize> =
        indexed.iter().take(take_n).map(|(i, _)| *i).collect();
    let top: Vec<Value> = indexed.iter().take(take_n).map(|(_, v)| (*v).clone()).collect();

    // Reproducible "random" sample: stride through arr skipping top hits.
    let stride = (arr.len() / SAMPLE_K).max(1);
    let mut sample = Vec::new();
    let mut i = 0;
    while sample.len() < SAMPLE_K && i < arr.len() {
        if !top_indices.contains(&i) {
            sample.push(arr[i].clone());
        }
        i += stride;
    }

    (top, sample)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn small_attachment_returned_verbatim() {
        let arr: Vec<Value> = (0..50)
            .map(|i| json!({ "keyword": format!("kw {i}"), "search_volume": i }))
            .collect();
        let ctx = build_attachment_context(&Value::Array(arr));
        assert!(ctx.contains("\"kw 0\""));
        assert!(ctx.contains("\"kw 49\""));
        assert!(!ctx.contains("truncated"));
    }

    #[test]
    fn large_attachment_is_sampled() {
        let arr: Vec<Value> = (0..5000)
            .map(|i| json!({ "keyword": format!("kw {i}"), "search_volume": i }))
            .collect();
        let ctx = build_attachment_context(&Value::Array(arr));
        assert!(ctx.contains("Full size: 5000 rows"));
        assert!(ctx.contains("\"kw 4999\""), "highest-volume row should be in top set");
    }
}
