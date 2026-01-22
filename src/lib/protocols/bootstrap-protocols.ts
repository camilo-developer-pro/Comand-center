/**
 * Bootstrap Protocols
 * Command Center V3.0 - Core system protocols for the Agent Runtime
 * 
 * These protocols define the foundational behaviors for:
 * - Document ingestion and entity extraction
 * - Query resolution using hybrid search
 * - Error handling and recovery
 */

import type { ProtocolDefinition } from './protocol-schema';

/**
 * INGESTION PROTOCOL
 * Purpose: Process new documents/data and extract entities for the knowledge graph
 */
export const INGESTION_PROTOCOL: ProtocolDefinition = {
    metadata: {
        name: 'IngestionProtocol',
        version: '1.0.0',
        intent: 'Process incoming documents, extract entities, and update the knowledge graph',
        tags: ['system', 'ingestion', 'knowledge-graph'],
        requires_approval: false
    },

    scaffold: {
        inputs: [
            {
                name: 'document_id',
                type: 'string',
                required: true,
                validation: { pattern: '^[0-9a-f-]{36}$' }
            },
            {
                name: 'document_content',
                type: 'string',
                required: true,
                validation: { min: 1, max: 100000 }
            },
            {
                name: 'document_metadata',
                type: 'object',
                required: false,
                default: {}
            },
            {
                name: 'extraction_depth',
                type: 'string',
                required: false,
                default: 'standard',
                validation: { enum: ['shallow', 'standard', 'deep'] }
            }
        ],
        context_sources: [
            {
                source_type: 'database',
                query: 'SELECT entity_type, description FROM semantic_memory.entity_types WHERE is_active = true',
                output_key: 'known_entity_types',
                max_tokens: 1000
            },
            {
                source_type: 'hybrid_search',
                query: '{{document_content | truncate: 500}}',
                params: { limit: 10 },
                output_key: 'related_entities',
                max_tokens: 2000
            }
        ],
        max_context_tokens: 6000
    },

    steps: [
        {
            id: 'analyze_document',
            type: 'llm_call',
            config: {
                model: 'gpt-4o',
                temperature: 0.3,
                max_tokens: 2000,
                system_prompt: `You are an entity extraction specialist. Your task is to analyze documents and identify:
1. Named entities (people, organizations, locations, products)
2. Concepts and topics
3. Relationships between entities

Output valid JSON only. No explanations.`,
                user_prompt_template: `Analyze this document and extract entities.

KNOWN ENTITY TYPES:
{{scaffold.known_entity_types}}

RELATED EXISTING ENTITIES (for reference/linking):
{{scaffold.related_entities}}

DOCUMENT TO ANALYZE:
{{inputs.document_content}}

Extract entities in this JSON format:
{
  "entities": [
    {
      "name": "entity name",
      "type": "entity_type",
      "description": "brief description",
      "confidence": 0.0-1.0,
      "source_spans": ["text excerpt where found"]
    }
  ],
  "relationships": [
    {
      "source": "entity name",
      "target": "entity name", 
      "type": "relationship_type",
      "confidence": 0.0-1.0
    }
  ],
  "document_summary": "2-3 sentence summary"
}`,
                output_schema: {
                    type: 'object',
                    required: ['entities', 'relationships', 'document_summary'],
                    properties: {
                        entities: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['name', 'type', 'confidence'],
                                properties: {
                                    name: { type: 'string' },
                                    type: { type: 'string' },
                                    description: { type: 'string' },
                                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                                    source_spans: { type: 'array', items: { type: 'string' } }
                                }
                            }
                        },
                        relationships: { type: 'array' },
                        document_summary: { type: 'string' }
                    }
                }
            },
            timeout_seconds: 120,
            retry: { max_attempts: 3, backoff_ms: 2000 }
        },
        {
            id: 'resolve_entities',
            type: 'tool_execution',
            config: {
                tool_name: 'entity_resolver',
                tool_params: {
                    entities: '{{steps.analyze_document.output.entities}}',
                    workspace_id: '{{context.workspace_id}}',
                    matching_threshold: 0.85
                }
            },
            timeout_seconds: 60
        },
        {
            id: 'validate_extraction',
            type: 'conditional',
            config: {
                condition: '{{steps.analyze_document.output.entities.length}} > 0',
                if_true: 'persist_entities',
                if_false: 'handle_empty_extraction'
            }
        },
        {
            id: 'handle_empty_extraction',
            type: 'llm_call',
            config: {
                model: 'gpt-4o-mini',
                temperature: 0.5,
                system_prompt: 'You are a helpful assistant that explains extraction results.',
                user_prompt_template: `No entities were extracted from the document. Generate a brief explanation and suggest whether the document should be:
1. Re-processed with different parameters
2. Marked as non-extractable
3. Manually reviewed

Document preview: {{inputs.document_content | truncate: 200}}

Respond in JSON: { "recommendation": "reprocess|skip|review", "reason": "explanation" }`
            },
            timeout_seconds: 30
        },
        {
            id: 'persist_entities',
            type: 'tool_execution',
            config: {
                tool_name: 'entity_persister',
                tool_params: {
                    resolved_entities: '{{steps.resolve_entities.output}}',
                    relationships: '{{steps.analyze_document.output.relationships}}',
                    document_id: '{{inputs.document_id}}',
                    workspace_id: '{{context.workspace_id}}'
                }
            },
            timeout_seconds: 60
        },
        {
            id: 'generate_embeddings',
            type: 'tool_execution',
            config: {
                tool_name: 'embedding_generator',
                tool_params: {
                    entity_ids: '{{steps.persist_entities.output.created_entity_ids}}',
                    model: 'text-embedding-3-small'
                }
            },
            timeout_seconds: 120
        },
        {
            id: 'finalize',
            type: 'llm_call',
            config: {
                model: 'gpt-4o-mini',
                temperature: 0,
                max_tokens: 500,
                system_prompt: 'Generate a brief summary of the ingestion results.',
                user_prompt_template: `Ingestion completed. Summarize:
- Entities created: {{steps.persist_entities.output.created_count}}
- Entities merged: {{steps.persist_entities.output.merged_count}}
- Relationships created: {{steps.persist_entities.output.relationship_count}}

Generate a 1-2 sentence summary for the user.`
            }
        }
    ],

    transitions: {
        analyze_document: 'resolve_entities',
        resolve_entities: 'validate_extraction',
        validate_extraction: 'persist_entities',
        handle_empty_extraction: 'END',
        persist_entities: 'generate_embeddings',
        generate_embeddings: 'finalize',
        finalize: 'END'
    },

    error_handling: {
        global_fallback: 'handle_empty_extraction',
        retry_policy: {
            max_retries: 3,
            backoff_type: 'exponential',
            base_delay_ms: 1000
        },
        notification: {
            on_failure: true,
            channels: ['webhook']
        }
    }
};

/**
 * RESOLUTION PROTOCOL
 * Purpose: Answer user queries using hybrid search and reasoning
 */
export const RESOLUTION_PROTOCOL: ProtocolDefinition = {
    metadata: {
        name: 'ResolutionProtocol',
        version: '1.0.0',
        intent: 'Answer user questions using knowledge graph and semantic search',
        tags: ['system', 'query', 'reasoning'],
        requires_approval: false
    },

    scaffold: {
        inputs: [
            {
                name: 'user_query',
                type: 'string',
                required: true,
                validation: { min: 1, max: 2000 }
            },
            {
                name: 'conversation_history',
                type: 'array',
                required: false,
                default: []
            },
            {
                name: 'response_format',
                type: 'string',
                required: false,
                default: 'detailed',
                validation: { enum: ['concise', 'detailed', 'structured'] }
            }
        ],
        context_sources: [
            {
                source_type: 'hybrid_search',
                query: '{{inputs.user_query}}',
                params: {
                    vector_limit: 20,
                    graph_depth: 2,
                    rrf_k: 60,
                    final_limit: 15
                },
                output_key: 'search_results',
                max_tokens: 4000
            }
        ],
        max_context_tokens: 8000
    },

    steps: [
        {
            id: 'analyze_query',
            type: 'llm_call',
            config: {
                model: 'gpt-4o-mini',
                temperature: 0.2,
                max_tokens: 500,
                system_prompt: 'Analyze user queries to determine intent and required information.',
                user_prompt_template: `Analyze this query and determine:
1. Primary intent (question, request, command)
2. Key entities/topics mentioned
3. Required information type (factual, analytical, creative)
4. Complexity level (simple, moderate, complex)

Query: {{inputs.user_query}}
Conversation context: {{inputs.conversation_history | last: 3}}

Respond in JSON: { "intent": "", "entities": [], "info_type": "", "complexity": "" }`
            }
        },
        {
            id: 'check_context_sufficiency',
            type: 'conditional',
            config: {
                condition: '{{scaffold.search_results.length}} >= 3',
                if_true: 'generate_response',
                if_false: 'expand_search'
            }
        },
        {
            id: 'expand_search',
            type: 'tool_execution',
            config: {
                tool_name: 'expanded_search',
                tool_params: {
                    query: '{{inputs.user_query}}',
                    strategy: 'relaxed_threshold',
                    additional_hops: 1
                }
            },
            timeout_seconds: 30
        },
        {
            id: 'generate_response',
            type: 'llm_call',
            config: {
                model: 'gpt-4o',
                temperature: 0.7,
                max_tokens: 2000,
                system_prompt: `You are a knowledgeable assistant with access to a curated knowledge base. 
Answer questions accurately based on the provided context.
If information is insufficient, clearly state what you know and what you don't.
Always cite your sources by referencing entity names.`,
                user_prompt_template: `KNOWLEDGE CONTEXT:
{{scaffold.search_results | format: 'numbered_list'}}

QUERY ANALYSIS:
{{steps.analyze_query.output}}

USER QUESTION:
{{inputs.user_query}}

RESPONSE FORMAT: {{inputs.response_format}}

Provide a helpful, accurate response based on the knowledge context above.`
            },
            retry: { max_attempts: 2, backoff_ms: 1000 }
        },
        {
            id: 'validate_response',
            type: 'llm_call',
            config: {
                model: 'gpt-4o-mini',
                temperature: 0,
                max_tokens: 300,
                system_prompt: 'Validate responses for accuracy and completeness.',
                user_prompt_template: `Validate this response:

Original query: {{inputs.user_query}}
Generated response: {{steps.generate_response.output}}
Available context: {{scaffold.search_results | length}} sources

Check:
1. Does it answer the question?
2. Is it grounded in the provided context?
3. Are there any hallucinations?

Respond: { "valid": true/false, "issues": [], "confidence": 0.0-1.0 }`
            }
        }
    ],

    transitions: {
        analyze_query: 'check_context_sufficiency',
        check_context_sufficiency: 'generate_response',
        expand_search: 'generate_response',
        generate_response: 'validate_response',
        validate_response: 'END'
    },

    error_handling: {
        retry_policy: {
            max_retries: 2,
            backoff_type: 'linear',
            base_delay_ms: 500
        }
    }
};

/**
 * ERROR HANDLING PROTOCOL
 * Purpose: Handle and recover from errors in other protocols
 */
export const ERROR_HANDLING_PROTOCOL: ProtocolDefinition = {
    metadata: {
        name: 'ErrorHandlingProtocol',
        version: '1.0.0',
        intent: 'Handle errors gracefully and attempt recovery',
        tags: ['system', 'error', 'recovery'],
        requires_approval: false
    },

    scaffold: {
        inputs: [
            {
                name: 'error_type',
                type: 'string',
                required: true
            },
            {
                name: 'error_message',
                type: 'string',
                required: true
            },
            {
                name: 'failed_step',
                type: 'string',
                required: true
            },
            {
                name: 'execution_context',
                type: 'object',
                required: true
            },
            {
                name: 'retry_count',
                type: 'number',
                required: false,
                default: 0
            }
        ],
        context_sources: [],
        max_context_tokens: 2000
    },

    steps: [
        {
            id: 'classify_error',
            type: 'llm_call',
            config: {
                model: 'gpt-4o-mini',
                temperature: 0,
                max_tokens: 300,
                system_prompt: 'Classify errors and determine recovery strategy.',
                user_prompt_template: `Classify this error:

Type: {{inputs.error_type}}
Message: {{inputs.error_message}}
Failed Step: {{inputs.failed_step}}
Retry Count: {{inputs.retry_count}}

Categories:
- transient: Temporary failure, retry may succeed
- configuration: Config/setup issue, needs manual fix
- data: Bad input data, skip or transform
- resource: Rate limit/quota, wait and retry
- fatal: Unrecoverable, abort and notify

Respond: { "category": "", "recoverable": true/false, "suggested_action": "", "wait_seconds": 0 }`
            }
        },
        {
            id: 'check_recoverable',
            type: 'conditional',
            config: {
                condition: '{{steps.classify_error.output.recoverable}} && {{inputs.retry_count}} < 3',
                if_true: 'attempt_recovery',
                if_false: 'escalate_error'
            }
        },
        {
            id: 'attempt_recovery',
            type: 'tool_execution',
            config: {
                tool_name: 'error_recovery',
                tool_params: {
                    action: '{{steps.classify_error.output.suggested_action}}',
                    wait_seconds: '{{steps.classify_error.output.wait_seconds}}',
                    execution_context: '{{inputs.execution_context}}'
                }
            },
            timeout_seconds: 120
        },
        {
            id: 'escalate_error',
            type: 'tool_execution',
            config: {
                tool_name: 'error_notifier',
                tool_params: {
                    error_type: '{{inputs.error_type}}',
                    error_message: '{{inputs.error_message}}',
                    classification: '{{steps.classify_error.output}}',
                    channels: ['webhook', 'email']
                }
            }
        },
        {
            id: 'log_resolution',
            type: 'tool_execution',
            config: {
                tool_name: 'error_logger',
                tool_params: {
                    error_data: '{{inputs}}',
                    classification: '{{steps.classify_error.output}}',
                    recovery_attempted: '{{steps.attempt_recovery.output | default: null}}',
                    escalated: '{{steps.escalate_error.output | default: null}}'
                }
            }
        }
    ],

    transitions: {
        classify_error: 'check_recoverable',
        check_recoverable: 'attempt_recovery',
        attempt_recovery: 'log_resolution',
        escalate_error: 'log_resolution',
        log_resolution: 'END'
    }
};

// Export all bootstrap protocols
export const BOOTSTRAP_PROTOCOLS = [
    INGESTION_PROTOCOL,
    RESOLUTION_PROTOCOL,
    ERROR_HANDLING_PROTOCOL
] as const;

// Protocol name type for type-safe access
export type BootstrapProtocolName =
    | 'IngestionProtocol'
    | 'ResolutionProtocol'
    | 'ErrorHandlingProtocol';
