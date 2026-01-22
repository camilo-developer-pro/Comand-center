-- File: migrations/003_roles.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'command_center_app') THEN
        CREATE ROLE command_center_app WITH LOGIN PASSWORD 'CHANGE_IN_PRODUCTION';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA episodic_memory TO command_center_app;
GRANT USAGE ON SCHEMA semantic_memory TO command_center_app;
GRANT USAGE ON SCHEMA procedural_memory TO command_center_app;
GRANT USAGE ON SCHEMA public TO command_center_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA episodic_memory GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO command_center_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA semantic_memory GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO command_center_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA procedural_memory GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO command_center_app;