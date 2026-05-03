-- Position Tracking — daily SERP rank history per (target, keyword,
-- location, language) tuple.
--
-- The background tracker polls due rows on a 1h interval (cheaper than
-- per-keyword cron jobs and respects rate limits). One row per check
-- lands in tracking_results, append-only, so trend charts are a simple
-- ORDER BY fetched_at.
--
-- DuckDB doesn't support ON DELETE CASCADE reliably; the delete command
-- removes child rows in the same transaction.

CREATE TABLE IF NOT EXISTS tracked_keywords (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    target VARCHAR NOT NULL,
    keyword VARCHAR NOT NULL,
    location_code INTEGER NOT NULL,
    language_code VARCHAR NOT NULL,
    -- 'daily' | 'weekly' | 'manual'
    frequency VARCHAR NOT NULL DEFAULT 'daily',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMP,
    UNIQUE (target, keyword, location_code, language_code)
);

CREATE INDEX IF NOT EXISTS tracked_keywords_due_idx
    ON tracked_keywords(active, last_run_at);

CREATE TABLE IF NOT EXISTS tracking_results (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    tracked_keyword_id BIGINT NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- NULL = target not found in top 100 SERP results.
    rank_absolute INTEGER,
    url VARCHAR
);

CREATE INDEX IF NOT EXISTS tracking_results_lookup_idx
    ON tracking_results(tracked_keyword_id, fetched_at DESC);
