import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function deferConstraint() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('Making async_processing_errors_block_id_fkey deferrable...');

        // First drop the existing constraint
        await pool.query(`
      ALTER TABLE async_processing_errors 
      DROP CONSTRAINT IF EXISTS async_processing_errors_block_id_fkey
    `);

        // Re-add it as deferrable
        await pool.query(`
      ALTER TABLE async_processing_errors 
      ADD CONSTRAINT async_processing_errors_block_id_fkey 
      FOREIGN KEY (block_id) REFERENCES blocks(id) 
      ON DELETE CASCADE 
      DEFERRABLE INITIALLY DEFERRED
    `);

        console.log('✅ Constraint updated successfully');
    } catch (err) {
        console.error('❌ Failed to update constraint:', err.message);
    } finally {
        await pool.end();
    }
}

deferConstraint();
