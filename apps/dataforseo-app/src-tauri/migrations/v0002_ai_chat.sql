-- AI chat tables. Sibling to api_calls / serp_tasks / serp_results from v0001.
-- Provider responses (token counts, costs) are stored both per-message
-- (chat_messages) and per-call (ai_calls), the former for the chat UI and
-- the latter for the Usage page.

CREATE SEQUENCE IF NOT EXISTS chat_sessions_id_seq;
CREATE TABLE IF NOT EXISTS chat_sessions (
    id BIGINT PRIMARY KEY DEFAULT nextval('chat_sessions_id_seq'),
    title VARCHAR,                                 -- AI-generated after first turn
    provider VARCHAR NOT NULL,                     -- 'anthropic' | 'openai' | 'ollama'
    model VARCHAR NOT NULL,
    attachment_summary VARCHAR,                    -- e.g. "1000 keywords from /keywords/volume"
    attachment_json JSON,                          -- original table rows, nullable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS chat_messages_id_seq;
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT PRIMARY KEY DEFAULT nextval('chat_messages_id_seq'),
    session_id BIGINT NOT NULL,
    role VARCHAR NOT NULL,                         -- 'system' | 'user' | 'assistant'
    content VARCHAR NOT NULL,
    prompt_template_id VARCHAR,                    -- 'cluster' | 'blog_ideas' | NULL
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id);

CREATE SEQUENCE IF NOT EXISTS ai_calls_id_seq;
CREATE TABLE IF NOT EXISTS ai_calls (
    id BIGINT PRIMARY KEY DEFAULT nextval('ai_calls_id_seq'),
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    provider VARCHAR NOT NULL,
    model VARCHAR NOT NULL,
    purpose VARCHAR NOT NULL,                      -- 'chat' | future: 'cluster' | 'titles'
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd DOUBLE NOT NULL,
    duration_ms INTEGER,
    error VARCHAR
);
CREATE INDEX IF NOT EXISTS ai_calls_ts_idx ON ai_calls(ts);
CREATE INDEX IF NOT EXISTS ai_calls_provider_idx ON ai_calls(provider);
