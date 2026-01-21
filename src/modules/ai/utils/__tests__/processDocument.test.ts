/**
 * Test Suite for processDocument
 * 
 * Run with: npx tsx src/modules/ai/utils/__tests__/processDocument.test.ts
 */

import { processDocument, prepareChunksForStorage, enrichChunkContent } from '../processDocument';
import type { Block } from '@blocknote/core';

console.log('🧪 Testing processDocument orchestration...\n');

// ============================================================
// Test 1: Full Pipeline
// ============================================================
const testJson = [
    {
        id: '1',
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: 'Test Title', styles: {} }],
        children: []
    },
    {
        id: '2',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Some interesting content here about AI.', styles: {} }],
        children: []
    },
] as any as Block[];

const result = processDocument('doc-123', 'ws-456', testJson);

console.assert(result.chunks.length === 1, `❌ Test 1: Expected 1 chunk, got ${result.chunks.length}`);
console.assert(result.workspaceId === 'ws-456', '❌ Test 1: WorkspaceId mismatch');
console.assert(result.documentId === 'doc-123', '❌ Test 1: DocumentId mismatch');
console.assert(result.totalChars > 0, '❌ Test 1: totalChars should be > 0');
console.log('✅ Test 1: Full pipeline execution');

// ============================================================
// Test 2: Empty/Null content
// ============================================================
const resultEmpty = processDocument('doc-123', 'ws-456', []);
console.assert(resultEmpty.chunks.length === 0, '❌ Test 2: Should return 0 chunks for empty array');
console.assert(resultEmpty.markdown === '', '❌ Test 2: Markdown should be empty');

const resultNull = processDocument('doc-123', 'ws-456', null);
console.assert(resultNull.chunks.length === 0, '❌ Test 2b: Should return 0 chunks for null');
console.log('✅ Test 2: Empty/Null content handling');

// ============================================================
// Test 3: Validation Errors
// ============================================================
try {
    processDocument('', 'ws-456', []);
    console.error('❌ Test 3 failed: Should have thrown for missing documentId');
} catch (e) {
    console.log('✅ Test 3a: Throws for missing documentId');
}

try {
    processDocument('doc-123', '', []);
    console.error('❌ Test 3b failed: Should have thrown for missing workspaceId');
} catch (e) {
    console.log('✅ Test 3b: Throws for missing workspaceId');
}

try {
    processDocument('doc-123', 'ws-456', { not: 'an array' });
    console.error('❌ Test 3c failed: Should have thrown for invalid JSON structure');
} catch (e) {
    console.log('✅ Test 3c: Throws for invalid BlockNote JSON');
}

// ============================================================
// Test 4: prepareChunksForStorage
// ============================================================
const storageChunks = prepareChunksForStorage(result);
console.assert(storageChunks.length === 1, '❌ Test 4: Storage chunk count mismatch');
console.assert(storageChunks[0].document_id === 'doc-123', '❌ Test 4: document_id mismatch');
console.assert(storageChunks[0].metadata.char_count === result.chunks[0].charCount, '❌ Test 4: metadata mismatch');
console.log('✅ Test 4: prepareChunksForStorage mapping');

// ============================================================
// Test 5: enrichChunkContent
// ============================================================
const enriched = enrichChunkContent(result.chunks[0], 'Project Alpha');
console.assert(enriched.includes('Document: Project Alpha'), '❌ Test 5: Missing document title prefix');
console.assert(enriched.includes('Section: Test Title'), '❌ Test 5: Missing section prefix');
console.assert(enriched.includes('Some interesting content'), '❌ Test 5: Missing original content');
console.log('✅ Test 5: enrichChunkContent prefixing');

console.log('\n🎉 Orchestration tests passed!');
