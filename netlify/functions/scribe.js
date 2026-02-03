import { GoogleGenerativeAI } from "@google/generative-ai";

export const handler = async function (event, context) {
    // Only accept POST requests
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        const { message } = JSON.parse(event.body);

        if (!message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Message is required" }),
            };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing in environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Server configuration error" }),
            };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use Flash model for speed and higher quota
        const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

        const result = await model.generateContent(message);
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ text }),
        };

    } catch (error) {
        console.error("Error processing Gemini request:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error", details: error.message }),
        };
    }
};
