pub mod audits;
pub mod reports;
pub mod backlinks;
pub mod chat;
pub mod cost_budget;
pub mod keywords_cache;
pub mod ledger;
pub mod projects;
pub mod response_cache;
pub mod schema;
pub mod semrush_import;
pub mod serp_results;
pub mod serp_tasks;
pub mod tracking;

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
        store.with_conn(schema::ensure_current)?;
        Ok(store)
    }

    /// In-memory store for integration tests. Runs all migrations so the
    /// full schema is available without touching the filesystem.
    #[doc(hidden)]
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let store = Self { conn: Mutex::new(conn) };
        store.with_conn(schema::ensure_current)?;
        Ok(store)
    }

    /// Run a closure with the underlying connection. Holds a blocking mutex
    /// — async callers must wrap calls in tokio::task::spawn_blocking.
    /// `&mut Connection` is required by duckdb to start transactions.
    pub fn with_conn<T>(&self, f: impl FnOnce(&mut Connection) -> Result<T>) -> Result<T> {
        let mut conn = self
            .conn
            .lock()
            .map_err(|_| AppError::Database("store mutex poisoned".into()))?;
        f(&mut conn)
    }
}
