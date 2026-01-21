// src/modules/editor/schema/index.ts
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'
import { LeadListBlock } from '../components/blocks/LeadListBlock'

// Extend the default schema with custom blocks
const safeBlockSpecs = {
    ...(defaultBlockSpecs || {}),
} as any

if (LeadListBlock) {
    safeBlockSpecs.leadList = LeadListBlock
}

export const customSchema = BlockNoteSchema.create({
    blockSpecs: safeBlockSpecs,
})

// Export the schema type for TypeScript
export type CustomSchema = typeof customSchema.blockSpecs
