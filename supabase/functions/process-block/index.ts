import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Import schemas and types
import {
  ProcessBlockRequestSchema,
  ProcessingResultSchema,
  APIResponseSchema,
  ErrorResponseSchema,
  ClaudeEntityExtractionResponseSchema,
  OpenAIEmbeddingResponseSchema,
  KnowledgeGraphEdgeSchema,
  type ProcessBlockRequest,
  type ProcessingResult,
  type APIResponse,
  type Entity,
  type Relationship,
} from "./schemas.ts";

import {
  DEFAULT_PROCESSING_OPTIONS,
  DEFAULT_ENTITY_EXTRACTION_PROMPT,
  type ProcessingOptions,
  type ProcessingError,
  type ProcessingErrorType,
  type TextExtractionResult,
  type ProcessingStats,
} from "./types.ts";

// Enhanced logging utility
const LOG_LEVEL = ((globalThis as any).Deno?.env?.get("LOG_LEVEL") || "info") as "debug" | "info" | "warn" | "error";

function log(level: "debug" | "info" | "warn" | "error", message: string, data?: any) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[LOG_LEVEL];
  const messageLevel = levels[level];
  
  if (messageLevel >= currentLevel) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data: typeof data === "object" ? JSON.stringify(data) : data }),
    };
    
    if (level === "error") {
      console.error(JSON.stringify(logEntry));
    } else if (level === "warn") {
      console.warn(JSON.stringify(logEntry));
    } else if (level === "info") {
      console.info(JSON.stringify(logEntry));
    } else {
      console.debug(JSON.stringify(logEntry));
    }
  }
}

// Structured error creation
function createProcessingError(
  type: ProcessingErrorType,
  message: string,
  context?: Record<string, any>,
  retryable: boolean = true
): ProcessingError {
  return {
    type,
    message,
    context,
    retryable,
    timestamp: new Date().toISOString(),
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const CONFIG = {
  ...DEFAULT_PROCESSING_OPTIONS,
  // Environment-specific overrides
  maxRetries: parseInt(Deno.env.get("MAX_RETRIES") || "3"),
  timeoutMs: parseInt(Deno.env.get("TIMEOUT_MS") || "30000"),
  idempotencyWindowMs: parseInt(Deno.env.get("IDEMPOTENCY_WINDOW_MS") || "60000"),
} as ProcessingOptions;

// Serve the Edge Function
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const stats: ProcessingStats = {
    startTime,
    endTime: 0,
    entityExtractionTime: 0,
    embeddingGenerationTime: 0,
    graphUpdateTime: 0,
    totalTime: 0,
    tokensUsed: 0,
    apiCalls: 0,
    retries: 0,
  };

  let processingResult: ProcessingResult = {
    block_id: "",
    entities: [],
    relationships: [],
    embedding_generated: false,
    graph_updated: false,
    processing_time_ms: 0,
    content_hash: "",
  };

  try {
    // Parse and validate request with Zod
    const rawBody = await req.json();
    const validationResult = ProcessBlockRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    const body: ProcessBlockRequest = validationResult.data;
    const {
      block_id,
      document_id,
      workspace_id,
      content,
      type,
      content_hash,
      triggered_at,
      operation,
    } = body;

    processingResult.block_id = block_id;
    processingResult.content_hash = content_hash;

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Check idempotency (prevent duplicate processing)
    if (CONFIG.idempotencyEnabled) {
      const isDuplicate = await checkIdempotency(supabase, block_id, content_hash);
      if (isDuplicate) {
        console.log(`Block ${block_id} with hash ${content_hash} was already processed recently, skipping`);
        
        stats.endTime = Date.now();
        stats.totalTime = stats.endTime - stats.startTime;
        processingResult.processing_time_ms = stats.totalTime;
        
        return createSuccessResponse(
          processingResult,
          "Block already processed (idempotency check)",
          {
            text_length: 0,
            entity_count: 0,
            relationship_count: 0,
            operation,
            content_hash,
          }
        );
      }
    }

    // Step 2: Extract text content from TipTap JSON
    const textExtractionResult = extractTextFromTipTap(content);
    
    if (!textExtractionResult.hasText) {
      // No text content to process (might be an image, divider, etc.)
      console.log(`Block ${block_id} has no text content, skipping processing`);
      
      stats.endTime = Date.now();
      stats.totalTime = stats.endTime - stats.startTime;
      processingResult.processing_time_ms = stats.totalTime;
      
      return createSuccessResponse(
        processingResult,
        "No text content to process",
        {
          text_length: 0,
          entity_count: 0,
          relationship_count: 0,
          operation,
          content_hash,
        }
      );
    }

    const { text: textContent } = textExtractionResult;

    // Step 3: Parallel processing of entity extraction and embedding generation
    const [entityExtractionResult, embeddingResult] = await Promise.allSettled([
      CONFIG.entityExtractionEnabled 
        ? extractEntitiesWithClaude(textContent, workspace_id)
        : Promise.resolve({ entities: [], relationships: [] }),
      CONFIG.embeddingGenerationEnabled 
        ? generateEmbeddingWithOpenAI(textContent)
        : Promise.resolve(null),
    ]);

    // Handle entity extraction results
    let entities: Entity[] = [];
    let relationships: Relationship[] = [];
    
    if (entityExtractionResult.status === "fulfilled") {
      entities = entityExtractionResult.value.entities;
      relationships = entityExtractionResult.value.relationships;
      processingResult.entities = entities;
      processingResult.relationships = relationships;
    } else {
      console.error("Entity extraction failed:", entityExtractionResult.reason);
      // Continue without entities - don't fail the whole process
    }

    // Handle embedding generation results
    if (embeddingResult.status === "fulfilled" && embeddingResult.value) {
      const embeddingSuccess = await storeEmbedding(supabase, block_id, embeddingResult.value);
      processingResult.embedding_generated = embeddingSuccess;
    } else if (embeddingResult.status === "rejected") {
      console.error("Embedding generation failed:", embeddingResult.reason);
      processingResult.embedding_generated = false;
    }

    // Step 4: Update knowledge graph with bi-temporal support
    if (CONFIG.knowledgeGraphEnabled && (entities.length > 0 || relationships.length > 0)) {
      const graphUpdateStart = Date.now();
      const graphUpdated = await updateKnowledgeGraphWithBiTemporal(
        supabase,
        block_id,
        document_id,
        workspace_id,
        entities,
        relationships,
        textContent
      );
      processingResult.graph_updated = graphUpdated;
      stats.graphUpdateTime = Date.now() - graphUpdateStart;
    }

    // Step 5: Update block metadata and record idempotency
    await supabase
      .from("blocks")
      .update({
        embedding_updated_at: new Date().toISOString(),
        last_processed_at: new Date().toISOString(),
        content_hash: content_hash,
      })
      .eq("id", block_id);

    if (CONFIG.idempotencyEnabled) {
      await recordIdempotency(supabase, block_id, content_hash, "completed");
    }

    // Calculate final statistics
    stats.endTime = Date.now();
    stats.totalTime = stats.endTime - stats.startTime;
    processingResult.processing_time_ms = stats.totalTime;

    // Return success response
    return createSuccessResponse(
      processingResult,
      "Block processed successfully",
      {
        text_length: textContent.length,
        entity_count: entities.length,
        relationship_count: relationships.length,
        operation,
        content_hash,
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error("Function error:", error.message);
    console.error("Stack:", error.stack);

    stats.endTime = Date.now();
    stats.totalTime = stats.endTime - stats.startTime;
    processingResult.processing_time_ms = stats.totalTime;

    return createErrorResponse(
      processingResult,
      error.message,
      400
    );
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract text from TipTap JSON content with improved parsing
 */
function extractTextFromTipTap(content: any): TextExtractionResult {
  const result: TextExtractionResult = {
    text: "",
    length: 0,
    hasText: false,
    extractionMethod: "simple",
    warnings: [],
  };

  try {
    if (typeof content === "string") {
      result.text = content;
      result.extractionMethod = "simple";
    } else if (content?.type === "doc" && Array.isArray(content.content)) {
      result.text = extractTextFromNodes(content.content);
      result.extractionMethod = "tiptap";
    } else if (content?.content && Array.isArray(content.content)) {
      result.text = extractTextFromNodes(content.content);
      result.extractionMethod = "tiptap";
    } else {
      // Fallback: stringify and extract text
      const contentStr = JSON.stringify(content);
      const textMatches = contentStr.match(/"text"\s*:\s*"([^"]+)"/g);
      if (textMatches) {
        result.text = textMatches
          .map(match => match.replace(/"text"\s*:\s*"/, '').replace(/"$/, ''))
          .join(' ');
        result.extractionMethod = "fallback";
      }
    }

    result.text = result.text.trim();
    result.length = result.text.length;
    result.hasText = result.length > 0;

    if (result.extractionMethod === "fallback") {
      result.warnings.push("Used fallback text extraction method");
    }

  } catch (err) {
    console.error("Error extracting text from TipTap:", err);
    result.warnings.push(`Extraction error: ${err.message}`);
  }

  return result;
}

/**
 * Recursively extract text from TipTap nodes
 */
function extractTextFromNodes(nodes: any[]): string {
  let text = "";
  
  for (const node of nodes) {
    if (node.type === "text" && node.text) {
      text += node.text + " ";
    }
    
    if (node.content && Array.isArray(node.content)) {
      text += extractTextFromNodes(node.content);
    }
    
    if (node.children && Array.isArray(node.children)) {
      text += extractTextFromNodes(node.children);
    }
  }
  
  return text.trim();
}

/**
 * Extract entities and relationships using Claude 3.5 Haiku
 */
async function extractEntitiesWithClaude(
  text: string, 
  workspaceId: string
): Promise<{ entities: Entity[]; relationships: Relationship[] }> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    console.warn("ANTHROPIC_API_KEY not configured, skipping entity extraction");
    return { entities: [], relationships: [] };
  }

  const prompt = DEFAULT_ENTITY_EXTRACTION_PROMPT.user.replace("{text}", text);
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CONFIG.entityExtractionModel,
        max_tokens: 4000,
        temperature: 0.1,
        system: DEFAULT_ENTITY_EXTRACTION_PROMPT.system,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    
    const parsed = JSON.parse(jsonStr);
    const validationResult = ClaudeEntityExtractionResponseSchema.safeParse(parsed);
    
    if (!validationResult.success) {
      console.warn("Claude response validation failed:", validationResult.error.errors);
      return { entities: [], relationships: [] };
    }

    return {
      entities: validationResult.data.entities,
      relationships: validationResult.data.relationships,
    };

  } catch (err) {
    console.error("Error in extractEntitiesWithClaude:", err);
    // Return empty results instead of failing
    return { entities: [], relationships: [] };
  }
}

/**
 * Generate embedding using OpenAI with retry logic
 */
async function generateEmbeddingWithOpenAI(text: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CONFIG.embeddingModel,
          input: text.trim(),
          dimensions: CONFIG.embeddingDimensions,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const validationResult = OpenAIEmbeddingResponseSchema.safeParse(data);
      
      if (!validationResult.success) {
        throw new Error(`OpenAI response validation failed: ${validationResult.error.errors[0]?.message}`);
      }

      return validationResult.data.data[0].embedding;

    } catch (err) {
      lastError = err as Error;
      console.warn(`Embedding generation attempt ${attempt} failed:`, err);
      
      if (attempt < CONFIG.maxRetries) {
        // Exponential backoff
        const delay = CONFIG.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Embedding generation failed after all retries");
}

/**
 * Store embedding in the database
 */
async function storeEmbedding(
  supabase: any,
  blockId: string,
  embedding: number[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("blocks")
      .update({
        embedding: embedding,
        embedding_updated_at: new Date().toISOString(),
      })
      .eq("id", blockId);

    if (error) {
      console.error("Error storing embedding:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error in storeEmbedding:", err);
    return false;
  }
}

/**
 * Update knowledge graph with bi-temporal support using the new upsert functions
 */
async function updateKnowledgeGraphWithBiTemporal(
  supabase: any,
  blockId: string,
  documentId: string,
  workspaceId: string,
  entities: Entity[],
  relationships: Relationship[],
  context: string
): Promise<boolean> {
  try {
    // Check if knowledge_graph_edges table exists
    const { data: tableExists, error: checkError } = await supabase
      .rpc("table_exists", { table_name: "knowledge_graph_edges" });

    if (checkError || !tableExists) {
      console.warn("knowledge_graph_edges table does not exist, skipping graph update");
      return false;
    }

    const now = new Date().toISOString();
    
    // Update entities in semantic_memory.entities (keep existing logic for entities)
    for (const entity of entities) {
      const { error: entityError } = await supabase
        .rpc("upsert_entity", {
          p_workspace_id: workspaceId,
          p_name: entity.name,
          p_type: entity.type,
          p_description: context.substring(0, 500),
          p_metadata: {
            source_block_id: blockId,
            source_document_id: documentId,
            confidence: entity.confidence,
            extracted_at: now,
            extraction_method: "claude-3-5-haiku",
          },
        });

      if (entityError) {
        console.error("Error upserting entity:", entityError);
      }
    }

    // If no relationships, return early
    if (relationships.length === 0) {
      console.log("No relationships to process for block:", blockId);
      return true;
    }

    // Prepare edges for batch upsert using the new upsert_knowledge_graph_edges_batch function
    const edges = relationships.map(rel => ({
      source_entity: rel.source_entity,
      source_entity_type: "unknown", // We should extract this from entities if available
      relationship: rel.relationship_type,
      target_entity: rel.target_entity,
      target_entity_type: "unknown", // We should extract this from entities if available
      confidence: rel.confidence,
      metadata: {
        context: rel.context || context.substring(0, 200),
        source_document_id: documentId,
        extraction_method: "claude-3-5-haiku",
        extracted_at: now,
      },
      operation: "insert" as const,
    }));

    // Try to enhance entity types if we have entity information
    const entityMap = new Map(entities.map(e => [e.name, e.type]));
    edges.forEach(edge => {
      if (entityMap.has(edge.source_entity)) {
        edge.source_entity_type = entityMap.get(edge.source_entity)!.toLowerCase();
      }
      if (entityMap.has(edge.target_entity)) {
        edge.target_entity_type = entityMap.get(edge.target_entity)!.toLowerCase();
      }
    });

    // Use the new batch upsert function
    const { data: batchResult, error: batchError } = await supabase
      .rpc("upsert_knowledge_graph_edges_batch", {
        p_workspace_id: workspaceId,
        p_source_block_id: blockId,
        p_edges: edges,
      });

    if (batchError) {
      console.error("Error in batch upsert of knowledge graph edges:", batchError);
      
      // Fallback to individual upserts if batch fails
      console.log("Falling back to individual edge upserts...");
      let successCount = 0;
      
      for (const edge of edges) {
        try {
          const { data: singleResult, error: singleError } = await supabase
            .rpc("upsert_knowledge_graph_edge", {
              p_workspace_id: workspaceId,
              p_source_entity: edge.source_entity,
              p_source_entity_type: edge.source_entity_type,
              p_relationship: edge.relationship,
              p_target_entity: edge.target_entity,
              p_target_entity_type: edge.target_entity_type,
              p_source_block_id: blockId,
              p_confidence: edge.confidence,
              p_metadata: edge.metadata,
              p_valid_from: now,
            });

          if (singleError) {
            console.error("Error in individual edge upsert:", singleError);
          } else {
            successCount++;
          }
        } catch (singleErr) {
          console.error("Exception in individual edge upsert:", singleErr);
        }
      }
      
      console.log(`Fallback completed: ${successCount}/${edges.length} edges processed`);
      return successCount > 0;
    }

    // Check batch result
    if (batchResult && batchResult.success) {
      console.log(`Batch upsert successful: ${batchResult.inserted_count} inserted, ${batchResult.updated_count} updated, ${batchResult.invalidated_count} invalidated`);
      return true;
    } else {
      console.error("Batch upsert returned unsuccessful result:", batchResult);
      return false;
    }

  } catch (err) {
    console.error("Error in updateKnowledgeGraphWithBiTemporal:", err);
    return false;
  }
}

/**
 * Check if a block has already been processed (idempotency check)
 */
async function checkIdempotency(
  supabase: any,
  blockId: string,
  contentHash: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("idempotency_records")
      .select("*")
      .eq("block_id", blockId)
      .eq("content_hash", contentHash)
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (error) {
      console.error("Error checking idempotency:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error("Error in checkIdempotency:", err);
    return false;
  }
}

/**
 * Record that a block has been processed (idempotency tracking)
 */
async function recordIdempotency(
  supabase: any,
  blockId: string,
  contentHash: string,
  status: 'processing' | 'completed' | 'failed'
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONFIG.idempotencyWindowMs);
    
    const idempotencyKey = `${blockId}:${contentHash}:${now.getTime()}`;
    
    const record = {
      idempotency_key: idempotencyKey,
      block_id: blockId,
      content_hash: contentHash,
      processed_at: now.toISOString(),
      status: status,
      expires_at: expiresAt.toISOString(),
    };

    const { error } = await supabase
      .from("idempotency_records")
      .insert(record);

    if (error) {
      console.error("Error recording idempotency:", error);
    }
  } catch (err) {
    console.error("Error in recordIdempotency:", err);
  }
}

/**
 * Create a success response with proper formatting
 */
function createSuccessResponse(
  processingResult: ProcessingResult,
  message: string,
  metadata: {
    text_length: number;
    entity_count: number;
    relationship_count: number;
    operation: string;
    content_hash: string;
  }
): Response {
  const response: APIResponse = {
    success: true,
    message,
    data: processingResult,
    metadata: {
      text_length: metadata.text_length,
      entity_count: metadata.entity_count,
      relationship_count: metadata.relationship_count,
      operation: metadata.operation as 'INSERT' | 'UPDATE' | 'DELETE',
      content_hash: metadata.content_hash,
    },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

/**
 * Create an error response with proper formatting
 */
function createErrorResponse(
  processingResult: ProcessingResult,
  errorMessage: string,
  statusCode: number = 400
): Response {
  const response: ErrorResponse = {
    success: false,
    error: errorMessage,
    data: processingResult,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: statusCode,
  });
}