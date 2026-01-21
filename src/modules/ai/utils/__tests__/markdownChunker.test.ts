/**
 * Test Suite for markdownChunker
 * 
 * Run with: npx tsx src/modules/ai/utils/__tests__/markdownChunker.test.ts
 */

import { chunkMarkdownByHeaders, getTotalChunkChars } from '../markdownChunker';
import type { DocumentChunk } from '../../types';

console.log('🧪 Testing markdownChunker...\n');

// ============================================================
// Test 1: Hierarchical Header Handling
// ============================================================
const md1 = `# Main
Intro

## Sub1
Content1

### Sub1.1
Deep content

## Sub2
Content2`;

const chunks1 = chunkMarkdownByHeaders(md1);

console.assert(chunks1.length === 4, `❌ Test 1: Expected 4 chunks, got ${chunks1.length}`);
console.assert(chunks1[0].headerPath.join('/') === 'Main', `❌ Test 1: Chunk 0 path incorrect: ${chunks1[0].headerPath.join('/')}`);
console.assert(chunks1[1].headerPath.join('/') === 'Main/Sub1', `❌ Test 1: Chunk 1 path incorrect: ${chunks1[1].headerPath.join('/')}`);
console.assert(chunks1[2].headerPath.join('/') === 'Main/Sub1/Sub1.1', `❌ Test 1: Chunk 2 path incorrect: ${chunks1[2].headerPath.join('/')}`);
console.assert(chunks1[3].headerPath.join('/') === 'Main/Sub2', `❌ Test 1: Chunk 3 path incorrect: ${chunks1[3].headerPath.join('/')}`);

console.log('✅ Test 1: Hierarchical header handling');

// ============================================================
// Test 2: Content before any headers
// ============================================================
const md2 = `Preamble text
More preamble

# First Header
Content`;

const chunks2 = chunkMarkdownByHeaders(md2);
console.assert(chunks2[0].headerPath.length === 0, '❌ Test 2: Preamble should have empty header path');
console.assert(chunks2[1].headerPath[0] === 'First Header', '❌ Test 2: Second chunk path incorrect');
console.log('✅ Test 2: Content before any headers');

// ============================================================
// Test 3: minChunkChars filtering
// ============================================================
const md3 = `# Header
Short`; // "Short" is 5 chars, default min is 10. But with header included, it might be more.
// If includeHeaderInContent is true (default), "# Header\nShort" is > 10 chars.

const chunks3 = chunkMarkdownByHeaders(md3, { minChunkChars: 20 });
console.assert(chunks3.length === 0, '❌ Test 3: Chunk should have been filtered out');

const chunks3b = chunkMarkdownByHeaders(md3, { minChunkChars: 5 });
console.assert(chunks3b.length === 1, '❌ Test 3b: Chunk should have been kept');
console.log('✅ Test 3: minChunkChars filtering');

// ============================================================
// Test 4: Oversized chunk splitting
// ============================================================
const md4 = `# Long Section
Paragraph 1 is here.

Paragraph 2 follows here.

Paragraph 3 is the final one.`;

// Each paragraph is roughly 25 chars. Total ~75.
const chunks4 = chunkMarkdownByHeaders(md4, { maxChunkChars: 40 });
// Should split into at least 2 chunks.
// Chunk 1: "# Long Section\nParagraph 1 is here." (~35 chars)
// Chunk 2: "Paragraph 2 follows here.\n\nParagraph 3 is the final one." (~50 chars) -> wait, 50 > 40, so it splits again.
// Expected 3 chunks.

console.assert(chunks4.length === 3, `❌ Test 4: Expected 3 chunks, got ${chunks4.length}`);
console.assert(chunks4[0].content.includes('Paragraph 1'), '❌ Test 4: Chunk 0 missing content');
console.assert(chunks4[1].content.includes('Paragraph 2'), '❌ Test 4: Chunk 1 missing content');
console.assert(chunks4[2].content.includes('Paragraph 3'), '❌ Test 4: Chunk 2 missing content');
console.assert(chunks4[1].chunkIndex === 1, '❌ Test 4: Re-indexing check failed');
console.log('✅ Test 4: Oversized chunk splitting');

// ============================================================
// Test 5: getTotalChunkChars utility
// ============================================================
const totalChars = getTotalChunkChars(chunks4);
const summedChars = chunks4.reduce((sum, c) => sum + c.charCount, 0);
console.assert(totalChars === summedChars, '❌ Test 5: Character count mismatch');
console.log('✅ Test 5: getTotalChunkChars utility');

console.log('\n🎉 All tests passed!');
