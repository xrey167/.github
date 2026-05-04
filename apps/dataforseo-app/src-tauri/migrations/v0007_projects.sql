-- Multi-domain projects. Lets the user group tracked keywords / audit
-- runs / brand snapshots by a logical "project" (typically one client
-- domain). The sidebar gets a project switcher; pages default their
-- target input to the active project's domain.
--
-- Backfill happens at startup in lib.rs::run — for every distinct target
-- in tracked_keywords and audit_runs, an idempotent insert creates a
-- project row and updates the FK. Forward-only; existing data stays
-- functional even with project_id NULL.

CREATE SEQUENCE IF NOT EXISTS projects_id_seq;
CREATE TABLE IF NOT EXISTS projects (
    id BIGINT PRIMARY KEY DEFAULT nextval('projects_id_seq'),
    name VARCHAR NOT NULL,
    -- Denormalized so the sidebar / API filters don't need a join.
    target VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (target)
);

ALTER TABLE tracked_keywords ADD COLUMN IF NOT EXISTS project_id BIGINT;
ALTER TABLE audit_runs       ADD COLUMN IF NOT EXISTS project_id BIGINT;

CREATE INDEX IF NOT EXISTS tracked_keywords_project_idx ON tracked_keywords(project_id);
CREATE INDEX IF NOT EXISTS audit_runs_project_idx       ON audit_runs(project_id);
