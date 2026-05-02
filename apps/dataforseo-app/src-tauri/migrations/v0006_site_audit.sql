-- Site Audit (full crawl). One row per audit run; the background
-- poller updates status from pending → running → ready, and once
-- the task is ready it pulls the summary + pages list and stores them.
--
-- Cost: 0.000125 USD per page. A 100-page audit costs 0.0125 USD.
-- audit_pages.raw_json keeps the verbose On-Page row so the per-page
-- drill-down can show every check without needing a fresh API call.

CREATE TABLE IF NOT EXISTS audit_runs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    target VARCHAR NOT NULL,
    task_id VARCHAR,
    max_crawl_pages INTEGER NOT NULL,
    -- 'pending' | 'running' | 'ready' | 'failed'
    status VARCHAR NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    last_polled_at TIMESTAMP,
    cost_usd DOUBLE,
    summary_json JSON,
    error VARCHAR
);

CREATE INDEX IF NOT EXISTS audit_runs_status_idx ON audit_runs(status);
CREATE INDEX IF NOT EXISTS audit_runs_task_idx ON audit_runs(task_id);

CREATE TABLE IF NOT EXISTS audit_pages (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    audit_run_id BIGINT NOT NULL,
    url VARCHAR NOT NULL,
    status_code INTEGER,
    title VARCHAR,
    description VARCHAR,
    h1 VARCHAR,
    plain_text_word_count INTEGER,
    page_timing_ttfb INTEGER,
    onpage_score DOUBLE,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_json JSON
);

CREATE INDEX IF NOT EXISTS audit_pages_run_idx ON audit_pages(audit_run_id);
