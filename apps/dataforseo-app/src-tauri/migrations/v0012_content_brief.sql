-- Phase 3 of content-strategy (issue #68): LLM-generated content briefs.
-- Each planned post can have one current brief (Markdown) plus the
-- model + timestamp so the UI can show staleness and the user can
-- regenerate when the topic context changes.

ALTER TABLE planned_posts ADD COLUMN IF NOT EXISTS brief_md           VARCHAR;
ALTER TABLE planned_posts ADD COLUMN IF NOT EXISTS brief_model        VARCHAR;
ALTER TABLE planned_posts ADD COLUMN IF NOT EXISTS brief_generated_at TIMESTAMP;
