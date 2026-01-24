#!/usr/bin/env node

/**
 * Verification Script: V3.1 Phase 3 Week 8 Task 8.1
 * Edge Function Implementation Verification
 * 
 * This script verifies the `process-block` Edge Function implementation
 * by checking file structure, dependencies, and performing basic validation.
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const EDGE_FUNCTION_PATH = join(projectRoot, 'supabase', 'functions', 'process-block');
const REQUIRED_FILES = [
  'index.ts',
  'schemas.ts',
  'types.ts',
  'deno.json'
];

const REQUIRED_IMPORTS = [
  '@supabase/supabase-js',
  'zod'
];

const REQUIRED_FUNCTIONS = [
  'handler',
  'extractTextFromTipTap',
  'checkIdempotency',
  'createSuccessResponse',
  'createErrorResponse',
  'log'
];

const REQUIRED_SCHEMAS = [
  'ProcessBlockRequestSchema',
  'EntitySchema',
  'RelationshipSchema',
  'ClaudeEntityExtractionResponseSchema',
  'OpenAIEmbeddingResponseSchema',
  'KnowledgeGraphEdgeSchema',
  'IdempotencyRecordSchema'
];

const REQUIRED_TYPES = [
  'ProcessingOptions',
  'ProcessingError',
  'ProcessingStats',
  'TextExtractionResult',
  'EnvironmentConfig',
  'APIClientConfig',
  'OpenAIConfig',
  'AnthropicConfig',
  'SupabaseConfig',
  'EntityExtractionPrompt',
  'BatchProcessingConfig',
  'CacheConfig',
  'LoggingConfig',
  'HealthStatus',
  'PerformanceMetrics'
];

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(text) {
  console.log(`\n${colorize('cyan', '='.repeat(60))}`);
  console.log(`${colorize('cyan', text)}`);
  console.log(`${colorize('cyan', '='.repeat(60))}\n`);
}

function printSuccess(message) {
  console.log(`${colorize('green', '✓')} ${message}`);
}

function printWarning(message) {
  console.log(`${colorize('yellow', '⚠')} ${message}`);
}

function printError(message) {
  console.log(`${colorize('red', '✗')} ${message}`);
}

function printInfo(message) {
  console.log(`${colorize('blue', 'ℹ')} ${message}`);
}

function checkFileExists(filePath) {
  if (!existsSync(filePath)) {
    printError(`File not found: ${filePath}`);
    return false;
  }
  
  const stats = statSync(filePath);
  if (stats.size === 0) {
    printError(`File is empty: ${filePath}`);
    return false;
  }
  
  printSuccess(`File exists and is not empty: ${filePath}`);
  return true;
}

function checkFileContent(filePath, checks) {
  try {
    const content = readFileSync(filePath, 'utf8');
    
    for (const check of checks) {
      if (check.type === 'contains') {
        if (content.includes(check.value)) {
          printSuccess(`${check.description}: Found "${check.value}"`);
        } else {
          printError(`${check.description}: Missing "${check.value}"`);
          return false;
        }
      } else if (check.type === 'regex') {
        const regex = new RegExp(check.pattern, check.flags || '');
        if (regex.test(content)) {
          printSuccess(`${check.description}: Pattern matched`);
        } else {
          printError(`${check.description}: Pattern not found`);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    printError(`Error reading file ${filePath}: ${error.message}`);
    return false;
  }
}

function checkDenoConfig() {
  const denoJsonPath = join(EDGE_FUNCTION_PATH, 'deno.json');
  
  if (!checkFileExists(denoJsonPath)) {
    return false;
  }
  
  try {
    const content = readFileSync(denoJsonPath, 'utf8');
    const config = JSON.parse(content);
    
    // Check required imports
    if (config.imports) {
      for (const requiredImport of REQUIRED_IMPORTS) {
        if (config.imports[requiredImport]) {
          printSuccess(`Import found: ${requiredImport}`);
        } else {
          printError(`Import missing: ${requiredImport}`);
          return false;
        }
      }
    } else {
      printError('No imports section found in deno.json');
      return false;
    }
    
    // Check tasks
    if (config.tasks && config.tasks.dev) {
      printSuccess('Development task found in deno.json');
    } else {
      printWarning('No development task found in deno.json');
    }
    
    return true;
  } catch (error) {
    printError(`Error parsing deno.json: ${error.message}`);
    return false;
  }
}

function checkMainIndexFile() {
  const indexPath = join(EDGE_FUNCTION_PATH, 'index.ts');
  
  if (!checkFileExists(indexPath)) {
    return false;
  }
  
  const checks = [
    {
      type: 'contains',
      value: 'serve(async (req) => {',
      description: 'Deno serve function'
    },
    {
      type: 'contains',
      value: 'ProcessBlockRequestSchema.safeParse',
      description: 'Zod validation'
    },
    {
      type: 'contains',
      value: 'Promise.allSettled',
      description: 'Parallel processing'
    },
    {
      type: 'contains',
      value: 'claude-3-5-haiku',
      description: 'Claude integration'
    },
    {
      type: 'contains',
      value: 'embeddingModel',
      description: 'OpenAI embeddings configuration'
    },
    {
      type: 'contains',
      value: 'valid_to',
      description: 'Bi-temporal updates'
    },
    {
      type: 'contains',
      value: 'content_hash',
      description: 'Idempotency check'
    },
    {
      type: 'contains',
      value: 'function log(level: "debug" | "info" | "warn" | "error"',
      description: 'Structured logging function'
    }
  ];
  
  return checkFileContent(indexPath, checks);
}

function checkSchemasFile() {
  const schemasPath = join(EDGE_FUNCTION_PATH, 'schemas.ts');
  
  if (!checkFileExists(schemasPath)) {
    return false;
  }
  
  const checks = [
    {
      type: 'contains',
      value: 'import { z } from',
      description: 'Zod import'
    }
  ];
  
  // Add checks for each required schema
  for (const schema of REQUIRED_SCHEMAS) {
    checks.push({
      type: 'contains',
      value: `export const ${schema} =`,
      description: `${schema} schema definition`
    });
  }
  
  return checkFileContent(schemasPath, checks);
}

function checkTypesFile() {
  const typesPath = join(EDGE_FUNCTION_PATH, 'types.ts');
  
  if (!checkFileExists(typesPath)) {
    return false;
  }
  
  const checks = [
    {
      type: 'contains',
      value: 'export interface',
      description: 'TypeScript interfaces'
    },
    {
      type: 'contains',
      value: 'export type',
      description: 'TypeScript type aliases'
    }
  ];
  
  // Add checks for each required type - note that some are interfaces, some are types
  // We'll check for existence in the file rather than specific export pattern
  for (const type of REQUIRED_TYPES) {
    checks.push({
      type: 'contains',
      value: type,
      description: `${type} type/interface definition`
    });
  }
  
  return checkFileContent(typesPath, checks);
}

function checkEdgeFunctionStructure() {
  printHeader('Checking Edge Function Structure');
  
  let allChecksPassed = true;
  
  // Check if edge function directory exists
  if (!existsSync(EDGE_FUNCTION_PATH)) {
    printError(`Edge function directory not found: ${EDGE_FUNCTION_PATH}`);
    return false;
  }
  
  printSuccess(`Edge function directory found: ${EDGE_FUNCTION_PATH}`);
  
  // Check required files
  for (const file of REQUIRED_FILES) {
    const filePath = join(EDGE_FUNCTION_PATH, file);
    if (!checkFileExists(filePath)) {
      allChecksPassed = false;
    }
  }
  
  return allChecksPassed;
}

function checkCodeQuality() {
  printHeader('Checking Code Quality and Implementation');
  
  let allChecksPassed = true;
  
  // Check deno.json configuration
  if (!checkDenoConfig()) {
    allChecksPassed = false;
  }
  
  // Check main index.ts file
  if (!checkMainIndexFile()) {
    allChecksPassed = false;
  }
  
  // Check schemas.ts file
  if (!checkSchemasFile()) {
    allChecksPassed = false;
  }
  
  // Check types.ts file
  if (!checkTypesFile()) {
    allChecksPassed = false;
  }
  
  return allChecksPassed;
}

function checkIntegrationPoints() {
  printHeader('Checking Integration Points');
  
  let allChecksPassed = true;
  
  // Check for environment variable references
  const indexPath = join(EDGE_FUNCTION_PATH, 'index.ts');
  try {
    const content = readFileSync(indexPath, 'utf8');
    
    const envChecks = [
      { variable: 'ANTHROPIC_API_KEY', description: 'Claude API key' },
      { variable: 'OPENAI_API_KEY', description: 'OpenAI API key' },
      { variable: 'SUPABASE_URL', description: 'Supabase URL' },
      { variable: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Service role key' },
      { variable: 'LOG_LEVEL', description: 'Log level' }
    ];
    
    for (const check of envChecks) {
      if (content.includes(check.variable)) {
        printSuccess(`Environment variable reference found: ${check.variable} (${check.description})`);
      } else {
        printWarning(`Environment variable reference not found: ${check.variable} (${check.description})`);
      }
    }
    
    // Check for Supabase client initialization
    if (content.includes('createClient') && content.includes('supabaseUrl') && content.includes('supabaseServiceKey')) {
      printSuccess('Supabase client initialization found');
    } else if (content.includes('createClient')) {
      printSuccess('Supabase client initialization found (createClient)');
    } else {
      printError('Supabase client initialization not found');
      allChecksPassed = false;
    }
    
    // Check for error handling patterns
    const errorHandlingPatterns = [
      'try {',
      'catch (error)',
      'exponential backoff',
      'retry',
      'errorResponse'
    ];
    
    for (const pattern of errorHandlingPatterns) {
      if (content.includes(pattern)) {
        printSuccess(`Error handling pattern found: ${pattern}`);
      }
    }
    
  } catch (error) {
    printError(`Error checking integration points: ${error.message}`);
    allChecksPassed = false;
  }
  
  return allChecksPassed;
}

function checkDeploymentReadiness() {
  printHeader('Checking Deployment Readiness');
  
  let allChecksPassed = true;
  
  // Check for README or documentation
  const readmePath = join(EDGE_FUNCTION_PATH, 'README.md');
  if (existsSync(readmePath)) {
    printSuccess('Documentation found (README.md)');
  } else {
    printWarning('No documentation found (README.md)');
  }
  
  // Check for import_map.json (optional but recommended)
  const importMapPath = join(EDGE_FUNCTION_PATH, 'import_map.json');
  if (existsSync(importMapPath)) {
    printSuccess('Import map found (import_map.json)');
  } else {
    printInfo('No import map found (optional)');
  }
  
  // Check file sizes (ensure they're not too large)
  const indexPath = join(EDGE_FUNCTION_PATH, 'index.ts');
  try {
    const stats = statSync(indexPath);
    const fileSizeKB = Math.round(stats.size / 1024);
    
    if (fileSizeKB < 10) {
      printWarning(`Main file is very small (${fileSizeKB} KB) - might be incomplete`);
      allChecksPassed = false;
    } else if (fileSizeKB > 1000) {
      printWarning(`Main file is very large (${fileSizeKB} KB) - consider splitting`);
    } else if (fileSizeKB < 50) {
      printInfo(`Main file size is moderate (${fileSizeKB} KB) - typical for Edge Functions`);
    } else {
      printSuccess(`Main file size is reasonable (${fileSizeKB} KB)`);
    }
  } catch (error) {
    printError(`Error checking file size: ${error.message}`);
    allChecksPassed = false;
  }
  
  return allChecksPassed;
}

async function main() {
  printHeader('V3.1 Phase 3 Week 8 Task 8.1: Edge Function Verification');
  printInfo('Verifying process-block Edge Function implementation');
  printInfo(`Project Root: ${projectRoot}`);
  printInfo(`Edge Function Path: ${EDGE_FUNCTION_PATH}`);
  
  let overallStatus = true;
  
  // Run all checks
  if (!checkEdgeFunctionStructure()) {
    overallStatus = false;
  }
  
  if (!checkCodeQuality()) {
    overallStatus = false;
  }
  
  if (!checkIntegrationPoints()) {
    overallStatus = false;
  }
  
  if (!checkDeploymentReadiness()) {
    overallStatus = false;
  }
  
  // Summary
  printHeader('Verification Summary');
  
  if (overallStatus) {
    console.log(colorize('green', '✓ All checks passed!'));
    console.log(colorize('green', 'The Edge Function implementation is complete and ready for deployment.'));
    
    console.log('\n' + colorize('cyan', 'Next Steps:'));
    console.log('1. Deploy the Edge Function:');
    console.log('   supabase functions deploy process-block --project-ref your-project-ref');
    console.log('\n2. Configure environment variables in Supabase Dashboard:');
    console.log('   - ANTHROPIC_API_KEY');
    console.log('   - OPENAI_API_KEY');
    console.log('   - SUPABASE_URL');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY');
    console.log('   - LOG_LEVEL (optional, defaults to "info")');
    console.log('\n3. Test the integration with PostgreSQL triggers');
    console.log('   Insert a test block to verify the full pipeline');
    
    process.exit(0);
  } else {
    console.log(colorize('red', '✗ Some checks failed!'));
    console.log(colorize('yellow', 'Please review the errors above and fix the issues before deployment.'));
    process.exit(1);
  }
}

// Run the verification
main().catch(error => {
  console.error(colorize('red', `Unhandled error: ${error.message}`));
  console.error(error.stack);
  process.exit(1);
});