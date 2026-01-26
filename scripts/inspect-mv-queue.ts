import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectMVQueue() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    let output = '';

    try {
        output += '--- Inspecting Table: mv_refresh_queue ---\n';
        const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'mv_refresh_queue'
    `);
        output += JSON.stringify(cols.rows, null, 2) + '\n';

        output += '\n--- Inspecting Constraints: mv_refresh_queue ---\n';
        const consts = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'mv_refresh_queue'
    `);
        output += JSON.stringify(consts.rows, null, 2) + '\n';

        fs.writeFileSync('mv_queue_info.txt', output);
        console.log('✅ MV Queue info written to mv_queue_info.txt');

    } catch (err) {
        console.error('❌ Failed to inspect MV Queue:', err);
    } finally {
        await pool.end();
    }
}

inspectMVQueue();
