const text = node => node.value ?? node.children?.map(text).join("") ?? "";
const element = (tagName, properties, children) => ({ type: "element", tagName, properties, children });
const literal = value => ({ type: "text", value });

function visit(node, handler) {
    handler(node);
    node.children?.forEach(child => visit(child, handler));
}

function transformCode(node) {
    if (node.tagName !== "pre") return;
    if (node.properties?.["data-reading-processed"]) return;
    node.properties["data-reading-processed"] = "true";
    const code = node.children?.find(child => child.tagName === "code");
    if (!code) return;
    const source = node.properties?.["data-source"] ?? text(code);
    const language = node.properties?.["data-language"] ?? "text";
    const meta = node.properties?.["data-meta"] ?? "";
    if (language === "text" && source.split("\n").some(line => /^\s*↓/.test(line))) {
        const steps = [];
        for (const line of source.split("\n")) {
            if (!line.trim()) continue;
            if (/^\s*↓/.test(line)) {
                const step = steps.at(-1);
                if (step) step.children.push(element("p", { className: ["flow-reason"] }, [literal(line.trim().replace(/^↓\s*/, ""))]));
            } else {
                steps.push(element("li", {}, [element("p", { className: ["flow-step"] }, [literal(line.trim())])]));
            }
        }
        node.tagName = "ol";
        node.properties = { className: ["text-flow"] };
        node.children = steps;
        return;
    }
    if (language === "mermaid") return;
    const ranges = [...meta.matchAll(/\{([\d, -]+)\}/g)].flatMap(match => match[1].split(",")).flatMap(range => {
        const [start, end = start] = range.trim().split("-").map(Number);
        return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
    });
    const lines = code.children?.filter(child => child.tagName === "span" && (child.properties?.class === "line" || child.properties?.className?.includes("line")));
    lines?.forEach((line, index) => {
        line.properties["data-line"] = index + 1;
        if (ranges.includes(index + 1)) { line.properties.className = ["line", "highlighted-line"]; delete line.properties.class; }
    });
    const pre = { ...node };
    node.tagName = "div";
    node.properties = { className: ["code-panel"], "data-code-panel": "", "data-language": language, "data-source": source };
    const title = meta.match(/title=["']([^"']+)["']/)?.[1];
    node.children = [element("div", { className: ["code-header"] }, [
        element("span", { className: ["code-language"] }, [literal(language.toUpperCase())]),
        ...(title ? [element("span", { className: ["code-filename"] }, [literal(title)])] : []),
    ]), pre];
}

export function rehypeReading() {
    return tree => {
        visit(tree, node => {
            if (node.type !== "element") return;
            transformCode(node);
            if (node.tagName === "h3" || node.tagName === "h4") {
                const first = node.children?.[0];
                const match = first?.type === "text" ? first.value.match(/^(\d+(?:\.\d+)*)\.?\s+(.+)/s) : null;
                if (match) {
                    node.properties["data-heading-number"] = match[1];
                    node.properties.className = [node.tagName === "h3" ? "chapter-heading" : "section-heading-original"];
                    first.value = match[2];
                    node.children.unshift(element("span", { className: ["heading-number"] }, [literal(match[1])]));
                }
            }
            if (node.tagName === "p" && node.children?.length === 1 && node.children[0].tagName === "strong") node.properties.className = ["strong-paragraph"];
            if (node.tagName === "blockquote") {
                const paragraph = node.children?.find(child => child.tagName === "p");
                const first = paragraph?.children?.[0];
                const match = first?.type === "text" ? first.value.match(/^\[!(NOTE|TIP|WARNING)\]\s*/) : null;
                if (match) {
                    first.value = first.value.slice(match[0].length);
                    node.properties.className = ["callout", `callout-${match[1].toLowerCase()}`];
                    node.children.unshift(element("p", { className: ["callout-label"] }, [literal({ NOTE: "참고", TIP: "확인 팁", WARNING: "주의" }[match[1]])]));
                }
            }
        });
        const grouped = [];
        let section;
        let insights = false;
        for (const node of tree.children) {
            if (node.tagName === "h2") insights = /오늘 이해한 핵심/.test(text(node));
            if (insights && node.tagName === "ol") node.properties.className = ["insight-list"];
            if (/^h[1-4]$/.test(node.tagName ?? "")) section = undefined;
            if (node.tagName === "h4") {
                section = element("div", { className: ["subsection"], "data-subsection": "" }, [node,
                    element("div", { className: ["subsection-content"] }, [])]);
                grouped.push(section);
            } else if (section) section.children[1].children.push(node);
            else grouped.push(node);
        }
        tree.children = grouped;
    };
}
