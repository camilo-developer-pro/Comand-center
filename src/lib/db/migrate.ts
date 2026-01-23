import { promises as fs } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

async function runMigrations() {
  console.log('Running database migrations...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get list of migration files
    const migrationsDir = join(process.cwd(), 'database', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();

    // Get already executed migrations
    const executedResult = await pool.query('SELECT name FROM migrations');
    const executedNames = new Set(executedResult.rows.map((row: any) => row.name));

    // Run pending migrations
    for (const file of sqlFiles) {
      if (!executedNames.has(file)) {
        console.log(`Running migration: ${file}`);
        const filePath = join(migrationsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Execute the entire file as one query
        await pool.query(content);

        // Record migration as executed
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);

        console.log(`✅ Migration ${file} completed`);
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();