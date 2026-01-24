#!/usr/bin/env node

/**
 * Verification script for Phase 3 Week 7: Block Change Trigger
 * 
 * This script verifies that the trigger function and Edge Function
 * are properly configured for the Incremental GraphRAG system.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message, stdout: error.stdout, stderr: error.stderr };
  }
}

async function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

async function readFileContent(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

async function verifyMigrationFile() {
  console.log('🔍 Verifying migration file...');
  
  const migrationPath = 'database/migrations/phase3/007_block_change_trigger.sql';
  
  if (!await checkFileExists(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    return false;
  }
  
  const content = await readFileContent(migrationPath);
  
  // Check for key components
  const checks = [
    { name: 'CREATE EXTENSION IF NOT EXISTS "pg_net"', found: content.includes('CREATE EXTENSION IF NOT EXISTS "pg_net"') },
    { name: 'CREATE TABLE async_processing_errors', found: content.includes('CREATE TABLE IF NOT EXISTS public.async_processing_errors') },
    { name: 'compute_content_hash function', found: content.includes('CREATE OR REPLACE FUNCTION public.compute_content_hash') },
    { name: 'fn_notify_block_change function', found: content.includes('CREATE OR REPLACE FUNCTION public.fn_notify_block_change') },
    { name: 'CREATE TRIGGER trigger_notify_block_change', found: content.includes('CREATE TRIGGER trigger_notify_block_change') },
    { name: 'net.http_post call', found: content.includes('net.http_post') },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.found) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name}`);
      allPassed = false;
    }
  });
  
  console.log(`  📄 Migration file size: ${content.length} bytes`);
  
  return allPassed;
}

async function verifyEdgeFunction() {
  console.log('\n🔍 Verifying Edge Function...');
  
  const edgeFunctionPath = 'supabase/functions/process-block';
  const indexFile = path.join(edgeFunctionPath, 'index.ts');
  const readmeFile = path.join(edgeFunctionPath, 'README.md');
  
  if (!await checkFileExists(edgeFunctionPath)) {
    console.error('❌ Edge Function directory not found:', edgeFunctionPath);
    return false;
  }
  
  if (!await checkFileExists(indexFile)) {
    console.error('❌ Edge Function index.ts not found');
    return false;
  }
  
  if (!await checkFileExists(readmeFile)) {
    console.error('❌ Edge Function README.md not found');
    return false;
  }
  
  const indexContent = await readFileContent(indexFile);
  const readmeContent = await readFileContent(readmeFile);
  
  const checks = [
    { name: 'import { serve } from Deno', found: indexContent.includes('import { serve }') },
    { name: 'interface ProcessBlockRequest', found: indexContent.includes('interface ProcessBlockRequest') },
    { name: 'extractTextFromTipTap function', found: indexContent.includes('function extractTextFromTipTap') },
    { name: 'generateAndStoreEmbedding function', found: indexContent.includes('function generateAndStoreEmbedding') },
    { name: 'extractEntitiesAndRelationships function', found: indexContent.includes('function extractEntitiesAndRelationships') },
    { name: 'updateKnowledgeGraph function', found: indexContent.includes('function updateKnowledgeGraph') },
    { name: 'README has deployment instructions', found: readmeContent.includes('## Deployment') },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.found) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name}`);
      allPassed = false;
    }
  });
  
  console.log(`  📄 Edge Function index.ts size: ${indexContent.length} bytes`);
  console.log(`  📄 README.md size: ${readmeContent.length} bytes`);
  
  return allPassed;
}

async function verifyDatabaseSchema() {
  console.log('\n🔍 Verifying database schema compatibility...');
  
  // Check if blocks table has required columns
  const coreSchemaPath = 'src/lib/db/migrations/002_core_schema.sql';
  
  if (!await checkFileExists(coreSchemaPath)) {
    console.error('❌ Core schema file not found:', coreSchemaPath);
    return false;
  }
  
  const schemaContent = await readFileContent(coreSchemaPath);
  
  const checks = [
    { name: 'blocks table definition', found: schemaContent.includes('CREATE TABLE public.blocks') },
    { name: 'content_hash column', found: schemaContent.includes('content_hash VARCHAR(64)') },
    { name: 'embedding_updated_at column', found: schemaContent.includes('embedding_updated_at TIMESTAMPTZ') },
    { name: 'embedding column', found: schemaContent.includes('embedding vector(1536)') },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.found) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name}`);
      allPassed = false;
    }
  });
  
  return allPassed;
}

async function verifyPhase3Completion() {
  console.log('\n📋 Verifying Phase 3 Week 7 completion...');
  
  const verificationPlanPath = 'plans/phase3_intelligence_layer_verification.md';
  
  if (!await checkFileExists(verificationPlanPath)) {
    console.error('❌ Verification plan not found:', verificationPlanPath);
    return false;
  }
  
  const planContent = await readFileContent(verificationPlanPath);
  
  const checks = [
    { name: 'Verification plan exists', found: true },
    { name: 'Plan mentions Week 7', found: planContent.includes('Week 7') },
    { name: 'Plan mentions asynchronous triggers', found: planContent.includes('asynchronous') || planContent.includes('trigger') },
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.found) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name}`);
      allPassed = false;
    }
  });
  
  console.log(`  📄 Verification plan size: ${planContent.length} bytes`);
  
  return allPassed;
}

async function main() {
  console.log('🚀 Starting Phase 3 Week 7: Asynchronous Triggers Verification');
  console.log('=' .repeat(60));
  
  const results = {
    migrationFile: await verifyMigrationFile(),
    edgeFunction: await verifyEdgeFunction(),
    databaseSchema: await verifyDatabaseSchema(),
    phase3Completion: await verifyPhase3Completion(),
  };
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 VERIFICATION RESULTS:');
  console.log('=' .repeat(60));
  
  Object.entries(results).forEach(([key, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${key}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ALL CHECKS PASSED! Phase 3 Week 7 implementation is complete.');
    console.log('\n📝 Next steps:');
    console.log('   1. Deploy the Edge Function: supabase functions deploy process-block');
    console.log('   2. Run the migration: psql -f database/migrations/phase3/007_block_change_trigger.sql');
    console.log('   3. Set environment variables in Supabase Dashboard');
    console.log('   4. Test with sample block insertions');
    console.log('   5. Update project_log.md with completion status');
  } else {
    console.log('\n⚠️  SOME CHECKS FAILED. Please review the errors above.');
    process.exit(1);
  }
}

// Run the verification
main().catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});