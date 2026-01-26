import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectAsyncErrors() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    let output = '';

    try {
        output += '--- Inspecting Table: async_processing_errors ---\n';
        const consts = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'async_processing_errors'
    `);
        output += JSON.stringify(consts.rows, null, 2) + '\n';

        fs.writeFileSync('async_errors_info.txt', output);
        console.log('✅ Async errors info written to async_errors_info.txt');

    } catch (err) {
        console.error('❌ Failed to inspect async errors:', err);
    } finally {
        await pool.end();
    }
}

inspectAsyncErrors();
