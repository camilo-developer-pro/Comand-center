import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectDefaults() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const res = await pool.query(`
      SELECT column_name, column_default
      FROM information_schema.columns
      WHERE table_name = 'blocks'
      AND column_name IN ('created_at', 'updated_at')
    `);
        console.table(res.rows);
        fs.writeFileSync('blocks_defaults.txt', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('❌ Failed to inspect blocks defaults:', err);
    } finally {
        await pool.end();
    }
}

inspectDefaults();
