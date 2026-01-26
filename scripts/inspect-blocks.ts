import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectBlocks() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    let output = '';

    try {
        output += '--- Inspecting Table: blocks ---\n';
        const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'blocks'
    `);
        output += JSON.stringify(cols.rows, null, 2) + '\n';

        output += '\n--- Inspecting Constraints: blocks ---\n';
        const consts = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'blocks'
    `);
        output += JSON.stringify(consts.rows, null, 2) + '\n';

        output += '\n--- Inspecting Triggers: blocks ---\n';
        const triggers = await pool.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'blocks'::regclass
    `);
        output += JSON.stringify(triggers.rows, null, 2) + '\n';

        fs.writeFileSync('blocks_info.txt', output);
        console.log('✅ Blocks info written to blocks_info.txt');

    } catch (err) {
        console.error('❌ Failed to inspect blocks:', err);
    } finally {
        await pool.end();
    }
}

inspectBlocks();
