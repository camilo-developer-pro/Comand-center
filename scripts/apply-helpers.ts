import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function applyHelpers() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const sql = fs.readFileSync('database/migrations/phase4/006_launch_verification_helpers.sql', 'utf8');
        await pool.query(sql);
        console.log('✅ Helpers created successfully');
    } catch (err) {
        console.error('❌ Failed to create helpers:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyHelpers();
