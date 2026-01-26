import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    let output = '';

    try {
        output += '--- Inspecting Table: documents ---\n';
        const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documents'
    `);
        output += JSON.stringify(cols.rows, null, 2) + '\n';

        output += '\n--- Inspecting Constraints: documents ---\n';
        const consts = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'documents'::regclass
    `);
        output += JSON.stringify(consts.rows, null, 2) + '\n';

        output += '\n--- Inspecting Triggers: documents ---\n';
        const triggers = await pool.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgrelid = 'documents'::regclass
    `);
        output += JSON.stringify(triggers.rows, null, 2) + '\n';

        fs.writeFileSync('schema_info.txt', output);
        console.log('✅ Schema info written to schema_info.txt');

    } catch (err) {
        console.error('❌ Failed to inspect schema:', err);
    } finally {
        await pool.end();
    }
}

inspectSchema();
