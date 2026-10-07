function text(node) {
    return node.value ?? node.children?.map(text).join("") ?? "";
}

export function remarkReading() {
    return tree => {
        let inReview = false;
        let inMetadata = tree.children[0]?.type === "heading" && tree.children[0].depth === 1;
        tree.children = tree.children.filter((node, index) => {
            if (index === 0 && inMetadata) return false;
            if (node.type === "heading" && node.depth === 2) inReview = /복습할 부분/.test(text(node));
            if (inReview || node.type === "thematicBreak") return false;
            if (inMetadata) {
                if (node.type === "paragraph" && /작성일|학습 언어|핵심 기술/.test(text(node))) return false;
                inMetadata = false;
            }
            return true;
        });
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
