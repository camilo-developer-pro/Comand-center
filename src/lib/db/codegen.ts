import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
}

console.log('Generating Kysely types from database schema...');

try {
    execSync(
        `kysely-codegen --url "${databaseUrl}" --out-file src/lib/db/generated-types.ts --dialect postgres`,
        { stdio: 'inherit' }
    );
    console.log('Types generated successfully!');
} catch (error) {
    console.error('Failed to generate types:', error);
    process.exit(1);
}
