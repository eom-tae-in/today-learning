import { getTagKey, hasTag, resolveTagLabel } from "../lib/tags.mjs";

type Card = { readonly element: HTMLElement; readonly tags: readonly string[]; readonly date: string };

function initializeTagToggle(root: HTMLElement): void {
    const frame = root.querySelector<HTMLElement>("[data-tag-filters]");
    const popular = root.querySelector<HTMLElement>('[data-tag-list="popular"]');
    const all = root.querySelector<HTMLElement>('[data-tag-list="all"]');
    const toggle = root.querySelector<HTMLButtonElement>("[data-tag-toggle]");
    const label = toggle?.querySelector<HTMLElement>("[data-tag-toggle-label]");
    const reset = popular?.querySelector<HTMLElement>("[data-filter-reset]");
    if (!frame || !popular || !all || !toggle || !label || !reset) return;
    toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") !== "true";
        const headerBottom = document.querySelector(".site-header")?.getBoundingClientRect().bottom ?? 0;
        if (!expanded && frame.getBoundingClientRect().top < headerBottom) frame.scrollIntoView({ block: "start", behavior: "instant" });
        popular.inert = expanded; all.inert = !expanded;
        (expanded ? all : popular).append(toggle, reset);
        toggle.setAttribute("aria-expanded", String(expanded)); label.textContent = expanded ? "태그 접기" : "태그 전체 보기";
        (expanded ? all.querySelector<HTMLElement>("[data-tag-filter]:not([data-tag-filter=''])") ?? toggle : toggle).focus({ preventScroll: true });
    });
}

export function initializeRecordFilters(): void {
    document.querySelectorAll<HTMLElement>('[data-record-browser="full"]').forEach(root => {
        const search = root.querySelector<HTMLInputElement>("[data-record-search]");
        const year = root.querySelector<HTMLSelectElement>("[data-year-filter]");
        const list = root.querySelector<HTMLElement>("[data-record-list]");
        if (!search || !year || !list) return;
        const cards: readonly Card[] = [...root.querySelectorAll<HTMLElement>("[data-record-card]")].map(element => {
            const tags: unknown = JSON.parse(element.dataset["tags"] ?? "[]");
            return { element, tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [], date: element.dataset["date"] ?? "" };
        }).toSorted((a, b) => b.date.localeCompare(a.date));
        const tagLabels = [...root.querySelectorAll<HTMLElement>('[data-tag-list="all"] [data-tag-filter]')].map(chip => chip.dataset["tagFilter"] ?? "").filter(Boolean);
        const query = new URLSearchParams(location.search);
        search.value = query.get("q") ?? "";
        year.value = query.get("year") ?? "";
        const requestedTag = query.get("tag") ?? "";
        let tag = resolveTagLabel(requestedTag, tagLabels);
        let limit = 12;
        const chips = root.querySelector<HTMLElement>("[data-tag-filters]");
        const popular = root.querySelector<HTMLElement>('[data-tag-list="popular"]');
        const isSelected = (chip: HTMLElement): boolean => getTagKey(chip.dataset["tagFilter"] ?? "") === getTagKey(tag);
        const ensureTag = (): void => {
            if (!tag || [...popular?.querySelectorAll<HTMLElement>("[data-tag-filter]") ?? []].some(isSelected)) return;
            const chip = document.createElement("button");
            chip.type = "button"; chip.className = "filter-chip"; chip.dataset["tagFilter"] = tag; chip.textContent = tag;
            const clear = document.createElement("span"); clear.className = "filter-clear"; clear.textContent = "×"; clear.setAttribute("aria-hidden", "true"); chip.append(clear);
            popular?.querySelector('[data-tag-filter=""]')?.after(chip);
        };
        const update = (writeUrl = true): void => {
            ensureTag();
            const q = search.value.trim().toLowerCase();
            const active = Boolean(q || year.value || tag);
            const matches = cards.filter(card => (!q || card.element.dataset["search"]?.includes(q)) && (!year.value || card.element.dataset["year"] === year.value) && (!tag || hasTag(card.tags, tag)));
            cards.forEach(card => { card.element.hidden = true; });
            list.replaceChildren(); list.classList.toggle("is-filtered", active);
            const groups = new Map<string, HTMLElement>();
            matches.slice(0, limit).forEach(card => {
                card.element.hidden = false;
                if (active) { list.append(card.element); return; }
                const month = card.date.slice(0, 7);
                let grid = groups.get(month);
                if (!grid) {
                    const section = document.createElement("section"); section.className = "month-group"; section.dataset["recordMonth"] = month;
                    const heading = document.createElement("h2"); heading.className = "month-heading"; heading.textContent = `${Number(month.slice(0, 4))}년 ${Number(month.slice(5))}월`;
                    grid = document.createElement("div"); grid.className = "records-grid"; section.append(heading, grid); list.append(section); groups.set(month, grid);
                }
                grid.append(card.element);
            });
            root.querySelectorAll<HTMLElement>("[data-tag-filter]").forEach(chip => chip.setAttribute("aria-pressed", String(isSelected(chip))));
            root.querySelectorAll<HTMLElement>("[data-filter-reset]").forEach(reset => { if (!reset.closest("[data-empty-results]")) reset.hidden = !active || matches.length === 0; });
            const empty = root.querySelector<HTMLElement>("[data-empty-results]"); if (empty) empty.hidden = matches.length > 0;
            const heading = root.querySelector<HTMLElement>("[data-results-title]");
            if (heading) { heading.hidden = !active || matches.length === 0; heading.textContent = [tag ? `${tag} 태그` : "", q ? `'${search.value.trim()}' 검색 결과` : "", year.value ? `${year.value}년` : ""].filter(Boolean).join(" · "); }
            const load = root.querySelector<HTMLElement>("[data-load-records]"); if (load) load.hidden = matches.length <= limit;
            const params = new URLSearchParams(); if (search.value.trim()) params.set("q", search.value.trim()); if (year.value) params.set("year", year.value); if (tag) params.set("tag", tag);
            if (writeUrl) history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : ""));
        };
        const resetLimit = (): void => { limit = 12; update(); };
        search.addEventListener("input", resetLimit); year.addEventListener("change", resetLimit);
        chips?.addEventListener("click", event => {
            if (!(event.target instanceof Element)) return;
            const chip = event.target.closest<HTMLElement>("[data-tag-filter]"); if (!chip) return;
            tag = isSelected(chip) ? "" : chip.dataset["tagFilter"] ?? ""; resetLimit();
        });
        root.querySelectorAll<HTMLAnchorElement>("[data-filter-reset]").forEach(reset => reset.addEventListener("click", event => { event.preventDefault(); search.value = ""; year.value = ""; tag = ""; resetLimit(); }));
        root.querySelector("[data-load-records]")?.addEventListener("click", () => { limit += 12; update(); });
        document.addEventListener("keydown", event => {
            if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLElement && event.target.isContentEditable)) { event.preventDefault(); search.focus(); }
        });
        initializeTagToggle(root);
        update(requestedTag !== tag);
    });
}
