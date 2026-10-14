export function initializeMenu(): void {
    const button = document.querySelector<HTMLButtonElement>("[data-menu-button]");
    const panel = document.querySelector<HTMLElement>("[data-menu-panel]");
    if (!button || !panel) return;
    const compactLayout = matchMedia("(max-width: 1023px)");
    const isOpen = (): boolean => button.getAttribute("aria-expanded") === "true";
    const isInsideMenu = (target: EventTarget | null): boolean => target instanceof Node && (panel.contains(target) || button.contains(target));
    const setOpen = (open: boolean): void => {
        button.setAttribute("aria-expanded", String(open)); button.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
        panel.classList.toggle("is-open", open);
    };
    const open = (): void => { setOpen(true); panel.querySelector<HTMLAnchorElement>("a[href]")?.focus(); };
    const close = (restoreFocus: boolean): void => { if (!isOpen()) return; setOpen(false); if (restoreFocus) button.focus(); };
    button.addEventListener("click", () => { if (isOpen()) close(true); else open(); });
    panel.addEventListener("click", event => { if (event.target instanceof Element && event.target.closest("a[href]")) close(false); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && isOpen()) close(true); });
    document.addEventListener("focusin", event => { if (isOpen() && !isInsideMenu(event.target)) close(false); });
    document.addEventListener("click", event => {
        if (!isOpen() || isInsideMenu(event.target)) return;
        const focusLost = document.activeElement === null || document.activeElement === document.body || panel.contains(document.activeElement);
        close(focusLost);
    });
    compactLayout.addEventListener("change", () => { if (!compactLayout.matches) close(false); });
}
