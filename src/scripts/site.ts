import { initializeMarkdown, renderMermaid } from "./markdown";
import { initializeRecordFilters } from "./record-filters";
import { initializeReading } from "./reading";
import { readPreference, savePreference } from "./storage";

type Theme = "light" | "dark" | "green";
const backgrounds = { light: "#F4F8FB", dark: "#121417", green: "#EEF2EA" } as const;

function initializeTheme(): void {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const stored = readPreference("today-learning-theme");
    let explicit = stored === "light" || stored === "dark" || stored === "green";
    const apply = (theme: Theme): void => {
        document.documentElement.dataset["theme"] = theme;
        document.querySelector("[data-theme-color]")?.setAttribute("content", backgrounds[theme]);
        document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach(button => {
            const selected = button.dataset["themeOption"] === theme;
            button.setAttribute("aria-checked", String(selected)); button.tabIndex = selected ? 0 : -1;
        });
    };
    apply(explicit && (stored === "light" || stored === "dark" || stored === "green") ? stored : system.matches ? "dark" : "light");
    const options = [...document.querySelectorAll<HTMLButtonElement>("[data-theme-option]")];
    options.forEach((button, index) => {
        button.addEventListener("click", () => {
            const value = button.dataset["themeOption"];
            if (value !== "light" && value !== "dark" && value !== "green") return;
            explicit = true; savePreference("today-learning-theme", value); apply(value); void renderMermaid();
        });
        button.addEventListener("keydown", event => {
            if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const target = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + options.length) % options.length;
            options[target]?.focus(); options[target]?.click();
        });
    });
    system.addEventListener("change", () => { if (!explicit) { apply(system.matches ? "dark" : "light"); void renderMermaid(); } });
}

function initializeGraph(): void {
    const graphs = [...document.querySelectorAll<HTMLElement>("[data-graph-year]")];
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-graph-year-option]")];
    const position = (graph: HTMLElement): void => {
        if (matchMedia("(max-width: 679px)").matches) {
            const today = graph.querySelector<HTMLElement>(".is-today");
            const recent = graph.querySelectorAll<HTMLElement>("[data-record-date]");
            const target = today ?? recent.item(recent.length - 1);
            graph.scrollLeft = target ? Math.max(0, target.offsetLeft - graph.offsetLeft - graph.clientWidth + 36) : graph.scrollWidth;
        }
    };
    buttons.forEach(button => button.addEventListener("click", () => {
        graphs.forEach(graph => { graph.hidden = graph.dataset["graphYear"] !== button.dataset["graphYearOption"]; if (!graph.hidden) position(graph); });
        buttons.forEach(option => option.setAttribute("aria-pressed", String(option === button)));
    }));
    graphs.forEach(graph => { if (!graph.hidden) position(graph); });
}

function initializeReaderTabs(): void {
    const tabs = [...document.querySelectorAll<HTMLAnchorElement>("[data-reader-tab]")];
    const panels = [...document.querySelectorAll<HTMLElement>("[data-reader-panel]")];
    if (!tabs.length) return;
    const show = (id: string): void => {
        const current = id === "til" || document.getElementById(id)?.closest("#til") ? "til" : "summary";
        document.body.dataset["readerTab"] = current;
        tabs.forEach(tab => { if (tab.dataset["readerTab"] === current) tab.setAttribute("aria-current", "page"); else tab.removeAttribute("aria-current"); });
        panels.forEach(panel => { panel.hidden = panel.dataset["readerPanel"] !== current; });
        document.querySelectorAll<HTMLElement>("[data-collapse-all]").forEach(button => { if (!button.closest("dialog")) button.hidden = current !== "til"; });
        document.querySelector<HTMLElement>(".page-background")?.classList.toggle("reader-glow-hidden", current === "til");
        window.dispatchEvent(new Event("reader-tab-change"));
    };
    tabs.forEach(tab => tab.addEventListener("click", event => { event.preventDefault(); const id = tab.dataset["readerTab"] ?? "summary"; show(id); history.replaceState(null, "", "#" + id); }));
    window.addEventListener("hashchange", () => show(decodeURIComponent(location.hash.slice(1))));
    show(decodeURIComponent(location.hash.slice(1)));
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && target.id !== "til" && target.id !== "summary") requestAnimationFrame(() => target.scrollIntoView());
}

document.addEventListener("DOMContentLoaded", () => {
    initializeTheme(); initializeRecordFilters(); initializeGraph(); initializeMarkdown(); initializeReading(); initializeReaderTabs(); void renderMermaid();
});
