-- Initial schema for Tier 1.
-- Source: docs/DATAFORSEO_ARCHITECTURE.md Teil 4.

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR PRIMARY KEY,
    value VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS api_calls (
    id BIGINT PRIMARY KEY,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    endpoint VARCHAR NOT NULL,
    mode VARCHAR NOT NULL,
    cost_usd DOUBLE NOT NULL,
    estimated_usd DOUBLE,
    request_size INTEGER,
    response_status INTEGER,
    duration_ms INTEGER,
    task_id VARCHAR,
    error VARCHAR
);
CREATE INDEX IF NOT EXISTS api_calls_ts_idx ON api_calls(ts);
CREATE INDEX IF NOT EXISTS api_calls_endpoint_idx ON api_calls(endpoint);

CREATE TABLE IF NOT EXISTS keyword_volume_cache (
    keyword VARCHAR NOT NULL,
    location_code INTEGER NOT NULL,
    language_code VARCHAR NOT NULL,
    search_volume INTEGER,
    competition VARCHAR,
    competition_index INTEGER,
    cpc DOUBLE,
    low_top_of_page_bid DOUBLE,
    high_top_of_page_bid DOUBLE,
    monthly_searches JSON,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (keyword, location_code, language_code)
);

CREATE TABLE IF NOT EXISTS serp_tasks (
    task_id VARCHAR PRIMARY KEY,
    batch_id VARCHAR NOT NULL,
    keyword VARCHAR NOT NULL,
    location_code INTEGER NOT NULL,
    language_code VARCHAR NOT NULL,
    depth INTEGER NOT NULL,
    status VARCHAR NOT NULL,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fetched_at TIMESTAMP,
    last_polled_at TIMESTAMP,
    poll_attempts INTEGER DEFAULT 0,
    cost_usd DOUBLE,
    error VARCHAR
);
CREATE INDEX IF NOT EXISTS serp_tasks_batch_idx ON serp_tasks(batch_id);
CREATE INDEX IF NOT EXISTS serp_tasks_status_idx ON serp_tasks(status);

CREATE TABLE IF NOT EXISTS serp_results (
    task_id VARCHAR NOT NULL,
    position INTEGER NOT NULL,
    type VARCHAR NOT NULL,
    url VARCHAR,
    title VARCHAR,
    description VARCHAR,
    domain VARCHAR,
    extra JSON,
    PRIMARY KEY (task_id, position)
);
CREATE INDEX IF NOT EXISTS serp_results_domain_idx ON serp_results(domain);
