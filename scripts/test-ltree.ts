import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testLtree() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Testing conditional subpath behavior...');
        const cases = [
            "SELECT 'root.new'::ltree || CASE WHEN nlevel('root.a'::ltree) > 1 THEN subpath('root.a'::ltree, 1) ELSE ''::ltree END as s1",
            "SELECT 'root.new'::ltree || CASE WHEN nlevel('root.a'::ltree) > 2 THEN subpath('root.a'::ltree, 2) ELSE ''::ltree END as s2",
            "SELECT 'root.new.extra'::ltree || subpath('root.a.b'::ltree, 2) as s3"
        ];

        for (const sql of cases) {
            try {
                const res = await pool.query(sql);
                console.log(`${sql} =>`, res.rows[0]);
            } catch (e) {
                console.error(`${sql} => ERROR: ${e.message}`);
            }
        }

    } catch (err) {
        console.error('❌ Test failed:', err.message);
    } finally {
        await pool.end();
    }
}

testLtree();
