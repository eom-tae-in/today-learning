import "dotenv/config";
import fs from "fs/promises";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function summarizeMarkdown(markdownPath) {
    const prompt = await fs.readFile("./prompts/summarize.md", "utf8");
    const markdown = await fs.readFile(markdownPath, "utf8");

    const response = await client.responses.create({
        model: "gpt-5.5",
        input: [
            {
                role: "system",
                content: prompt,
            },
            {
                role: "user",
                content: markdown,
            },
        ],
    });

    return JSON.parse(response.output_text);
}