import "dotenv/config";
import fs from "node:fs/promises";
import OpenAI from "openai";

import { analysisSchema } from "./schema.js";

export async function summarizeRecord(paths) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = await fs.readFile("./prompts/github/summarize.md", "utf8");
    const markdown = await fs.readFile(paths.til, "utf8");
    const response = await client.responses.create({
        model: "gpt-5.5",
        input: [
            { role: "system", content: prompt },
            { role: "user", content: markdown },
        ],
    });
    return parseAnalysisResponse(response.output_text);
}

export function parseAnalysisResponse(outputText) {
    let analysis;
    try {
        analysis = JSON.parse(outputText);
    } catch (error) {
        throw new Error("Generated summary must be valid JSON.", { cause: error });
    }
    return analysisSchema.parse(analysis);
}
