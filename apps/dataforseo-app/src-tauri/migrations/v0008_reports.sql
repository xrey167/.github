-- Scheduled PDF reports. Users configure schedules (one per project +
-- kind) and the background reporter task generates a PDF to the local
-- Documents folder on each tick. Runs are recorded so the UI can list
-- past files and offer "Open PDF" buttons.
--
-- Supported kinds:   'daily-tracking' | 'weekly-audit' | 'weekly-brand'
-- Supported cadences:'daily' | 'weekly'

CREATE TABLE IF NOT EXISTS report_schedules (
    id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    project_id BIGINT,
    kind       VARCHAR NOT NULL,
    cadence    VARCHAR NOT NULL,
    active     BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_runs (
    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    schedule_id BIGINT  NOT NULL,
    pdf_path    VARCHAR NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS report_schedules_project_idx ON report_schedules(project_id);
CREATE INDEX IF NOT EXISTS report_runs_schedule_idx     ON report_runs(schedule_id);
