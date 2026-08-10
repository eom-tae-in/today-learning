import "dotenv/config";
import fs from "fs/promises";
import OpenAI from "openai";

function createClient() {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

async function readOptionalMarkdown(label, markdownPath) {
    if (markdownPath === undefined) {
        return "";
    }

    const markdown = await fs.readFile(markdownPath, "utf8");

    return `# ${label}\n\n${markdown}`;
}

export async function summarizeRecord(paths) {
    const client = createClient();
    const prompt = await fs.readFile("./prompts/summarize.md", "utf8");
    const markdown = [
        await readOptionalMarkdown("TLP", paths.tlp),
        await readOptionalMarkdown("TIL", paths.til),
    ].filter(Boolean).join("\n\n---\n\n");

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

    return parseAnalysisResponse(response.output_text);
}

export function parseAnalysisResponse(outputText) {
    try {
        return JSON.parse(outputText);
    } catch (error) {
        throw new Error("Generated AI response must be valid JSON.", {
            cause: error,
        });
    }
}
