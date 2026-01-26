import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkType() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const res = await pool.query(`
      SELECT udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'path'
    `);
        console.table(res.rows);
    } catch (err) {
        console.error('❌ Type check failed:', err.message);
    } finally {
        await pool.end();
    }
}

checkType();
