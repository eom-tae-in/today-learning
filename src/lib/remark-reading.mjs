function text(node) {
    return node.value ?? node.children?.map(text).join("") ?? "";
}

const isNumbered = heading => /^\d+(?:\.\d+)*\.?\s/.test(text(heading).trim());

function headerLength(nodes) {
    let index = /^(paragraph|blockquote)$/.test(nodes[0]?.type ?? "") && /^\s*📅?\s*작성일/u.test(text(nodes[0])) ? 1 : 0;
    if (nodes[index]?.type !== "heading" || nodes[index].depth !== 1) return index;
    index++;
    while (nodes[index]?.type === "thematicBreak" || (nodes[index]?.type === "paragraph" && /작성일|학습 언어|핵심 기술/.test(text(nodes[index])))) index++;
    if (nodes[index]?.type === "paragraph" && /^오늘 학습한 내용을 기록하고 돌아본다\.?$/.test(text(nodes[index]).trim())) index++;
    return index;
}

function normalizeHeadings(nodes) {
    const headings = nodes.filter(node => node.type === "heading");
    if (!headings.some(heading => heading.depth === 1)) return;
    const chaptered = headings.some(heading => heading.depth === 1 && isNumbered(heading));
    const parents = [];
    for (const heading of headings) {
        const original = heading.depth;
        while (parents.length && parents.at(-1).original >= original) parents.pop();
        const parent = parents.at(-1)?.heading;
        if (original === 1) heading.depth = chaptered && isNumbered(heading) ? 3 : 2;
        else if (original === 2 && chaptered && !(parent && isNumbered(parent))) heading.depth = 2;
        else heading.depth = Math.min((parent?.depth ?? 1) + 1, 6);
        parents.push({ original, heading });
    }
}

function hideReview(nodes) {
    let reviewDepth = 0;
    return nodes.filter(node => {
        if (node.type === "heading") {
            if (node.depth <= reviewDepth) reviewDepth = 0;
            if (!reviewDepth && /복습할 부분/.test(text(node))) reviewDepth = node.depth;
        }
        return !reviewDepth && node.type !== "thematicBreak";
    });
}

export function remarkReading() {
    return tree => {
        const nodes = hideReview(tree.children.slice(headerLength(tree.children)));
        normalizeHeadings(nodes);
        tree.children = nodes;
    };
}

export const readingCodeTransformer = {
    name: "today-learning-code",
    pre(node) {
        node.properties["data-source"] = this.source;
        node.properties["data-language"] = this.options.lang;
        node.properties["data-meta"] = this.options.meta?.__raw ?? "";
    },
};
