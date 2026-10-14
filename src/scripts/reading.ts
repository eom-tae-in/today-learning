import { action, copyFeedbackDuration, createFoldRegion, icon } from "./dom";
import { readPreference, savePreference } from "./storage";
import { initializeTableOfContents, type ReadingHeading } from "./toc";
import { decodeHash } from "../lib/hash.mjs";
import { findTocParents } from "../lib/toc.mjs";

function readHeadings(body: HTMLElement): readonly ReadingHeading[] {
    return [...body.querySelectorAll<HTMLElement>("h2,h3,h4")].map(element => {
        const clone = element.cloneNode(true);
        let title = "";
        if (clone instanceof HTMLElement) { clone.querySelectorAll("a,button,.heading-number").forEach(item => item.remove()); title = (clone.textContent ?? "").trim().replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\s]+/u, ""); }
        return { element, depth: Number(element.tagName.slice(1)), title, number: element.dataset["headingNumber"] ?? "" };
    });
}

function initializeSections(body: HTMLElement): (target: HTMLElement) => void {
    const sections = [...body.querySelectorAll<HTMLElement>("[data-subsection]")];
    const all = [...document.querySelectorAll<HTMLButtonElement>("[data-collapse-all]")];
    const folds = new Map<HTMLElement, (expanded: boolean, animate: boolean) => void>();
    const setSection = (section: HTMLElement, expanded: boolean, animate: boolean): void => {
        if (section.classList.contains("is-collapsed") === expanded) folds.get(section)?.(expanded, animate);
        section.querySelector("[data-fold-section]")?.setAttribute("aria-expanded", String(expanded));
    };
    const syncAll = (): void => {
        const expanded = sections.some(section => !section.classList.contains("is-collapsed"));
        all.forEach(button => { button.hidden = !sections.length; button.setAttribute("aria-expanded", String(expanded)); button.textContent = expanded ? "모두 접기" : "모두 펼치기"; });
    };
    sections.forEach(section => {
        const content = section.querySelector<HTMLElement>(".subsection-content");
        if (content) { const inner = document.createElement("div"); inner.className = "subsection-body"; inner.append(...content.childNodes); content.append(inner); folds.set(section, createFoldRegion(section, content, "is-collapsed")); }
        const heading = section.querySelector("h4"); const button = action("", "section-fold-toggle"); button.append(icon("chevron", 18)); button.dataset["foldSection"] = ""; button.setAttribute("aria-label", "소주제 접기 또는 펼치기"); button.setAttribute("aria-expanded", "true"); heading?.append(button);
        button.addEventListener("click", () => { setSection(section, section.classList.contains("is-collapsed"), true); syncAll(); });
        content?.addEventListener("beforematch", () => { setSection(section, true, false); syncAll(); });
    });
    all.forEach(button => button.addEventListener("click", () => { const expanded = button.getAttribute("aria-expanded") !== "true"; sections.forEach(section => setSection(section, expanded, true)); syncAll(); }));
    syncAll();
    return target => { const section = target.closest<HTMLElement>("[data-subsection]"); if (section?.classList.contains("is-collapsed")) { setSection(section, true, false); syncAll(); } };
}

function createAnnouncer(): (message: string) => void {
    const announcementDelay = 100; const region = document.querySelector<HTMLElement>("[data-reading-announcer]"); let timer = 0;
    return message => { if (!region) return; window.clearTimeout(timer); region.textContent = ""; timer = window.setTimeout(() => { region.textContent = message; }, announcementDelay); };
}

function placeCopyBubble(anchor: HTMLElement, bubble: HTMLElement): void {
    const viewportMargin = 8;
    bubble.classList.remove("is-right", "is-above");
    const anchorBox = anchor.getBoundingClientRect(); const iconBox = anchor.querySelector(".heading-link-icon")?.getBoundingClientRect() ?? anchorBox;
    const width = bubble.offsetWidth; const left = anchorBox.left + bubble.offsetLeft; const gap = iconBox.left - left - width;
    if (left >= viewportMargin) return;
    bubble.classList.add(iconBox.right + gap + width <= document.documentElement.clientWidth - viewportMargin ? "is-right" : "is-above");
}

function initializeHeadingAnchors(body: HTMLElement): void {
    const announce = createAnnouncer();
    body.querySelectorAll<HTMLAnchorElement>(".heading-anchor").forEach(anchor => {
        let hideTimer = 0;
        const showResult = (copied: boolean): void => {
            let bubble = anchor.querySelector<HTMLElement>(".heading-copy-bubble");
            if (!bubble) { bubble = document.createElement("span"); bubble.className = "heading-copy-bubble"; bubble.setAttribute("aria-hidden", "true"); anchor.append(bubble); }
            bubble.textContent = copied ? "복사됨" : "복사 실패"; placeCopyBubble(anchor, bubble); void getComputedStyle(bubble).opacity; anchor.classList.add("is-copied"); anchor.classList.toggle("is-copy-failed", !copied);
            announce(copied ? "제목 주소를 복사했어요" : "주소를 복사하지 못했어요");
            window.clearTimeout(hideTimer); hideTimer = window.setTimeout(() => anchor.classList.remove("is-copied"), copyFeedbackDuration);
        };
        anchor.addEventListener("click", async event => {
            event.preventDefault();
            try { await navigator.clipboard.writeText(anchor.href); showResult(true); }
            catch (error) { if (!(error instanceof DOMException)) throw error; showResult(false); }
        });
    });
}

function initializeFontSize(body: HTMLElement): void {
    let fontSize = Number(readPreference("today-learning-font-size") ?? "1"); if (![0, 1, 2].includes(fontSize)) fontSize = 1;
    const applySize = (): void => {
        body.dataset["fontSize"] = String(fontSize);
        document.querySelectorAll<HTMLElement>("[data-font-size]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset["fontSize"] === String(fontSize))));
        document.querySelector("[data-cycle-font]")?.setAttribute("aria-label", `글자 크기 ${["작게", "기본", "크게"][fontSize]}, 다음 크기로 변경`);
        savePreference("today-learning-font-size", String(fontSize));
    };
    document.querySelectorAll<HTMLElement>("[data-font-size]").forEach(button => button.addEventListener("click", () => { fontSize = Number(button.dataset["fontSize"]); applySize(); }));
    document.querySelector("[data-cycle-font]")?.addEventListener("click", () => { fontSize = (fontSize + 1) % 3; applySize(); }); applySize();
}

function showCurrentChapter(heading: ReadingHeading | undefined, fallback: string): void {
    document.querySelectorAll<HTMLElement>("[data-current-chapter]").forEach(label => {
        label.replaceChildren();
        if (heading?.number) { const number = document.createElement("span"); number.className = "current-chapter-number"; number.textContent = heading.number; label.append(number); }
        label.append(heading?.title ?? fallback);
    });
}

export function initializeReading(): void {
    const body = document.querySelector<HTMLElement>("#til .markdown-body");
    if (!body) return;
    const reveal = initializeSections(body);
    initializeHeadingAnchors(body); initializeFontSize(body);
    body.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not(.heading-anchor)').forEach(anchor => anchor.addEventListener("click", () => { const target = document.getElementById(decodeHash(anchor.hash)); if (target) reveal(target); }));
    const headings = readHeadings(body);
    const relations = findTocParents(headings);
    const updateToc = initializeTableOfContents(headings, relations, reveal);
    const hero = document.querySelector<HTMLElement>("[data-reader-hero]"); const summary = document.querySelector<HTMLElement>("[data-summary-card]");
    const toolbar = document.querySelector<HTMLElement>("[data-reading-toolbar]"); const mobile = document.querySelector<HTMLElement>("[data-mobile-reading-bar]");
    const backToTop = document.querySelector<HTMLElement>(".desktop-back-top"); const progress = document.querySelector<HTMLElement>("[data-reading-progress]");
    const title = document.querySelector("h1")?.textContent?.trim() ?? "";
    document.querySelectorAll<HTMLElement>("[data-reader-top]").forEach(button => button.addEventListener("click", () => hero?.scrollIntoView()));
    const readHeaderHeight = (): number => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 0;
    let headerHeight = readHeaderHeight(); let previousScroll = window.scrollY; let scheduled = false; let activeIndex: number | null = null; let labelKey = "";
    const update = (): void => {
        scheduled = false;
        const scrolled = (hero?.getBoundingClientRect().bottom ?? 0) <= headerHeight;
        toolbar?.classList.toggle("is-visible", scrolled);
        if (mobile) { mobile.hidden = false; if (Math.abs(window.scrollY - previousScroll) > 2) mobile.classList.toggle("is-scrolling-down", window.scrollY > previousScroll && scrolled); }
        if (backToTop) backToTop.hidden = !scrolled;
        if (progress) { progress.hidden = !scrolled; const rect = body.getBoundingClientRect(); const value = Math.max(0, Math.min(100, (150 - rect.top) / Math.max(1, rect.height - innerHeight + 150) * 100)); progress.setAttribute("aria-valuenow", String(Math.round(value))); progress.style.setProperty("--reading-progress", `${value}%`); }
        const currentIndex = headings.findLastIndex(heading => heading.element.getBoundingClientRect().top < 170);
        if (currentIndex !== activeIndex) { activeIndex = currentIndex; updateToc(currentIndex); }
        const inSummary = currentIndex < 0 && (summary?.getBoundingClientRect().bottom ?? 0) > 170;
        const nextLabelKey = `${currentIndex}:${inSummary}`;
        if (nextLabelKey !== labelKey) {
            labelKey = nextLabelKey;
            const current = headings[currentIndex]; const parent = relations[currentIndex]?.parent ?? -1;
            showCurrentChapter(current?.depth === 4 && parent >= 0 ? headings[parent] : current, inSummary ? "한눈에 보기" : title);
        }
        previousScroll = window.scrollY;
    };
    const schedule = (): void => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", () => { headerHeight = readHeaderHeight(); schedule(); });
    new ResizeObserver(schedule).observe(body);
    const initial = document.getElementById(decodeHash(location.hash)); if (initial) reveal(initial);
    update();
}
