import { action, icon } from "./dom";
import { readPreference, savePreference } from "./storage";

type Heading = { readonly element: HTMLElement; readonly depth: number; readonly title: string; readonly number: string; readonly chapter: string };

export function initializeReading(): void {
    const body = document.querySelector<HTMLElement>("#til .markdown-body");
    const til = document.querySelector<HTMLElement>("#til");
    if (!body || !til) return;
    const sections = [...body.querySelectorAll<HTMLElement>("[data-subsection]")];
    const setSection = (section: HTMLElement, expanded: boolean): void => {
        section.classList.toggle("is-collapsed", !expanded);
        section.querySelector("[data-fold-section]")?.setAttribute("aria-expanded", String(expanded));
        const content = section.querySelector<HTMLElement>(".subsection-content");
        if (expanded) content?.removeAttribute("hidden"); else content?.setAttribute("hidden", "until-found");
    };
    const all = [...document.querySelectorAll<HTMLButtonElement>("[data-collapse-all]")];
    const syncAll = (): void => {
        const expanded = sections.some(section => !section.classList.contains("is-collapsed"));
        all.forEach(button => { button.setAttribute("aria-expanded", String(expanded)); const label = button.querySelector("span:not(.icon)"); if (label) label.textContent = expanded ? "모두 접기" : "모두 펼치기"; else button.textContent = expanded ? "모두 접기" : "모두 펼치기"; });
    };
    sections.forEach(section => {
        const heading = section.querySelector("h4"); const button = action("", "section-fold-toggle"); button.append(icon("chevron", 18)); button.dataset["foldSection"] = ""; button.setAttribute("aria-label", "소주제 접기 또는 펼치기"); button.setAttribute("aria-expanded", "true"); heading?.append(button);
        button.addEventListener("click", () => { setSection(section, section.classList.contains("is-collapsed")); syncAll(); });
        section.querySelector(".subsection-content")?.addEventListener("beforematch", () => { setSection(section, true); syncAll(); });
    });
    all.forEach(button => button.addEventListener("click", () => { const expanded = button.getAttribute("aria-expanded") !== "true"; sections.forEach(section => setSection(section, expanded)); syncAll(); }));
    body.querySelectorAll<HTMLAnchorElement>(".heading-anchor").forEach(anchor => anchor.addEventListener("click", async event => {
        event.preventDefault();
        try { await navigator.clipboard.writeText(anchor.href); anchor.setAttribute("aria-label", "주소 복사됨"); window.setTimeout(() => anchor.setAttribute("aria-label", "제목 주소 복사"), 1200); }
        catch (error) { if (!(error instanceof DOMException)) throw error; anchor.setAttribute("aria-label", "주소 복사 실패"); }
    }));
    const reveal = (target: HTMLElement): void => { const section = target.closest<HTMLElement>("[data-subsection]"); if (section) { setSection(section, true); syncAll(); } };
    body.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not(.heading-anchor)').forEach(anchor => anchor.addEventListener("click", () => { const target = document.getElementById(decodeURIComponent(anchor.hash.slice(1))); if (target) reveal(target); }));
    let chapter = "";
    const headings: readonly Heading[] = [...body.querySelectorAll<HTMLElement>("h2,h3,h4")].map(element => {
        const depth = Number(element.tagName.slice(1)); const number = element.dataset["headingNumber"] ?? "";
        const clone = element.cloneNode(true);
        let title = "";
        if (clone instanceof HTMLElement) { clone.querySelectorAll("a,button,.heading-number").forEach(item => item.remove()); title = (clone.textContent ?? "").trim().replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\s]+/u, ""); }
        if (depth === 3) chapter = element.id; if (depth === 2) chapter = "";
        return { element, depth, title, number, chapter };
    }).filter((heading, index, items) => !(heading.depth === 2 && items[index + 1]?.depth === 3));
    const toc = [...document.querySelectorAll<HTMLElement>("[data-desktop-toc],[data-sheet-toc]")];
    let activeId = "";
    const drawToc = (current: Heading | undefined): void => {
        const currentIndex = headings.findIndex(item => item.element.id === current?.element.id);
        const chapterId = current?.chapter ?? "";
        toc.forEach(nav => {
            nav.replaceChildren(); let previousSections: readonly Heading[] = [];
            const appendLink = (heading: Heading, passed: boolean): void => {
                const link = document.createElement("a"); link.href = "#" + heading.element.id; link.dataset["depth"] = String(heading.depth); link.className = "toc-item"; if (passed) link.classList.add("is-passed");
                if (current?.element === heading.element) link.setAttribute("aria-current", "location");
                if (heading.depth !== 4) { const number = document.createElement("span"); number.className = "toc-number"; if (passed && heading.number) number.append(icon("check", 13)); else number.textContent = heading.number; link.append(number); }
                const label = document.createElement("span"); label.textContent = heading.depth === 4 ? [heading.number, heading.title].filter(Boolean).join(" ") : heading.title; link.append(label);
                link.addEventListener("click", () => { reveal(heading.element); document.querySelector<HTMLDialogElement>("[data-toc-sheet]")?.close(); }); nav.append(link);
            };
            headings.forEach((heading, index) => {
                if (heading.depth === 4 && heading.chapter !== chapterId) return;
                if (heading.depth === 4 && index < currentIndex) { previousSections = [...previousSections, heading]; return; }
                if (previousSections.length) {
                    const first = previousSections[0]; const last = previousSections.at(-1);
                    if (first && last) { const range = document.createElement("a"); range.className = "toc-item toc-range"; range.dataset["depth"] = "4"; range.href = "#" + first.element.id; range.textContent = first.number === last.number ? first.number : `${first.number} – ${last.number}`; range.addEventListener("click", () => { reveal(first.element); document.querySelector<HTMLDialogElement>("[data-toc-sheet]")?.close(); }); nav.append(range); }
                    previousSections = [];
                }
                appendLink(heading, index < currentIndex);
            });
        });
    };
    let fontSize = Number(readPreference("today-learning-font-size") ?? "1"); if (![0, 1, 2].includes(fontSize)) fontSize = 1;
    const applySize = (): void => {
        body.dataset["fontSize"] = String(fontSize);
        document.querySelectorAll<HTMLElement>("[data-font-size]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset["fontSize"] === String(fontSize))));
        const cycle = document.querySelector("[data-cycle-font]"); cycle?.setAttribute("aria-label", `글자 크기 ${["작게", "기본", "크게"][fontSize]}, 다음 크기로 변경`);
        savePreference("today-learning-font-size", String(fontSize));
    };
    document.querySelectorAll<HTMLElement>("[data-font-size]").forEach(button => button.addEventListener("click", () => { fontSize = Number(button.dataset["fontSize"]); applySize(); }));
    document.querySelector("[data-cycle-font]")?.addEventListener("click", () => { fontSize = (fontSize + 1) % 3; applySize(); }); applySize();
    const sheet = document.querySelector<HTMLDialogElement>("[data-toc-sheet]"); let opener: HTMLElement | null = null;
    document.querySelectorAll<HTMLElement>("[data-open-toc]").forEach(button => button.addEventListener("click", () => {
        if (matchMedia("(min-width: 920px)").matches) { const nav = document.querySelector<HTMLElement>("[data-desktop-toc]"); if (nav) { nav.tabIndex = -1; nav.focus(); } }
        else { opener = button; sheet?.showModal(); sheet?.querySelector<HTMLElement>("a,button")?.focus(); }
    }));
    sheet?.querySelector("[data-close-toc]")?.addEventListener("click", () => sheet.close());
    sheet?.addEventListener("close", () => opener?.focus()); sheet?.addEventListener("click", event => { if (event.target === sheet) sheet.close(); });
    document.querySelectorAll<HTMLElement>("[data-reader-top]").forEach(button => button.addEventListener("click", () => document.querySelector(".reader-hero")?.scrollIntoView()));
    let previousScroll = window.scrollY; let scheduled = false;
    const update = (): void => {
        scheduled = false;
        const reading = document.body.dataset["readerTab"] === "til";
        const toolbar = document.querySelector<HTMLElement>("[data-reading-toolbar]"); const mobile = document.querySelector<HTMLElement>("[data-mobile-reading-bar]"); const tabs = document.querySelector("[data-reader-tabs-row]");
        const scrolled = matchMedia("(max-width: 679px)").matches ? body.getBoundingClientRect().top <= 132 : (tabs?.getBoundingClientRect().bottom ?? 0) <= (matchMedia("(min-width: 920px)").matches ? 72 : 64);
        if (toolbar) toolbar.hidden = !reading || !scrolled; if (mobile) { mobile.hidden = !reading; if (Math.abs(window.scrollY - previousScroll) > 2) mobile.classList.toggle("is-scrolling-down", window.scrollY > previousScroll && scrolled); }
        document.querySelectorAll<HTMLElement>(".desktop-back-top").forEach(button => { button.hidden = !reading || !scrolled; });
        const progress = document.querySelector<HTMLElement>("[data-reading-progress]");
        if (progress) { progress.hidden = !reading; const rect = body.getBoundingClientRect(); const value = Math.max(0, Math.min(100, (150 - rect.top) / Math.max(1, rect.height - innerHeight + 150) * 100)); progress.setAttribute("aria-valuenow", String(Math.round(value))); progress.style.setProperty("--reading-progress", `${value}%`); }
        if (reading) {
            const current = headings.filter(heading => heading.element.getBoundingClientRect().top < 170).at(-1) ?? headings[0];
            if (current?.element.id !== activeId) { activeId = current?.element.id ?? ""; drawToc(current); }
            const currentChapter = headings.find(heading => heading.element.id === current?.chapter) ?? current;
            document.querySelectorAll<HTMLElement>("[data-current-chapter]").forEach(label => {
                label.replaceChildren();
                if (!currentChapter) return;
                if (currentChapter.number) {
                    const number = document.createElement("span"); number.className = "current-chapter-number"; number.textContent = currentChapter.number; label.append(number);
                }
                label.append(currentChapter.title);
            });
        }
        previousScroll = window.scrollY;
    };
    const schedule = (): void => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule); window.addEventListener("reader-tab-change", schedule);
    new ResizeObserver(schedule).observe(body); drawToc(headings[0]);
    const initial = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (initial) reveal(initial);
    update();
}
