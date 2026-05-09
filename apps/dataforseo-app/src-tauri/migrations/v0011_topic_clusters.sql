-- Phase 2 of content-strategy (issue #68): topic clusters.
-- Lets users group planned posts under a pillar topic, plus surface a
-- "content gap" keyword view (the gap data itself is queried live from
-- DataForSEO Labs domain_intersection, no persistence needed).

CREATE SEQUENCE IF NOT EXISTS topic_clusters_id_seq;

CREATE TABLE IF NOT EXISTS topic_clusters (
    id              BIGINT    PRIMARY KEY DEFAULT nextval('topic_clusters_id_seq'),
    project_id      BIGINT,                          -- nullable = global
    name            VARCHAR   NOT NULL,
    pillar_keyword  VARCHAR,                         -- the head term the cluster targets
    description     VARCHAR,
    color           VARCHAR,                         -- e.g. 'blue', 'amber' — optional UI hint
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS topic_clusters_project_idx ON topic_clusters(project_id);

-- Tie planned posts to a cluster. Nullable so existing posts and ad-hoc
-- ideas don't need a cluster.
ALTER TABLE planned_posts ADD COLUMN IF NOT EXISTS cluster_id BIGINT;

CREATE INDEX IF NOT EXISTS planned_posts_cluster_idx ON planned_posts(cluster_id);
