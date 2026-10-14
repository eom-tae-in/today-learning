import { findGraphTarget } from "../lib/graph-navigation.mjs";

type GraphYear = { readonly element: HTMLElement; readonly cells: readonly HTMLAnchorElement[]; readonly dates: readonly string[]; userScrolled: boolean };

function getSeoulToday(): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function markToday(): void {
    document.querySelectorAll<HTMLElement>(`.graph-grid [data-calendar-date="${getSeoulToday()}"]`).forEach(cell => {
        cell.classList.add("is-today");
        if (cell instanceof HTMLAnchorElement) cell.setAttribute("aria-current", "date");
    });
}

function setActiveCell(graph: GraphYear, active: HTMLAnchorElement | undefined): void {
    graph.cells.forEach(cell => { cell.tabIndex = cell === active ? 0 : -1; });
}

function updateFade(graph: GraphYear): void {
    const { element } = graph;
    element.classList.toggle("is-scroll-end", element.scrollLeft + element.clientWidth >= element.scrollWidth - 1);
}

function scrollToRecent(graph: GraphYear): void {
    const { element, cells } = graph;
    if (!element.hidden) {
        const offsetOf = (cell: HTMLElement): number => cell.getBoundingClientRect().left - element.getBoundingClientRect().left + element.scrollLeft;
        const style = getComputedStyle(element);
        const startPadding = parseFloat(style.scrollPaddingInlineStart) || 0;
        const endPadding = parseFloat(style.scrollPaddingInlineEnd) || 0;
        const endScroll = element.scrollWidth - element.clientWidth;
        const first = cells[0];
        const latest = cells.at(-1);
        const recent = element.querySelector<HTMLElement>(".is-today") ?? latest;
        if (!first || !latest || !recent || offsetOf(first) - startPadding >= endScroll) element.scrollLeft = endScroll;
        else element.scrollLeft = Math.max(0, Math.min(offsetOf(recent) + recent.offsetWidth + endPadding - element.clientWidth, offsetOf(latest) - startPadding));
    }
    updateFade(graph);
}

function handleResize(graph: GraphYear): void {
    if (graph.userScrolled) updateFade(graph);
    else scrollToRecent(graph);
}

function handleArrowKeys(graph: GraphYear, event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !(event.target instanceof HTMLAnchorElement)) return;
    const target = findGraphTarget(graph.dates, event.target.dataset["recordDate"] ?? "", event.key);
    if (target === null) return;
    event.preventDefault();
    const cell = graph.cells[graph.dates.indexOf(target)];
    setActiveCell(graph, cell); cell?.focus();
}

export function initializeGraph(): void {
    markToday();
    const graphs: readonly GraphYear[] = [...document.querySelectorAll<HTMLElement>("[data-graph-year]")].map(element => {
        const cells = [...element.querySelectorAll<HTMLAnchorElement>("a[data-record-date]")];
        return { element, cells, dates: cells.map(cell => cell.dataset["recordDate"] ?? ""), userScrolled: false };
    });
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-graph-year-option]")];
    const resizeObserver = new ResizeObserver(entries => entries.forEach(entry => { const graph = graphs.find(item => item.element === entry.target); if (graph) handleResize(graph); }));
    graphs.forEach(graph => {
        setActiveCell(graph, graph.cells.at(-1));
        graph.element.addEventListener("keydown", event => handleArrowKeys(graph, event));
        graph.element.addEventListener("focusin", event => { if (event.target instanceof HTMLAnchorElement) setActiveCell(graph, event.target); });
        graph.element.addEventListener("scroll", () => updateFade(graph), { passive: true });
        ["wheel", "pointerdown", "keydown"].forEach(type => graph.element.addEventListener(type, () => { graph.userScrolled = true; }, { passive: true }));
        scrollToRecent(graph); resizeObserver.observe(graph.element);
    });
    buttons.forEach(button => button.addEventListener("click", () => {
        graphs.forEach(graph => {
            graph.element.hidden = graph.element.dataset["graphYear"] !== button.dataset["graphYearOption"];
            if (!graph.element.hidden) { graph.userScrolled = false; setActiveCell(graph, graph.cells.at(-1)); scrollToRecent(graph); }
        });
        buttons.forEach(option => option.setAttribute("aria-pressed", String(option === button)));
    }));
}
