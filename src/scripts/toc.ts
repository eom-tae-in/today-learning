import { action, icon } from "./dom";
import { savePreference } from "./storage";
import { describeToc, type TocRelation } from "../lib/toc.mjs";

export type ReadingHeading = { readonly element: HTMLElement; readonly depth: number; readonly title: string; readonly number: string };
type TocGroup = { readonly container: HTMLElement; readonly list: HTMLElement; readonly range: HTMLButtonElement; readonly label: HTMLElement };
type TocList = { readonly nav: HTMLElement; readonly links: readonly HTMLAnchorElement[]; readonly rows: readonly HTMLElement[]; readonly groups: ReadonlyMap<number, TocGroup> };

const collapsedKey = "today-learning-toc-collapsed";

function createGroup(prefix: string, parent: number, onRange: (parent: number) => void): TocGroup {
    const container = document.createElement("div"); container.className = "toc-sections"; container.hidden = true;
    const list = document.createElement("div"); list.className = "toc-section-rows"; list.id = `${prefix}-sections-${parent < 0 ? "start" : parent}`;
    const range = action("", "toc-item toc-range"); range.dataset["depth"] = "4"; range.hidden = true; range.setAttribute("aria-expanded", "false"); range.setAttribute("aria-controls", list.id);
    const label = document.createElement("span"); label.className = "toc-label"; range.append(label, icon("chevron", 16)); range.addEventListener("click", () => onRange(parent));
    container.append(range, list);
    return { container, list, range, label };
}

function buildList(nav: HTMLElement, headings: readonly ReadingHeading[], relations: readonly TocRelation[], onSelect: (heading: ReadingHeading) => void, onRange: (parent: number) => void): TocList {
    const prefix = nav.hasAttribute("data-sheet-toc") ? "toc-sheet" : "toc-desktop";
    const groups = new Map<number, TocGroup>(); const links: HTMLAnchorElement[] = []; const rows: HTMLElement[] = [];
    nav.replaceChildren();
    headings.forEach((heading, index) => {
        const link = document.createElement("a"); link.className = "toc-item"; link.href = "#" + heading.element.id; link.dataset["depth"] = String(heading.depth); link.title = [heading.number, heading.title].filter(Boolean).join(" ");
        if (heading.depth === 3) { const number = document.createElement("span"); number.className = "toc-number"; const text = document.createElement("span"); text.textContent = heading.number; number.append(text, icon("check", 13)); link.append(number); }
        const label = document.createElement("span"); label.className = "toc-label"; label.textContent = heading.depth === 4 ? link.title : heading.title; link.append(label);
        link.addEventListener("click", () => onSelect(heading)); links.push(link);
        if (heading.depth !== 4) { nav.append(link); rows.push(link); return; }
        const parent = relations[index]?.parent ?? -1;
        const group = groups.get(parent) ?? createGroup(prefix, parent, onRange);
        if (!groups.has(parent)) { groups.set(parent, group); nav.append(group.container); }
        const row = document.createElement("div"); row.className = "toc-row"; const inner = document.createElement("div"); inner.append(link); row.append(inner); group.list.append(row); rows.push(row);
    });
    return { nav, links, rows, groups };
}

function centerInList(nav: HTMLElement, target: HTMLElement): void {
    if (nav.scrollHeight <= nav.clientHeight) return;
    const navRect = nav.getBoundingClientRect(); const rect = target.getBoundingClientRect();
    nav.scrollTop += rect.top - navRect.top - (nav.clientHeight - rect.height) / 2;
}

export function initializeTableOfContents(headings: readonly ReadingHeading[], relations: readonly TocRelation[], reveal: (target: HTMLElement) => void): (currentIndex: number) => void {
    const sheet = document.querySelector<HTMLDialogElement>("[data-toc-sheet]");
    const layout = document.querySelector<HTMLElement>("[data-reader-layout]");
    const expanded = new Set<number>();
    let view = describeToc(headings, -1, relations); let shownParent: number | null = null; let opener: HTMLElement | null = null;
    const render = (): void => lists.forEach(list => {
        view.items.forEach(item => {
            const link = list.links[item.index]; const row = list.rows[item.index];
            if (!link || !row) return;
            if (item.current) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
            link.classList.toggle("is-passed", item.passed);
            if (row !== link) row.classList.toggle("is-folded", item.folded && !expanded.has(item.parent));
        });
        list.groups.forEach((group, parent) => {
            const range = view.range?.parent === parent ? view.range : null;
            group.container.hidden = parent !== view.currentParent; group.range.hidden = range === null;
            if (range) { group.label.textContent = range.label; group.range.title = range.title; group.range.setAttribute("aria-expanded", String(expanded.has(parent))); }
        });
    });
    const select = (heading: ReadingHeading): void => { reveal(heading.element); sheet?.close(); };
    const toggleRange = (parent: number): void => { if (expanded.has(parent)) expanded.delete(parent); else expanded.add(parent); render(); };
    const lists = [...document.querySelectorAll<HTMLElement>("[data-desktop-toc],[data-sheet-toc]")].map(nav => buildList(nav, headings, relations, select, toggleRange));
    const desktop = lists.find(list => list.nav.hasAttribute("data-desktop-toc"));
    const sheetList = lists.find(list => list.nav.hasAttribute("data-sheet-toc"));
    const focusCurrent = (list: TocList): void => {
        const target = list.nav.querySelector<HTMLElement>('[aria-current="location"]') ?? list.links[0];
        if (!target) return;
        target.focus({ preventScroll: true }); centerInList(list.nav, target);
    };
    const setCollapsed = (collapsed: boolean): void => { layout?.classList.toggle("is-toc-collapsed", collapsed); savePreference(collapsedKey, String(collapsed)); };
    const collapseButton = document.querySelector<HTMLButtonElement>("[data-toc-collapse]"); const expandButton = document.querySelector<HTMLButtonElement>("[data-toc-expand]");
    collapseButton?.addEventListener("click", () => { setCollapsed(true); expandButton?.focus(); });
    expandButton?.addEventListener("click", () => { setCollapsed(false); collapseButton?.focus(); });
    document.querySelectorAll<HTMLElement>("[data-open-toc]").forEach(button => button.addEventListener("click", () => {
        if (matchMedia("(min-width: 1200px)").matches && desktop) { setCollapsed(false); focusCurrent(desktop); return; }
        if (!sheet || !sheetList) return;
        opener = button; sheet.showModal(); focusCurrent(sheetList);
    }));
    sheet?.querySelector("[data-close-toc]")?.addEventListener("click", () => sheet.close());
    sheet?.addEventListener("close", () => { opener?.focus(); opener = null; });
    sheet?.addEventListener("click", event => { if (event.target === sheet) sheet.close(); });
    return currentIndex => {
        view = describeToc(headings, currentIndex, relations);
        if (view.currentParent !== shownParent) { expanded.clear(); shownParent = view.currentParent; }
        render();
        const current = desktop?.nav.querySelector<HTMLElement>('[aria-current="location"]');
        if (desktop && current) { const navRect = desktop.nav.getBoundingClientRect(); const rect = current.getBoundingClientRect(); if (rect.top < navRect.top || rect.bottom > navRect.bottom) centerInList(desktop.nav, current); }
    };
}
