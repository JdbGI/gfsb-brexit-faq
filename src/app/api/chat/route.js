import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchSources } from '@/lib/qdrant';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

// Send a notification to the Telegram group chat
async function sendTelegramNotification(question, answer) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log('[Telegram] Attempting to send notification...');
    console.log('[Telegram] Bot token present:', !!botToken);
    console.log('[Telegram] Chat ID present:', !!chatId);
    if (chatId) console.log('[Telegram] Chat ID value:', chatId);

    if (!botToken || !chatId) {
        console.warn('[Telegram] Bot token or chat ID not configured, skipping notification.');
        return;
    }

    // Truncate answer if too long for Telegram (max 4096 chars)
    const maxLen = 3500;
    const truncatedAnswer = answer.length > maxLen ? answer.substring(0, maxLen) + '... [truncated]' : answer;
    const text = `📩 New Brexit Q&A Question\n\nQuestion:\n${question}\n\nAnswer:\n${truncatedAnswer}`;

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        console.log('[Telegram] Sending to URL:', url.replace(botToken, 'BOT_TOKEN_HIDDEN'));
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
            }),
        });
        const data = await response.json();
        console.log('[Telegram] API response status:', response.status);
        console.log('[Telegram] API response body:', JSON.stringify(data));
        if (!data.ok) {
            console.error('[Telegram] API error:', data.error_code, data.description);
        } else {
            console.log('[Telegram] Notification sent successfully!');
        }
    } catch (err) {
        console.error('[Telegram] Failed to send notification:', err.message, err.stack);
    }
}

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
            const noSourcesReply = "Our Q&A sources do not have any information relating to that enquiry right now. You can stay up to date on this issue, and other issues affecting Gibraltar businesses, by subscribing to the GFSB weekly newsletter: https://gfsb.glueup.com/org/gfsb/subscriptions/?fbclid=IwdGRjcAN_-EBjbGNrA3_4NmV4dG4DYWVtAjExAHNydGMGYXBwX2lkDDM1MDY4NTUzMTcyOAABHoxCB376i4dKW6zkt7I-6K7lL4nUZrRwIY_vg3gp25cGsT1JGo0FGd1hTMLs_aem_TL0brPLlmRY6u3_0iNSw0g";
            // Await Telegram notification to ensure it completes before serverless shutdown
            await sendTelegramNotification(message, noSourcesReply);
            return NextResponse.json({
                reply: noSourcesReply,
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
1. **Repeat the question**: Begin your response by repeating or paraphrasing the user's question. Use your judgment to determine whether a verbatim or paraphrased version is more appropriate.

2. **Answer based on sources only**: Use ONLY information from the RELEVANT SOURCES below. Never invent or assume information not explicitly stated.

3. **Always cite sources**: At the end of your answer, list the sources you used. Format each citation as:
   - "Source: [source_name]" if no date
   - "Source: [source_name] ([source_date])" if date is available
   If a source link exists, mention users can find more details at that link.

4. **Handle conflicting information**: If sources contain conflicting or different information on the same topic:
   - Present BOTH perspectives clearly
   - Attribute each perspective to its source
   - Example: "According to [Source A], X applies. However, [Source B] indicates Y. This may reflect changes over time or different interpretations."

5. **Synthesize when appropriate**: When multiple sources agree or complement each other, combine them into a cohesive answer rather than repeating similar information.

6. **Missing information**: If the question cannot be answered from the sources, respond: "Our Q&A sources do not have any information relating to that enquiry right now. You can stay up to date on this issue, and other issues affecting Gibraltar businesses, by subscribing to the GFSB weekly newsletter: https://gfsb.glueup.com/org/gfsb/subscriptions/?fbclid=IwdGRjcAN_-EBjbGNrA3_4NmV4dG4DYWVtAjExAHNydGMGYXBwX2lkDDM1MDY4NTUzMTcyOAABHoxCB376i4dKW6zkt7I-6K7lL4nUZrRwIY_vg3gp25cGsT1JGo0FGd1hTMLs_aem_TL0brPLlmRY6u3_0iNSw0g"

7. **Professional tone**: Be direct, concise, and helpful. Avoid unnecessary filler.

RELEVANT SOURCES (ranked by relevance to the user's question):
${sourcesContext}`
                },
                { role: "user", content: message }
            ],
            model: "gpt-4o-mini",
        });

        const reply = completion.choices[0].message.content;

        // Await Telegram notification to ensure it completes before serverless shutdown
        await sendTelegramNotification(message, reply);

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
