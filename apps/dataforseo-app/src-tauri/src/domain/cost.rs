//! Pure cost estimation. Mirrors src/lib/cost.ts on the frontend.
//!
//! Source: docs/DATAFORSEO_API_MAPPING.md (Teil 4) and DATAFORSEO_ARCHITECTURE.md (Teil 5).

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
