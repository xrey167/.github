//! Pure cost estimation. Mirrors src/lib/cost.ts on the frontend.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::types::Mode;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(tag = "kind")]
pub enum CostAction {
    KeywordsSearchVolume { count: u32, mode: Mode },
    KeywordsSuggestions { mode: Mode },
    KeywordsRelated { depth: u32, mode: Mode },
    KeywordsForDomain { mode: Mode },
    Serp { count: u32, mode: Mode, depth: u32, extra_params: u32 },
    /// Backlinks endpoints follow a different shape: 0.02 USD per request
    /// + 0.00003 USD per result row. `target_count` is how many separate
    /// targets are queried (one POST each), `rows_per_target` the limit
    /// requested. Aggregate endpoints (summary, history) pass rows=1.
    Backlinks { target_count: u32, rows_per_target: u32 },
    /// Domain Analytics WHOIS · 0.0001 USD per row (one row per domain
    /// returned). One request can return many rows when filtered.
    DomainAnalyticsWhois { rows: u32 },
    /// Domain Analytics Technologies · 0.001 USD per request (the
    /// per-domain endpoint returns one row per request, so we don't
    /// multiply by rows here).
    DomainAnalyticsTechnologies,
    /// Labs Domain Rank Overview · 0.0125 USD per request, single
    /// target. Aggregate metrics (organic traffic, keyword count,
    /// position bucket counts) for one domain.
    LabsDomainRankOverview,
    /// Labs Bulk Keyword Difficulty · 0.0001 USD per keyword. The
    /// endpoint accepts up to 1000 keywords per request; we charge
    /// strictly per keyword regardless of how many requests we
    /// have to fan out under the hood.
    LabsBulkKeywordDifficulty { count: u32 },
    /// Labs SERP Competitors · 0.0125 USD per request. Returns the
    /// domains ranking for a keyword with position metrics.
    LabsSerpCompetitors,
    /// Labs Competitors Domain · 0.0125 USD per request. Returns the
    /// domains that compete most with a target domain.
    LabsCompetitorsDomain,
    /// Labs Domain Intersection · 0.0125 USD per request. Returns
    /// keywords both target domains rank for (competitive overlap).
    LabsDomainIntersection,
}

pub fn estimate(action: &CostAction) -> f64 {
    use CostAction::*;
    match action {
        KeywordsSearchVolume { count, mode } => {
            let base = match mode { Mode::Live => 0.075, _ => 0.05 };
            let requests = (*count as f64 / 1000.0).ceil().max(1.0);
            requests * base
        }
        KeywordsSuggestions { mode } => match mode {
            Mode::Live => 0.0125,
            _ => 0.0075,
        },
        KeywordsRelated { depth, mode } => {
            let base = match mode { Mode::Live => 0.0125, _ => 0.0075 };
            base * (*depth as f64).max(1.0)
        }
        KeywordsForDomain { mode } => match mode {
            Mode::Live => 0.0125,
            _ => 0.0075,
        },
        Serp { count, mode, depth, extra_params } => {
            let base = match mode {
                Mode::Live => 0.002,
                Mode::Priority => 0.0012,
                Mode::Standard => 0.0006,
            };
            let depth_mult = if *depth <= 10 {
                1.0
            } else {
                (*depth as f64 / 10.0).ceil()
            };
            let param_mult = 5.0_f64.powi(*extra_params as i32);
            (*count as f64) * base * depth_mult * param_mult
        }
        Backlinks { target_count, rows_per_target } => {
            // 0.02 USD per request, plus 0.00003 USD per row.
            // Cast both to f64 before multiplying so target × rows can't
            // overflow u32 (a 70k × 100k worst case is well above 2^32).
            let requests_per_target = (*rows_per_target as f64 / 1000.0).ceil().max(1.0);
            let total_requests = *target_count as f64 * requests_per_target;
            total_requests * 0.02
                + (*target_count as f64 * *rows_per_target as f64) * 0.00003
        }
        DomainAnalyticsWhois { rows } => (*rows as f64).max(1.0) * 0.0001,
        DomainAnalyticsTechnologies => 0.001,
        LabsDomainRankOverview => 0.0125,
        LabsBulkKeywordDifficulty { count } => (*count as f64).max(1.0) * 0.0001,
        LabsSerpCompetitors => 0.0125,
        LabsCompetitorsDomain => 0.0125,
        LabsDomainIntersection => 0.0125,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_volume_live_1000_keywords() {
        let cost = estimate(&CostAction::KeywordsSearchVolume { count: 1000, mode: Mode::Live });
        assert!((cost - 0.075).abs() < 1e-9);
    }

    #[test]
    fn search_volume_standard_2500_keywords_takes_three_requests() {
        let cost = estimate(&CostAction::KeywordsSearchVolume { count: 2500, mode: Mode::Standard });
        // ceil(2500 / 1000) = 3 -> 3 * 0.05 = 0.15
        assert!((cost - 0.15).abs() < 1e-9);
    }

    #[test]
    fn search_volume_minimum_one_request_for_partial() {
        let cost = estimate(&CostAction::KeywordsSearchVolume { count: 50, mode: Mode::Live });
        assert!((cost - 0.075).abs() < 1e-9);
    }

    #[test]
    fn serp_live_depth_10_baseline() {
        let cost = estimate(&CostAction::Serp {
            count: 1, mode: Mode::Live, depth: 10, extra_params: 0,
        });
        assert!((cost - 0.002).abs() < 1e-9);
    }

    #[test]
    fn serp_live_depth_100_is_10x_baseline() {
        let cost = estimate(&CostAction::Serp {
            count: 1, mode: Mode::Live, depth: 100, extra_params: 0,
        });
        assert!((cost - 0.020).abs() < 1e-9);
    }

    #[test]
    fn serp_extra_params_multiply_by_5() {
        let with_zero = estimate(&CostAction::Serp {
            count: 1, mode: Mode::Live, depth: 10, extra_params: 0,
        });
        let with_two = estimate(&CostAction::Serp {
            count: 1, mode: Mode::Live, depth: 10, extra_params: 2,
        });
        // 5^2 = 25x
        assert!((with_two - with_zero * 25.0).abs() < 1e-9);
    }

    #[test]
    fn backlinks_summary_is_one_request_per_target() {
        // rows_per_target=1 -> 1 request, ~0.02 USD per target.
        let cost = estimate(&CostAction::Backlinks {
            target_count: 1,
            rows_per_target: 1,
        });
        assert!((cost - (0.02 + 0.00003)).abs() < 1e-9);
    }

    #[test]
    fn backlinks_detail_1000_rows_one_target() {
        let cost = estimate(&CostAction::Backlinks {
            target_count: 1,
            rows_per_target: 1000,
        });
        // ceil(1000/1000)=1 -> 1 * 0.02 + 1000 * 0.00003 = 0.05
        assert!((cost - 0.05).abs() < 1e-9);
    }

    #[test]
    fn backlinks_detail_huge_input_no_overflow() {
        // 70k targets × 100k rows would overflow u32 if multiplied as ints;
        // f64 cast keeps it safe.
        let cost = estimate(&CostAction::Backlinks {
            target_count: 70_000,
            rows_per_target: 100_000,
        });
        assert!(cost > 0.0 && cost.is_finite());
    }

    #[test]
    fn whois_overview_one_row_baseline() {
        let cost = estimate(&CostAction::DomainAnalyticsWhois { rows: 1 });
        assert!((cost - 0.0001).abs() < 1e-9);
    }

    #[test]
    fn whois_overview_zero_rows_still_one_request() {
        let cost = estimate(&CostAction::DomainAnalyticsWhois { rows: 0 });
        // .max(1.0) prevents the estimate from going to zero before the
        // user's first keystroke.
        assert!((cost - 0.0001).abs() < 1e-9);
    }

    #[test]
    fn technologies_is_flat_per_request() {
        let cost = estimate(&CostAction::DomainAnalyticsTechnologies);
        assert!((cost - 0.001).abs() < 1e-9);
    }

    #[test]
    fn labs_domain_rank_overview_is_flat_per_request() {
        let cost = estimate(&CostAction::LabsDomainRankOverview);
        assert!((cost - 0.0125).abs() < 1e-9);
    }

    #[test]
    fn labs_bulk_keyword_difficulty_charges_per_keyword() {
        let cost = estimate(&CostAction::LabsBulkKeywordDifficulty { count: 100 });
        assert!((cost - 0.01).abs() < 1e-9);
    }

    #[test]
    fn labs_bulk_keyword_difficulty_zero_count_still_baseline() {
        let cost = estimate(&CostAction::LabsBulkKeywordDifficulty { count: 0 });
        // .max(1.0) keeps the cost preview from going to 0 before the
        // user has typed anything.
        assert!((cost - 0.0001).abs() < 1e-9);
    }

    #[test]
    fn serp_standard_is_cheaper_than_live() {
        let live = estimate(&CostAction::Serp {
            count: 100, mode: Mode::Live, depth: 10, extra_params: 0,
        });
        let standard = estimate(&CostAction::Serp {
            count: 100, mode: Mode::Standard, depth: 10, extra_params: 0,
        });
        assert!(standard < live);
        // 0.0006 vs 0.002 -> exact ratio
        assert!((live / standard - (0.002 / 0.0006)).abs() < 1e-9);
    }
}
