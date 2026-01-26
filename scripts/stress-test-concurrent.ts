import { Pool } from 'pg';
import { generateKeyBetween } from '../src/lib/utils/fractional-index';
import { generateUUIDv7 } from '../src/lib/utils/uuid';
import dotenv from 'dotenv';
import assert from 'assert';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20 // Allow more concurrent connections
});

async function runConcurrentStressTest() {
    console.log('🚀 Starting Concurrent Edit Stress Test (PG Direct)...');

    // 1. Setup
    const client = await pool.connect();
    let testWorkspaceId: string;
    let testDocumentId: string;
    let testUserId: string;

    try {
        // Get a test user
        const userRes = await client.query('SELECT id FROM auth.users LIMIT 1');
        if (userRes.rows.length === 0) throw new Error('No users found');
        testUserId = userRes.rows[0].id;

        // Create workspace
        const wsRes = await client.query(`
      INSERT INTO workspaces (name, slug, owner_id)
      VALUES ($1, $2, $3) RETURNING id
    `, ['Stress Test PG', `stress-pg-${Date.now()}`, testUserId]);
        testWorkspaceId = wsRes.rows[0].id;

        // Create document
        const docRes = await client.query(`
      INSERT INTO documents (workspace_id, title, content, path, created_by, is_template)
      VALUES ($1, $2, $3, $4::ltree, $5, $6) RETURNING id
    `, [testWorkspaceId, 'Stress Doc', {}, 'root', testUserId, false]);
        testDocumentId = docRes.rows[0].id;

        console.log(`✅ Setup complete. Workspace: ${testWorkspaceId}, Document: ${testDocumentId}`);
    } finally {
        client.release();
    }

    // 2. Concurrent Insertions
    console.log('\n--- Test 1: 50 Concurrent Block Insertions ---');
    const CONCURRENT_USERS = 50;
    const start = Date.now();

    const insertPromises = Array.from({ length: CONCURRENT_USERS }, async (_, i) => {
        const localClient = await pool.connect();
        try {
            // Each user finds the last sort_order
            const blocksRes = await localClient.query(`
        SELECT sort_order FROM blocks 
        WHERE document_id = $1 
        ORDER BY sort_order DESC LIMIT 1
      `, [testDocumentId]);

            const lastKey = blocksRes.rows[0]?.sort_order || null;
            const newKey = generateKeyBetween(lastKey, null);

            const { rowCount } = await localClient.query(`
        INSERT INTO blocks (id, document_id, type, content, sort_order, parent_path, created_by)
        VALUES ($1, $2, $3, $4, $5, $6::ltree, $7)
      `, [generateUUIDv7(), testDocumentId, 'paragraph', { text: `Block ${i}` }, newKey, 'root', testUserId]);

            return { success: rowCount === 1 };
        } catch (e: any) {
            return { success: false, error: e.message };
        } finally {
            localClient.release();
        }
    });

    const results = await Promise.all(insertPromises);
    const successful = results.filter(r => r.success).length;
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
        console.log(`❌ First error: ${failures[0].error}`);
    }
    const collisions = results.filter(r => r.error?.includes('unique_rank_per_parent') || r.error?.includes('unique_document_rank')).length;
    const duration = Date.now() - start;

    console.log(`Results: ${successful}/${CONCURRENT_USERS} successful in ${duration}ms`);
    console.log(`Collisions detected: ${collisions}`);

    assert(successful >= CONCURRENT_USERS - 5, `Too many insertion failures (${CONCURRENT_USERS - successful})`);

    // 3. Concurrent Folder Moves (RPC)
    console.log('\n--- Test 2: Concurrent Folder Moves (Hierarchical) ---');
    // Create 3 parent folders
    const parentsRes = await pool.query(`
    INSERT INTO documents (workspace_id, title, content, path, created_by, is_template)
    VALUES 
        ($1, 'Parent X', '{}', 'root.x'::ltree, $2, false),
        ($1, 'Parent Y', '{}', 'root.y'::ltree, $2, false),
        ($1, 'Parent Z', '{}', 'root.z'::ltree, $2, false)
    RETURNING id
  `, [testWorkspaceId, testUserId]);
    const parentIds = parentsRes.rows.map(r => r.id);

    // Create 10 folders to move
    const foldersToMoveRes = await pool.query(`
    INSERT INTO documents (workspace_id, title, content, path, created_by, is_template)
    SELECT $1, 'Folder ' || i, '{}', ('root.doc_' || i)::ltree, $2, false
    FROM generate_series(1, 10) i
    RETURNING id
  `, [testWorkspaceId, testUserId]);
    const folderIds = foldersToMoveRes.rows.map(r => r.id);

    const MOVE_ATTEMPTS = 50;
    const movePromises = Array.from({ length: MOVE_ATTEMPTS }, async (_, i) => {
        const localClient = await pool.connect();
        localClient.on('notice', (msg) => console.log(`[DB NOTICE] ${msg.message}`));
        try {
            await localClient.query('SELECT move_document_atomic($1, $2)', [
                folderIds[Math.floor(Math.random() * folderIds.length)],
                parentIds[Math.floor(Math.random() * parentIds.length)]
            ]);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        } finally {
            localClient.release();
        }
    });

    const moveResults = await Promise.all(movePromises);
    const movesSuccessful = moveResults.filter(r => r.success).length;
    const moveFailures = moveResults.filter(r => !r.success);
    if (moveFailures.length > 0) {
        console.log(`❌ First move error: ${moveFailures[0].error}`);
    }
    const serializationErrors = moveResults.filter(r => r.error?.includes('serialization') || r.error?.includes('deadlock')).length;

    console.log(`Results: ${movesSuccessful}/${MOVE_ATTEMPTS} successful`);
    console.log(`Concurrency conflicts (deadlock/serialization): ${serializationErrors}`);
    assert(movesSuccessful >= 1, 'At least one move should have succeeded');

    // 4. Final Cleanup
    console.log('\n--- Cleanup ---');
    await pool.query('DELETE FROM documents WHERE workspace_id = $1', [testWorkspaceId]);
    await pool.query('DELETE FROM workspaces WHERE id = $1', [testWorkspaceId]);
    console.log('✅ Cleanup complete');

    await pool.end();
}

runConcurrentStressTest().catch(async err => {
    console.error('❌ Stress test failed:', err);
    await pool.end();
    process.exit(1);
});
