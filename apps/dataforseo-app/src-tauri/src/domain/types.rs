use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/lib/types/")]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Live,
    Priority,
    Standard,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/lib/types/")]
pub enum EndpointFamily {
    GoogleAdsLive,
    Labs,
    SerpLive,
    SerpTask,
}
