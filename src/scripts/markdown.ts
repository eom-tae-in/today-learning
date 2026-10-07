import { action, icon, initializeMedia, openMedia } from "./dom";
import { initializeCodeBlocks } from "./code-blocks";
import { initializeTables } from "./tables";

let rendering: Promise<void> = Promise.resolve();
let revision = 0;

function showMermaidSource(diagram: HTMLElement, source: string): void {
    const figure = diagram.closest("figure");
    if (!figure) return;
    const fallback = document.createElement("div"); fallback.className = "code-panel"; fallback.dataset["codePanel"] = ""; fallback.dataset["source"] = source; fallback.dataset["language"] = "mermaid";
    const header = document.createElement("div"); header.className = "code-header"; const label = document.createElement("span"); label.className = "code-language"; label.textContent = "MERMAID"; header.append(label);
    const pre = document.createElement("pre"); const code = document.createElement("code"); code.textContent = source; pre.append(code); fallback.append(header, pre); figure.replaceWith(fallback);
}

export function renderMermaid(): Promise<void> {
    const requested = ++revision;
    rendering = rendering.then(async () => {
        if (requested !== revision) return;
        const diagrams = [...document.querySelectorAll<HTMLElement>(".mermaid")];
        if (!diagrams.length) return;
        const module = await import("mermaid").catch((error: unknown) => {
            if (!(error instanceof Error)) throw error;
            diagrams.forEach(diagram => showMermaidSource(diagram, diagram.dataset["source"] ?? diagram.textContent ?? ""));
            initializeCodeBlocks();
            return undefined;
        });
        if (!module) return;
        const mermaid = module.default;
        const styles = getComputedStyle(document.documentElement);
        const color = (token: string): string => styles.getPropertyValue("--" + token).trim();
        mermaid.initialize({
            startOnLoad: false, securityLevel: "strict", theme: "base",
            themeVariables: {
                fontFamily: styles.getPropertyValue("--font-sans"), fontSize: "14px",
                background: color("surface"), primaryColor: color("surface-soft"), primaryBorderColor: color("border-strong"),
                primaryTextColor: color("text-primary"), secondaryColor: color("primary-soft"), secondaryBorderColor: color("border-brand"),
                secondaryTextColor: color("text-primary"), tertiaryColor: color("surface"), tertiaryTextColor: color("text-primary"),
                lineColor: color("text-tertiary"), textColor: color("text-primary"), nodeTextColor: color("text-primary"),
                edgeLabelBackground: color("surface"), clusterBkg: color("surface-soft"), clusterBorder: color("border"),
                actorBkg: color("surface-soft"), actorBorder: color("border-strong"), actorTextColor: color("text-primary"),
                signalColor: color("text-tertiary"), signalTextColor: color("text-primary"),
                noteBkgColor: color("primary-soft"), noteTextColor: color("text-primary"), noteBorderColor: color("border-brand"),
            },
        });
        for (const [index, diagram] of diagrams.entries()) {
            const source = diagram.dataset["source"] ?? diagram.textContent?.trim() ?? "";
            if (!source) continue;
            diagram.dataset["source"] = source;
            const figure = diagram.closest<HTMLElement>("figure");
            if (!figure) continue;
            if (!figure.querySelector(".mermaid-header")) {
                const header = document.createElement("div"); header.className = "mermaid-header";
                const label = document.createElement("span"); label.textContent = "MERMAID"; header.append(label);
                const sourceButton = action("원본 보기", "mermaid-source-button"); sourceButton.prepend(icon("source", 14)); sourceButton.setAttribute("aria-expanded", "false");
                const zoom = action("크게 보기", "mermaid-zoom-button"); zoom.prepend(icon("zoom", 14));
                const pre = document.createElement("pre"); pre.className = "mermaid-source"; pre.hidden = true; const code = document.createElement("code"); code.textContent = source; pre.append(code);
                sourceButton.addEventListener("click", () => { pre.hidden = !pre.hidden; sourceButton.setAttribute("aria-expanded", String(!pre.hidden)); sourceButton.replaceChildren(icon("source", 14), pre.hidden ? "원본 보기" : "원본 닫기"); });
                zoom.addEventListener("click", () => openMedia(diagram));
                header.append(sourceButton, zoom); figure.prepend(header); figure.append(pre);
            }
            const id = `mermaid-${requested}-${index}`;
            try {
                const result = await mermaid.render(id, source); diagram.innerHTML = result.svg;
                const svg = diagram.querySelector("svg");
                if (svg) {
                    svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "학습 흐름도");
                    const width = svg.viewBox.baseVal.width;
                    diagram.style.setProperty("--diagram-width", `${width}px`);
                    diagram.classList.toggle("is-wide", width > diagram.clientWidth - 48);
                }
            }
            catch (error) {
                if (!(error instanceof Error)) throw error;
                document.getElementById("d" + id)?.remove(); document.getElementById(id)?.remove();
                showMermaidSource(diagram, source); initializeCodeBlocks();
            }
        }
    });
    return rendering;
}

export function initializeMarkdown(): void {
    initializeCodeBlocks(); initializeTables(); initializeMedia();
    document.querySelectorAll<HTMLImageElement>(".markdown-body img").forEach(image => {
        const figure = document.createElement("figure"); figure.className = "image-figure"; const button = action("", "image-zoom-button"); button.setAttribute("aria-label", image.alt ? image.alt + " 크게 보기" : "이미지 크게 보기");
        const parent = image.parentElement; image.before(figure); button.append(image); figure.append(button);
        if (image.alt) { const caption = document.createElement("figcaption"); caption.textContent = image.alt; figure.append(caption); }
        if (parent?.tagName === "P" && parent.childNodes.length === 1) parent.replaceWith(figure);
        button.addEventListener("click", () => openMedia(image));
    });
}
