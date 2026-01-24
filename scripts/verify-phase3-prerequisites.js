#!/usr/bin/env node

/**
 * V3.1 Phase 3 Pre-Execution Checklist Verification
 * 
 * This script verifies all prerequisites before starting Phase 3:
 * 1. Confirm pg_net extension is enabled
 * 2. Confirm blocks table has required columns
 * 3. Confirm knowledge_graph_edges table exists
 * 4. Verify Supabase Edge Functions CLI
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let DATABASE_URL = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) {
    DATABASE_URL = match[1].trim();
  }
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

console.log('============================================================');
console.log('V3.1 Phase 3 Pre-Execution Checklist Verification');
console.log('============================================================\n');

async function verifyDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Verify pg_net extension
    console.log('1. Checking pg_net extension...');
    const pgNetResult = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'pg_net';
    `);
    
    if (pgNetResult.rows.length > 0) {
      console.log('✅ pg_net extension is enabled');
      console.log(`   Extension: ${pgNetResult.rows[0].extname}`);
      console.log(`   Version: ${pgNetResult.rows[0].extversion}`);
    } else {
      console.log('❌ pg_net extension is NOT enabled');
      console.log('   Run: CREATE EXTENSION IF NOT EXISTS pg_net;');
    }

    // 2. Verify blocks table columns
    console.log('\n2. Checking blocks table columns...');
    const blocksColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'blocks' 
        AND table_schema = 'public'
        AND column_name IN ('embedding', 'content_hash', 'embedding_updated_at');
    `);
    
    const requiredColumns = ['embedding', 'content_hash', 'embedding_updated_at'];
    const foundColumns = blocksColumnsResult.rows.map(row => row.column_name);
    
    for (const column of requiredColumns) {
      if (foundColumns.includes(column)) {
        const colInfo = blocksColumnsResult.rows.find(r => r.column_name === column);
        console.log(`✅ ${column}: ${colInfo.data_type} (nullable: ${colInfo.is_nullable})`);
      } else {
        console.log(`❌ ${column}: MISSING`);
      }
    }

    // 3. Verify knowledge_graph_edges table exists
    console.log('\n3. Checking knowledge_graph_edges table...');
    const kgTableResult = await client.query(`
      SELECT to_regclass('public.knowledge_graph_edges') as table_exists;
    `);
    
    if (kgTableResult.rows[0].table_exists) {
      console.log('✅ knowledge_graph_edges table exists');
      
      // Check table structure
      const kgColumnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'knowledge_graph_edges' 
          AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      console.log(`   Columns: ${kgColumnsResult.rows.map(r => r.column_name).join(', ')}`);
    } else {
      console.log('❌ knowledge_graph_edges table does NOT exist');
    }

    // 4. Check if trigger function exists
    console.log('\n4. Checking trigger function...');
    const triggerResult = await client.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname = 'fn_notify_block_change';
    `);
    
    if (triggerResult.rows.length > 0) {
      console.log('✅ fn_notify_block_change trigger function exists');
    } else {
      console.log('❌ fn_notify_block_change trigger function does NOT exist');
    }

    // 5. Check if trigger exists on blocks table
    console.log('\n5. Checking trigger on blocks table...');
    const triggerExistsResult = await client.query(`
      SELECT tgname, tgrelid::regclass as table_name
      FROM pg_trigger 
      WHERE tgrelid = 'public.blocks'::regclass 
        AND tgname = 'trg_notify_block_change';
    `);
    
    if (triggerExistsResult.rows.length > 0) {
      console.log('✅ trg_notify_block_change trigger exists on blocks table');
    } else {
      console.log('❌ trg_notify_block_change trigger does NOT exist on blocks table');
    }

  } catch (error) {
    console.error('❌ Database verification error:', error.message);
  } finally {
    await client.end();
  }
}

async function verifySupabaseCLI() {
  console.log('\n6. Checking Supabase Edge Functions CLI...');
  try {
    // Check if supabase CLI is installed
    const version = execSync('supabase --version', { encoding: 'utf8' }).trim();
    console.log(`✅ Supabase CLI installed: ${version}`);
    
    // Check if we can list functions (requires login)
    try {
      const functions = execSync('supabase functions list', { encoding: 'utf8' });
      console.log('✅ Supabase CLI is logged in and can list functions');
    } catch (funcError) {
      console.log('⚠️  Supabase CLI not logged in. Run: supabase login');
      console.log('   Then set SUPABASE_ACCESS_TOKEN environment variable');
    }
  } catch (error) {
    console.log('❌ Supabase CLI not found or not working');
    console.log('   Install with: npm install -g supabase');
  }
}

async function verifyEdgeFunction() {
  console.log('\n7. Checking Edge Function implementation...');
  const edgeFunctionPath = path.join(__dirname, '..', 'supabase', 'functions', 'process-block');
  
  if (fs.existsSync(edgeFunctionPath)) {
    console.log('✅ Edge Function directory exists');
    
    const files = [
      'index.ts',
      'schemas.ts',
      'types.ts',
      'deno.json'
    ];
    
    for (const file of files) {
      const filePath = path.join(edgeFunctionPath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${Math.round(stats.size / 1024)} KB)`);
      } else {
        console.log(`   ❌ ${file} missing`);
      }
    }
  } else {
    console.log('❌ Edge Function directory does not exist');
  }
}

async function main() {
  console.log('Verifying Phase 3 prerequisites...\n');
  
  await verifyDatabase();
  await verifySupabaseCLI();
  await verifyEdgeFunction();
  
  console.log('\n============================================================');
  console.log('Verification Complete');
  console.log('============================================================');
  console.log('\nNext Steps:');
  console.log('1. Ensure all database prerequisites are met (fix any ❌ items)');
  console.log('2. Login to Supabase: supabase login');
  console.log('3. Deploy Edge Function: supabase functions deploy process-block');
  console.log('4. Configure environment variables in Supabase Dashboard');
  console.log('5. Test the integration with a sample block insert');
}

main().catch(console.error);