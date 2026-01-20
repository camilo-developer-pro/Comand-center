// src/modules/editor/schema/index.ts
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { LeadListBlock } from '../components/blocks/LeadListBlock'

// Extend the default schema with custom blocks
export const customSchema = BlockNoteSchema.create({
    blockSpecs: {
        // Include all default blocks
        ...defaultBlockSpecs,
        // Add custom blocks
        leadList: LeadListBlock,
    } as any,
})

// Export the schema type for TypeScript
export type CustomSchema = typeof customSchema.blockSpecs
