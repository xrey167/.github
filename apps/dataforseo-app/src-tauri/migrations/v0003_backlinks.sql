-- Backlinks Phase 2. Two new tables alongside the v0001 / v0002 schema:
--
-- backlinks_summary_cache: short-TTL cache for the backlinks_summary
--     endpoint, keyed on the target domain. Aggregate metrics change
--     slowly; 24h TTL keeps the dashboard tile near-free.
-- saved_filters: persistent named filter sets for the upcoming
--     filter-builder UI. Generic enough to serve Backlinks + Labs.

CREATE TABLE IF NOT EXISTS backlinks_summary_cache (
    target VARCHAR PRIMARY KEY,
    summary_json JSON NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cost_usd DOUBLE
);

CREATE TABLE IF NOT EXISTS saved_filters (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    endpoint VARCHAR NOT NULL,
    filter_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS saved_filters_endpoint_idx ON saved_filters(endpoint);
