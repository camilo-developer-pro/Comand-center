// Core type definitions for the process-block Edge Function
// Note: For Zod-based types, import from schemas.ts

// Environment variables configuration
export interface EnvironmentConfig {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

// Processing options for the Edge Function
export interface ProcessingOptions {
  // Entity extraction options
  entityExtractionEnabled: boolean;
  entityExtractionModel: 'claude-3-5-haiku' | 'claude-3-5-sonnet' | 'gpt-4';
  
  // Embedding generation options
  embeddingGenerationEnabled: boolean;
  embeddingModel: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  embeddingDimensions: number;
  
  // Knowledge graph options
  knowledgeGraphEnabled: boolean;
  biTemporalUpdates: boolean;
  
  // Performance options
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  
  // Idempotency options
  idempotencyEnabled: boolean;
  idempotencyWindowMs: number;
}

// Default processing options
export const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  entityExtractionEnabled: true,
  entityExtractionModel: 'claude-3-5-haiku',
  embeddingGenerationEnabled: true,
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  knowledgeGraphEnabled: true,
  biTemporalUpdates: true,
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  idempotencyEnabled: true,
  idempotencyWindowMs: 60000, // 1 minute
};

// API client configurations
export interface APIClientConfig {
  baseURL: string;
  headers: Record<string, string>;
  timeout: number;
}

// OpenAI client configuration
export interface OpenAIConfig extends APIClientConfig {
  apiKey: string;
  model: string;
  dimensions: number;
}

// Anthropic (Claude) client configuration
export interface AnthropicConfig extends APIClientConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// Supabase client configuration
export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
  headers?: Record<string, string>;
}

// Processing statistics
export interface ProcessingStats {
  startTime: number;
  endTime: number;
  entityExtractionTime: number;
  embeddingGenerationTime: number;
  graphUpdateTime: number;
  totalTime: number;
  tokensUsed: number;
  apiCalls: number;
  retries: number;
}

// Error types for the Edge Function
export enum ProcessingErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Structured error information
export interface ProcessingError {
  type: ProcessingErrorType;
  message: string;
  code?: string;
  status?: number;
  retryable: boolean;
  timestamp: string;
  context?: Record<string, any>;
}

// Idempotency tracking
export interface IdempotencyRecord {
  idempotencyKey: string;
  blockId: string;
  contentHash: string;
  processedAt: string;
  resultHash: string;
  status: 'processing' | 'completed' | 'failed';
  expiresAt: string;
}

// Text extraction result
export interface TextExtractionResult {
  text: string;
  length: number;
  hasText: boolean;
  extractionMethod: 'tiptap' | 'fallback' | 'simple';
  warnings: string[];
}

// Entity extraction prompt templates
export interface EntityExtractionPrompt {
  system: string;
  user: string;
  format: 'json' | 'text';
}

// Default entity extraction prompt
export const DEFAULT_ENTITY_EXTRACTION_PROMPT: EntityExtractionPrompt = {
  system: `You are an expert entity extraction system. Extract entities and relationships from the provided text.
  
  Rules:
  1. Extract only factual entities mentioned in the text
  2. Classify entities into appropriate types (PERSON, ORGANIZATION, PROJECT, CONCEPT, DATE, LOCATION, OTHER)
  3. Extract relationships between entities mentioned in the same context
  4. Provide confidence scores (0.0-1.0) based on certainty
  5. Include relevant context snippets for each entity/relationship
  6. Return valid JSON with the specified format
  
  Entity Types:
  - PERSON: Individual people, names, titles
  - ORGANIZATION: Companies, teams, departments
  - PROJECT: Projects, initiatives, campaigns
  - CONCEPT: Ideas, topics, themes, technologies
  - DATE: Dates, time periods, deadlines
  - LOCATION: Places, addresses, regions
  - OTHER: Anything that doesn't fit above categories`,
  
  user: `Extract entities and relationships from this text:
  
  "{text}"
  
  Return JSON with this exact structure:
  {
    "entities": [
      {
        "name": "entity name",
        "type": "ENTITY_TYPE",
        "confidence": 0.95,
        "context": "relevant context snippet"
      }
    ],
    "relationships": [
      {
        "source_entity": "source entity name",
        "target_entity": "target entity name",
        "relationship_type": "relationship description",
        "confidence": 0.85,
        "context": "relevant context snippet"
      }
    ]
  }`,
  
  format: 'json',
};

// Batch processing configuration
export interface BatchProcessingConfig {
  maxBatchSize: number;
  concurrency: number;
  delayBetweenBatches: number;
  timeoutPerBatch: number;
}

// Cache configuration for idempotency
export interface CacheConfig {
  ttlSeconds: number;
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

// Logging configuration
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  includeStackTrace: boolean;
  includeTimestamps: boolean;
}

// Health check status
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    openai: boolean;
    anthropic: boolean;
    memory: boolean;
  };
  timestamp: string;
  uptime: number;
}

// Performance metrics
export interface PerformanceMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  average: number;
  min: number;
  max: number;
  requests: number;
  errors: number;
  successRate: number;
}

// Export utility types
export type MaybePromise<T> = T | Promise<T>;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;