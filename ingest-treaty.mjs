/**
 * Ingest the UK-EU Gibraltar Agreement into Qdrant.
 *
 * Reads the Unstructured.io JSON output, groups elements into article/annex-level
 * chunks, filters noise, and upserts each section to Qdrant via the existing
 * addSource() function.
 *
 * Usage:
 *   node --env-file=.env.local ingest-treaty.mjs              # full ingestion
 *   node --env-file=.env.local ingest-treaty.mjs --dry-run     # preview only
 *   node --env-file=.env.local ingest-treaty.mjs --clear-first # clear then ingest
 */

import { readFileSync } from 'fs';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

// ── Config ──────────────────────────────────────────────────────────────────────

const JSON_PATH = 'UK-EU-Agreement-in-respect-of-Gibraltar-894888f6.pdf.json';
const COLLECTION_NAME = 'gfsb_sources';
const VECTOR_SIZE = 1536;
const MAX_CHUNK_SIZE = 6000;
const CHUNK_OVERLAP = 200;
const SOURCE_DATE = null; // Treaty date TBD
const SOURCE_LINK = null;

const DRY_RUN = process.argv.includes('--dry-run');
const CLEAR_FIRST = process.argv.includes('--clear-first');

// ── Clients ─────────────────────────────────────────────────────────────────────

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ── Noise Detection ─────────────────────────────────────────────────────────────

const NOISE_TYPES = new Set(['Footer', 'Image', 'Header']);

const NOISE_PATTERNS = [
    /^OFFICIAL\s*[-–—]?\s*FOR\s+PUBLIC\s+RELEASE/i,
    /^DRAFT\s*[-–—]\s*SUBJECT\s+TO\s+LEGAL\s+REVIEW/i,
    /^OFFICIAL\s+[-–—]\s+FOR\s+PUBLIC\s+RELEASE\s+DRAFT/i,
    /^_{3,}$/,  // separator lines like "_______________"
    /^&\s*\/en\s+\d+/i, // footer pattern: "& /en 1 OFFICIAL..."
];

function isNoise(element) {
    if (NOISE_TYPES.has(element.type)) return true;
    const text = element.text.trim();
    if (!text || text.length < 3) return true;
    for (const pattern of NOISE_PATTERNS) {
        if (pattern.test(text)) return true;
    }
    return false;
}

function isTitleNoise(text) {
    const t = text.trim();
    return /^OFFICIAL\s*[-–—]?\s*FOR\s+PUBLIC\s+RELEASE/i.test(t) ||
        /^DRAFT\s*[-–—]\s*SUBJECT\s+TO\s+LEGAL\s+REVIEW/i.test(t) ||
        /^OFFICIAL\s+[-–—]\s+FOR\s+PUBLIC\s+RELEASE\s+DRAFT/i.test(t);
}

// ── Section Boundary Detection ──────────────────────────────────────────────────

const ARTICLE_RE = /^ARTICLE\s+(\S+)/i;
const ANNEX_RE = /^ANNEX\s+(\S+)/i;
const PART_RE = /^PART\s+(\S+)/i;
const TITLE_SECTION_RE = /^TITLE\s+([IVX0-9]+)/i;

function detectBoundary(element) {
    if (element.type !== 'Title') return null;
    const text = element.text.trim();

    if (isTitleNoise(text)) return null;

    // Check if this title has an embedded article reference (e.g., "DRAFT – SUBJECT TO LEGAL REVIEW ARTICLE SSC.61")
    const embeddedArticle = text.match(/ARTICLE\s+(\S+)\s*$/i);
    if (embeddedArticle) {
        return { type: 'article', id: embeddedArticle[1] };
    }

    let m;
    if ((m = ARTICLE_RE.exec(text))) return { type: 'article', id: m[1] };
    if ((m = ANNEX_RE.exec(text))) return { type: 'annex', id: m[1] };
    if ((m = PART_RE.exec(text))) return { type: 'part', id: m[1] };
    if ((m = TITLE_SECTION_RE.exec(text))) return { type: 'title', id: m[1] };

    return null;
}

// ── Text Chunking (mirrors src/lib/qdrant.js) ───────────────────────────────────

function chunkText(text, maxChunkSize = MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    if (text.length <= maxChunkSize) return [text];

    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        let endIndex = startIndex + maxChunkSize;
        if (endIndex < text.length) {
            const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
            if (paragraphBreak > startIndex + maxChunkSize / 2) {
                endIndex = paragraphBreak;
            } else {
                const sentenceBreak = text.lastIndexOf('. ', endIndex);
                if (sentenceBreak > startIndex + maxChunkSize / 2) {
                    endIndex = sentenceBreak + 1;
                }
            }
        }
        chunks.push(text.slice(startIndex, endIndex).trim());
        startIndex = endIndex - overlap;
    }

    return chunks.filter(c => c.length > 0);
}

// ── Embedding ───────────────────────────────────────────────────────────────────

async function generateEmbedding(text) {
    const truncated = text.slice(0, MAX_CHUNK_SIZE);
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncated,
    });
    return response.data[0].embedding;
}

// ── Qdrant Operations ───────────────────────────────────────────────────────────

async function ensureCollection() {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    if (!exists) {
        await qdrantClient.createCollection(COLLECTION_NAME, {
            vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        console.log(`Created collection: ${COLLECTION_NAME}`);
    }
}

async function clearCollection() {
    console.log('🗑️  Clearing all points from collection...');
    try {
        await qdrantClient.delete(COLLECTION_NAME, {
            wait: true,
            filter: { must: [{ key: 'source_name', match: { any: [] } }] },
        });
    } catch {
        // If filter-based delete fails, delete and recreate
        try {
            await qdrantClient.deleteCollection(COLLECTION_NAME);
        } catch { /* ignore */ }
        await qdrantClient.createCollection(COLLECTION_NAME, {
            vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
    }
    console.log('✅ Collection cleared.');
}

async function upsertSection(section, idx) {
    const chunks = chunkText(section.rawData);
    const baseId = Date.now() + idx * 1000;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkLabel = chunks.length > 1 ? ` [Part ${i + 1}/${chunks.length}]` : '';

        const textForEmbedding = `${section.sourceName}${chunkLabel}\n${chunk}`;
        const embedding = await generateEmbedding(textForEmbedding);
        const pointId = baseId + i;

        await qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points: [{
                id: pointId,
                vector: embedding,
                payload: {
                    source_name: section.sourceName + chunkLabel,
                    source_date: section.sourceDate || null,
                    source_link: section.sourceLink || null,
                    raw_data: chunk,
                    chunk_index: i,
                    total_chunks: chunks.length,
                    parent_id: baseId,
                    created_at: new Date().toISOString(),
                },
            }],
        });
    }

    return chunks.length;
}

// ── Main Parsing Logic ──────────────────────────────────────────────────────────

function parseElements(elements) {
    const sections = [];
    let currentPart = '';
    let currentTitle = '';
    let currentSection = null;

    function finishSection() {
        if (currentSection && currentSection.texts.length > 0) {
            const rawData = currentSection.texts.join('\n\n');
            if (rawData.trim().length > 20) { // Skip near-empty sections
                sections.push({
                    sourceName: currentSection.name,
                    sourceDate: SOURCE_DATE,
                    sourceLink: SOURCE_LINK,
                    rawData,
                    elementCount: currentSection.texts.length,
                });
            }
        }
        currentSection = null;
    }

    function startSection(name) {
        finishSection();
        currentSection = { name, texts: [] };
    }

    // Start with preamble
    startSection('UK-EU Gibraltar Agreement — Preamble');

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];

        // Skip noise
        if (isNoise(el)) continue;

        const boundary = detectBoundary(el);

        if (boundary) {
            if (boundary.type === 'part') {
                currentPart = `Part ${boundary.id}`;
                // Don't start a new section for PART alone — wait for article/annex
                continue;
            }

            if (boundary.type === 'title') {
                currentTitle = `Title ${boundary.id}`;
                continue;
            }

            if (boundary.type === 'article') {
                // Look ahead for subtitle (next Title that's not noise and not another ARTICLE)
                let subtitle = '';
                for (let j = i + 1; j < Math.min(i + 4, elements.length); j++) {
                    const next = elements[j];
                    if (next.type === 'Title' && !isTitleNoise(next.text.trim()) && !ARTICLE_RE.test(next.text.trim()) && !ANNEX_RE.test(next.text.trim())) {
                        subtitle = next.text.trim();
                        break;
                    }
                }

                let name = 'UK-EU Gibraltar Agreement';
                if (currentPart) name += ` — ${currentPart}`;
                if (currentTitle) name += `, ${currentTitle}`;
                name += ` — Article ${boundary.id}`;
                if (subtitle) name += `: ${subtitle}`;

                startSection(name);
                continue;
            }

            if (boundary.type === 'annex') {
                // Look ahead for annex title
                let annexTitle = '';
                for (let j = i + 1; j < Math.min(i + 4, elements.length); j++) {
                    const next = elements[j];
                    if (next.type === 'Title' && !isTitleNoise(next.text.trim()) && !ANNEX_RE.test(next.text.trim())) {
                        annexTitle = next.text.trim();
                        break;
                    }
                }

                let name = `UK-EU Gibraltar Agreement — Annex ${boundary.id}`;
                if (annexTitle) name += `: ${annexTitle}`;

                startSection(name);
                continue;
            }
        }

        // Skip Title elements that are already consumed as subtitles or context
        if (el.type === 'Title') {
            // If it's a title that wasn't a boundary, it's a subtitle — include as text
            const text = el.text.trim();
            if (text && currentSection) {
                currentSection.texts.push(text);
            }
            continue;
        }

        // Add body content
        if (currentSection && (el.type === 'NarrativeText' || el.type === 'ListItem' || el.type === 'Table' || el.type === 'UncategorizedText' || el.type === 'FigureCaption' || el.type === 'FormKeysValues')) {
            const text = el.text.trim();
            if (text) {
                currentSection.texts.push(text);
            }
        }
    }

    finishSection();
    return sections;
}

// ── Entry Point ─────────────────────────────────────────────────────────────────

async function main() {
    console.log('📖 Reading JSON file...');
    const raw = readFileSync(JSON_PATH, 'utf-8');
    const elements = JSON.parse(raw);
    console.log(`   Loaded ${elements.length} elements\n`);

    console.log('🔍 Parsing into sections...');
    const sections = parseElements(elements);
    console.log(`   Found ${sections.length} sections\n`);

    // Print summary
    let totalChars = 0;
    for (const s of sections) {
        const chars = s.rawData.length;
        totalChars += chars;
        if (DRY_RUN) {
            console.log(`  📄 ${s.sourceName}`);
            console.log(`     ${chars.toLocaleString()} chars, ${s.elementCount} elements`);
        }
    }
    console.log(`\n📊 Total: ${sections.length} sections, ${totalChars.toLocaleString()} chars`);

    if (DRY_RUN) {
        console.log('\n🏁 Dry run complete. No data written to Qdrant.');
        return;
    }

    // Connect to Qdrant
    console.log('\n🔗 Connecting to Qdrant...');
    await ensureCollection();

    if (CLEAR_FIRST) {
        await clearCollection();
    }

    // Upsert all sections
    console.log(`\n📤 Upserting ${sections.length} sections to Qdrant...`);
    let totalPoints = 0;
    let errors = 0;

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        try {
            const chunkCount = await upsertSection(section, i);
            totalPoints += chunkCount;
            console.log(`  ✅ [${i + 1}/${sections.length}] ${section.sourceName} (${chunkCount} chunk(s))`);
        } catch (err) {
            errors++;
            console.error(`  ❌ [${i + 1}/${sections.length}] ${section.sourceName}: ${err.message}`);
        }

        // Small delay to avoid rate-limiting
        if (i % 10 === 9) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log(`\n🎉 Done! Upserted ${totalPoints} points from ${sections.length} sections.`);
    if (errors > 0) console.log(`⚠️  ${errors} error(s) occurred.`);
}

main().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
});
