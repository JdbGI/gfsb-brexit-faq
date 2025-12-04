import { NextResponse } from 'next/server';
import { addSource, getAllSources, deleteSource } from '@/lib/qdrant';

// GET - Fetch all sources
export async function GET() {
    try {
        const sources = await getAllSources();
        return NextResponse.json({ sources });
    } catch (error) {
        console.error('Error fetching sources:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sources' },
            { status: 500 }
        );
    }
}

// POST - Add a new source
export async function POST(request) {
    try {
        const body = await request.json();
        const { sourceName, sourceDate, sourceLink, rawData } = body;

        if (!sourceName || !rawData) {
            return NextResponse.json(
                { error: 'sourceName and rawData are required' },
                { status: 400 }
            );
        }

        const result = await addSource({
            sourceName,
            sourceDate,
            sourceLink,
            rawData,
        });

        return NextResponse.json({
            success: true,
            message: `Source "${result.sourceName}" added successfully`,
            id: result.id,
        });
    } catch (error) {
        console.error('Error adding source:', error);
        return NextResponse.json(
            { error: 'Failed to add source: ' + error.message },
            { status: 500 }
        );
    }
}

// DELETE - Remove a source
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Source ID is required' },
                { status: 400 }
            );
        }

        const success = await deleteSource(parseInt(id));

        if (success) {
            return NextResponse.json({ success: true, message: 'Source deleted' });
        } else {
            return NextResponse.json(
                { error: 'Failed to delete source' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error deleting source:', error);
        return NextResponse.json(
            { error: 'Failed to delete source' },
            { status: 500 }
        );
    }
}
