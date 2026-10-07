function restoreMermaidSource(diagram: HTMLElement, source: string): void {
    const figure = diagram.closest("figure");
    const fallback = document.createElement("pre");
    const code = document.createElement("code");

    fallback.className = "mermaid-fallback";
    code.className = "language-mermaid";
    code.textContent = source;
    fallback.append(code);
    figure?.replaceWith(fallback);
}

export async function renderMermaid(): Promise<void> {
    document.querySelectorAll<HTMLElement>('pre[data-language="mermaid"]').forEach((block) => {
        const code = block.querySelector("code");
        const source = code?.textContent?.trim();

        if (source === undefined || source.length === 0) {
            return;
        }

        const figure = document.createElement("figure");
        const diagram = document.createElement("div");

        figure.className = "mermaid-figure";
        diagram.className = "mermaid";
        diagram.textContent = source;
        figure.append(diagram);
        block.replaceWith(figure);
    });

    const diagrams = Array.from(document.querySelectorAll<HTMLElement>(".mermaid"));

    if (diagrams.length === 0) {
        return;
    }

    const { default: mermaid } = await import("mermaid");

    mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: document.documentElement.dataset["theme"] === "dark" ? "dark" : "default",
    });

    await Promise.all(diagrams.map(async (diagram, index) => {
        const source = diagram.dataset["source"] ?? diagram.textContent?.trim() ?? "";

        if (source.length === 0) {
            return;
        }

        const diagramId = `mermaid-${Date.now()}-${index}`;

        try {
            const result = await mermaid.render(diagramId, source);

            diagram.dataset["source"] = source;
            diagram.innerHTML = result.svg;
        } catch {
            document.getElementById(`d${diagramId}`)?.remove();
            document.getElementById(diagramId)?.remove();
            restoreMermaidSource(diagram, source);
        }
    }));
}

export function initializeCopyButtons(): void {
    document.querySelectorAll<HTMLElement>(".markdown-body pre").forEach((block) => {
        if (block.querySelector("button") !== null) {
            return;
        }

        const code = block.querySelector("code");

        if (code === null) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy-code-button";
        button.textContent = "복사";
        button.addEventListener("click", async () => {
            await navigator.clipboard.writeText(code.textContent ?? "");
            button.textContent = "완료";
            window.setTimeout(() => {
                button.textContent = "복사";
            }, 1200);
        });

        block.append(button);
    });
}
