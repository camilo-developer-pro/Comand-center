import OpenAI from 'openai';

/**
 * OpenAI Client Utility
 * 
 * V2.0 Phase 2: Semantic Brain
 * 
 * Initializes the OpenAI client using environment variables.
 * Used for generating embeddings and LLM completions.
 */

if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing environment variable: OPENAI_API_KEY');
}

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates an embedding vector for the given text.
 * 
 * @param text - The text to embed
 * @param model - The model to use (default: text-embedding-3-small)
 * @returns 1536-dimensional vector for text-embedding-3-small
 */
export async function generateEmbedding(
    text: string,
    model: string = 'text-embedding-3-small'
): Promise<number[]> {
    try {
        const response = await openai.embeddings.create({
            model,
            input: text.replace(/\n/g, ' '), // Clean text for better quality
            encoding_format: 'float',
        });

        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error('Failed to generate embedding');
    }
}

/**
 * Generates embeddings for a batch of texts.
 * 
 * @param texts - Array of strings to embed
 * @param model - The model to use
 * @returns Array of embedding vectors
 */
export async function generateBatchEmbeddings(
    texts: string[],
    model: string = 'text-embedding-3-small'
): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
        const response = await openai.embeddings.create({
            model,
            input: texts.map(t => t.replace(/\n/g, ' ')),
            encoding_format: 'float',
        });

        return response.data.map(item => item.embedding);
    } catch (error) {
        console.error('Error generating batch embeddings:', error);
        throw new Error('Failed to generate batch embeddings');
    }
}
