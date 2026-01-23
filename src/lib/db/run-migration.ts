import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const migrationPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'database',
    'migrations',
    'phase1',
    '001_extensions.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Running extension migration...');

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration completed successfully');
  console.log('Installed extensions:', data);
}

runMigration().catch(console.error);