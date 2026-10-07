import { initializeCopyButtons, renderMermaid } from "./markdown";

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
    return "light";
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
    document.querySelector<HTMLButtonElement>("[data-theme-toggle]")?.setAttribute(
        "aria-label",
        theme === "dark" ? "라이트 모드로 변경" : "다크 모드로 변경"
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
    const prompt = document.querySelector<HTMLElement>("[data-record-prompt]");
    const list = document.querySelector<HTMLElement>("[data-record-list]");

    if (cards.length === 0 || (search === null && year === null)) {
        return;
    }

    const revealElement = (element: HTMLElement): void => {
        element.hidden = false;
        element.classList.remove("is-visible");
        window.requestAnimationFrame(() => {
            element.classList.add("is-visible");
        });
    };

    const concealElement = (element: HTMLElement): void => {
        element.classList.remove("is-visible");
        element.hidden = true;
    };

    const update = (): void => {
        const query = search?.value.trim().toLowerCase() ?? "";
        const selectedYear = year?.value ?? "all";
        const hasQuery = query.length > 0;
        const isExploring = hasQuery || selectedYear !== "all";
        let visibleCount = 0;

        cards.forEach((card) => {
            const matchesQuery = !hasQuery || card.dataset["search"]?.includes(query) === true;
            const matchesYear = selectedYear === "all" || card.dataset["year"] === selectedYear;
            const isVisible = isExploring && matchesQuery && matchesYear;

            card.hidden = !isVisible;

            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (empty !== null) {
            empty.hidden = !isExploring || visibleCount > 0;
        }

        if (prompt !== null) {
            if (isExploring) {
                concealElement(prompt);
            } else {
                revealElement(prompt);
            }
        }

        if (list !== null) {
            if (isExploring) {
                revealElement(list);
            } else {
                concealElement(list);
            }
        }


    };

    search?.addEventListener("input", update);
    year?.addEventListener("change", update);
    update();
}

function initializeGraph(): void {
    const graphs = Array.from(document.querySelectorAll<HTMLElement>("[data-graph-year]"));
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-graph-year-option]"));
    const currentYear = document.querySelector<HTMLElement>("[data-graph-current-year]");

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const year = button.dataset["graphYearOption"];
            graphs.forEach((graph) => { graph.hidden = graph.dataset["graphYear"] !== year; });
            buttons.forEach((option) => {
                option.setAttribute("aria-pressed", option === button ? "true" : "false");
            });
            if (currentYear !== null) {
                currentYear.textContent = `${year}년 · ${button.dataset["recordCount"]}일의 기록`;
            }
        });
    });
}

function initializeReaderTabs(): void {
    const tabs = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-reader-tab]"));
    const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-reader-panel]"));

    if (tabs.length === 0 || panels.length === 0) {
        return;
    }

    const showPanel = (id: string): void => {
        const selectedId = tabs.some((tab) => tab.dataset["readerTab"] === id) ? id : "summary";
        tabs.forEach((tab) => {
            const isCurrent = tab.dataset["readerTab"] === selectedId;

            if (isCurrent) {
                tab.setAttribute("aria-current", "page");
            } else {
                tab.removeAttribute("aria-current");
            }
        });

        panels.forEach((panel) => {
            const isCurrent = panel.dataset["readerPanel"] === selectedId;

            if (!isCurrent) {
                panel.classList.remove("is-visible");
                panel.hidden = true;
                return;
            }

            panel.hidden = false;
            panel.classList.remove("is-visible");
            window.requestAnimationFrame(() => {
                panel.classList.add("is-visible");
            });
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

    window.addEventListener("hashchange", () => {
        const id = window.location.hash.slice(1);
        if (tabs.some((tab) => tab.dataset["readerTab"] === id)) {
            showPanel(id);
        } else if (document.getElementById(id)?.closest('[data-reader-panel="til"]')) {
            showPanel("til");
        }
    });

    const hash = window.location.hash.slice(1);
    const initialId = document.getElementById(hash)?.closest('[data-reader-panel="til"]') ? "til" : hash || "summary";

    if (initialId !== undefined) {
        showPanel(initialId);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeTheme();
    initializeRecordFilters();
    initializeGraph();
    initializeReaderTabs();
    initializeCopyButtons();
    void renderMermaid();
});
