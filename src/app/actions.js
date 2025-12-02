"use server";

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

export async function addFAQ(formData) {
    const question = formData.get('question');
    const answer = formData.get('answer');
    const category = formData.get('category');

    if (!question || !answer || !category) {
        return { success: false, message: 'All fields are required' };
    }

    // Escape quotes for CSV
    const escape = (text) => `"${text.replace(/"/g, '""')}"`;
    const csvLine = `\n${escape(question)},${escape(answer)},${escape(category)}`;

    try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'faqs.csv');
        fs.appendFileSync(filePath, csvLine);

        revalidatePath('/'); // Update the home page
        return { success: true, message: 'FAQ added successfully!' };
    } catch (error) {
        console.error('Error writing to CSV:', error);
        return { success: false, message: 'Failed to save FAQ.' };
    }
}
