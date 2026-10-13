/** @typedef {{ readonly depth: number; readonly number: string; readonly title: string }} TocHeading */
/** @typedef {{ readonly index: number; readonly parent: number; readonly visible: boolean; readonly current: boolean; readonly passed: boolean; readonly folded: boolean }} TocItemState */
/** @typedef {{ readonly parent: number; readonly chapter: number }} TocRelation */
/** @typedef {{ readonly parent: number; readonly first: number; readonly last: number; readonly count: number; readonly label: string; readonly title: string }} TocRange */

/** @param {TocHeading} heading */
const fullTitle = heading => [heading.number, heading.title].filter(Boolean).join(" ");

/** @param {TocHeading} first @param {TocHeading} last @param {number} count */
export function formatRangeLabel(first, last, count) {
    const numbers = first.number && last.number ? (count === 1 || first.number === last.number ? first.number : `${first.number} – ${last.number}`) : "";
    return [numbers, `지난 소주제 ${count}개`].filter(Boolean).join(" · ");
}

/** @param {TocHeading} first @param {TocHeading} last */
export function formatRangeTitle(first, last) {
    return [...new Set([fullTitle(first), fullTitle(last)])].join(" – ");
}

/** @param {readonly TocHeading[]} headings @returns {TocRelation[]} */
export function findTocParents(headings) {
    let section = -1;
    let chapter = -1;
    return headings.map((heading, index) => {
        if (heading.depth === 2) { section = index; chapter = -1; }
        if (heading.depth === 3) chapter = index;
        return { parent: heading.depth === 4 ? (chapter >= 0 ? chapter : section) : -1, chapter: heading.depth === 2 ? -1 : chapter };
    });
}

/** @param {readonly TocHeading[]} headings @param {number} currentIndex @param {readonly TocRelation[]} relations */
export function describeToc(headings, currentIndex, relations = findTocParents(headings)) {
    const current = headings[currentIndex];
    const currentRelation = relations[currentIndex];
    /** @type {number | null} */
    const currentParent = current === undefined || currentRelation === undefined ? null : current.depth === 4 ? currentRelation.parent : currentIndex;
    const currentChapter = currentRelation?.chapter ?? -1;
    /** @type {TocItemState[]} */
    const items = headings.map((heading, index) => {
        const parent = relations[index]?.parent ?? -1;
        const isCurrent = index === currentIndex;
        if (heading.depth !== 4) return { index, parent, visible: true, current: isCurrent, passed: heading.depth === 3 && index < currentIndex && index !== currentChapter, folded: false };
        const visible = parent === currentParent;
        return { index, parent, visible, current: isCurrent, passed: false, folded: visible && index < currentIndex };
    });
    const folded = items.filter(item => item.folded).map(item => item.index);
    const first = headings[folded[0] ?? -1];
    const last = headings[folded.at(-1) ?? -1];
    /** @type {TocRange | null} */
    const range = currentParent !== null && first && last ? { parent: currentParent, first: folded[0] ?? -1, last: folded.at(-1) ?? -1, count: folded.length, label: formatRangeLabel(first, last, folded.length), title: formatRangeTitle(first, last) } : null;
    return { items, range, currentParent };
}
