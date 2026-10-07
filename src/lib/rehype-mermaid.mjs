function visit(node, visitor) {
    if (node === null || typeof node !== "object") {
        return;
    }

    visitor(node);

    if (!Array.isArray(node.children)) {
        return;
    }

    node.children.forEach((child) => {
        visit(child, visitor);
    });
}

function hasMermaidClass(node) {
    const className = node.properties?.className;

    if (!Array.isArray(className)) {
        return false;
    }

    return className.includes("language-mermaid");
}

function getCodeChild(node) {
    const [child] = Array.isArray(node.children) ? node.children : [];

    if (child?.type !== "element" || child.tagName !== "code") {
        return null;
    }

    return node.properties?.["data-language"] === "mermaid" || hasMermaidClass(child) ? child : null;
}

export function rehypeMermaid() {
    return (tree) => {
        visit(tree, (node) => {
            if (node.type !== "element" || node.tagName !== "pre") {
                return;
            }

            const code = getCodeChild(node);

            if (code === null) {
                return;
            }

            const source = node.properties?.["data-source"];
            node.tagName = "figure";
            node.properties = {
                className: ["mermaid-figure"],
            };
            node.children = [
                {
                    type: "element",
                    tagName: "div",
                    properties: {
                        className: ["mermaid"],
                        ...(source === undefined ? {} : { "data-source": source }),
                    },
                    children: [{ type: "element", tagName: "pre", properties: { className: ["mermaid-source"], "data-reading-processed": "true" }, children: [{ type: "element", tagName: "code", properties: {}, children: source === undefined ? code.children ?? [] : [{ type: "text", value: source }] }] }],
                },
            ];
        });
    };
}
