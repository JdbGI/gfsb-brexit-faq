import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchSources } from '@/lib/qdrant';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

export async function POST(request) {
    try {
        const { message } = await request.json();

        // Check if API key is present
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                reply: "I am ready to answer! To activate me, please add an OPENAI_API_KEY to your .env.local file."
            });
        }

        // 1. Search Qdrant for relevant sources
        console.log("Searching Qdrant for:", message);
        const relevantSources = await searchSources(message, 5);
        console.log(`Found ${relevantSources.length} relevant sources`);

        if (relevantSources.length === 0) {
            return NextResponse.json({
                reply: "I don't have any sources in my database yet. Please add sources via the /admin page first.",
                sourcesUsed: []
            });
        }

        // 2. Format sources for the AI context
        const sourcesContext = relevantSources.map((source, index) => {
            return `
--- SOURCE ${index + 1} ---
Name: ${source.sourceName}
Date: ${source.sourceDate || 'Not specified'}
Link: ${source.sourceLink || 'Not available'}
Relevance Score: ${(source.score * 100).toFixed(1)}%

Content:
${source.rawData}
--- END SOURCE ${index + 1} ---
`;
        }).join('\n');

        // 3. Call OpenAI with the relevant sources
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert research assistant for the Gibraltar Federation of Small Businesses (GFSB). Your knowledge comes EXCLUSIVELY from the source documents provided below.

INSTRUCTIONS:
1. **Answer based on sources only**: Use ONLY information from the RELEVANT SOURCES below. Never invent or assume information not explicitly stated.

2. **Always cite sources**: At the end of your answer, list the sources you used. Format each citation as:
   - "Source: [source_name]" if no date
   - "Source: [source_name] ([source_date])" if date is available
   If a source link exists, mention users can find more details at that link.

3. **Handle conflicting information**: If sources contain conflicting or different information on the same topic:
   - Present BOTH perspectives clearly
   - Attribute each perspective to its source
   - Example: "According to [Source A], X applies. However, [Source B] indicates Y. This may reflect changes over time or different interpretations."

4. **Synthesize when appropriate**: When multiple sources agree or complement each other, combine them into a cohesive answer rather than repeating similar information.

5. **Missing information**: If the question cannot be answered from the sources, respond: "I don't have specific information on that in my current sources. Please contact the GFSB directly for assistance."

6. **Professional tone**: Be direct, concise, and helpful. Avoid unnecessary filler.

RELEVANT SOURCES (ranked by relevance to the user's question):
${sourcesContext}`
                },
                { role: "user", content: message }
            ],
            model: "gpt-4o-mini",
        });

        const reply = completion.choices[0].message.content;

        return NextResponse.json({
            reply,
            sourcesUsed: relevantSources.map(s => ({
                name: s.sourceName,
                date: s.sourceDate,
                link: s.sourceLink,
                score: s.score
            }))
        });
    } catch (error) {
        console.error('AI Error:', error);
        return NextResponse.json({
            reply: "Sorry, I encountered an error processing your request. Please try again.",
            error: error.message
        }, { status: 500 });
    }
}
