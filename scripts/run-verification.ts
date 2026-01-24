import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function runVerification() {
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

  const verificationPath = path.join(
    __dirname,
    '..',
    'database',
    'migrations',
    'phase3',
    'verify_009_knowledge_graph.sql'
  );
  
  if (!fs.existsSync(verificationPath)) {
    throw new Error(`Verification file not found: ${verificationPath}`);
  }

  const sql = fs.readFileSync(verificationPath, 'utf-8');

  console.log('Running knowledge graph verification...');
  console.log('========================================');

  try {
    // Split the SQL into individual statements (DO blocks)
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Statement ${i + 1} failed:`, error.message);
        console.error('SQL:', statement.substring(0, 200) + '...');
        throw error;
      }
      
      console.log(`Statement ${i + 1} executed successfully`);
    }
    
    console.log('\n========================================');
    console.log('✅ Knowledge graph verification completed successfully!');
    console.log('All three upsert functions are verified and working correctly.');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

runVerification().catch(console.error);