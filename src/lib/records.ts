import { readFile } from "node:fs/promises";

import { z } from "zod";

const recordTabSchema = z.enum(["tlp", "til", "review"]);

const recordStatusSchema = z.enum([
    "reviewed",
    "pending-review",
    "missing-tlp",
    "missing-til",
]);

const completionLevelSchema = z.enum([
    "excellent",
    "good",
    "needs-work",
    "not-evaluated",
]);

const recordPathsSchema = z.object({
    tlp: z.string().optional(),
    til: z.string().optional(),
    review: z.string().optional(),
});

const aiEvaluationSchema = z.object({
    level: completionLevelSchema.exclude(["not-evaluated"]),
    summary: z.string(),
    reviewedAt: z.string(),
});

const postSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string(),
    summary: z.string(),
    paths: recordPathsSchema,
    tags: z.array(z.string()).default([]),
    hashtags: z.array(z.string()).default([]),
    aiEvaluation: aiEvaluationSchema.optional(),
});

const postsSchema = z.array(postSchema);
const baseUrl = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

export type RecordTab = z.infer<typeof recordTabSchema>;
export type RecordStatus = z.infer<typeof recordStatusSchema>;
export type CompletionLevel = z.infer<typeof completionLevelSchema>;
export type LearningPost = z.infer<typeof postSchema>;

export type LearningRecord = LearningPost & {
    readonly year: string;
    readonly month: string;
    readonly displayDate: string;
    readonly status: RecordStatus;
    readonly statusLabel: string;
    readonly statusMessage: string;
    readonly completionLevel: CompletionLevel;
    readonly completionLabel: string;
    readonly completionColor: string;
};

const statusCopy: Record<RecordStatus, { readonly label: string; readonly message: string }> = {
    reviewed: {
        label: "AI 정리 완료",
        message: "TLP와 TIL을 바탕으로 AI 학습 정리가 준비되었습니다.",
    },
    "pending-review": {
        label: "AI 정리 대기",
        message: "TLP와 TIL은 작성되어 있지만 AI 학습 정리가 아직 생성되지 않았습니다.",
    },
    "missing-tlp": {
        label: "TLP 없음",
        message: "이 날짜에는 TLP 파일이 연결되어 있지 않습니다.",
    },
    "missing-til": {
        label: "TIL 없음",
        message: "이 날짜에는 TIL 파일이 연결되어 있지 않습니다.",
    },
};

const levelCopy: Record<CompletionLevel, { readonly label: string; readonly color: string }> = {
    excellent: {
        label: "매우 좋음",
        color: "#22c55e",
    },
    good: {
        label: "좋음",
        color: "#5b8def",
    },
    "needs-work": {
        label: "보완 필요",
        color: "#f59e0b",
    },
    "not-evaluated": {
        label: "평가 미진행",
        color: "#94a3b8",
    },
};

function getStatus(post: LearningPost): RecordStatus {
    if (post.paths.review !== undefined && post.aiEvaluation !== undefined) {
        return "reviewed";
    }

    if (post.paths.tlp === undefined) {
        return "missing-tlp";
    }

    if (post.paths.til === undefined) {
        return "missing-til";
    }

    return "pending-review";
}

function getDisplayDate(date: string): string {
    const [year, month, day] = date.split("-");

    if (year === undefined || month === undefined || day === undefined) {
        return date;
    }

    return `${year}.${month}.${day}`;
}

function normalizePost(post: LearningPost): LearningRecord {
    const status = getStatus(post);
    const completionLevel = post.aiEvaluation?.level ?? "not-evaluated";
    const statusDetails = statusCopy[status];
    const levelDetails = levelCopy[completionLevel];
    const [year = "", month = ""] = post.date.split("-");

    return {
        ...post,
        year,
        month,
        displayDate: getDisplayDate(post.date),
        status,
        statusLabel: statusDetails.label,
        statusMessage: statusDetails.message,
        completionLevel,
        completionLabel: levelDetails.label,
        completionColor: levelDetails.color,
    };
}

export async function getLearningRecords(): Promise<readonly LearningRecord[]> {
    const source = await readFile("posts.json", "utf8");
    const posts = postsSchema.parse(JSON.parse(source));

    return posts
        .map(normalizePost)
        .toSorted((left, right) => right.date.localeCompare(left.date));
}

export async function getLearningRecord(date: string): Promise<LearningRecord | undefined> {
    const records = await getLearningRecords();

    return records.find((record) => record.date === date);
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
