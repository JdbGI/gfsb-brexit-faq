export function parseCSV(csvText) {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++; // Skip next quote
            } else {
                // Toggle quotes
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            currentLine.push(currentField);
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            // End of line
            if (char === '\r' && nextChar === '\n') i++; // Handle CRLF

            if (currentLine.length > 0 || currentField) {
                currentLine.push(currentField);
                lines.push(currentLine);
            }
            currentLine = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }

    // Push last field/line if exists
    if (currentLine.length > 0 || currentField) {
        currentLine.push(currentField);
        lines.push(currentLine);
    }

    if (lines.length === 0) return [];

    const headers = lines[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        // Skip empty rows
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j] ? row[j].trim() : '';
        }
        result.push(obj);
    }

    return result;
}

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWYO9ZyGGeiC0DP0h--_631ltOYEc6DgX5Ku-9Yl4pCSY3WF6yBcvnTxFoQAfvz8ivEgUAWhzL03ZI/pub?output=csv";

export async function getFAQs() {
    try {
        // Fetch with revalidation every 60 seconds
        const response = await fetch(SHEET_URL, { next: { revalidate: 60 } });

        if (!response.ok) {
            throw new Error(`Failed to fetch sheet: ${response.statusText}`);
        }

        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error("Error fetching FAQ data:", error);
        return [];
    }
}
