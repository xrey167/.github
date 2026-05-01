use crate::domain::cost::{self, CostAction};
use crate::errors::Result;

#[tauri::command]
pub fn estimate_cost(action: CostAction) -> Result<f64> {
    Ok(cost::estimate(&action))
}
