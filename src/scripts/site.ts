import { initializeMarkdown, renderMermaid } from "./markdown";
import { initializeRecordFilters } from "./record-filters";
import { initializeReading } from "./reading";
import { initializeRecordsReturn } from "./records-return";
import { initializeSummaryCard } from "./summary-card";
import { readPreference, savePreference } from "./storage";

type Theme = "light" | "dark" | "green";
const backgrounds = { light: "#F4F8FB", dark: "#121417", green: "#EEF2EA" } as const;

function initializeTheme(): void {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const stored = readPreference("today-learning-theme");
    let explicit = stored === "light" || stored === "dark" || stored === "green";
    let transitionTimer = 0;
    const apply = (theme: Theme): void => {
        document.documentElement.dataset["theme"] = theme;
        document.querySelector("[data-theme-color]")?.setAttribute("content", backgrounds[theme]);
        document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach(button => {
            const selected = button.dataset["themeOption"] === theme;
            button.setAttribute("aria-checked", String(selected)); button.tabIndex = selected ? 0 : -1;
        });
    };
    const change = (theme: Theme): void => {
        const root = document.documentElement;
        const token = getComputedStyle(root).getPropertyValue("--duration-normal").trim();
        const duration = (parseFloat(token) || 0) * (token.endsWith("ms") ? 1 : 1000);
        window.clearTimeout(transitionTimer);
        if (duration < 1) { delete root.dataset["themeTransition"]; apply(theme); void renderMermaid(); return; }
        root.dataset["themeTransition"] = ""; apply(theme);
        transitionTimer = window.setTimeout(() => { delete root.dataset["themeTransition"]; void renderMermaid(); }, duration + 50);
    };
    apply(explicit && (stored === "light" || stored === "dark" || stored === "green") ? stored : system.matches ? "dark" : "light");
    const options = [...document.querySelectorAll<HTMLButtonElement>("[data-theme-option]")];
    options.forEach((button, index) => {
        button.addEventListener("click", () => {
            const value = button.dataset["themeOption"];
            if (value !== "light" && value !== "dark" && value !== "green") return;
            explicit = true; savePreference("today-learning-theme", value); change(value);
        });
        button.addEventListener("keydown", event => {
            if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const target = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + options.length) % options.length;
            options[target]?.focus(); options[target]?.click();
        });
    });
    system.addEventListener("change", () => { if (!explicit) change(system.matches ? "dark" : "light"); });
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

function scrollToHashTarget(): void {
    if (!document.querySelector("[data-reader-page]")) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: "instant" }));
}

document.addEventListener("DOMContentLoaded", () => {
    initializeTheme(); initializeRecordFilters(); initializeRecordsReturn(); initializeGraph(); initializeMarkdown(); initializeSummaryCard(); initializeReading(); scrollToHashTarget(); void renderMermaid();
});
