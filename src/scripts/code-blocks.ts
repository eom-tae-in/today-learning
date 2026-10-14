import { action, copyFeedbackDuration, createFoldRegion, icon, keepInView, releaseView } from "./dom";
import { findCodeBreakPoints } from "../lib/code-wrap.mjs";

function insertBreakPoints(line: HTMLElement): void {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT); const nodes: { readonly node: Text; readonly start: number }[] = []; let text = "";
    for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node instanceof Text && node.data) { nodes.push({ node, start: text.length }); text += node.data; }
    findCodeBreakPoints(text).reverse().forEach(point => {
        const owner = nodes.findLast(({ start }) => start <= point); if (!owner) return;
        const local = point - owner.start; const target = local ? owner.node.splitText(local) : owner.node; target.before(document.createElement("wbr"));
    });
}

export function initializeCodeBlocks(): void {
    document.querySelectorAll<HTMLElement>("[data-code-panel]").forEach(panel => {
        if (panel.dataset["initialized"]) return;
        panel.dataset["initialized"] = "true";
        const pre = panel.querySelector("pre"); const code = pre?.querySelector("code"); const header = panel.querySelector<HTMLElement>(".code-header");
        if (!pre || !code || !header) return;
        const source = panel.dataset["source"] ?? code.textContent ?? "";
        if (!code.querySelector(".line")) {
            code.replaceChildren(...source.replace(/\n$/, "").split("\n").map((value, index) => { const line = document.createElement("span"); line.className = "line"; line.dataset["line"] = String(index + 1); line.textContent = value || " "; return line; }));
        }
        const lines = [...code.querySelectorAll<HTMLElement>(".line")];
        lines.forEach(line => {
            const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT); const first = walker.nextNode();
            const match = first?.textContent?.match(/^[ \t]+/);
            if (first && match) { first.textContent = (first.textContent ?? "").slice(match[0].length); const indent = document.createElement("span"); indent.className = "code-indent"; indent.textContent = match[0]; first.parentNode?.insertBefore(indent, first); }
        });
        panel.classList.toggle("mobile-wrap", ["java", "javascript", "js", "typescript", "ts", "jsx", "tsx", "json", "css", "html", "xml", "c", "cpp", "go", "rust", "kotlin"].includes(panel.dataset["language"] ?? ""));
        const mobile = matchMedia("(max-width: 679px)");
        const isWrapped = (): boolean => panel.classList.contains("wrap-chosen") ? panel.classList.contains("wrap-code") : mobile.matches && panel.classList.contains("mobile-wrap");
        let hasBreakPoints = false;
        const prepareWrap = (): void => { if (hasBreakPoints || !isWrapped()) return; hasBreakPoints = true; lines.forEach(insertBreakPoints); };
        const wrap = action("", "code-wrap-toggle"); wrap.append(icon("wrap", 16)); wrap.setAttribute("aria-label", "코드 줄바꿈 전환"); wrap.setAttribute("aria-pressed", String(isWrapped())); prepareWrap();
        wrap.addEventListener("click", () => { const active = !isWrapped(); panel.classList.toggle("wrap-code", active); panel.classList.add("wrap-chosen"); wrap.setAttribute("aria-pressed", String(active)); prepareWrap(); });
        mobile.addEventListener("change", () => { wrap.setAttribute("aria-pressed", String(isWrapped())); prepareWrap(); });
        const copy = action("복사", "copy-code-button"); copy.prepend(icon("copy", 14));
        copy.addEventListener("click", async () => {
            try { await navigator.clipboard.writeText(source); copy.replaceChildren(icon("check", 14), "복사됨"); }
            catch (error) { if (!(error instanceof DOMException)) throw error; copy.textContent = "복사 실패"; }
            window.setTimeout(() => copy.replaceChildren(icon("copy", 14), "복사"), copyFeedbackDuration);
        });
        header.append(wrap, copy);
        if (lines.length > 15) {
            const rest = document.createElement("span"); rest.className = "code-rest"; const restBody = document.createElement("span"); restBody.className = "code-rest-body"; rest.append(restBody);
            lines[10]?.before(rest); while (rest.nextSibling) restBody.append(rest.nextSibling);
            const label = document.createElement("span"); const fold = action("", "code-fold-button"); fold.append(label, icon("expand", 14)); panel.append(fold);
            const foldRest = createFoldRegion(panel, rest, "code-collapsed");
            const setExpanded = (expanded: boolean, animate: boolean): void => {
                if (expanded) releaseView(); else if (animate) { const top = fold.getBoundingClientRect().top; keepInView(fold, top, top - rest.getBoundingClientRect().height, () => rest.hasAttribute("hidden")); }
                foldRest(expanded, animate); fold.setAttribute("aria-expanded", String(expanded)); label.textContent = expanded ? "코드 접기" : "코드 전체 보기";
            };
            fold.addEventListener("click", () => setExpanded(fold.getAttribute("aria-expanded") !== "true", true));
            rest.addEventListener("beforematch", () => setExpanded(true, false));
            setExpanded(false, false);
        }
    });
}
