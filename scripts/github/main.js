import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { getChangedFiles } from "./git.js";
import { summarizeRecord } from "./llm.js";
import { normalizeMetadata } from "./metadata.js";
import { loadPosts, savePosts, upsertPost, removePost } from "./posts.js";

const DEFAULT_HASHTAGS = ["LG CNS 6기", "개발자", "LGNSINSPIRECMAP"];

function createRecordPath(date) {
    const [year, month] = date.split("-");
    return `TIL/${year}/${month}/${date}.md`;
}

async function listRecordDates() {
    let files;
    try {
        files = await fs.readdir("TIL", { recursive: true });
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
        return [];
    }

    return files.flatMap((file) => {
        const date = file.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        return date !== undefined && `TIL/${file}` === createRecordPath(date) ? [date] : [];
    });
}

async function collectRequestedDates(listChangedFiles) {
    if (process.env.SUMMARY_DATE) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(process.env.SUMMARY_DATE)) {
            throw new Error("SUMMARY_DATE must use YYYY-MM-DD.");
        }
        return [process.env.SUMMARY_DATE];
    }

    if (process.argv.includes("--all")) {
        return listRecordDates();
    }

    return listChangedFiles().flatMap((file) => (
        file.status === "R" ? [file.oldPath, file.newPath] : [file.path]
    )).filter((file) => file.startsWith("TIL/") && file.endsWith(".md"))
        .flatMap((file) => file.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? []);
}

async function findUnsummarizedDates() {
    const summarizedDates = new Set((await loadPosts()).map((post) => post.date));
    return (await listRecordDates()).filter((date) => !summarizedDates.has(date));
}

export async function collectDates({ listChangedFiles = getChangedFiles } = {}) {
    const requestedDates = await collectRequestedDates(listChangedFiles);
    const unsummarizedDates = await findUnsummarizedDates();

    if (unsummarizedDates.length > 0) {
        console.log(`posts.json에 없는 TIL을 함께 처리합니다: ${unsummarizedDates.join(", ")}`);
    }

    return [...new Set([...requestedDates, ...unsummarizedDates])];
}

export async function syncRecords(dates, summarize = summarizeRecord) {
    const posts = await loadPosts();

    for (const date of new Set(dates)) {
        const til = createRecordPath(date);
        try {
            await fs.access(til);
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
            removePost(posts, date);
            console.log(`삭제 완료: ${date}`);
            continue;
        }

        const existingPost = posts.find((post) => post.date === date);
        const analysis = await summarize({ til });
        const metadata = normalizeMetadata(analysis, {
            title: existingPost?.title ?? date,
            summary: existingPost?.summary ?? date,
            tags: existingPost?.tags ?? [],
        });

        upsertPost(posts, {
            ...metadata,
            date,
            paths: { til },
            hashtags: DEFAULT_HASHTAGS,
        });
        console.log(`갱신 완료: ${date}`);
    }

    await savePosts(posts.toSorted((left, right) => left.date.localeCompare(right.date)));
}

export async function runSync({ listChangedFiles = getChangedFiles, summarize = summarizeRecord } = {}) {
    const dates = await collectDates({ listChangedFiles });
    if (dates.length === 0) {
        console.log("변경된 TIL Markdown 파일이 없습니다.");
        return;
    }
    await syncRecords(dates, summarize);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runSync().catch((error) => {
        console.error("학습 기록 요약 갱신 중 오류가 발생했습니다.", error);
        process.exitCode = 1;
    });
}
