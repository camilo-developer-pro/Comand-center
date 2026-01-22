-- File: verify_004_uuidv7.sql
DO $$
DECLARE
    v_uuid1 UUID;
    v_uuid2 UUID;
    v_ts1 TIMESTAMP WITH TIME ZONE;
    v_ts2 TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate two UUIDs with small delay
    v_uuid1 := generate_uuidv7();
    PERFORM pg_sleep(0.01);
    v_uuid2 := generate_uuidv7();

    -- Verify ordering (uuid2 should be > uuid1)
    ASSERT v_uuid2 > v_uuid1, 'UUIDv7 ordering failed: second UUID should be greater';

    -- Verify timestamp extraction
    v_ts1 := uuidv7_extract_timestamp(v_uuid1);
    v_ts2 := uuidv7_extract_timestamp(v_uuid2);

    ASSERT v_ts2 > v_ts1, 'Timestamp extraction failed: second timestamp should be later';
    ASSERT v_ts1 > NOW() - INTERVAL '1 minute', 'Extracted timestamp too old';
    ASSERT v_ts1 < NOW() + INTERVAL '1 minute', 'Extracted timestamp in future';

    RAISE NOTICE 'UUIDv7 verification PASSED';
    RAISE NOTICE 'UUID1: %, Timestamp: %', v_uuid1, v_ts1;
    RAISE NOTICE 'UUID2: %, Timestamp: %', v_uuid2, v_ts2;
END;
$$;