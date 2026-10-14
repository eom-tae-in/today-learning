/** @typedef {{ readonly date: string; readonly tags: readonly string[] }} TaggedRecord */
/** @typedef {{ readonly key: string; readonly label: string; readonly count: number; readonly latest: string }} TagGroup */
/** @typedef {{ count: number; latest: string }} TagUsage */

const collator = new Intl.Collator("ko");

/** @param {string} tag */
export const getTagKey = tag => tag.trim().toLowerCase();

/** @param {TagUsage} usage @param {string} date */
const countUsage = (usage, date) => { usage.count++; if (date > usage.latest) usage.latest = date; };

/** @param {Map<string, TagUsage>} spellings */
function pickLabel(spellings) {
    const ranked = [...spellings].toSorted(([, left], [, right]) => right.count - left.count || right.latest.localeCompare(left.latest));
    return ranked[0]?.[0] ?? "";
}

/** @param {readonly TaggedRecord[]} records @returns {TagGroup[]} */
export function groupTags(records) {
    /** @type {Map<string, { usage: TagUsage; spellings: Map<string, TagUsage> }>} */
    const groups = new Map();
    for (const record of records) {
        const keys = new Set();
        for (const tag of new Set(record.tags.map(tag => tag.trim()).filter(Boolean))) {
            const key = getTagKey(tag);
            const group = groups.get(key) ?? { usage: { count: 0, latest: "" }, spellings: new Map() };
            groups.set(key, group);
            if (!keys.has(key)) { keys.add(key); countUsage(group.usage, record.date); }
            const spelling = group.spellings.get(tag) ?? { count: 0, latest: "" };
            group.spellings.set(tag, spelling); countUsage(spelling, record.date);
        }
    }
    return [...groups].map(([key, group]) => ({ key, label: pickLabel(group.spellings), count: group.usage.count, latest: group.usage.latest }));
}

/** @param {readonly TagGroup[]} groups @param {number} limit */
export function getPopularTagLabels(groups, limit) {
    return groups.toSorted((left, right) => right.count - left.count || right.latest.localeCompare(left.latest)).slice(0, limit).map(group => group.label);
}

/** @param {readonly TagGroup[]} groups */
export function getSortedTagLabels(groups) {
    return groups.map(group => group.label).toSorted(collator.compare);
}

/** @param {string} value @param {readonly string[]} labels */
export function resolveTagLabel(value, labels) {
    const key = getTagKey(value);
    return labels.find(label => getTagKey(label) === key) ?? value.trim();
}

/** @param {readonly string[]} tags @param {string} selected */
export function hasTag(tags, selected) {
    const key = getTagKey(selected);
    return tags.some(tag => getTagKey(tag) === key);
}
