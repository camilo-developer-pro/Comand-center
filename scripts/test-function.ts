import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testFunction() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Testing extract_mentions_from_content({})...');
        const res = await pool.query("SELECT * FROM extract_mentions_from_content('{}'::jsonb)");
        console.log('Result:', res.rows);
    } catch (err) {
        console.error('❌ Function failed:', err.message);
    } finally {
        await pool.end();
    }
}

testFunction();
