-- Verify Phase 1 setup: extensions, schemas, and role access

-- Check extensions are installed
SELECT 'Installed Extensions:' AS check;
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pgcrypto', 'pg_partman', 'vector')
ORDER BY extname;

-- Check schemas exist
SELECT 'Existing Schemas:' AS check;
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('episodic_memory', 'semantic_memory', 'procedural_memory', 'public')
ORDER BY schema_name;

-- Check role exists
SELECT 'Role Status:' AS check;
SELECT rolname FROM pg_roles WHERE rolname = 'command_center_app';

-- Check schema usage privileges for the role
SELECT 'Schema Usage Privileges:' AS check;
SELECT
    object_schema AS schema_name,
    grantee,
    privilege_type
FROM information_schema.role_usage_grants
WHERE grantee = 'command_center_app'
  AND object_schema IN ('episodic_memory', 'semantic_memory', 'procedural_memory', 'public')
  AND object_type = 'SCHEMA'
  AND privilege_type = 'USAGE'
ORDER BY object_schema;