import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
// NOTE: You need to add OPENAI_API_KEY to your .env.local file
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});

export async function POST(request) {
    try {
        const { message } = await request.json();

        // 1. Fetch the FAQ data from Google Sheets to use as context
        const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWYO9ZyGGeiC0DP0h--_631ltOYEc6DgX5Ku-9Yl4pCSY3WF6yBcvnTxFoQAfvz8ivEgUAWhzL03ZI/pub?output=csv";
        // Disable cache to prevent getting stuck with a redirect page
        const response = await fetch(SHEET_URL, { cache: 'no-store' });
        const csvData = await response.text();

        console.log("AI Chat Debug - CSV Data Length:", csvData.length);
        console.log("AI Chat Debug - CSV Preview:", csvData.substring(0, 200));

        // 2. Check if API key is present
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                reply: "I am ready to answer! To make me real, please add an OPENAI_API_KEY to your .env.local file. For now, I can tell you that I have access to " + csvData.split('\n').length + " rows of data."
            });
        }

        // 3. Call OpenAI with context
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert advisor for the Gibraltar Federation of Small Businesses (GFSB). Your goal is to help users understand the Gibraltar-EU treaty negotiations and Brexit implications.

INSTRUCTIONS:
1.  **Professional Brevity**: Provide direct, concise answers. Avoid fluff or unnecessary conversational filler. Get straight to the point.
2.  **Synthesize**: Combine relevant details from the data into a single, cohesive response.
3.  **Nuance with Economy**: Provide necessary context for "Yes/No" questions (the "why" and "how") but keep it brief and factual.
4.  **Strict Data Adherence**: Answer ONLY based on the provided FAQ DATA below. Do not make up information or use outside knowledge.
5.  **Citations**: If the answer is derived from a specific row in the data that has a 'source_name', mention it at the end of your answer (e.g., "Source: Gov.gi Press Release").
6.  **Missing Info**: If the answer is not in the data, state clearly: "I don't have specific details on that in my current database. Please contact the GFSB directly."

FAQ DATA:
${csvData}`
                },
                { role: "user", content: message }
            ],
            model: "gpt-4o-mini",
        });

        const reply = completion.choices[0].message.content;

        return NextResponse.json({
            reply,
            debug: {
                csvLength: csvData.length,
                preview: csvData.substring(0, 50)
            }
        });
    } catch (error) {
        console.error('AI Error:', error);
        return NextResponse.json({ reply: "Sorry, I encountered an error processing your request." }, { status: 500 });
    }
}
