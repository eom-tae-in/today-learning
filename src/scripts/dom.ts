import { baseUrl } from "../lib/paths";
import { longestTransition, toMilliseconds } from "../lib/motion.mjs";

export const copyFeedbackDuration = 1200;
let stopKeepingInView = (): void => {};

export function icon(name: string, size = 18): HTMLSpanElement {
    const span = document.createElement("span"); span.className = "icon"; span.setAttribute("aria-hidden", "true");
    span.style.setProperty("--icon-url", `url('${baseUrl}icons/${name}.svg')`); span.style.setProperty("--icon-size", `${size}px`); return span;
}

export function action(label: string, className: string): HTMLButtonElement {
    const button = document.createElement("button"); button.type = "button"; button.className = className; button.textContent = label; return button;
}

export function afterTransition(element: HTMLElement, callback: () => void): number {
    const style = getComputedStyle(element); return window.setTimeout(callback, longestTransition(style.transitionDuration, style.transitionDelay));
}

export function motionDuration(token: string): number {
    return toMilliseconds(getComputedStyle(document.documentElement).getPropertyValue(token));
}

export function createFoldRegion(owner: HTMLElement, region: HTMLElement, collapsedClass: string): (expanded: boolean, animate: boolean) => void {
    let timer = 0;
    return (expanded, animate) => {
        window.clearTimeout(timer); owner.classList.remove("is-folding");
        if (!expanded && !animate) { owner.classList.add(collapsedClass); region.setAttribute("hidden", "until-found"); return; }
        if (expanded) region.removeAttribute("hidden");
        if (!animate) { owner.classList.add("is-instant"); owner.classList.remove(collapsedClass); void region.offsetHeight; owner.classList.remove("is-instant"); return; }
        owner.classList.add("is-folding"); owner.classList.toggle(collapsedClass, !expanded);
        timer = afterTransition(region, () => { owner.classList.remove("is-folding"); if (!expanded) region.setAttribute("hidden", "until-found"); });
    };
}

export function releaseView(): void {
    stopKeepingInView();
}

export function keepInView(target: HTMLElement, startTop: number, endTop: number, isSettled: () => boolean): void {
    const settleLimit = 500; const stableFramesNeeded = 2;
    releaseView();
    const root = document.documentElement; const style = getComputedStyle(root); const coveredTop = parseFloat(style.scrollPaddingTop) || parseFloat(style.getPropertyValue("--header-height")) || 0;
    if (endTop >= coveredTop) return;
    const savedAnchor = root.style.getPropertyValue("overflow-anchor"); const savedPriority = root.style.getPropertyPriority("overflow-anchor");
    const giveUpAt = performance.now() + motionDuration("--duration-normal") + settleLimit; let targetTop = startTop; let expectedScroll = window.scrollY; let stableFrames = 0; let frame = 0;
    const release = (): void => { cancelAnimationFrame(frame); root.style.setProperty("overflow-anchor", savedAnchor, savedPriority); stopKeepingInView = () => {}; };
    const step = (): void => {
        targetTop -= window.scrollY - expectedScroll;
        const shift = target.getBoundingClientRect().top - targetTop;
        if (Math.abs(shift) >= .5) { window.scrollBy({ top: shift, behavior: "instant" }); stableFrames = 0; } else stableFrames++;
        expectedScroll = window.scrollY;
        if (performance.now() <= giveUpAt && !(isSettled() && stableFrames >= stableFramesNeeded)) frame = requestAnimationFrame(step); else release();
    };
    root.style.setProperty("overflow-anchor", "none"); stopKeepingInView = release; frame = requestAnimationFrame(step);
}

export function initializeMedia(): void {
    const dialog = document.querySelector<HTMLDialogElement>("[data-media-dialog]");
    dialog?.querySelector("[data-close-media]")?.addEventListener("click", () => dialog.close());
    dialog?.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
}

export function openMedia(content: Element): void {
    const dialog = document.querySelector<HTMLDialogElement>("[data-media-dialog]");
    const area = dialog?.querySelector("[data-media-content]");
    if (!dialog || !area) return;
    area.replaceChildren(content.cloneNode(true)); dialog.showModal();
}
