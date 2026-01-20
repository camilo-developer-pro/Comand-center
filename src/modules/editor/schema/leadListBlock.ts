// src/modules/editor/schema/leadListBlock.ts
import { z } from 'zod'

// Schema for the block attributes (configuration ONLY, no data)
export const leadListBlockAttributesSchema = z.object({
    filterStatus: z.enum(['all', 'new', 'contacted', 'qualified', 'lost']).default('all'),
    limit: z.number().min(1).max(100).default(10),
})

export type LeadListBlockAttributes = z.infer<typeof leadListBlockAttributesSchema>

// Default configuration for new blocks
export const defaultLeadListBlockAttributes: LeadListBlockAttributes = {
    filterStatus: 'all',
    limit: 10,
}
