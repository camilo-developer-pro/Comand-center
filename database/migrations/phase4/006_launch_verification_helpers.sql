-- Helper function for launch readiness verification
CREATE OR REPLACE FUNCTION check_extensions()
RETURNS TABLE (name TEXT, installed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ext.extname::TEXT,
        TRUE
    FROM pg_extension ext
    WHERE ext.extname IN ('ltree', 'vector', 'pg_net', 'pg_cron', 'pgcrypto');
END;
$$;
