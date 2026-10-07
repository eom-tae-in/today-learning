import { action, icon } from "./dom";

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
        const fold = action("표 전체 보기", "table-fold-button"); wrapper.append(fold); let expanded = false;
        const update = (): void => {
            const query = input.value.trim().toLowerCase();
            const matches = rows.map((row, index) => ({ row, index })).filter(({ row }) => (row.textContent ?? "").toLowerCase().includes(query));
            const visible = new Set(matches.slice(0, expanded ? matches.length : 6).map(({ index }) => index));
            rows.forEach((row, index) => { row.hidden = !visible.has(index); const item = items[index]; if (item) item.hidden = row.hidden; });
            fold.hidden = matches.length <= 6; fold.setAttribute("aria-expanded", String(expanded)); fold.replaceChildren(expanded ? "표 접기" : "표 전체 보기", icon("expand", 14));
        };
        input.addEventListener("input", () => { expanded = false; update(); }); fold.addEventListener("click", () => { expanded = !expanded; update(); }); update();
    });
}
