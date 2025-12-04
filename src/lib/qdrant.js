import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const COLLECTION_NAME = 'gfsb_sources';
const VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small dimension
const MAX_CHUNK_SIZE = 6000; // ~1500 tokens, safe limit for embedding model
const CHUNK_OVERLAP = 200; // Overlap between chunks for context continuity

/**
 * Initialize the Qdrant collection if it doesn't exist
 */
export async function initializeCollection() {
    try {
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

        if (!exists) {
            await qdrantClient.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: VECTOR_SIZE,
                    distance: 'Cosine',
                },
            });
            console.log(`Created collection: ${COLLECTION_NAME}`);
        }
        return true;
    } catch (error) {
        console.error('Error initializing Qdrant collection:', error);
        throw error;
    }
}

/**
 * Split text into chunks that fit within token limits
 */
function chunkText(text, maxChunkSize = MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    if (text.length <= maxChunkSize) {
        return [text];
    }

    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        let endIndex = startIndex + maxChunkSize;

        // Try to break at a sentence or paragraph boundary
        if (endIndex < text.length) {
            // Look for paragraph break first
            const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
            if (paragraphBreak > startIndex + maxChunkSize / 2) {
                endIndex = paragraphBreak;
            } else {
                // Look for sentence break
                const sentenceBreak = text.lastIndexOf('. ', endIndex);
                if (sentenceBreak > startIndex + maxChunkSize / 2) {
                    endIndex = sentenceBreak + 1;
                }
            }
        }

        chunks.push(text.slice(startIndex, endIndex).trim());
        startIndex = endIndex - overlap; // Overlap for context
    }

    return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text) {
    // Truncate if still too long (safety measure)
    const truncatedText = text.slice(0, MAX_CHUNK_SIZE);

    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncatedText,
    });
    return response.data[0].embedding;
}

/**
 * Add a source document to Qdrant (with automatic chunking for large docs)
 */
export async function addSource({ sourceName, sourceDate, sourceLink, rawData }) {
    await initializeCollection();

    // Chunk the raw data if it's too large
    const chunks = chunkText(rawData);
    const baseId = Date.now();
    const addedPoints = [];

    console.log(`Adding source "${sourceName}" with ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkLabel = chunks.length > 1 ? ` [Part ${i + 1}/${chunks.length}]` : '';

        // Create text for embedding (include metadata for better search)
        const textForEmbedding = `${sourceName}${chunkLabel}\n${sourceDate || ''}\n${chunk}`;
        const embedding = await generateEmbedding(textForEmbedding);

        const pointId = baseId + i;

        await qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points: [
                {
                    id: pointId,
                    vector: embedding,
                    payload: {
                        source_name: sourceName + chunkLabel,
                        source_date: sourceDate || null,
                        source_link: sourceLink || null,
                        raw_data: chunk,
                        chunk_index: i,
                        total_chunks: chunks.length,
                        parent_id: baseId,
                        created_at: new Date().toISOString(),
                    },
                },
            ],
        });

        addedPoints.push(pointId);
    }

    return { id: baseId, sourceName, chunks: chunks.length };
}

/**
 * Search for relevant sources based on a query
 */
export async function searchSources(query, limit = 5) {
    try {
        await initializeCollection();

        const queryEmbedding = await generateEmbedding(query);

        const results = await qdrantClient.search(COLLECTION_NAME, {
            vector: queryEmbedding,
            limit,
            with_payload: true,
        });

        return results.map(result => ({
            id: result.id,
            score: result.score,
            sourceName: result.payload.source_name,
            sourceDate: result.payload.source_date,
            sourceLink: result.payload.source_link,
            rawData: result.payload.raw_data,
        }));
    } catch (error) {
        console.error('Error searching Qdrant:', error);
        return [];
    }
}

/**
 * Get all sources from Qdrant (grouped by parent)
 */
export async function getAllSources() {
    try {
        await initializeCollection();

        const result = await qdrantClient.scroll(COLLECTION_NAME, {
            limit: 500,
            with_payload: true,
        });

        // Group by parent_id to show as single sources
        const grouped = {};

        for (const point of result.points) {
            const parentId = point.payload.parent_id || point.id;

            if (!grouped[parentId]) {
                grouped[parentId] = {
                    id: parentId,
                    sourceName: point.payload.source_name.replace(/ \[Part \d+\/\d+\]$/, ''),
                    sourceDate: point.payload.source_date,
                    sourceLink: point.payload.source_link,
                    rawData: point.payload.raw_data,
                    createdAt: point.payload.created_at,
                    chunks: 1,
                    totalLength: point.payload.raw_data?.length || 0,
                };
            } else {
                grouped[parentId].chunks++;
                grouped[parentId].totalLength += point.payload.raw_data?.length || 0;
            }
        }

        return Object.values(grouped);
    } catch (error) {
        console.error('Error getting all sources:', error);
        return [];
    }
}

/**
 * Delete a source from Qdrant (including all chunks)
 */
export async function deleteSource(id) {
    try {
        // First find all chunks with this parent_id
        const result = await qdrantClient.scroll(COLLECTION_NAME, {
            limit: 100,
            with_payload: true,
            filter: {
                should: [
                    { key: 'parent_id', match: { value: id } },
                ],
            },
        });

        const idsToDelete = result.points.map(p => p.id);

        // Also delete the id itself if it exists
        idsToDelete.push(id);

        await qdrantClient.delete(COLLECTION_NAME, {
            wait: true,
            points: idsToDelete,
        });

        return true;
    } catch (error) {
        console.error('Error deleting source:', error);
        return false;
    }
}
