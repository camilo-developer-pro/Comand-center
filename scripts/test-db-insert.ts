import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testInsert() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Fetching a workspace and user...');
        const ws = await pool.query('SELECT id, owner_id FROM workspaces LIMIT 1');
        if (ws.rows.length === 0) throw new Error('No workspaces found');

        const workspaceId = ws.rows[0].id;
        const userId = ws.rows[0].owner_id;

        console.log(`Inserting document into workspace ${workspaceId}...`);
        const res = await pool.query(`
      INSERT INTO documents (
        workspace_id, title, content, path, created_by, is_template
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING id
    `, [workspaceId, 'Test Doc PG', {}, 'root', userId, false]);

        console.log('✅ Successfully inserted document via PG. ID:', res.rows[0].id);

        // Cleanup
        await pool.query('DELETE FROM documents WHERE id = $1', [res.rows[0].id]);
        console.log('✅ Cleanup successful');

    } catch (err) {
        console.error('❌ Insertion failed:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await pool.end();
    }
}

testInsert();
