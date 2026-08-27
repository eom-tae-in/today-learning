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
    const cardTagLists = Array.from(document.querySelectorAll<HTMLElement>("[data-card-tags]"));

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

        cardTagLists.forEach((tagList) => {
            const cardTags = Array.from(tagList.querySelectorAll<HTMLElement>("[data-card-tag-value]"));
            let visibleCardTagCount = 0;

            cardTags.forEach((tag) => {
                const tagValue = tag.dataset["cardTagValue"] ?? "";
                const isVisible = hasQuery && tagValue.includes(query);

                tag.hidden = !isVisible;

                if (isVisible) {
                    visibleCardTagCount += 1;
                }
            });

            tagList.hidden = visibleCardTagCount === 0;
        });
    };

    search?.addEventListener("input", update);
    year?.addEventListener("change", update);
    update();
}

function initializeGraph(): void {
    const select = document.querySelector<HTMLSelectElement>("[data-graph-year-select]");
    const currentYear = document.querySelector<HTMLElement>("[data-graph-current-year]");
    const graphs = Array.from(document.querySelectorAll<HTMLElement>("[data-graph-year]"));
    const previewDate = document.querySelector<HTMLElement>("[data-graph-preview-date]");
    const previewTitle = document.querySelector<HTMLElement>("[data-graph-preview-title]");
    const previewSummary = document.querySelector<HTMLElement>("[data-graph-preview-summary]");
    const previewStatus = document.querySelector<HTMLElement>("[data-graph-preview-status]");
    const previewLink = document.querySelector<HTMLAnchorElement>("[data-graph-preview-link]");
    const records = Array.from(document.querySelectorAll<HTMLElement>("[data-graph-record]"));
    const yearButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-graph-year-option]"));
    let selectedRecord: HTMLElement | null = null;

    if (select === null || graphs.length === 0) {
        return;
    }

    const showYear = (): void => {
        const selectedYear = select.value;

        graphs.forEach((graph) => {
            graph.hidden = graph.dataset["graphYear"] !== selectedYear;
        });

        if (currentYear !== null) {
            currentYear.textContent = `${selectedYear}년`;
        }

        yearButtons.forEach((button) => {
            button.setAttribute("aria-pressed", button.dataset["graphYearOption"] === selectedYear ? "true" : "false");
        });

        const isSelectedRecordVisible = selectedRecord?.dataset["recordYear"] === selectedYear;

        if (!isSelectedRecordVisible) {
            clearSelection();
        }
    };

    const selectRecord = (target: HTMLElement): void => {
        selectedRecord = target;

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
            previewStatus.textContent = target.dataset["level"] ?? target.dataset["status"] ?? "";
        }

        const preview = document.querySelector<HTMLElement>("[data-graph-preview]");
        const badgesContainer = document.querySelector<HTMLElement>("[data-graph-preview-badges]");
        const aiBadge = document.querySelector<HTMLElement>("[data-ai-badge]");

        if (badgesContainer !== null) {
            badgesContainer.hidden = false;
            if (aiBadge !== null) {
                aiBadge.hidden = target.dataset["hasAi"] !== "true";
            }
        }

        preview?.style.setProperty("--level-color", target.dataset["color"] ?? target.style.getPropertyValue("--level-color"));

        if (preview !== null) {
            preview.dataset["previewState"] = target.dataset["level"] ?? "selected";
            preview.classList.remove("is-visible");
            window.requestAnimationFrame(() => {
                preview.classList.add("is-visible");
            });
        }

        if (previewLink !== null) {
            previewLink.href = target instanceof HTMLAnchorElement ? target.href : "#";
            previewLink.hidden = false;
            previewLink.style.setProperty("--level-color", target.dataset["color"] ?? target.style.getPropertyValue("--level-color"));
        }
    };

    const clearSelection = (): void => {
        selectedRecord = null;

        records.forEach((record) => {
            record.classList.remove("is-selected");
            record.setAttribute("aria-pressed", "false");
        });

        if (previewDate !== null) {
            previewDate.textContent = "기록 선택";
        }

        if (previewTitle !== null) {
            previewTitle.textContent = "기록된 날짜를 선택해 주세요.";
        }

        if (previewSummary !== null) {
            previewSummary.textContent = "잔디의 색이 있는 날짜를 선택하면 그날 작성한 학습 요약을 바로 확인할 수 있습니다.";
        }

        if (previewStatus !== null) {
            previewStatus.textContent = "대기 중";
        }

        const badgesContainer = document.querySelector<HTMLElement>("[data-graph-preview-badges]");
        if (badgesContainer !== null) {
            badgesContainer.hidden = true;
        }

        const preview = document.querySelector<HTMLElement>("[data-graph-preview]");

        preview?.classList.remove("is-visible");
        preview?.style.removeProperty("--level-color");
        delete preview?.dataset["previewState"];

        if (previewLink !== null) {
            previewLink.hidden = true;
        }
    };

    select.addEventListener("change", showYear);
    yearButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const year = button.dataset["graphYearOption"];

            if (year === undefined) {
                return;
            }

            select.value = year;
            showYear();
        });
    });
    records.forEach((record) => {
        record.addEventListener("click", (event) => {
            event.preventDefault();
            if (selectedRecord === record) {
                clearSelection();
            } else {
                selectRecord(record);
            }
        });
        record.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }

            clearSelection();
            record.blur();
        });
    });

    clearSelection();
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
            const isCurrent = panel.dataset["readerPanel"] === id;

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
