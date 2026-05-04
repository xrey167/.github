-- SEMrush import history.  Tracks every CSV ingestion so the user can see
-- which files have been imported and how much API spend was avoided.

CREATE SEQUENCE IF NOT EXISTS semrush_imports_id_seq;

CREATE TABLE IF NOT EXISTS semrush_imports (
    id            BIGINT    PRIMARY KEY DEFAULT nextval('semrush_imports_id_seq'),
    filename      VARCHAR   NOT NULL,
    import_type   VARCHAR   NOT NULL,   -- 'keyword_overview' | 'organic_positions'
    rows_imported BIGINT    NOT NULL    DEFAULT 0,
    location_code INTEGER,
    language_code VARCHAR,
    cost_saved_usd DOUBLE   DEFAULT 0.0,
    imported_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS semrush_imports_ts_idx ON semrush_imports(imported_at);
