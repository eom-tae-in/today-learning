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
import {
    createReviewMarkdown,
    normalizeEvaluation,
} from "./review.js";

const PROD_DIRECTORY = "../prod";
const REVIEW_DIRECTORY = "Reviews";
const DEFAULT_HASHTAGS = [
    "LG CNS 6기",
    "개발자",
    "LGNSINSPIRECMAP",
];

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

async function saveReview(date, review, evaluation) {
    const reviewPath = createRecordPath(REVIEW_DIRECTORY, date);
    const outputPath = path.join(PROD_DIRECTORY, reviewPath);

    await fs.mkdir(path.dirname(outputPath), {
        recursive: true,
    });
    await fs.writeFile(
        outputPath,
        createReviewMarkdown(date, review, evaluation),
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

function shouldCreateMetadata(paths, shouldSummarize) {
    return paths.til !== undefined && shouldSummarize;
}

function shouldCreateReview(paths) {
    return paths.tlp !== undefined && paths.til !== undefined;
}

function hasRecordFile(paths) {
    return paths.tlp !== undefined || paths.til !== undefined;
}

async function createPost(date, existingPost, shouldSummarize) {
    const paths = await collectRecordPaths(date);

    if (!hasRecordFile(paths)) {
        await removeReview(date);
        return null;
    }

    const fallbackMetadata = createFallbackMetadata(date, existingPost);
    let metadata = fallbackMetadata;
    let aiEvaluation = existingPost?.aiEvaluation;

    if (shouldCreateMetadata(paths, shouldSummarize)) {
        const analysis = await summarizeRecord(paths);

        metadata = pickMetadata(analysis, fallbackMetadata);

        if (shouldCreateReview(paths)) {
            aiEvaluation = normalizeEvaluation(analysis.evaluation, date);
            paths.review = await saveReview(date, analysis.review, aiEvaluation);
        }
    }

    if (!shouldCreateReview(paths)) {
        await removeReview(date);
        delete paths.review;
        aiEvaluation = undefined;
    }

    const post = {
        ...metadata,
        hashtags: DEFAULT_HASHTAGS,
        date,
        paths,
    };

    if (aiEvaluation !== undefined) {
        post.aiEvaluation = aiEvaluation;
    }

    return post;
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

function collectRequestedRecords() {
    const date = process.env.REVIEW_DATE;

    if (date === undefined || date.length === 0) {
        return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Invalid REVIEW_DATE: ${date}`);
    }

    return [{
        date,
        shouldSummarize: true,
    }];
}

async function main() {
    const requestedRecords = collectRequestedRecords();
    const changedFiles = requestedRecords === null
        ? getChangedFiles()
        : [];

    if (requestedRecords === null && changedFiles.length === 0) {
        console.log("변경된 학습 기록 Markdown 파일이 없습니다.");
        return;
    }

    const posts = await loadPosts();
    const changedRecords = requestedRecords ?? collectChangedRecords(changedFiles);

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
