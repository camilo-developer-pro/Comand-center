import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BenchmarkResult {
    benchmark_name: string;
    avg_time_ms: number;
    min_time_ms: number;
    max_time_ms: number;
    p95_time_ms: number;
    status: string;
}

async function runBenchmarks(workspaceId: string): Promise<void> {
    console.log('========================================');
    console.log('V3.1 Phase 4: Performance Benchmark Suite');
    console.log('========================================\n');

    const startTime = Date.now();

    // Run aggregate benchmark report
    const { data, error } = await supabase.rpc('generate_benchmark_report', {
        p_workspace_id: workspaceId
    });

    if (error) {
        console.error('❌ Benchmark failed:', error.message);
        process.exit(1);
    }

    const results = data as BenchmarkResult[];

    // Print results table
    console.log('Benchmark Results:');
    console.log('─'.repeat(80));
    console.log(
        'Benchmark'.padEnd(20),
        'Avg (ms)'.padEnd(12),
        'Min (ms)'.padEnd(12),
        'Max (ms)'.padEnd(12),
        'P95 (ms)'.padEnd(12),
        'Status'
    );
    console.log('─'.repeat(80));

    let allPassed = true;

    for (const result of results) {
        console.log(
            result.benchmark_name.padEnd(20),
            String(result.avg_time_ms).padEnd(12),
            String(result.min_time_ms).padEnd(12),
            String(result.max_time_ms).padEnd(12),
            String(result.p95_time_ms).padEnd(12),
            result.status
        );

        if (result.status.includes('FAIL')) {
            allPassed = false;
        }
    }

    console.log('─'.repeat(80));
    console.log(`\nTotal benchmark time: ${Date.now() - startTime}ms`);

    if (allPassed) {
        console.log('\n✅ All benchmarks passed! System is production-ready.');
        process.exit(0);
    } else {
        console.log('\n❌ Some benchmarks failed. Review index configuration.');
        process.exit(1);
    }
}

// Get workspace ID from command line or environment
const workspaceId = process.argv[2] || process.env.TEST_WORKSPACE_ID;

if (!workspaceId) {
    console.error('Usage: npx ts-node scripts/run-performance-benchmarks.ts <workspace_id>');
    process.exit(1);
}

runBenchmarks(workspaceId);
