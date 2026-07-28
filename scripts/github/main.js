import fs from "fs/promises";
import path from "path";

import { getChangedFiles } from "./git.js";
import { summarizeRecord } from "./llm.js";
import {
    loadPosts,
    savePosts,
    upsertPost,
    removePost,
} from "./posts.js";

const PROD_DIRECTORY = "../prod";
const REVIEW_DIRECTORY = "Reviews";
const DEFAULT_HASHTAGS = [
    "LG CNS 6기",
    "개발자",
    "LGNSINSPIRECMAP",
];

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
    const reviewPath = createRecordPath(REVIEW_DIRECTORY, date);

    if (await pathExists(tlpPath)) {
        paths.tlp = tlpPath;
    }

    if (await pathExists(tilPath)) {
        paths.til = tilPath;
    }

    if (await pathExists(path.join(PROD_DIRECTORY, reviewPath))) {
        paths.review = reviewPath;
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

function normalizeMarkdownList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(item => String(item).replace(/\s+/g, " ").trim())
        .filter(Boolean);
}

function createMarkdownList(items, fallback) {
    const listItems = items.length === 0
        ? [fallback]
        : items;

    return listItems
        .map(item => `- ${item}`)
        .join("\n");
}

function createReviewMarkdown(date, review) {
    const overview = String(review?.overview ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const strengths = normalizeMarkdownList(review?.strengths);
    const improvements = normalizeMarkdownList(review?.improvements);
    const nextActions = normalizeMarkdownList(review?.nextActions);

    return [
        `# AI 학습 점검 - ${date}`,
        "",
        "## 종합",
        "",
        overview || "TLP와 TIL을 바탕으로 오늘의 학습 흐름을 점검했습니다.",
        "",
        "## 잘한 점",
        "",
        createMarkdownList(strengths, "계획과 회고를 함께 남겨 학습 흐름을 추적할 수 있습니다."),
        "",
        "## 보완할 점",
        "",
        createMarkdownList(improvements, "다음 기록에서 실행 결과와 근거를 더 구체적으로 남기면 좋습니다."),
        "",
        "## 다음 액션",
        "",
        createMarkdownList(nextActions, "다음 학습 계획에 오늘의 보완점을 반영합니다."),
        "",
    ].join("\n");
}

async function saveReview(date, review) {
    const reviewPath = createRecordPath(REVIEW_DIRECTORY, date);
    const outputPath = path.join(PROD_DIRECTORY, reviewPath);

    await fs.mkdir(path.dirname(outputPath), {
        recursive: true,
    });
    await fs.writeFile(
        outputPath,
        createReviewMarkdown(date, review),
        "utf8"
    );

    return reviewPath;
}

async function removeReview(date) {
    const reviewPath = createRecordPath(REVIEW_DIRECTORY, date);

    try {
        await fs.unlink(path.join(PROD_DIRECTORY, reviewPath));
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
}

function createFallbackMetadata(date, existingPost) {
    return {
        title: existingPost?.title ?? date,
        summary: existingPost?.summary ?? "TIL이 작성되어 있지 않은 학습 계획 기록",
        tags: existingPost?.tags ?? [],
        hashtags: DEFAULT_HASHTAGS,
    };
}

function pickMetadata(analysis, fallback) {
    return {
        title: String(analysis.title ?? fallback.title).trim() || fallback.title,
        summary: String(analysis.summary ?? fallback.summary).trim() || fallback.summary,
        tags: Array.isArray(analysis.tags)
            ? analysis.tags.map(tag => String(tag).trim()).filter(Boolean)
            : fallback.tags,
    };
}

async function createPost(date, existingPost, shouldSummarize) {
    const paths = await collectRecordPaths(date);
    const recordPath = paths.review ?? paths.til ?? paths.tlp;

    if (recordPath === undefined) {
        return null;
    }

    const fallbackMetadata = createFallbackMetadata(date, existingPost);
    let metadata = fallbackMetadata;

    if (paths.til !== undefined && shouldSummarize) {
        const analysis = await summarizeRecord(paths);

        metadata = pickMetadata(analysis, fallbackMetadata);

        if (paths.tlp !== undefined) {
            paths.review = await saveReview(date, analysis.review);
        }
    }

    if (paths.tlp === undefined || paths.til === undefined) {
        await removeReview(date);
        delete paths.review;
    }

    const status = inferStatus(paths);
    const statusMeta = RECORD_STATUS[status];
    const primaryPath = paths.review ?? paths.til ?? paths.tlp;

    return {
        ...metadata,
        hashtags: DEFAULT_HASHTAGS,
        date,
        status,
        statusMessage: statusMeta.message,
        completionLabel: statusMeta.completionLabel,
        completionLevel: statusMeta.level,
        paths,
        path: primaryPath,
    };
}

function isReviewablePath(path) {
    return (
        path?.startsWith("TLP/") === true ||
        path?.startsWith("TIL/") === true
    );
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

    changedRecord.shouldSummarize ||= isReviewablePath(path);
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
