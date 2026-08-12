const VALID_LEVELS = new Set(["excellent", "good", "needs-work"]);
const MAX_EVALUATION_SUMMARY_LENGTH = 90;
const DEFAULT_REVIEW_TEXT = {
    overview: "TLP와 TIL을 바탕으로 오늘의 학습 흐름을 정리했다.",
    summary: "오늘 기록에서 확인되는 핵심 학습 흐름을 간단히 요약했다.",
    keyLearning: "오늘 기록에서 뚜렷한 주요 학습 항목이 보이지 않는다.",
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

function createOptionalSection(title, items) {
    if (items.length === 0) {
        return [];
    }

    return [
        title,
        "",
        createMarkdownList(items),
        "",
    ];
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
    const summary = String(review?.summary ?? "")
        .replace(/\s+/g, " ")
        .trim();
    const keyLearnings = normalizeMarkdownList(review?.keyLearnings);
    const strengths = normalizeMarkdownList(review?.strengths);
    const improvements = normalizeMarkdownList(review?.improvements);

    return [
        "---",
        `level: ${toYamlScalar(evaluation.level)}`,
        `summary: ${toYamlScalar(evaluation.summary)}`,
        `reviewedAt: ${toYamlScalar(evaluation.reviewedAt)}`,
        "---",
        "",
        "# 🤖 AI 학습 리포트",
        "",
        formatDisplayDate(date),
        "",
        "> 오늘의 TLP와 TIL을 바탕으로 학습 흐름을 간단히 리포트합니다.",
        "",
        "## 🧭 종합",
        "",
        overview || DEFAULT_REVIEW_TEXT.overview,
        "",
        "## 📝 요약",
        "",
        summary || DEFAULT_REVIEW_TEXT.summary,
        "",
        "## 📚 주요 학습",
        "",
        createMarkdownList(keyLearnings, DEFAULT_REVIEW_TEXT.keyLearning),
        "",
        ...createOptionalSection("## 👍 잘한 점", strengths),
        ...createOptionalSection("## 🔧 보완할 점", improvements),
    ].join("\n");
}
