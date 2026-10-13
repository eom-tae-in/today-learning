import { readPreference, savePreference } from "./storage";

const collapsedKey = "today-learning-summary-collapsed";

export function initializeSummaryCard(): void {
    const card = document.querySelector<HTMLElement>("[data-summary-card]");
    const toggle = card?.querySelector<HTMLButtonElement>("[data-summary-toggle]");
    if (!card || !toggle) return;
    const label = toggle.querySelector("[data-summary-toggle-label]");
    const apply = (collapsed: boolean): void => {
        card.classList.toggle("is-collapsed", collapsed); toggle.setAttribute("aria-expanded", String(!collapsed));
        if (label) label.textContent = collapsed ? "펼치기" : "접기";
    };
    const isSummaryHash = (): boolean => decodeURIComponent(location.hash.slice(1)) === "summary";
    apply(readPreference(collapsedKey) === "true" && !isSummaryHash());
    toggle.addEventListener("click", () => { const collapsed = !card.classList.contains("is-collapsed"); apply(collapsed); savePreference(collapsedKey, String(collapsed)); });
    window.addEventListener("hashchange", () => { if (isSummaryHash()) apply(false); });
}
