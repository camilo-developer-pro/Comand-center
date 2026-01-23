#!/usr/bin/env node

/**
 * Phase 3 Status Checker
 * Quick verification of all Phase 3 components
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPhase3Status() {
    console.log('🔍 Checking Phase 3 Components...\n');

    const checks = [
        { name: 'Error taxonomy enum', query: "SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'error_class') as exists" },
        { name: 'Error logs table', query: "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'episodic_memory' AND table_name = 'error_logs') as exists" },
        { name: 'Diagnostic function', query: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'diagnose_error') as exists" },
        { name: 'Meta-Agent protocol', query: "SELECT EXISTS(SELECT 1 FROM agent_runtime.protocols WHERE name = 'Meta-Agent Error Handler') as exists" },
        { name: 'Protocol versions table', query: "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'procedural_memory' AND table_name = 'protocol_versions') as exists" },
        { name: 'Delta queue table', query: "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'mv_delta_queue') as exists" },
        { name: 'Live stats table', query: "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_stats_live') as exists" },
        { name: 'Delta capture trigger', query: "SELECT EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_capture_item_delta') as exists" },
        { name: 'Notification functions', query: "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'notify_realtime') as exists" },
        { name: 'Graph change trigger', query: "SELECT EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_notify_graph_change') as exists" }
    ];

    let passed = 0;
    let failed = 0;

    const client = await pool.connect();

    try {
        for (const check of checks) {
            try {
                const result = await client.query(check.query);
                const exists = result.rows[0].exists;

                if (exists) {
                    console.log(`✅ ${check.name}`);
                    passed++;
                } else {
                    console.log(`❌ ${check.name}: Not found`);
                    failed++;
                }
            } catch (err) {
                console.log(`❌ ${check.name}: Error - ${err.message}`);
                failed++;
            }
        }
    } finally {
        client.release();
        await pool.end();
    }

    console.log(`\n📊 Results: ${passed}/${passed + failed} tests passed`);

    if (failed === 0) {
        console.log('🎉 All Phase 3 components are deployed and ready!');
        process.exit(0);
    } else {
        console.log('⚠️  Some components are missing. Check the list above.');
        process.exit(1);
    }
}

checkPhase3Status().catch(err => {
    console.error('Failed to check Phase 3 status:', err);
    process.exit(1);
});