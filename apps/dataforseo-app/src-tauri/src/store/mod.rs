pub mod keywords_cache;
pub mod ledger;
pub mod schema;

use std::path::PathBuf;
use std::sync::Mutex;

use duckdb::Connection;

use crate::errors::{AppError, Result};

pub struct Store {
    conn: Mutex<Connection>,
}

impl Store {
    pub fn open(path: PathBuf) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| AppError::Database(e.to_string()))?;
        }
        let conn = Connection::open(&path)?;
        let store = Self { conn: Mutex::new(conn) };
        store.with_conn(|c| schema::ensure_current(c))?;
        Ok(store)
    }

    /// Run a closure with the underlying connection. Holds a blocking mutex
    /// — async callers must wrap calls in tokio::task::spawn_blocking.
    pub fn with_conn<T>(&self, f: impl FnOnce(&Connection) -> Result<T>) -> Result<T> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Database("store mutex poisoned".into()))?;
        f(&conn)
    }
}
