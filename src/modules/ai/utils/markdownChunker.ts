/**
 * Header-Aware Markdown Chunker
 * 
 * V2.0 Phase 2: Intelligent Editor
 * 
 * Splits Markdown by headers while preserving the hierarchical
 * breadcrumb path for each chunk. This enables semantic search
 * with full context awareness.
 */

import type { DocumentChunk, HeadingLevel } from '../types';

// ============================================================
// Header Detection
// ============================================================

/**
 * Regex to match Markdown headers (# to ###)
 * Captures: level (number of #), text (header content)
 */
const HEADER_REGEX = /^(#{1,3})\s+(.+)$/;

/**
 * Parses a line to check if it's a header
 */
interface ParsedHeader {
    level: HeadingLevel;
    text: string;
}

function parseHeader(line: string): ParsedHeader | null {
    const match = line.match(HEADER_REGEX);
    if (!match) return null;

    const level = match[1].length as HeadingLevel;
    const text = match[2].trim();

    return { level, text };
}

// ============================================================
// Header Path Stack Management
// ============================================================

/**
 * Manages the hierarchical header path stack.
 * When a new header is encountered, it pops headers of equal or lower level
 * and pushes the new header.
 */
class HeaderStack {
    private stack: Array<{ level: HeadingLevel; text: string }> = [];

    /**
     * Updates the stack with a new header.
     * Returns the new path array.
     */
    push(header: ParsedHeader): string[] {
        // Pop all headers of equal or greater level (less important)
        while (
            this.stack.length > 0 &&
            this.stack[this.stack.length - 1].level >= header.level
        ) {
            this.stack.pop();
        }

        // Push the new header
        this.stack.push(header);

        return this.getPath();
    }

    /**
     * Returns current header path as string array
     */
    getPath(): string[] {
        return this.stack.map((h) => h.text);
    }

    /**
     * Returns the current heading level (or null if no headers)
     */
    getCurrentLevel(): HeadingLevel | null {
        if (this.stack.length === 0) return null;
        return this.stack[this.stack.length - 1].level;
    }
}

// ============================================================
// Content Accumulator
// ============================================================

/**
 * Accumulates content lines and creates a chunk when flushed
 */
class ChunkAccumulator {
    private lines: string[] = [];
    private headerPath: string[] = [];
    private headingLevel: HeadingLevel | null = null;
    private chunkIndex: number = 0;
    private chunks: DocumentChunk[] = [];

    setContext(headerPath: string[], headingLevel: HeadingLevel | null): void {
        this.headerPath = [...headerPath];
        this.headingLevel = headingLevel;
    }

    addLine(line: string): void {
        this.lines.push(line);
    }

    hasContent(): boolean {
        return this.lines.some((line) => line.trim().length > 0);
    }

    flush(): void {
        if (!this.hasContent()) {
            this.lines = [];
            return;
        }

        const content = this.lines
            .join('\n')
            .trim();

        const chunk: DocumentChunk = {
            chunkIndex: this.chunkIndex++,
            content,
            headerPath: this.headerPath,
            headingLevel: this.headingLevel,
            charCount: content.length,
        };

        this.chunks.push(chunk);
        this.lines = [];
    }

    getChunks(): DocumentChunk[] {
        return this.chunks;
    }

    getTotalChars(): number {
        return this.chunks.reduce((sum, c) => sum + c.charCount, 0);
    }
}

// ============================================================
// Main Chunker
// ============================================================

/**
 * Configuration options for the chunker
 */
export interface ChunkerOptions {
    /**
     * Minimum characters for a chunk to be included.
     * Prevents empty or trivial chunks.
     * Default: 10
     */
    minChunkChars?: number;

    /**
     * Maximum characters per chunk.
     * Longer sections will be split at paragraph boundaries.
     * Default: 2000
     */
    maxChunkChars?: number;

    /**
     * Whether to include the header text in the chunk content.
     * Default: true
     */
    includeHeaderInContent?: boolean;
}

const DEFAULT_OPTIONS: Required<ChunkerOptions> = {
    minChunkChars: 10,
    maxChunkChars: 2000,
    includeHeaderInContent: true,
};

/**
 * Main export: Splits Markdown by headers into semantic chunks.
 * 
 * @param markdown - The Markdown string to chunk
 * @param options - Configuration options
 * @returns Array of DocumentChunk with headerPath metadata
 * 
 * @example
 * const chunks = chunkMarkdownByHeaders(`
 * # Project
 * Introduction text
 * 
 * ## Budget
 * Budget details here
 * `);
 * // Returns:
 * // [
 * //   { chunkIndex: 0, content: "# Project\nIntroduction text", headerPath: ["Project"], ... },
 * //   { chunkIndex: 1, content: "## Budget\nBudget details here", headerPath: ["Project", "Budget"], ... }
 * // ]
 */
export function chunkMarkdownByHeaders(
    markdown: string,
    options: ChunkerOptions = {}
): DocumentChunk[] {
    const opts = {
        minChunkChars: options.minChunkChars ?? DEFAULT_OPTIONS.minChunkChars,
        maxChunkChars: options.maxChunkChars ?? DEFAULT_OPTIONS.maxChunkChars,
        includeHeaderInContent: options.includeHeaderInContent ?? DEFAULT_OPTIONS.includeHeaderInContent,
    };

    if (!markdown || typeof markdown !== 'string') {
        return [];
    }

    const lines = markdown.split('\n');
    const headerStack = new HeaderStack();
    const accumulator = new ChunkAccumulator();

    // Initialize context for content before any headers
    accumulator.setContext([], null);

    for (const line of lines) {
        const header = parseHeader(line);

        if (header) {
            // Flush previous chunk before starting new section
            accumulator.flush();

            // Update header stack and get new path
            const newPath = headerStack.push(header);

            // Set context for new chunk
            accumulator.setContext(newPath, header.level);

            // Optionally include header in content
            if (opts.includeHeaderInContent) {
                accumulator.addLine(line);
            }
        } else {
            // Regular content line
            accumulator.addLine(line);
        }
    }

    // Flush final chunk
    accumulator.flush();

    // Filter by minimum size
    let chunks = accumulator.getChunks()
        .filter((c) => c.charCount >= opts.minChunkChars);

    // Handle oversized chunks by splitting at paragraphs
    chunks = chunks.flatMap((chunk) =>
        splitOversizedChunk(chunk, opts.maxChunkChars)
    );

    // Re-index after splitting
    return chunks.map((chunk, index) => ({
        ...chunk,
        chunkIndex: index,
    }));
}

/**
 * Splits a chunk that exceeds maxChunkChars at paragraph boundaries
 */
function splitOversizedChunk(
    chunk: DocumentChunk,
    maxChars: number
): DocumentChunk[] {
    if (chunk.charCount <= maxChars) {
        return [chunk];
    }

    const paragraphs = chunk.content.split(/\n\n+/);
    const result: DocumentChunk[] = [];
    let currentContent = '';
    let subIndex = 0;

    for (const para of paragraphs) {
        if (currentContent.length + para.length > maxChars && currentContent.length > 0) {
            // Flush current accumulation
            result.push({
                ...chunk,
                chunkIndex: chunk.chunkIndex + subIndex * 0.01,
                content: currentContent.trim(),
                charCount: currentContent.trim().length,
            });
            currentContent = '';
            subIndex++;
        }
        currentContent += (currentContent ? '\n\n' : '') + para;
    }

    // Flush remaining
    if (currentContent.trim()) {
        result.push({
            ...chunk,
            chunkIndex: chunk.chunkIndex + subIndex * 0.01,
            content: currentContent.trim(),
            charCount: currentContent.trim().length,
        });
    }

    return result;
}

/**
 * Utility: Get total character count from chunks
 */
export function getTotalChunkChars(chunks: DocumentChunk[]): number {
    return chunks.reduce((sum, c) => sum + c.charCount, 0);
}
