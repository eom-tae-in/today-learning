import { action, afterTransition, icon, keepInView, motionDuration, releaseView } from "./dom";

function revealRows(elements: readonly HTMLElement[]): void {
    const duration = motionDuration("--duration-normal"); const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-standard").trim() || "ease";
    elements.forEach(element => element.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], { duration, easing }));
}

function createFrameResizer(frame: HTMLElement): { readonly reset: () => void; readonly resize: (from: number) => number } {
    let timer = 0;
    const reset = (): void => { window.clearTimeout(timer); frame.classList.remove("is-resizing"); frame.style.height = ""; };
    const resize = (from: number): number => {
        reset(); const to = frame.getBoundingClientRect().height; if (Math.abs(to - from) < 1) return 0;
        frame.style.height = `${from}px`; void frame.offsetHeight; frame.classList.add("is-resizing"); frame.style.height = `${to}px`;
        timer = afterTransition(frame, reset);
        return from - to;
    };
    return { reset, resize };
}

export function initializeTables(): void {
    document.querySelectorAll<HTMLTableElement>(".markdown-body table").forEach(table => {
        const rows = [...table.querySelectorAll<HTMLTableRowElement>("tbody tr")];
        const headers = [...table.querySelectorAll("thead th")].map(cell => cell.textContent ?? "");
        const wrapper = document.createElement("div"); wrapper.className = "table-block"; table.before(wrapper);
        const frame = document.createElement("div"); frame.className = "table-frame"; wrapper.append(frame); frame.append(table);
        const mobile = document.createElement("dl"); mobile.className = "mobile-table"; frame.append(mobile);
        const items = rows.map(row => {
            const item = document.createElement("div"); item.className = "mobile-table-item";
            const cells = [...row.cells]; const first = cells[0]; const term = document.createElement("dt");
            if (first) term.append(...[...first.childNodes].map(node => node.cloneNode(true))); item.append(term);
            cells.slice(1).forEach((cell, index) => {
                const description = document.createElement("dd");
                if (headers.length > 2) { const label = document.createElement("span"); label.className = "table-field-label"; label.textContent = headers[index + 1] ?? ""; description.append(label); }
                const value = document.createElement("span"); value.className = "table-field-value"; value.append(...[...cell.childNodes].map(node => node.cloneNode(true))); description.append(value); item.append(description);
            });
            mobile.append(item); return item;
        });
        if (rows.length < 10) return;
        const label = document.createElement("label"); label.className = "table-search"; label.append(icon("search", 16));
        const input = document.createElement("input"); input.type = "search"; input.placeholder = "표 안에서 찾기"; input.setAttribute("aria-label", "표 안에서 찾기"); label.append(input); frame.before(label);
        const empty = document.createElement("p"); empty.className = "table-empty"; empty.setAttribute("role", "status"); frame.append(empty);
        const foldLabel = document.createElement("span"); const fold = action("", "table-fold-button"); fold.append(foldLabel, icon("expand", 14)); wrapper.append(fold); let expanded = false;
        const resizer = createFrameResizer(frame);
        const update = (animate: boolean): void => {
            const from = animate ? frame.getBoundingClientRect().height : 0; const foldTop = animate ? fold.getBoundingClientRect().top : 0;
            const query = input.value.trim().toLowerCase();
            const matches = rows.map((row, index) => ({ row, index })).filter(({ row }) => (row.textContent ?? "").toLowerCase().includes(query));
            const visible = new Set(matches.slice(0, expanded ? matches.length : 6).map(({ index }) => index)); const revealed: HTMLElement[] = [];
            rows.forEach((row, index) => { const item = items[index]; const shown = visible.has(index); if (shown && row.hidden) revealed.push(row, ...(item ? [item] : [])); row.hidden = !shown; if (item) item.hidden = !shown; });
            empty.textContent = matches.length ? "" : "일치하는 행이 없어요"; fold.hidden = matches.length <= 6; fold.setAttribute("aria-expanded", String(expanded)); foldLabel.textContent = expanded ? "표 접기" : "표 전체 보기";
            if (!animate) { resizer.reset(); return; }
            const shrink = resizer.resize(from); revealRows(revealed);
            if (expanded) releaseView(); else keepInView(fold, foldTop, foldTop - shrink);
        };
        input.addEventListener("input", () => { expanded = false; update(false); }); fold.addEventListener("click", () => { expanded = !expanded; update(true); }); update(false);
    });
}
