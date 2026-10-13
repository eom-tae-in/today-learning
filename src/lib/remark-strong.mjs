const delimiterPattern = /(?<!\*)\*\*(?!\*)/g;
const escapedAsteriskPattern = /\\\*|&(?:ast|#0*42|#x0*2a);/i;
const isWhitespace = character => /\s/u.test(character);

function hasEscapedAsterisk(node, source) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    return typeof source === "string" && start !== undefined && end !== undefined && escapedAsteriskPattern.test(source.slice(start, end));
}

function touchesContent(sibling, side) {
    if (!sibling || sibling.type === "break") return false;
    if (sibling.type !== "text") return true;
    const character = side === "end" ? sibling.value.at(-1) : sibling.value[0];
    return character !== undefined && !isWhitespace(character);
}

function findDelimiters(children, source) {
    return children.flatMap((child, index) => {
        if (child.type !== "text" || hasEscapedAsterisk(child, source)) return [];
        return [...child.value.matchAll(delimiterPattern)].map(match => {
            const afterOffset = match.index + 2;
            const canClose = match.index > 0 ? !isWhitespace(child.value[match.index - 1]) : touchesContent(children[index - 1], "end");
            const canOpen = afterOffset < child.value.length ? !isWhitespace(child.value[afterOffset]) : touchesContent(children[index + 1], "start");
            return { index, offset: match.index, canOpen, canClose, role: undefined };
        });
    });
}

function pairDelimiters(delimiters) {
    const openers = [];
    for (const delimiter of delimiters) {
        if (delimiter.canClose && openers.length) {
            openers.pop().role = "open";
            delimiter.role = "close";
        } else if (delimiter.canOpen) openers.push(delimiter);
    }
    return delimiters.filter(delimiter => delimiter.role);
}

function wrapPairs(children, marks) {
    const wrapped = [];
    const containers = [wrapped];
    const append = node => containers.at(-1).push(node);
    children.forEach((child, index) => {
        const childMarks = marks.filter(mark => mark.index === index);
        if (!childMarks.length) return append(child);
        let start = 0;
        for (const mark of childMarks) {
            if (mark.offset > start) append({ type: "text", value: child.value.slice(start, mark.offset) });
            if (mark.role === "open") {
                const strong = { type: "strong", children: [] };
                append(strong);
                containers.push(strong.children);
            } else containers.pop();
            start = mark.offset + 2;
        }
        if (start < child.value.length) append({ type: "text", value: child.value.slice(start) });
    });
    return wrapped;
}

export function repairStrong(node, source) {
    if (!node.children) return;
    const marks = pairDelimiters(findDelimiters(node.children, source));
    if (marks.length) node.children = wrapPairs(node.children, marks);
    node.children.forEach(child => repairStrong(child, source));
}
