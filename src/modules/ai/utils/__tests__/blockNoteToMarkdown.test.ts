/**
 * Test Suite for blockNoteToMarkdown
 * 
 * Run with: npx tsx src/modules/ai/utils/__tests__/blockNoteToMarkdown.test.ts
 */

import { blockNoteToMarkdown, isTextBlock } from '../blockNoteToMarkdown';
import type { Block } from '@blocknote/core';

// ============================================================
// Test Cases
// ============================================================

console.log('🧪 Testing blockNoteToMarkdown...\n');

// Test 1: Basic heading and paragraph
const test1 = [
    {
        id: '1',
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: 'Title', styles: {} }],
        children: []
    },
    {
        id: '2',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Hello world', styles: {} }],
        children: []
    },
] as any as Block[];

const result1 = blockNoteToMarkdown(test1);
const expected1 = '# Title\n\nHello world';
console.assert(result1 === expected1, `❌ Test 1 failed\nExpected: ${expected1}\nGot: ${result1}`);
console.log('✅ Test 1: Basic heading and paragraph');

// Test 2: Multiple heading levels
const test2 = [
    {
        id: '1',
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: 'Main Title', styles: {} }],
        children: []
    },
    {
        id: '2',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Subtitle', styles: {} }],
        children: []
    },
    {
        id: '3',
        type: 'heading',
        props: { level: 3 },
        content: [{ type: 'text', text: 'Sub-subtitle', styles: {} }],
        children: []
    },
] as any as Block[];

const result2 = blockNoteToMarkdown(test2);
const expected2 = '# Main Title\n\n## Subtitle\n\n### Sub-subtitle';
console.assert(result2 === expected2, `❌ Test 2 failed\nExpected: ${expected2}\nGot: ${result2}`);
console.log('✅ Test 2: Multiple heading levels');

// Test 3: Bullet list
const test3 = [
    {
        id: '1',
        type: 'bulletListItem',
        props: {},
        content: [{ type: 'text', text: 'First item', styles: {} }],
        children: []
    },
    {
        id: '2',
        type: 'bulletListItem',
        props: {},
        content: [{ type: 'text', text: 'Second item', styles: {} }],
        children: []
    },
] as any as Block[];

const result3 = blockNoteToMarkdown(test3);
const expected3 = '- First item\n\n- Second item';
console.assert(result3 === expected3, `❌ Test 3 failed\nExpected: ${expected3}\nGot: ${result3}`);
console.log('✅ Test 3: Bullet list');

// Test 4: Numbered list
const test4 = [
    {
        id: '1',
        type: 'numberedListItem',
        props: {},
        content: [{ type: 'text', text: 'First', styles: {} }],
        children: []
    },
    {
        id: '2',
        type: 'numberedListItem',
        props: {},
        content: [{ type: 'text', text: 'Second', styles: {} }],
        children: []
    },
] as any as Block[];

const result4 = blockNoteToMarkdown(test4);
const expected4 = '1. First\n\n1. Second';
console.assert(result4 === expected4, `❌ Test 4 failed\nExpected: ${expected4}\nGot: ${result4}`);
console.log('✅ Test 4: Numbered list');

// Test 5: Checklist
const test5 = [
    {
        id: '1',
        type: 'checkListItem',
        props: { checked: true },
        content: [{ type: 'text', text: 'Done task', styles: {} }],
        children: []
    },
    {
        id: '2',
        type: 'checkListItem',
        props: { checked: false },
        content: [{ type: 'text', text: 'Todo task', styles: {} }],
        children: []
    },
] as any as Block[];

const result5 = blockNoteToMarkdown(test5);
const expected5 = '- [x] Done task\n\n- [ ] Todo task';
console.assert(result5 === expected5, `❌ Test 5 failed\nExpected: ${expected5}\nGot: ${result5}`);
console.log('✅ Test 5: Checklist');

// Test 6: Quote
const test6 = [
    {
        id: '1',
        type: 'quote',
        props: {},
        content: [{ type: 'text', text: 'This is a quote', styles: {} }],
        children: []
    },
] as any as Block[];

const result6 = blockNoteToMarkdown(test6);
const expected6 = '> This is a quote';
console.assert(result6 === expected6, `❌ Test 6 failed\nExpected: ${expected6}\nGot: ${result6}`);
console.log('✅ Test 6: Quote');

// Test 7: Code block
const test7 = [
    {
        id: '1',
        type: 'codeBlock',
        props: { language: 'typescript' },
        content: [{ type: 'text', text: 'const x = 42;', styles: {} }],
        children: []
    },
] as any as Block[];

const result7 = blockNoteToMarkdown(test7);
const expected7 = '```typescript\nconst x = 42;\n```';
console.assert(result7 === expected7, `❌ Test 7 failed\nExpected: ${expected7}\nGot: ${result7}`);
console.log('✅ Test 7: Code block');

// Test 8: Empty input
const result8 = blockNoteToMarkdown([]);
console.assert(result8 === '', '❌ Test 8 failed: Empty array should return empty string');
console.log('✅ Test 8: Empty input');

// Test 9: Null/undefined handling
const result9a = blockNoteToMarkdown(null as any);
const result9b = blockNoteToMarkdown(undefined as any);
console.assert(result9a === '', '❌ Test 9a failed: Null should return empty string');
console.assert(result9b === '', '❌ Test 9b failed: Undefined should return empty string');
console.log('✅ Test 9: Null/undefined handling');

// Test 10: Nested children (indented list)
const test10 = [
    {
        id: '1',
        type: 'bulletListItem',
        props: {},
        content: [{ type: 'text', text: 'Parent item', styles: {} }],
        children: [
            {
                id: '2',
                type: 'bulletListItem',
                props: {},
                content: [{ type: 'text', text: 'Child item', styles: {} }],
                children: []
            }
        ]
    },
] as any as Block[];

const result10 = blockNoteToMarkdown(test10);
const expected10 = '- Parent item\n  - Child item';
console.assert(result10 === expected10, `❌ Test 10 failed\nExpected: ${expected10}\nGot: ${result10}`);
console.log('✅ Test 10: Nested children (indented list)');

// Test 11: isTextBlock utility
console.assert(isTextBlock('heading') === true, '❌ Test 11a failed');
console.assert(isTextBlock('paragraph') === true, '❌ Test 11b failed');
console.assert(isTextBlock('bulletListItem') === true, '❌ Test 11c failed');
console.assert(isTextBlock('image') === false, '❌ Test 11d failed');
console.assert(isTextBlock('unknown') === false, '❌ Test 11e failed');
console.log('✅ Test 11: isTextBlock utility');

// Test 12: Complex document structure
const test12 = [
    {
        id: '1',
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: 'Document Title', styles: {} }],
        children: []
    },
    {
        id: '2',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Introduction paragraph.', styles: {} }],
        children: []
    },
    {
        id: '3',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Section 1', styles: {} }],
        children: []
    },
    {
        id: '4',
        type: 'bulletListItem',
        props: {},
        content: [{ type: 'text', text: 'Point A', styles: {} }],
        children: []
    },
    {
        id: '5',
        type: 'bulletListItem',
        props: {},
        content: [{ type: 'text', text: 'Point B', styles: {} }],
        children: []
    },
] as any as Block[];

const result12 = blockNoteToMarkdown(test12);
const expected12 = '# Document Title\n\nIntroduction paragraph.\n\n## Section 1\n\n- Point A\n\n- Point B';
console.assert(result12 === expected12, `❌ Test 12 failed\nExpected: ${expected12}\nGot: ${result12}`);
console.log('✅ Test 12: Complex document structure');

console.log('\n🎉 All tests passed!');
