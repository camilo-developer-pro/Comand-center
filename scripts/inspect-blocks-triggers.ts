import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectBlocksTriggers() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const result = await pool.query(`
      SELECT p.proname, p.prosrc
      FROM pg_proc p
      JOIN pg_trigger t ON p.oid = t.tgfoid
      WHERE t.tgrelid = 'blocks'::regclass
    `);

        let output = '';
        for (const row of result.rows) {
            output += `--- Function: ${row.proname} ---\n${row.prosrc}\n\n`;
        }

        fs.writeFileSync('blocks_trigger_source.txt', output);
        console.log('✅ Blocks trigger source written to blocks_trigger_source.txt');

    } catch (err) {
        console.error('❌ Failed to inspect blocks triggers:', err);
    } finally {
        await pool.end();
    }
}

inspectBlocksTriggers();
