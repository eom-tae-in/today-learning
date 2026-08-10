const VALID_LEVELS = new Set(["excellent", "good", "needs-work"]);
const MAX_EVALUATION_SUMMARY_LENGTH = 90;
const DEFAULT_REVIEW_TEXT = {
    overview: "TLP와 TIL을 바탕으로 오늘의 학습 흐름을 점검했습니다.",
    strengths: "오늘 기록에서는 뚜렷하게 강조할 잘한 점이 보이지 않습니다.",
    improvements: "오늘 기록에서는 뚜렷한 보완할 부분이 보이지 않습니다.",
    nextActions: "오늘 기록에서는 별도의 다음 액션이 뚜렷하게 보이지 않습니다.",
};

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

function toYamlScalar(value) {
    return JSON.stringify(value);
}

function formatDisplayDate(date) {
    return date.replaceAll("-", ".");
}

function truncateEvaluationSummary(summary) {
    if (summary.length <= MAX_EVALUATION_SUMMARY_LENGTH) {
        return summary;
    }

    console.warn(
        `evaluation.summary exceeded ${MAX_EVALUATION_SUMMARY_LENGTH} characters. Truncating.`
    );

    return `${summary.slice(0, MAX_EVALUATION_SUMMARY_LENGTH - 3).trimEnd()}...`;
}

export function normalizeEvaluation(value, date) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Generated evaluation must be an object.");
    }

    const level = String(value?.level ?? "").trim();
    const summary = String(value?.summary ?? "")
        .replace(/\s+/g, " ")
        .trim();

    if (!VALID_LEVELS.has(level)) {
        throw new Error(`Invalid generated evaluation.level: ${level}`);
    }

    if (summary.length === 0) {
        throw new Error("Generated evaluation.summary is empty.");
    }

    return {
        level,
        summary: truncateEvaluationSummary(summary),
        reviewedAt: date,
    };
}

export function createReviewMarkdown(date, review, evaluation) {
    const overview = String(review?.overview ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const strengths = normalizeMarkdownList(review?.strengths);
    const improvements = normalizeMarkdownList(review?.improvements);
    const nextActions = normalizeMarkdownList(review?.nextActions);

    return [
        "---",
        `level: ${toYamlScalar(evaluation.level)}`,
        `summary: ${toYamlScalar(evaluation.summary)}`,
        `reviewedAt: ${toYamlScalar(evaluation.reviewedAt)}`,
        "---",
        "",
        "# 🤖 AI 학습 정리",
        "",
        formatDisplayDate(date),
        "",
        "> 오늘의 TLP와 TIL을 바탕으로 오늘 학습을 한 번 정리해 봅니다.",
        "",
        "## 종합",
        "",
        overview || DEFAULT_REVIEW_TEXT.overview,
        "",
        "## 잘 이어간 점",
        "",
        createMarkdownList(strengths, DEFAULT_REVIEW_TEXT.strengths),
        "",
        "## 다음에 다듬을 점",
        "",
        createMarkdownList(improvements, DEFAULT_REVIEW_TEXT.improvements),
        "",
        "## 다음 액션",
        "",
        createMarkdownList(nextActions, DEFAULT_REVIEW_TEXT.nextActions),
        "",
    ].join("\n");
}
