-- File: migrations/004_uuidv7_function.sql
CREATE OR REPLACE FUNCTION public.generate_uuidv7()
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
PARALLEL SAFE
AS $$
DECLARE
    v_time BIGINT;
    v_unix_ts_ms BYTEA;
    v_rand_a BYTEA;
    v_rand_b BYTEA;
    v_uuid_bytes BYTEA;
BEGIN
    -- Get current Unix timestamp in milliseconds
    v_time := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

    -- Convert timestamp to 6 bytes (48 bits)
    v_unix_ts_ms := substring(int8send(v_time) FROM 3 FOR 6);

    -- Generate random bytes
    v_rand_a := gen_random_bytes(2);
    v_rand_b := gen_random_bytes(8);

    -- Construct UUID bytes
    v_uuid_bytes := v_unix_ts_ms || v_rand_a || v_rand_b;

    -- Set version (bits 48-51 to 0111)
    v_uuid_bytes := set_byte(v_uuid_bytes, 6, (get_byte(v_uuid_bytes, 6) & x'0F'::INT) | x'70'::INT);

    -- Set variant (bits 64-65 to 10)
    v_uuid_bytes := set_byte(v_uuid_bytes, 8, (get_byte(v_uuid_bytes, 8) & x'3F'::INT) | x'80'::INT);

    -- Convert to UUID string format
    RETURN encode(v_uuid_bytes, 'hex')::UUID;
END;
$$;

COMMENT ON FUNCTION public.generate_uuidv7() IS 'Generates RFC 9562 compliant UUIDv7 with embedded millisecond timestamp. Time-sortable, globally unique.';

CREATE OR REPLACE FUNCTION public.uuidv7_extract_timestamp(p_uuid UUID)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
    v_bytes BYTEA;
    v_timestamp_ms BIGINT;
BEGIN
    v_bytes := decode(replace(p_uuid::TEXT, '-', ''), 'hex');

    -- Extract first 6 bytes and convert to bigint
    v_timestamp_ms := (get_byte(v_bytes, 0)::BIGINT << 40) |
                      (get_byte(v_bytes, 1)::BIGINT << 32) |
                      (get_byte(v_bytes, 2)::BIGINT << 24) |
                      (get_byte(v_bytes, 3)::BIGINT << 16) |
                      (get_byte(v_bytes, 4)::BIGINT << 8) |
                      (get_byte(v_bytes, 5)::BIGINT);

    RETURN to_timestamp(v_timestamp_ms / 1000.0) AT TIME ZONE 'UTC';
END;
$$;

COMMENT ON FUNCTION public.uuidv7_extract_timestamp(UUID) IS 'Extracts the embedded timestamp from a UUIDv7.';