const MAX_TITLE_LENGTH = 50;
const MAX_SUMMARY_LENGTH = 90;
const MAX_TAG_COUNT = 5;

function normalizeText(value) {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

function truncateText(label, value, maxLength) {
    if (value.length <= maxLength) {
        return value;
    }

    console.warn(`${label} exceeded ${maxLength} characters. Truncating.`);

    return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function normalizeRequiredText(label, value, fallback, maxLength) {
    const text = normalizeText(value);
    const fallbackText = normalizeText(fallback);
    const normalized = text || fallbackText;

    if (normalized.length === 0) {
        throw new Error(`Generated ${label} is empty.`);
    }

    return truncateText(label, normalized, maxLength);
}

function normalizeTags(value, fallback) {
    const source = Array.isArray(value)
        ? value
        : Array.isArray(fallback)
            ? fallback
            : [];
    const tags = [];
    const seen = new Set();

    for (const item of source) {
        const tag = normalizeText(item);
        const key = tag.toLowerCase();

        if (tag.length === 0 || seen.has(key)) {
            continue;
        }

        seen.add(key);
        tags.push(tag);
    }

    if (tags.length > MAX_TAG_COUNT) {
        console.warn(`tags exceeded ${MAX_TAG_COUNT} items. Truncating.`);
    }

    return tags.slice(0, MAX_TAG_COUNT);
}

export function normalizeMetadata(analysis, fallback) {
    if (
        analysis === null ||
        typeof analysis !== "object" ||
        Array.isArray(analysis)
    ) {
        throw new Error("Generated metadata must be an object.");
    }

    return {
        title: normalizeRequiredText(
            "title",
            analysis.title,
            fallback.title,
            MAX_TITLE_LENGTH
        ),
        summary: normalizeRequiredText(
            "summary",
            analysis.summary,
            fallback.summary,
            MAX_SUMMARY_LENGTH
        ),
        tags: normalizeTags(analysis.tags, fallback.tags),
    };
}
