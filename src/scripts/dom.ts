import { baseUrl } from "../lib/paths";

export function icon(name: string, size = 18): HTMLSpanElement {
    const span = document.createElement("span"); span.className = "icon"; span.setAttribute("aria-hidden", "true");
    span.style.setProperty("--icon-url", `url('${baseUrl}icons/${name}.svg')`); span.style.setProperty("--icon-size", `${size}px`); return span;
}

export function action(label: string, className: string): HTMLButtonElement {
    const button = document.createElement("button"); button.type = "button"; button.className = className; button.textContent = label; return button;
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
