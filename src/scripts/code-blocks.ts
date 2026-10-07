import { action, icon } from "./dom";

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
        const wrap = action("", "code-wrap-toggle"); wrap.append(icon("wrap", 16)); wrap.setAttribute("aria-label", "코드 줄바꿈 전환"); wrap.setAttribute("aria-pressed", String(isWrapped()));
        wrap.addEventListener("click", () => { const active = !isWrapped(); panel.classList.toggle("wrap-code", active); panel.classList.add("wrap-chosen"); wrap.setAttribute("aria-pressed", String(active)); });
        mobile.addEventListener("change", () => wrap.setAttribute("aria-pressed", String(isWrapped())));
        const copy = action("복사", "copy-code-button"); copy.prepend(icon("copy", 14));
        copy.addEventListener("click", async () => {
            try { await navigator.clipboard.writeText(source); copy.replaceChildren(icon("check", 14), "복사됨"); }
            catch (error) { if (!(error instanceof DOMException)) throw error; copy.textContent = "복사 실패"; }
            window.setTimeout(() => copy.replaceChildren(icon("copy", 14), "복사"), 1200);
        });
        header.append(wrap, copy);
        if (lines.length > 15) {
            const fold = action("코드 전체 보기", "code-fold-button"); fold.append(icon("expand", 14)); panel.append(fold);
            const setExpanded = (expanded: boolean): void => {
                panel.classList.toggle("code-collapsed", !expanded); fold.setAttribute("aria-expanded", String(expanded)); fold.replaceChildren(expanded ? "코드 접기" : "코드 전체 보기", icon("expand", 14));
                lines.slice(10).forEach(line => { if (expanded) line.removeAttribute("hidden"); else line.setAttribute("hidden", "until-found"); });
            };
            fold.addEventListener("click", () => setExpanded(fold.getAttribute("aria-expanded") !== "true"));
            lines.slice(10).forEach(line => line.addEventListener("beforematch", () => setExpanded(true)));
            setExpanded(false);
        }
    });
}
