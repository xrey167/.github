-- Editorial calendar: planned posts the user wants to write/publish.
-- Persistence for the Content Strategy page (issue #68 phase 1).

CREATE SEQUENCE IF NOT EXISTS planned_posts_id_seq;

CREATE TABLE IF NOT EXISTS planned_posts (
    id              BIGINT    PRIMARY KEY DEFAULT nextval('planned_posts_id_seq'),
    project_id      BIGINT,                          -- nullable = global / unscoped
    title           VARCHAR   NOT NULL,
    target_keyword  VARCHAR,                         -- the primary keyword the post targets
    status          VARCHAR   NOT NULL DEFAULT 'idea',
                                                     -- 'idea' | 'drafting' | 'review' | 'published' | 'archived'
    scheduled_for   DATE,                            -- planned publish date (calendar slot)
    notes           VARCHAR,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS planned_posts_project_idx  ON planned_posts(project_id);
CREATE INDEX IF NOT EXISTS planned_posts_schedule_idx ON planned_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS planned_posts_status_idx   ON planned_posts(status);
