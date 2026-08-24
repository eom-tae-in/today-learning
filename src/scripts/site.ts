const storageKey = "today-learning-theme";

export {};

type Theme = "light" | "dark";

function getStoredTheme(): Theme | null {
    const value = window.localStorage.getItem(storageKey);

    if (value === "light" || value === "dark") {
        return value;
    }

    return null;
}

function getPreferredTheme(): Theme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
    document.documentElement.dataset["theme"] = theme;
    document.querySelector<HTMLMetaElement>("[data-theme-color]")?.setAttribute(
        "content",
        theme === "dark" ? "#0c1018" : "#f6f8fc"
    );
    document.querySelector<HTMLButtonElement>("[data-theme-toggle]")?.setAttribute(
        "aria-pressed",
        theme === "dark" ? "true" : "false"
    );
    document.querySelector("[data-theme-toggle-icon]")?.replaceChildren(
        document.createTextNode(theme === "dark" ? "☾" : "☼")
    );
}

function initializeTheme(): void {
    const theme = getStoredTheme() ?? getPreferredTheme();

    applyTheme(theme);

    document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
        const currentTheme = document.documentElement.dataset["theme"] === "dark" ? "dark" : "light";
        const nextTheme = currentTheme === "dark" ? "light" : "dark";

        window.localStorage.setItem(storageKey, nextTheme);
        applyTheme(nextTheme);
        void renderMermaid();
    });
}

function initializeRecordFilters(): void {
    const search = document.querySelector<HTMLInputElement>("[data-record-search]");
    const year = document.querySelector<HTMLSelectElement>("[data-year-filter]");
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-record-card]"));
    const empty = document.querySelector<HTMLElement>("[data-empty-results]");

    if (cards.length === 0) {
        return;
    }

    const update = (): void => {
        const query = search?.value.trim().toLowerCase() ?? "";
        const selectedYear = year?.value ?? "all";
        let visibleCount = 0;

        cards.forEach((card) => {
            const matchesQuery = query.length === 0 || card.dataset["search"]?.includes(query) === true;
            const matchesYear = selectedYear === "all" || card.dataset["year"] === selectedYear;
            const isVisible = matchesQuery && matchesYear;

            card.hidden = !isVisible;

            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (empty !== null) {
            empty.hidden = visibleCount > 0;
        }
    };

    search?.addEventListener("input", update);
    year?.addEventListener("change", update);
}

function initializeGraph(): void {
    const select = document.querySelector<HTMLSelectElement>("[data-graph-year-select]");
    const titleYear = document.querySelector<HTMLElement>("[data-graph-title-year]");
    const graphs = Array.from(document.querySelectorAll<HTMLElement>("[data-graph-year]"));
    const previewDate = document.querySelector<HTMLElement>("[data-graph-preview-date]");
    const previewTitle = document.querySelector<HTMLElement>("[data-graph-preview-title]");
    const previewSummary = document.querySelector<HTMLElement>("[data-graph-preview-summary]");
    const previewStatus = document.querySelector<HTMLElement>("[data-graph-preview-status]");
    const previewLink = document.querySelector<HTMLAnchorElement>("[data-graph-preview-link]");
    const records = Array.from(document.querySelectorAll<HTMLElement>("[data-graph-record]"));

    if (select === null || graphs.length === 0) {
        return;
    }

    const showYear = (): void => {
        const selectedYear = select.value;

        graphs.forEach((graph) => {
            graph.hidden = graph.dataset["graphYear"] !== selectedYear;
        });

        if (titleYear !== null) {
            titleYear.textContent = selectedYear;
        }
    };

    const selectRecord = (target: HTMLElement): void => {
        records.forEach((record) => {
            const isSelected = record === target;

            record.classList.toggle("is-selected", isSelected);
            record.setAttribute("aria-pressed", isSelected ? "true" : "false");
        });

        if (previewDate !== null) {
            previewDate.textContent = target.dataset["date"] ?? "기록 선택";
        }

        if (previewTitle !== null) {
            previewTitle.textContent = target.dataset["title"] ?? "학습 흐름을 확인하세요.";
        }

        if (previewSummary !== null) {
            previewSummary.textContent = target.dataset["summary"] ?? "";
        }

        if (previewStatus !== null) {
            previewStatus.textContent = target.dataset["status"] ?? "";
        }

        if (previewLink !== null) {
            previewLink.href = target instanceof HTMLAnchorElement ? target.href : "#";
            previewLink.hidden = false;
        }
    };

    select.addEventListener("change", showYear);
    records.forEach((record) => {
        record.addEventListener("mouseenter", () => selectRecord(record));
        record.addEventListener("focus", () => selectRecord(record));
        record.addEventListener("click", (event) => {
            event.preventDefault();
            selectRecord(record);
        });
    });

    if (records[0] !== undefined) {
        selectRecord(records[0]);
    }
}

function initializeReaderTabs(): void {
    const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-reader-tab]"));
    const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-reader-panel]"));

    if (tabs.length === 0 || panels.length === 0) {
        return;
    }

    const showPanel = (id: string): void => {
        tabs.forEach((tab) => {
            const isCurrent = tab.dataset["readerTab"] === id;

            if (isCurrent) {
                tab.setAttribute("aria-current", "page");
                tab.setAttribute("aria-pressed", "true");
            } else {
                tab.removeAttribute("aria-current");
                tab.setAttribute("aria-pressed", "false");
            }
        });

        panels.forEach((panel) => {
            panel.hidden = panel.dataset["readerPanel"] !== id;
        });
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", (event) => {
            const id = tab.dataset["readerTab"];

            if (id === undefined) {
                return;
            }

            event.preventDefault();
            showPanel(id);
            history.replaceState(null, "", `#${id}`);
        });
    });

    const initialId = window.location.hash.slice(1) || tabs[0]?.dataset["readerTab"];

    if (initialId !== undefined) {
        showPanel(initialId);
    }
}

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

async function renderMermaid(): Promise<void> {
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

function initializeCopyButtons(): void {
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

document.addEventListener("DOMContentLoaded", () => {
    initializeTheme();
    initializeRecordFilters();
    initializeGraph();
    initializeReaderTabs();
    initializeCopyButtons();
    void renderMermaid();
});
