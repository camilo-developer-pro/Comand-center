import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function applyMigration() {
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
        const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
        console.log('Connecting to:', masked);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const migrationPath = path.join(process.cwd(), 'database', 'migrations', 'phase4', '004_move_document_atomic.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        console.log('Applying move_document_atomic RPC...');
        await pool.query(sql);
        console.log('✅ RPC move_document_atomic created successfully');
    } catch (err) {
        console.error('❌ Failed to apply migration:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyMigration();
