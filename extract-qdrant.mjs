/**
 * Extract all documents from Qdrant and save them as individual text files.
 * 
 * Usage:
 *   QDRANT_URL=<your-url> QDRANT_API_KEY=<your-key> node extract-qdrant.mjs
 * 
 * Or set QDRANT_URL and QDRANT_API_KEY in your .env.local file, then run:
 *   node --env-file=.env.local extract-qdrant.mjs
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const COLLECTION_NAME = 'gfsb_sources';
const OUTPUT_DIR = join(process.cwd(), 'extracted_qdrant_documents');

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

function sanitizeFilename(name) {
    // Remove or replace characters that are invalid in filenames
    return name
        .replace(/[\/\\:*?"<>|]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 200); // Limit filename length
}

async function extractAll() {
    console.log('🔗 Connecting to Qdrant...');
    console.log(`   URL: ${process.env.QDRANT_URL}`);

    // Create output directory
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

    // Scroll through ALL points in the collection (paginated)
    let allPoints = [];
    let offset = null;
    let page = 0;

    do {
        page++;
        console.log(`📄 Fetching page ${page}...`);
        const result = await qdrantClient.scroll(COLLECTION_NAME, {
            limit: 100,
            with_payload: true,
            with_vector: false,
            ...(offset !== null && offset !== undefined ? { offset } : {}),
        });

        allPoints.push(...result.points);
        offset = result.next_page_offset;
        console.log(`   Got ${result.points.length} points (total so far: ${allPoints.length})`);
    } while (offset !== null && offset !== undefined);

    console.log(`\n✅ Total points fetched: ${allPoints.length}\n`);

    // Group chunks by parent_id to reconstruct full documents
    const grouped = {};

    for (const point of allPoints) {
        const parentId = point.payload.parent_id || point.id;

        if (!grouped[parentId]) {
            grouped[parentId] = {
                id: parentId,
                sourceName: point.payload.source_name?.replace(/ \[Part \d+\/\d+\]$/, '') || `unknown_${parentId}`,
                sourceDate: point.payload.source_date,
                sourceLink: point.payload.source_link,
                createdAt: point.payload.created_at,
                chunks: [],
            };
        }

        grouped[parentId].chunks.push({
            chunkIndex: point.payload.chunk_index ?? 0,
            rawData: point.payload.raw_data || '',
        });
    }

    const documents = Object.values(grouped);
    console.log(`📚 Reconstructed ${documents.length} unique documents\n`);

    // Write each document to a file
    let fileCount = 0;
    const manifest = [];

    for (const doc of documents) {
        // Sort chunks by index and combine
        doc.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
        const fullContent = doc.chunks.map(c => c.rawData).join('\n\n');

        // Build filename with speculation prefix
        const safeName = sanitizeFilename(doc.sourceName);
        const filename = `speculation_${safeName}.txt`;
        const filepath = join(OUTPUT_DIR, filename);

        // Build file header with metadata
        const header = [
            `=== DOCUMENT METADATA ===`,
            `Source Name: ${doc.sourceName}`,
            `Source Date: ${doc.sourceDate || 'N/A'}`,
            `Source Link: ${doc.sourceLink || 'N/A'}`,
            `Created At:  ${doc.createdAt || 'N/A'}`,
            `Qdrant ID:   ${doc.id}`,
            `Chunks:      ${doc.chunks.length}`,
            `========================\n`,
        ].join('\n');

        writeFileSync(filepath, header + fullContent, 'utf-8');
        fileCount++;

        manifest.push({
            filename,
            sourceName: doc.sourceName,
            sourceDate: doc.sourceDate,
            sourceLink: doc.sourceLink,
            chunks: doc.chunks.length,
            contentLength: fullContent.length,
        });

        console.log(`  ✅ ${filename} (${doc.chunks.length} chunk(s), ${fullContent.length} chars)`);
    }

    // Write a manifest/index file
    const manifestPath = join(OUTPUT_DIR, '_MANIFEST.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    console.log(`\n🎉 Done! Extracted ${fileCount} documents to: ${OUTPUT_DIR}`);
    console.log(`📋 Manifest saved to: ${manifestPath}`);
}

extractAll().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
