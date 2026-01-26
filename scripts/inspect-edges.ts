import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectEdges() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    let output = '';

    try {
        output += '--- Inspecting Table: entity_edges ---\n';
        const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'entity_edges'
    `);
        output += JSON.stringify(cols.rows, null, 2) + '\n';

        output += '\n--- Inspecting Constraints: entity_edges ---\n';
        const consts = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      WHERE conrelid = 'entity_edges'::regclass
    `);
        output += JSON.stringify(consts.rows, null, 2) + '\n';

        fs.writeFileSync('edge_info.txt', output);
        console.log('✅ Edge info written to edge_info.txt');

    } catch (err) {
        console.error('❌ Failed to inspect edges:', err);
    } finally {
        await pool.end();
    }
}

inspectEdges();
