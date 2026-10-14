import { baseUrl } from "../lib/paths";
import { longestTransition, toMilliseconds } from "../lib/motion.mjs";

export const copyFeedbackDuration = 1200;
let keepInViewFrame = 0;

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
    cancelAnimationFrame(keepInViewFrame);
}

export function keepInView(target: HTMLElement, startTop: number, endTop: number): void {
    const settleLimit = 500; const stableFramesNeeded = 2;
    releaseView();
    const style = getComputedStyle(document.documentElement); const coveredTop = parseFloat(style.scrollPaddingTop) || parseFloat(style.getPropertyValue("--header-height")) || 0;
    if (endTop >= coveredTop) return;
    const end = performance.now() + motionDuration("--duration-normal"); let stableFrames = 0;
    const step = (): void => {
        const shift = target.getBoundingClientRect().top - startTop;
        if (Math.abs(shift) >= .5) { window.scrollBy({ top: shift, behavior: "instant" }); stableFrames = 0; } else stableFrames++;
        const now = performance.now();
        if (now <= end + settleLimit && (now <= end || stableFrames < stableFramesNeeded)) keepInViewFrame = requestAnimationFrame(step);
    };
    keepInViewFrame = requestAnimationFrame(step);
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
