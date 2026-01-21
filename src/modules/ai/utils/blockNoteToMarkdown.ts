/**
 * BlockNote to Markdown Converter
 * 
 * V2.0 Phase 2: Intelligent Editor
 * 
 * Converts BlockNote JSON tree to Markdown string.
 * Preserves heading structure for downstream header-aware chunking.
 */

import type { Block } from '@blocknote/core';
import type { BlockNoteJSON, TextBlockType, HeadingLevel } from '../types';

// ============================================================
// Inline Content Extraction
// ============================================================

/**
 * Extracts plain text from BlockNote inline content array.
 * Handles text, links, and styled text.
 */
function extractInlineText(content: Block['content']): string {
    if (!content || !Array.isArray(content)) {
        return '';
    }

    return content
        .map((item) => {
            if (typeof item === 'object' && item !== null) {
                // Handle text nodes
                if ('text' in item && typeof item.text === 'string') {
                    return item.text;
                }
                // Handle link nodes (they have href and content)
                if ('content' in item && Array.isArray(item.content)) {
                    return extractInlineText(item.content as Block['content']);
                }
            }
            return '';
        })
        .join('');
}

// ============================================================
// Block Type Converters
// ============================================================

/**
 * Converts a heading block to Markdown
 */
function convertHeading(block: Block): string {
    const level = (block.props as { level?: HeadingLevel })?.level ?? 1;
    const text = extractInlineText(block.content);
    const prefix = '#'.repeat(level);
    return `${prefix} ${text}`;
}

/**
 * Converts a paragraph block to Markdown
 */
function convertParagraph(block: Block): string {
    return extractInlineText(block.content);
}

/**
 * Converts a bullet list item to Markdown
 */
function convertBulletListItem(block: Block): string {
    const text = extractInlineText(block.content);
    return `- ${text}`;
}

/**
 * Converts a numbered list item to Markdown
 * Note: We use "1." for all items; Markdown renderers auto-number
 */
function convertNumberedListItem(block: Block): string {
    const text = extractInlineText(block.content);
    return `1. ${text}`;
}

/**
 * Converts a checklist item to Markdown (GitHub flavored)
 */
function convertCheckListItem(block: Block): string {
    const text = extractInlineText(block.content);
    const checked = (block.props as { checked?: boolean })?.checked ?? false;
    return `- [${checked ? 'x' : ' '}] ${text}`;
}

/**
 * Converts a quote block to Markdown
 */
function convertQuote(block: Block): string {
    const text = extractInlineText(block.content);
    return `> ${text}`;
}

/**
 * Converts a code block to Markdown
 */
function convertCodeBlock(block: Block): string {
    const text = extractInlineText(block.content);
    const language = (block.props as { language?: string })?.language ?? '';
    return `\`\`\`${language}\n${text}\n\`\`\``;
}

// ============================================================
// Main Converter
// ============================================================

/**
 * Block type to converter function mapping
 */
const BLOCK_CONVERTERS: Record<string, (block: Block) => string> = {
    heading: convertHeading,
    paragraph: convertParagraph,
    bulletListItem: convertBulletListItem,
    numberedListItem: convertNumberedListItem,
    checkListItem: convertCheckListItem,
    quote: convertQuote,
    codeBlock: convertCodeBlock,
};

/**
 * Converts a single block to Markdown, recursively processing children
 */
function convertBlock(block: Block, depth: number = 0): string {
    const lines: string[] = [];

    // Get converter for this block type
    const converter = BLOCK_CONVERTERS[block.type];

    if (converter) {
        const converted = converter(block);
        if (converted.trim()) {
            // Add indentation for nested list items
            const indent = depth > 0 && block.type.includes('ListItem')
                ? '  '.repeat(depth)
                : '';
            lines.push(indent + converted);
        }
    }

    // Process children recursively
    if (block.children && Array.isArray(block.children) && block.children.length > 0) {
        for (const child of block.children) {
            const childMarkdown = convertBlock(child as Block, depth + 1);
            if (childMarkdown) {
                lines.push(childMarkdown);
            }
        }
    }

    return lines.join('\n');
}

/**
 * Main export: Converts BlockNote JSON to Markdown string.
 * 
 * @param blocks - The BlockNote JSON content (Block[])
 * @returns Markdown string with preserved heading structure
 * 
 * @example
 * const markdown = blockNoteToMarkdown(document.content);
 * // Returns: "# Title\n\nParagraph text\n\n## Section\n\nMore text"
 */
export function blockNoteToMarkdown(blocks: BlockNoteJSON): string {
    if (!blocks || !Array.isArray(blocks)) {
        return '';
    }

    const markdownParts: string[] = [];

    for (const block of blocks) {
        const converted = convertBlock(block);
        if (converted.trim()) {
            markdownParts.push(converted);
        }
    }

    // Join with double newlines for proper Markdown paragraph separation
    return markdownParts.join('\n\n');
}

/**
 * Utility to check if a block type contains text content
 */
export function isTextBlock(blockType: string): blockType is TextBlockType {
    return blockType in BLOCK_CONVERTERS;
}
