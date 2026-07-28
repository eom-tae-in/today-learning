import fs from "fs/promises";

import { getChangedFiles } from "./git.js";
import { summarizeRecord } from "./llm.js";
import {
    loadPosts,
    savePosts,
    upsertPost,
    removePost,
} from "./posts.js";

const RECORD_STATUS = {
    reviewed: {
        label: "AI 점검 완료",
        completionLabel: "평가 완료",
        message: "TLP와 TIL을 바탕으로 AI 학습 점검이 완료되었습니다.",
        level: "reviewed",
    },
    "pending-review": {
        label: "AI 점검 대기",
        completionLabel: "점검 대기",
        message: "TLP와 TIL은 작성되어 있지만 AI 점검이 아직 생성되지 않았어요.",
        level: "not-evaluated",
    },
    "missing-tlp": {
        label: "TLP 없음",
        completionLabel: "평가 미진행",
        message: "TLP가 작성되어 있지 않아 오늘의 계획 이행 여부를 평가하기 어려워요.",
        level: "not-evaluated",
    },
    "missing-til": {
        label: "TIL 없음",
        completionLabel: "평가 미진행",
        message: "TIL이 작성되어 있지 않아 오늘의 학습 결과를 평가하기 어려워요.",
        level: "not-evaluated",
    },
};

function extractDateFromPath(path) {
    return path.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

function createRecordPath(directory, date) {
    const [year, month] = date.split("-");

    return `${directory}/${year}/${month}/${date}.md`;
}

async function pathExists(path) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

async function collectRecordPaths(date) {
    const paths = {};
    const tlpPath = createRecordPath("TLP", date);
    const tilPath = createRecordPath("TIL", date);

    if (await pathExists(tlpPath)) {
        paths.tlp = tlpPath;
    }

    if (await pathExists(tilPath)) {
        paths.til = tilPath;
    }

    return paths;
}

function inferStatus(paths) {
    if (paths.tlp === undefined) {
        return "missing-tlp";
    }

    if (paths.til === undefined) {
        return "missing-til";
    }

    return paths.review === undefined
        ? "pending-review"
        : "reviewed";
}

async function createPost(date, existingPost, shouldSummarize) {
    const paths = await collectRecordPaths(date);
    const path = paths.review ?? paths.til ?? paths.tlp;

    if (path === undefined) {
        return null;
    }

    const metadata = paths.til === undefined || !shouldSummarize
        ? {
            title: existingPost?.title ?? date,
            summary: existingPost?.summary ?? "TIL이 작성되어 있지 않은 학습 계획 기록",
            tags: existingPost?.tags ?? [],
        }
        : await summarizeRecord(paths);
    const status = inferStatus(paths);
    const statusMeta = RECORD_STATUS[status];

    return {
        ...metadata,
        date,
        status,
        statusMessage: statusMeta.message,
        completionLabel: statusMeta.completionLabel,
        completionLevel: statusMeta.level,
        paths,
        path,
    };
}

function isTilPath(path) {
    return path?.startsWith("TIL/") === true;
}

function addChangedRecord(changedRecords, path) {
    const date = extractDateFromPath(path);

    if (date === null) {
        return;
    }

    const changedRecord = changedRecords.get(date) ?? {
        date,
        shouldSummarize: false,
    };

    changedRecord.shouldSummarize ||= isTilPath(path);
    changedRecords.set(date, changedRecord);
}

function collectChangedRecords(changedFiles) {
    const changedRecords = new Map();

    changedFiles.forEach(file => {
        if (file.status === "R") {
            addChangedRecord(changedRecords, file.oldPath);
            addChangedRecord(changedRecords, file.newPath);
            return;
        }

        addChangedRecord(changedRecords, file.path);
    });

    return Array.from(changedRecords.values());
}

async function main() {
    const changedFiles = getChangedFiles();

    if (changedFiles.length === 0) {
        console.log("변경된 학습 기록 Markdown 파일이 없습니다.");
        return;
    }

    const posts = await loadPosts();
    const changedRecords = collectChangedRecords(changedFiles);

    for (const { date, shouldSummarize } of changedRecords) {
        const existingPost = posts.find(post => post.date === date);
        const post = await createPost(
            date,
            existingPost,
            shouldSummarize || existingPost === undefined
        );

        if (post === null) {
            removePost(posts, date);

            console.log(`삭제 완료: ${date}`);
            continue;
        }

        upsertPost(posts, post);

        console.log(`갱신 완료: ${date}`);
    }

    await savePosts(posts);

    console.log("posts.json 저장 완료");
}

main().catch(error => {
    console.error("posts.json 갱신 중 오류가 발생했습니다.");
    console.error(error);

    process.exit(1);
});
