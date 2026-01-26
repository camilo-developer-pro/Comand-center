import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function searchFunctions() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const res = await pool.query(`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE prosrc ILIKE '%invalid positions%'
    `);
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Search failed:', err.message);
    } finally {
        await pool.end();
    }
}

searchFunctions();
