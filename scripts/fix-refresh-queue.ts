import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Adding unique constraint to mv_refresh_queue...');
        await pool.query(`
      ALTER TABLE mv_refresh_queue 
      ADD CONSTRAINT mv_refresh_queue_view_workspace_unique 
      UNIQUE (view_name, workspace_id)
    `);
        console.log('✅ Unique constraint added successfully');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('✅ Constraint already exists');
        } else {
            console.error('❌ Failed to fix schema:', err.message);
        }
    } finally {
        await pool.end();
    }
}

fixSchema();
