/**
 * Scaffold Hydrator
 * Command Center V3.0 - Phase 2
 * 
 * Hydrates protocol context by fetching data from various sources
 * (hybrid search, database queries, graph queries, APIs).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContextSource, ProtocolScaffold } from '../protocols/protocol-schema';
import type { IScaffoldHydrator } from './types';

export class ScaffoldHydrator implements IScaffoldHydrator {
    private supabase: SupabaseClient;
    private embeddingEndpoint: string;

    constructor(supabase: SupabaseClient, embeddingEndpoint: string) {
        this.supabase = supabase;
        this.embeddingEndpoint = embeddingEndpoint;
    }

    /**
     * Hydrates the scaffold by fetching data from all context sources.
     */
    async hydrate(
        scaffold: ProtocolScaffold,
        inputs: Record<string, unknown>,
        workspaceId: string
    ): Promise<Record<string, unknown>> {
        const hydratedContext: Record<string, unknown> = {};

        // Process each context source in parallel
        const sourcePromises = scaffold.context_sources.map(async (source) => {
            try {
                const data = await this.fetchContextSource(source, inputs, workspaceId);

                // Truncate to max tokens if specified
                const truncated = this.truncateToTokens(
                    data,
                    source.max_tokens || 2000
                );

                return { key: source.output_key, data: truncated };
            } catch (error) {
                console.error(`Failed to hydrate context source ${source.output_key}:`, error);
                return { key: source.output_key, data: null };
            }
        });

        const results = await Promise.all(sourcePromises);

        for (const { key, data } of results) {
            hydratedContext[key] = data;
        }

        return hydratedContext;
    }

    /**
     * Fetches data from a single context source.
     */
    private async fetchContextSource(
        source: ContextSource,
        inputs: Record<string, unknown>,
        workspaceId: string
    ): Promise<unknown> {
        // Interpolate query template with inputs
        const query = this.interpolateTemplate(source.query, { inputs });

        switch (source.source_type) {
            case 'hybrid_search': {
                // Call hybrid search RPC
                const { data, error } = await this.supabase.rpc('search_hybrid', {
                    p_workspace_id: workspaceId,
                    p_query_text: query,
                    p_limit: source.params?.limit || 10
                });
                if (error) throw error;
                return data;
            }

            case 'database': {
                // Execute parameterized query via safe RPC
                const { data, error } = await this.supabase.rpc('execute_safe_query', {
                    p_query: query,
                    p_workspace_id: workspaceId
                });
                if (error) throw error;
                return data;
            }

            case 'graph_query': {
                // Execute graph traversal
                const { data, error } = await this.supabase.rpc('get_graph_neighborhood', {
                    p_workspace_id: workspaceId,
                    p_center_entity_id: source.params?.entity_id,
                    p_max_depth: source.params?.depth || 2
                });
                if (error) throw error;
                return data;
            }

            case 'api': {
                // Fetch from external API
                const response = await fetch(query, {
                    method: 'GET',
                    headers: (source.params?.headers as Record<string, string>) || {}
                });
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }
                return response.json();
            }

            case 'previous_step': {
                // Handled by the runtime, not the hydrator
                return null;
            }

            default:
                throw new Error(`Unknown source type: ${source.source_type}`);
        }
    }

    /**
     * Interpolates template strings with context values.
     * Supports: {{inputs.field}}, {{context.path.to.value}}
     */
    private interpolateTemplate(template: string, context: Record<string, unknown>): string {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(context, path.trim());
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * Gets a nested value from an object using dot notation.
     * Supports array access [index] and filters (|filter).
     */
    private getNestedValue(obj: unknown, path: string): unknown {
        const parts = path.split('.');
        let current: unknown = obj;

        for (const part of parts) {
            if (current === null || current === undefined) break;

            // Handle array access like "items[0]"
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, key, indexStr] = arrayMatch;
                current = (current as Record<string, unknown>)?.[key];
                if (Array.isArray(current)) {
                    current = current[parseInt(indexStr)];
                }
                continue;
            }

            // Handle filters like "value | truncate: 500"
            if (part.includes('|')) {
                const [actualPath, ...filters] = part.split('|').map(s => s.trim());
                current = (current as Record<string, unknown>)?.[actualPath];
                for (const filter of filters) {
                    current = this.applyFilter(current, filter);
                }
                continue;
            }

            current = (current as Record<string, unknown>)?.[part];
        }

        return current;
    }

    /**
     * Applies a filter transformation to a value.
     */
    private applyFilter(value: unknown, filter: string): unknown {
        const [filterName, ...args] = filter.split(':').map(s => s.trim());

        switch (filterName) {
            case 'truncate': {
                const maxLength = parseInt(args[0]) || 500;
                if (typeof value === 'string') {
                    return value.length > maxLength
                        ? value.substring(0, maxLength) + '...'
                        : value;
                }
                return value;
            }

            case 'length':
                return Array.isArray(value) ? value.length : 0;

            case 'last': {
                const count = parseInt(args[0]) || 1;
                return Array.isArray(value) ? value.slice(-count) : value;
            }

            case 'first': {
                const count = parseInt(args[0]) || 1;
                return Array.isArray(value) ? value.slice(0, count) : value;
            }

            case 'format':
                if (args[0] === 'numbered_list' && Array.isArray(value)) {
                    return value.map((item, i) =>
                        `${i + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}`
                    ).join('\n');
                }
                if (args[0] === 'json') {
                    return JSON.stringify(value, null, 2);
                }
                return value;

            case 'default':
                return value ?? args[0];

            case 'join': {
                const separator = args[0] || ', ';
                return Array.isArray(value) ? value.join(separator) : value;
            }

            default:
                return value;
        }
    }

    /**
     * Truncates data to fit within a token budget.
     * Uses rough estimation: 1 token ≈ 4 characters.
     */
    private truncateToTokens(data: unknown, maxTokens: number): unknown {
        const maxChars = maxTokens * 4;
        const stringified = JSON.stringify(data);

        if (stringified.length <= maxChars) {
            return data;
        }

        // For arrays, take fewer items
        if (Array.isArray(data)) {
            const result: unknown[] = [];
            let currentLength = 2; // []

            for (const item of data) {
                const itemStr = JSON.stringify(item);
                if (currentLength + itemStr.length + 1 > maxChars) break;
                result.push(item);
                currentLength += itemStr.length + 1;
            }

            return result;
        }

        // For strings, truncate directly
        if (typeof data === 'string') {
            return data.substring(0, maxChars);
        }

        // For objects, stringify and truncate
        return JSON.parse(stringified.substring(0, maxChars - 1) + '}');
    }
}
