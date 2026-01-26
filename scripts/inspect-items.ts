import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectItems() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    let output = '';

    try {
        output += '--- Inspecting Table: items ---\n';
        const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'items'
    `);
        output += JSON.stringify(cols.rows, null, 2) + '\n';

        output += '\n--- Inspecting Constraints: items ---\n';
        const consts = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      WHERE conrelid = 'items'::regclass
    `);
        output += JSON.stringify(consts.rows, null, 2) + '\n';

        output += '\n--- Inspecting Triggers: items ---\n';
        const triggers = await pool.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'items'::regclass
    `);
        output += JSON.stringify(triggers.rows, null, 2) + '\n';

        fs.writeFileSync('items_info.txt', output);
        console.log('✅ Items info written to items_info.txt');

    } catch (err) {
        console.error('❌ Failed to inspect items:', err);
    } finally {
        await pool.end();
    }
}

inspectItems();
