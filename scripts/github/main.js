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

async function collectDates() {
    if (process.env.SUMMARY_DATE) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(process.env.SUMMARY_DATE)) {
            throw new Error("SUMMARY_DATE must use YYYY-MM-DD.");
        }
        return [process.env.SUMMARY_DATE];
    }

    if (process.argv.includes("--all")) {
        const files = await fs.readdir("TIL", { recursive: true });
        return files.filter((file) => file.endsWith(".md"))
            .map((file) => file.match(/\d{4}-\d{2}-\d{2}/)?.[0])
            .filter((date) => date !== undefined);
    }

    return getChangedFiles().flatMap((file) => (
        file.status === "R" ? [file.oldPath, file.newPath] : [file.path]
    )).filter((file) => file.startsWith("TIL/") && file.endsWith(".md"))
        .flatMap((file) => file.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? []);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    collectDates().then(async (dates) => {
        if (dates.length === 0) {
            console.log("변경된 TIL Markdown 파일이 없습니다.");
            return;
        }
        await syncRecords(dates);
    }).catch((error) => {
        console.error("학습 기록 요약 갱신 중 오류가 발생했습니다.", error);
        process.exitCode = 1;
    });
}
