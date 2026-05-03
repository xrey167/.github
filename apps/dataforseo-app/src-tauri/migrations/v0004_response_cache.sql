-- Generic response cache. Keyed on (endpoint, params_hash) so any
-- command that derives a deterministic params blob can opt into caching
-- without a bespoke per-endpoint table.
--
-- Used by: whois, technologies, domain_rank_overview, and the seven
-- Labs* endpoints (suggestions, related, keywords_for_site, ranked,
-- serp_competitors, competitors_domain, domain_intersection). The
-- bespoke keyword_volume_cache and backlinks_summary_cache predate
-- this and remain in place — no need to migrate working caches.
--
-- TTL is enforced at read time via WHERE fetched_at >= cutoff. Stale
-- rows get overwritten by the ON CONFLICT update next time the same
-- (endpoint, params_hash) pair is fetched.

CREATE TABLE IF NOT EXISTS response_cache (
    endpoint VARCHAR NOT NULL,
    params_hash VARCHAR NOT NULL,
    response_json JSON NOT NULL,
    cost_usd DOUBLE,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (endpoint, params_hash)
);

CREATE INDEX IF NOT EXISTS response_cache_fetched_idx ON response_cache(fetched_at);

-- Daily cost budget. One row per period_start (day, ISO date). Inserted
-- on demand; we only persist days where the user explicitly set a cap
-- so the absence of a row means "no limit configured."
CREATE TABLE IF NOT EXISTS cost_budget (
    period VARCHAR PRIMARY KEY,  -- 'daily' | 'monthly'
    limit_usd DOUBLE NOT NULL,
    alert_at_pct DOUBLE NOT NULL DEFAULT 80.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
