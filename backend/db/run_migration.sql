
-- Study Companion - Migration Tracking
-- Records which database schema versions have been applied.

CREATE TABLE IF NOT EXISTS schema_migrations (

    -- Unique identifier for each migration version.
    version VARCHAR(50) PRIMARY KEY,

    -- Date and time the migration was recorded.
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
