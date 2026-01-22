# RRF Fusion Plan

## Objective
Complete the hybrid GraphRAG system by implementing Reciprocal Rank Fusion to combine vector and graph search results.

## RRF Mathematical Foundation
- Formula: `score = Σ(1 / (k + rank_i))` for each retrieval system
- k = 60 (standard constant prevents high-ranked items from dominating)
- When entity appears in both systems, scores are summed
- Higher RRF score = better overall ranking

## Implementation Steps
1. Execute vector search and store results in temp table
2. Extract seed entities from vector results + query entities
3. Execute graph expansion from seeds and store results
4. Apply RRF fusion formula to combine rankings
5. Return unified results with source attribution

## Key Components
- Temporary tables for intermediate result storage
- Seed entity selection (top vector + query mentions)
- Unified result fusion with proper ranking
- Source attribution ('vector', 'graph', 'both')