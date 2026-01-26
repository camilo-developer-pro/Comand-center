import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectTriggers() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const result = await pool.query(`
      SELECT p.proname, p.prosrc
      FROM pg_proc p
      JOIN pg_trigger t ON p.oid = t.tgfoid
      WHERE t.tgrelid = 'documents'::regclass
    `);

        let output = '';
        for (const row of result.rows) {
            output += `--- Function: ${row.proname} ---\n${row.prosrc}\n\n`;
        }

        fs.writeFileSync('trigger_source.txt', output);
        console.log('✅ Trigger source written to trigger_source.txt');

    } catch (err) {
        console.error('❌ Failed to inspect triggers:', err);
    } finally {
        await pool.end();
    }
}

inspectTriggers();
