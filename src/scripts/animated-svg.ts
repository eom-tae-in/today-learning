import { SvgTimeline } from "./svg-timeline";

type Playback = "automatic" | "playing" | "paused";

export function initializeAnimatedSvgs(): void {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    document.querySelectorAll<HTMLElement>("[data-animated-svg]").forEach(figure => {
        const host = figure.querySelector<HTMLElement>("[data-svg-host]");
        const template = host?.querySelector("template");
        if (!host || !(template instanceof HTMLTemplateElement)) return;
        const shadow = host.attachShadow({ mode: "open" });
        shadow.append(template.content.cloneNode(true));
        const svg = shadow.querySelector("svg");
        if (!(svg instanceof SVGSVGElement)) return;
        const toggle = figure.querySelector<HTMLButtonElement>('[data-svg-action="toggle"]');
        const restart = figure.querySelector<HTMLButtonElement>('[data-svg-action="restart"]');
        const expand = figure.querySelector<HTMLButtonElement>('[data-svg-action="expand"]');
        if (!toggle || !restart || !expand) return;
        host.replaceChildren();
        svg.setAttribute("aria-label", host.getAttribute("aria-label") ?? "학습 과정 애니메이션");
        svg.pauseAnimations(); svg.setCurrentTime(0);
        const timeline = new SvgTimeline(shadow, svg);
        let preference: Playback = "automatic";
        let visible = false;
        let expanded = false;
        let started = false;
        const apply = (): void => {
            const available = !host.closest("[hidden], [data-subsection].is-collapsed");
            const running = (expanded || visible) && available && !document.hidden && preference !== "paused" && (preference === "playing" || !reducedMotion.matches);
            host.toggleAttribute("data-running", running);
            if (running) {
                if (!started) { timeline.reset(); started = true; }
                svg.unpauseAnimations();
            } else svg.pauseAnimations();
            toggle.textContent = running ? "일시정지" : "재생";
            toggle.setAttribute("aria-label", running ? "애니메이션 일시정지" : "애니메이션 재생");
            toggle.setAttribute("aria-pressed", String(running));
        };
        toggle.addEventListener("click", () => { preference = host.hasAttribute("data-running") ? "paused" : "playing"; apply(); });
        restart.addEventListener("click", () => {
            preference = "playing"; started = true; timeline.reset(); apply();
        });
        const observer = new IntersectionObserver(entries => {
            const entry = entries[0]; if (!entry || expanded) return;
            visible = entry.isIntersecting && entry.intersectionRatio >= .1; apply();
        }, { threshold: .1 });
        observer.observe(host);
        const section = figure.closest("[data-subsection]");
        if (section) new MutationObserver(apply).observe(section, { attributes: true, subtree: true, attributeFilter: ["class", "hidden"] });
        document.addEventListener("visibilitychange", apply);
        reducedMotion.addEventListener("change", apply);
        host.addEventListener("click", () => { if (!expanded) expand.click(); });
        expand.addEventListener("click", () => {
            const dialog = document.querySelector<HTMLDialogElement>("[data-media-dialog]");
            const area = dialog?.querySelector<HTMLElement>("[data-media-content]");
            if (!dialog || !area || dialog.open) return;
            const marker = document.createComment("animated-svg-position");
            figure.before(marker);
            const move = (destination: () => void): void => {
                timeline.move(destination); apply();
            };
            expanded = true; expand.hidden = true;
            area.replaceChildren(); dialog.showModal();
            move(() => area.append(figure)); toggle.focus();
            dialog.addEventListener("close", () => {
                expanded = false; expand.hidden = false;
                move(() => marker.replaceWith(figure)); expand.focus();
            }, { once: true });
        });
        toggle.hidden = false; restart.hidden = false; expand.hidden = false;
        apply();
    });
}
