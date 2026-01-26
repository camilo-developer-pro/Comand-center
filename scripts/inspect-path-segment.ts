import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function inspectFunc() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const result = await pool.query(`
      SELECT p.proname, p.prosrc
      FROM pg_proc p
      WHERE p.proname = 'generate_path_segment'
    `);

        if (result.rows.length > 0) {
            console.log('--- Function: generate_path_segment ---');
            console.log(result.rows[0].prosrc);
            fs.writeFileSync('path_segment_func.txt', result.rows[0].prosrc);
        } else {
            console.log('Function not found');
        }

    } catch (err) {
        console.error('❌ Failed to inspect function:', err);
    } finally {
        await pool.end();
    }
}

inspectFunc();
