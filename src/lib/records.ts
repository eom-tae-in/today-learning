import { readFile } from "node:fs/promises";
import { getCollection } from "astro:content";
import { z } from "zod";

import { postSchema } from "../../scripts/github/schema.js";

const postsSchema = z.array(postSchema);
const baseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

export type LearningPost = z.infer<typeof postSchema>;
export type LearningRecord = LearningPost & {
    readonly year: string;
    readonly displayDate: string;
};

export async function getLearningRecords(): Promise<readonly LearningRecord[]> {
    const source = await readFile("posts.json", "utf8");
    const posts = postsSchema.parse(JSON.parse(source));
    const entryIds = new Set((await getCollection("record")).map((entry) => entry.id));

    return posts.filter((post) => entryIds.has(getRecordPathId(post.paths.til))).map((post) => ({
        ...post,
        year: post.date.slice(0, 4),
        displayDate: post.date.replaceAll("-", "."),
    })).toSorted((left, right) => right.date.localeCompare(left.date));
}

export async function getLearningRecord(date: string): Promise<LearningRecord | undefined> {
    return (await getLearningRecords()).find((record) => record.date === date);
}

export function getRecordPathId(path: string): string {
    return path.toLowerCase().replace(/\.md$/, "");
}

export function getRecordHref(date: string): string {
    return `${baseUrl}records/${date}/`;
}

export function getTagSlug(tag: string): string {
    return encodeURIComponent(tag).replaceAll("%", "~");
}

export function getTagHref(tag: string): string {
    return `${baseUrl}tags/${getTagSlug(tag)}/`;
}

export function getAvailableYears(records: readonly LearningRecord[]): readonly string[] {
    return Array.from(new Set(records.map((record) => record.year))).toSorted(
        (left, right) => right.localeCompare(left)
    );
}

export function getAllTags(records: readonly LearningRecord[]): readonly string[] {
    return Array.from(new Set(records.flatMap((record) => record.tags))).toSorted(
        (left, right) => left.localeCompare(right, "ko")
    );
}
