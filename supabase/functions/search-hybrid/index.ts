import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
    query: string;
    workspace_id: string;
    match_threshold?: number;
    match_count?: number;
    rrf_k?: number;
}

interface SearchResult {
    document_id: string;
    document_title: string;
    chunk_content: string;
    chunk_index: number;
    header_path: string[] | null;
    similarity_score: number | null;
    graph_score: number | null;
    fusion_score: number;
    source_type: "vector_only" | "graph_only" | "hybrid";
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Parse and validate request
        const body: SearchRequest = await req.json();

        const {
            query,
            workspace_id,
            match_threshold = 0.7,
            match_count = 20,
            rrf_k = 60
        } = body;

        if (!query || typeof query !== "string" || query.trim() === "") {
            throw new Error("query is required and must be a non-empty string");
        }
        if (!workspace_id || typeof workspace_id !== "string") {
            throw new Error("workspace_id is required");
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(workspace_id)) {
            throw new Error("workspace_id must be a valid UUID");
        }

        // Initialize Supabase client with service role
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Generate embedding via OpenAI
        const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiApiKey) {
            throw new Error("OPENAI_API_KEY not configured");
        }

        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "text-embedding-3-small",
                input: query.trim(),
                dimensions: 1536,
            }),
        });

        if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text();
            throw new Error(`Embedding generation failed: ${embeddingResponse.status} - ${errorText}`);
        }

        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // Call hybrid search RPC
        const { data, error } = await supabase.rpc("search_hybrid", {
            query_embedding: queryEmbedding,
            query_text: query.trim(),
            match_threshold: match_threshold,
            p_workspace_id: workspace_id,
            match_count: match_count,
            rrf_k: rrf_k,
        });

        if (error) {
            console.error("RPC Error:", error);
            throw new Error(`Hybrid search failed: ${error.message}`);
        }

        const results = (data ?? []) as SearchResult[];

        // Return formatted response
        return new Response(
            JSON.stringify({
                success: true,
                query: query.trim(),
                workspace_id,
                results,
                metadata: {
                    total_results: results.length,
                    match_threshold,
                    rrf_k,
                    source_distribution: {
                        vector_only: results.filter(r => r.source_type === "vector_only").length,
                        graph_only: results.filter(r => r.source_type === "graph_only").length,
                        hybrid: results.filter(r => r.source_type === "hybrid").length,
                    },
                },
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (err) {
        const error = err as Error;
        console.error("Function error:", error.message);

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
