import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ==================== CORE SCHEMAS ====================

/**
 * Request schema for the process-block Edge Function
 */
export const ProcessBlockRequestSchema = z.object({
  block_id: z.string().uuid(),
  document_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  content: z.any(), // TipTap JSON content
  type: z.enum(['paragraph', 'heading', 'codeBlock', 'listItem', 'image', 'divider', 'entity']),
  content_hash: z.string().min(1),
  triggered_at: z.string().datetime(),
  operation: z.enum(['INSERT', 'UPDATE', 'DELETE']),
});

export type ProcessBlockRequest = z.infer<typeof ProcessBlockRequestSchema>;

/**
 * Processing result schema
 */
export const ProcessingResultSchema = z.object({
  block_id: z.string().uuid(),
  entities: z.array(z.any()).default([]),
  relationships: z.array(z.any()).default([]),
  embedding_generated: z.boolean().default(false),
  graph_updated: z.boolean().default(false),
  processing_time_ms: z.number().nonnegative(),
  content_hash: z.string(),
});

export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;

/**
 * API response schema
 */
export const APIResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: ProcessingResultSchema,
  metadata: z.object({
    text_length: z.number().nonnegative(),
    entity_count: z.number().nonnegative(),
    relationship_count: z.number().nonnegative(),
    operation: z.enum(['INSERT', 'UPDATE', 'DELETE']),
    content_hash: z.string(),
  }),
  timestamp: z.string().datetime(),
});

export type APIResponse = z.infer<typeof APIResponseSchema>;

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  data: ProcessingResultSchema.optional(),
  timestamp: z.string().datetime(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ==================== ENTITY SCHEMAS ====================

/**
 * Entity schema for extracted entities
 */
export const EntitySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['PERSON', 'ORGANIZATION', 'PROJECT', 'CONCEPT', 'DATE', 'LOCATION', 'OTHER']),
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
});

export type Entity = z.infer<typeof EntitySchema>;

/**
 * Relationship schema for extracted relationships
 */
export const RelationshipSchema = z.object({
  source_entity: z.string().min(1),
  target_entity: z.string().min(1),
  relationship_type: z.string().min(1),
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
});

export type Relationship = z.infer<typeof RelationshipSchema>;

/**
 * Claude entity extraction response schema
 */
export const ClaudeEntityExtractionResponseSchema = z.object({
  entities: z.array(EntitySchema),
  relationships: z.array(RelationshipSchema),
});

export type ClaudeEntityExtractionResponse = z.infer<typeof ClaudeEntityExtractionResponseSchema>;

// ==================== EMBEDDING SCHEMAS ====================

/**
 * OpenAI embedding response schema
 */
export const OpenAIEmbeddingResponseSchema = z.object({
  object: z.literal('list'),
  data: z.array(
    z.object({
      object: z.literal('embedding'),
      embedding: z.array(z.number()),
      index: z.number(),
    })
  ),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

export type OpenAIEmbeddingResponse = z.infer<typeof OpenAIEmbeddingResponseSchema>;

// ==================== KNOWLEDGE GRAPH SCHEMAS ====================

/**
 * Knowledge graph edge schema
 */
export const KnowledgeGraphEdgeSchema = z.object({
  id: z.string().uuid().optional(),
  source_entity_name: z.string(),
  target_entity_name: z.string(),
  relationship_type: z.string(),
  workspace_id: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
  source_block_id: z.string().uuid(),
  source_document_id: z.string().uuid(),
  valid_from: z.string().datetime(),
  valid_to: z.string().datetime().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type KnowledgeGraphEdge = z.infer<typeof KnowledgeGraphEdgeSchema>;

/**
 * Entity upsert schema
 */
export const EntityUpsertSchema = z.object({
  p_workspace_id: z.string().uuid(),
  p_name: z.string(),
  p_type: z.string(),
  p_description: z.string().optional(),
  p_metadata: z.any().optional(),
});

// ==================== IDEMPOTENCY SCHEMAS ====================

/**
 * Idempotency record schema
 */
export const IdempotencyRecordSchema = z.object({
  idempotency_key: z.string(),
  block_id: z.string().uuid(),
  content_hash: z.string(),
  processed_at: z.string().datetime(),
  result_hash: z.string().optional(),
  status: z.enum(['processing', 'completed', 'failed']),
  expires_at: z.string().datetime(),
});

export type IdempotencyRecord = z.infer<typeof IdempotencyRecordSchema>;

// ==================== UTILITY SCHEMAS ====================

/**
 * Health check schema
 */
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  checks: z.object({
    database: z.boolean(),
    openai: z.boolean(),
    anthropic: z.boolean(),
    memory: z.boolean(),
  }),
  timestamp: z.string().datetime(),
  uptime: z.number(),
});

/**
 * Performance metrics schema
 */
export const PerformanceMetricsSchema = z.object({
  p50: z.number(),
  p90: z.number(),
  p95: z.number(),
  p99: z.number(),
  average: z.number(),
  min: z.number(),
  max: z.number(),
  requests: z.number(),
  errors: z.number(),
  successRate: z.number(),
});

// ==================== EXPORTS ====================

export {
  ProcessBlockRequestSchema,
  ProcessingResultSchema,
  APIResponseSchema,
  ErrorResponseSchema,
  EntitySchema,
  RelationshipSchema,
  ClaudeEntityExtractionResponseSchema,
  OpenAIEmbeddingResponseSchema,
  KnowledgeGraphEdgeSchema,
  IdempotencyRecordSchema,
  HealthCheckSchema,
  PerformanceMetricsSchema,
};

export type {
  ProcessBlockRequest,
  ProcessingResult,
  APIResponse,
  ErrorResponse,
  Entity,
  Relationship,
  ClaudeEntityExtractionResponse,
  OpenAIEmbeddingResponse,
  KnowledgeGraphEdge,
  IdempotencyRecord,
};
