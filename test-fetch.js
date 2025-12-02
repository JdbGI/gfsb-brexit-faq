const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWYO9ZyGGeiC0DP0h--_631ltOYEc6DgX5Ku-9Yl4pCSY3WF6yBcvnTxFoQAfvz8ivEgUAWhzL03ZI/pub?output=csv";

async function testFetch() {
    try {
        console.log("Fetching...");
        const response = await fetch(SHEET_URL);
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Length:", text.length);
        console.log("Preview:", text.substring(0, 200));
    } catch (e) {
        console.error("Error:", e);
    }
}

testFetch();
