"use strict";

const POSTS_URL = "./posts.json";
const GITHUB_REPOSITORY_URL = "https://github.com/eom-tae-in/today-learning";
const POST_BRANCH = "main";
const DEFAULT_MISSING_TLP_MESSAGE =
    "TLP가 작성되어 있지 않아 오늘의 계획 흐름을 돌아보기 어려워요.";
const DEFAULT_MISSING_TIL_MESSAGE =
    "TIL이 작성되어 있지 않아 오늘의 학습 기록을 바탕으로 흐름을 돌아보기 어려워요.";
const DEFAULT_PENDING_REVIEW_MESSAGE =
    "TLP와 TIL은 작성되어 있지만 AI 학습 정리가 아직 생성되지 않았어요.";
const DEFAULT_REVIEWED_MESSAGE =
    "TLP와 TIL을 바탕으로 AI 학습 정리가 준비되었습니다.";
const AI_CHECKIN_LABEL = "AI 학습 정리";
const AI_CHECKIN_HELP_TEXT =
    "오늘의 TLP와 TIL을 바탕으로 오늘 학습을 한 번 정리해 봅니다.";

const RECORD_STATUS = {
    reviewed: {
        label: "AI 평가 생성됨",
        message: DEFAULT_REVIEWED_MESSAGE
    },
    "pending-review": {
        label: "AI 평가 대기",
        message: DEFAULT_PENDING_REVIEW_MESSAGE
    },
    "missing-tlp": {
        label: "TLP 없음",
        message: DEFAULT_MISSING_TLP_MESSAGE
    },
    "missing-til": {
        label: "TIL 없음",
        message: DEFAULT_MISSING_TIL_MESSAGE
    }
};

const READER_TABS = [
    { id: "summary", label: "요약" },
    { id: "tlp", label: "TLP" },
    { id: "til", label: "TIL" },
    { id: "review", label: "AI 정리" }
];

const COMPLETION_LEVELS = {
    excellent: {
        label: "매우 좋음",
        color: "#22c55e"
    },
    good: {
        label: "좋음",
        color: "#5b8def"
    },
    "needs-work": {
        label: "보완 필요",
        color: "#f59e0b"
    },
    "not-evaluated": {
        label: "평가 미진행",
        color: "#94a3b8"
    }
};

const state = {
    posts: [],
    searchText: "",
    selectedYear: "all",
    selectedGraphYear: "",
    selectedGrassDate: "",
    previewRenderId: 0,
    readerRenderId: 0,
    activePostPath: null,
    activeReaderTab: "summary"
};

const elements = {
    html: document.documentElement,
    header: document.querySelector(".site-header"),
    hero: document.querySelector(".hero"),

    themeToggle: document.querySelector("#theme-toggle"),
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),

    searchInput: document.querySelector("#post-search"),
    yearMenu: document.querySelector('[data-menu="search-year"]'),
    yearButton: document.querySelector("#year-button"),
    yearOptions: document.querySelector("#year-options"),
    resetFilterButton: document.querySelector("#reset-filter"),

    statusMessage: document.querySelector("#status-message"),
    postGrid: document.querySelector("#post-grid"),
    emptyState: document.querySelector("#empty-state"),
    postsSection: document.querySelector("#posts"),
    summarySection: document.querySelector(".summary-section"),
    grassGrid: document.querySelector("#grass-grid"),
    grassRange: document.querySelector("#grass-range"),
    grassPreview: document.querySelector("#grass-preview"),
    graphYearMenu: document.querySelector('[data-menu="graph-year"]'),
    graphYearButton: document.querySelector("#graph-year-button"),
    graphYearOptions: document.querySelector("#graph-year-options"),

    totalPostCount: document.querySelector("#total-post-count"),
    currentYear: document.querySelector("#current-year"),

    readerSection: document.querySelector("#post-reader"),
    readerBack: document.querySelector("#reader-back"),
    readerSourceLink: document.querySelector("#reader-source-link"),
    readerDate: document.querySelector("#reader-date"),
    readerTitle: document.querySelector("#reader-title"),
    readerSummary: document.querySelector("#reader-summary"),
    readerTags: document.querySelector("#reader-tags"),
    readerTabs: document.querySelector("#reader-tabs"),
    readerStatus: document.querySelector("#reader-status"),
    readerContent: document.querySelector("#reader-content")
};


/* =========================
   Initialization
========================= */

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
    initializeTheme();
    initializeEventListeners();

    elements.currentYear.textContent = String(new Date().getFullYear());

    await loadPosts();
}


/* =========================
   Theme
========================= */

function initializeTheme() {
    const savedTheme = localStorage.getItem("today-learning-theme");

    const initialTheme =
        savedTheme === "light" || savedTheme === "dark"
            ? savedTheme
            : "light";

    applyTheme(initialTheme);
}

function toggleTheme() {
    const currentTheme =
        elements.html.dataset.theme === "dark"
            ? "dark"
            : "light";

    const nextTheme =
        currentTheme === "dark"
            ? "light"
            : "dark";

    applyTheme(nextTheme);
    localStorage.setItem("today-learning-theme", nextTheme);
}

function applyTheme(theme) {
    const isDark = theme === "dark";

    elements.html.dataset.theme = theme;

    elements.themeToggle.setAttribute(
        "aria-label",
        isDark
            ? "라이트 모드로 변경"
            : "다크 모드로 변경"
    );

    elements.themeToggle.setAttribute(
        "aria-pressed",
        String(isDark)
    );

    elements.themeColorMeta.setAttribute(
        "content",
        isDark ? "#0c1018" : "#f6f8fc"
    );
}


/* =========================
   Events
========================= */

function initializeEventListeners() {
    elements.themeToggle.addEventListener("click", toggleTheme);

    elements.searchInput.addEventListener("input", (event) => {
        state.searchText = event.target.value
            .trim()
            .toLowerCase();

        renderPosts();
    });

    initializeYearMenu({
        menu: elements.yearMenu,
        button: elements.yearButton,
        list: elements.yearOptions,
        getValue: () => state.selectedYear,
        onSelect: (value) => {
            state.selectedYear = value;
            renderSearchYearMenu();
            renderPosts();
        }
    });

    initializeYearMenu({
        menu: elements.graphYearMenu,
        button: elements.graphYearButton,
        list: elements.graphYearOptions,
        getValue: () => state.selectedGraphYear,
        onSelect: (value) => {
            state.selectedGraphYear = value;
            state.selectedGrassDate = "";
            renderGraphYearMenu();
            renderGrass();
        }
    });

    elements.resetFilterButton.addEventListener("click", () => {
        state.searchText = "";
        state.selectedYear = "all";

        elements.searchInput.value = "";

        renderSearchYearMenu();
        renderPosts();
        elements.searchInput.focus();
    });

    window.addEventListener(
        "scroll",
        handleHeaderScroll,
        { passive: true }
    );

    window.addEventListener("hashchange", handleRouteChange);
    document.addEventListener("pointerdown", closeYearMenusOnOutsidePointer);
    elements.readerBack.addEventListener("click", navigateToPosts);
    elements.readerTabs.addEventListener("click", handleReaderTabClick);

    handleHeaderScroll();
}

function handleReaderTabClick(event) {
    const tab = event.target.closest("[data-reader-tab]");

    if (tab === null) {
        return;
    }

    const post = state.posts.find(
        (item) => item.date === state.activePostPath
    );

    if (post === undefined) {
        return;
    }

    showReaderTab(post, tab.dataset.readerTab);
}

function handleHeaderScroll() {
    elements.header.classList.toggle(
        "is-scrolled",
        window.scrollY > 8
    );
}

function initializeYearMenu(config) {
    config.button.addEventListener("click", () => {
        toggleYearMenu(config);
    });

    config.button.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            config.button.getAttribute("aria-expanded") === "true"
        ) {
            event.preventDefault();
            closeYearMenu(config);
            return;
        }

        if (
            event.key !== "ArrowDown" &&
            event.key !== "Enter" &&
            event.key !== " "
        ) {
            return;
        }

        event.preventDefault();
        openYearMenu(config);
        focusSelectedYearOption(config);
    });

    config.list.addEventListener("click", (event) => {
        const option = event.target.closest("[data-year-value]");

        if (option === null) {
            return;
        }

        config.onSelect(option.dataset.yearValue);
        closeYearMenu(config);
        config.button.focus();
    });

    config.list.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeYearMenu(config);
            config.button.focus();
            return;
        }

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveYearOptionFocus(config, event.key === "ArrowDown" ? 1 : -1);
            return;
        }

        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        event.preventDefault();

        const option = document.activeElement.closest("[data-year-value]");

        if (option === null) {
            return;
        }

        config.onSelect(option.dataset.yearValue);
        closeYearMenu(config);
        config.button.focus();
    });
}

function toggleYearMenu(config) {
    if (config.button.getAttribute("aria-expanded") === "true") {
        closeYearMenu(config);
        return;
    }

    openYearMenu(config);
}

function openYearMenu(config) {
    closeAllYearMenus(config.menu);
    config.button.setAttribute("aria-expanded", "true");
    config.list.hidden = false;
}

function closeYearMenu(config) {
    config.button.setAttribute("aria-expanded", "false");
    config.list.hidden = true;
}

function closeAllYearMenus(exceptMenu = null) {
    [
        {
            menu: elements.yearMenu,
            button: elements.yearButton,
            list: elements.yearOptions
        },
        {
            menu: elements.graphYearMenu,
            button: elements.graphYearButton,
            list: elements.graphYearOptions
        }
    ].forEach((config) => {
        if (config.menu === exceptMenu) {
            return;
        }

        closeYearMenu(config);
    });
}

function closeYearMenusOnOutsidePointer(event) {
    if (
        elements.yearMenu.contains(event.target) ||
        elements.graphYearMenu.contains(event.target)
    ) {
        return;
    }

    closeAllYearMenus();
}

function focusSelectedYearOption(config) {
    const selectedOption =
        config.list.querySelector('[aria-selected="true"]') ??
        config.list.querySelector("[data-year-value]");

    selectedOption?.focus();
}

function moveYearOptionFocus(config, direction) {
    const options = [...config.list.querySelectorAll("[data-year-value]")];
    const currentIndex = options.indexOf(document.activeElement);
    const nextIndex =
        currentIndex === -1
            ? 0
            : (currentIndex + direction + options.length) % options.length;

    options[nextIndex]?.focus();
}


async function loadPosts() {
    showLoadingState();

    try {
        const response = await fetch(POSTS_URL);

        if (!response.ok) {
            throw new Error(
                `posts.json 요청 실패: ${response.status}`
            );
        }

        const posts = await response.json();

        if (!Array.isArray(posts)) {
            throw new Error("posts.json의 최상위 데이터는 배열이어야 합니다.");
        }

        state.posts = posts
            .map(normalizePost)
            .sort(sortPostsByNewestDate);
        await hydratePostSearchIndex();

        state.selectedGraphYear = state.posts[0]?.year ?? "";
        state.selectedGrassDate = "";

        populateYearFilter();
        populateGraphYearFilter();
        renderSearchYearMenu();
        renderGraphYearMenu();
        updateSummary();
        renderGrass();
        renderPosts();
        handleRouteChange();
    } catch (error) {
        console.error(error);
        showErrorState();
    }
}

function normalizePost(post) {
    const paths = normalizeRecordPaths(post);
    const primaryPath =
        paths.review ??
        paths.til ??
        paths.tlp ??
        post.path;
    const date = post.date ?? extractDateFromPath(primaryPath);
    const status = post.status ?? inferRecordStatus(paths);
    const statusMeta = RECORD_STATUS[status] ?? RECORD_STATUS["pending-review"];
    const aiEvaluation = normalizeAiEvaluation(post, status, statusMeta);
    const completionLevel = aiEvaluation.level;
    const completionMeta = getCompletionMeta(completionLevel);

    return {
        ...post,
        paths,
        aiEvaluation,
        path: primaryPath,
        date,
        year: date.slice(0, 4),
        status,
        statusLabel: statusMeta.label,
        statusMessage: post.statusMessage ?? statusMeta.message,
        completionLabel: completionMeta.label,
        completionLevel,
        completionLevelLabel: completionMeta.label,
        completionColor: completionMeta.color,
        evaluationLabel: AI_CHECKIN_LABEL,
        evaluationSummary: aiEvaluation.summary,
        searchIndex: createInitialSearchIndex(
            post,
            paths,
            statusMeta,
            aiEvaluation
        ),
        url: createPostUrl(primaryPath),
        pageUrl: createPostPageUrl(date)
    };
}

async function hydratePostSearchIndex() {
    await Promise.all(
        state.posts.map(async (post) => {
            const initialIndex = post.searchIndex;

            post.searchIndex = {
                til: createSearchText([
                    initialIndex.til,
                    await loadSearchDocument(post.paths.til)
                ]),
                tlp: createSearchText([
                    initialIndex.tlp,
                    await loadSearchDocument(post.paths.tlp)
                ]),
                review: createSearchText([
                    initialIndex.review,
                    await loadSearchDocument(post.paths.review)
                ])
            };
        })
    );
}

async function loadSearchDocument(path) {
    if (path === undefined) {
        return "";
    }

    try {
        const response = await fetch(encodePath(path));

        if (!response.ok) {
            return "";
        }

        return (await response.text()).toLowerCase();
    } catch (error) {
        console.warn("검색 인덱스를 불러오지 못했습니다.", path, error);
        return "";
    }
}

function createInitialSearchIndex(post, paths, statusMeta, aiEvaluation) {
    const evaluationMeta = getCompletionMeta(aiEvaluation.level);

    return {
        til: createSearchText([
            post.date,
            post.title,
            post.summary,
            paths.til,
            ...(post.tags ?? [])
        ]),
        tlp: createSearchText([
            post.date,
            paths.tlp
        ]),
        review: createSearchText([
            post.date,
            AI_CHECKIN_LABEL,
            evaluationMeta.label,
            aiEvaluation.summary,
            statusMeta.label,
            post.statusMessage ?? statusMeta.message,
            paths.review
        ])
    };
}

function createSearchText(parts) {
    return parts
        .filter((part) => part !== undefined && part !== null)
        .join(" ")
        .toLowerCase();
}

function normalizeRecordPaths(post) {
    const paths = post.paths ?? {};
    const legacyTilPath =
        post.path?.startsWith("TIL/") === true
            ? post.path
            : undefined;

    return {
        tlp: paths.tlp,
        til: paths.til ?? legacyTilPath,
        review: paths.review
    };
}

function inferRecordStatus(paths) {
    if (paths.tlp === undefined) {
        return "missing-tlp";
    }

    if (paths.til === undefined) {
        return "missing-til";
    }

    return paths.review === undefined
        ? "pending-review"
        : "reviewed";
}

function normalizeAiEvaluation(post, status, statusMeta) {
    const rawEvaluation = post.aiEvaluation ?? {};
    const level = normalizeEvaluationLevel(
        rawEvaluation.level ?? post.completionLevel,
        status
    );
    const summary =
        rawEvaluation.summary ??
        post.evaluationSummary ??
        post.statusMessage ??
        statusMeta.message;

    return {
        level,
        summary,
        reviewedAt: rawEvaluation.reviewedAt
    };
}

function normalizeEvaluationLevel(level, status) {
    if (status !== "reviewed") {
        return "not-evaluated";
    }

    if (level === "reviewed" || level === undefined) {
        return "not-evaluated";
    }

    if (
        level !== "not-evaluated" &&
        COMPLETION_LEVELS[level] !== undefined
    ) {
        return level;
    }

    return "not-evaluated";
}

function getCompletionMeta(level) {
    return (
        COMPLETION_LEVELS[level] ??
        COMPLETION_LEVELS["not-evaluated"]
    );
}

function createPostUrl(path) {
    return (
        `${GITHUB_REPOSITORY_URL}/blob/` +
        `${POST_BRANCH}/${encodePath(path)}`
    );
}

function createPostPageUrl(date) {
    return `#day=${encodeURIComponent(date)}`;
}

function findPostByDate(date) {
    return state.posts.find((post) => post.date === date);
}

function findPostByPath(path) {
    return state.posts.find((post) =>
        Object.values(post.paths).includes(path)
    );
}


/* =========================
   Rendering
========================= */

function renderPosts() {
    const hasSearchIntent =
        state.searchText !== "" ||
        state.selectedYear !== "all";

    elements.postGrid.replaceChildren();
    elements.statusMessage.hidden = true;

    if (!hasSearchIntent) {
        renderSearchPrompt();
        return;
    }

    const filteredPosts = state.posts.filter((post) => {
        const matchesYear =
            state.selectedYear === "all" ||
            post.year === state.selectedYear;

        return matchesYear && matchesSearchFilters(post);
    });

    if (filteredPosts.length === 0) {
        renderSearchEmpty();
        return;
    }

    elements.emptyState.hidden = true;

    const fragment = document.createDocumentFragment();

    filteredPosts.forEach((post, index) => {
        fragment.appendChild(createPostCard(post, index));
    });

    elements.postGrid.appendChild(fragment);
}

function renderSearchPrompt() {
    elements.emptyState.hidden = false;
    elements.emptyState.querySelector("h3").textContent =
        "검색어를 입력해 주세요.";
    elements.emptyState.querySelector("p").textContent =
        "키워드를 입력하거나 연도를 선택해 주세요.";
    elements.resetFilterButton.hidden = true;
}

function renderSearchEmpty() {
    elements.emptyState.hidden = false;
    elements.emptyState.querySelector("h3").textContent =
        "검색 결과가 없습니다.";
    elements.emptyState.querySelector("p").textContent =
        "다른 키워드나 연도로 다시 찾아보세요.";
    elements.resetFilterButton.hidden = false;
}

function matchesSearchFilters(post) {
    if (state.searchText === "") {
        return true;
    }

    return Object.values(post.searchIndex).some((text) =>
        text.includes(state.searchText)
    );
}

function createPostCard(post, index) {
    const card = document.createElement("a");

    card.className = "post-card";
    card.href = post.pageUrl;
    card.dataset.level = post.completionLevel;
    card.style.animationDelay = `${Math.min(index * 45, 360)}ms`;
    card.style.setProperty("--level-color", post.completionColor);

    card.setAttribute(
        "aria-label",
        `${post.title} 학습 기록 열기`
    );

    const tagsMarkup =
        post.tags.length > 0
            ? post.tags
                .map(
                    (tag) =>
                        `<span class="post-tag">${escapeHtml(tag)}</span>`
                )
                .join("")
            : '<span class="post-tag">Learning</span>';

    card.innerHTML = `
        <div class="post-meta">
            <time
                class="post-date"
                datetime="${escapeHtml(post.date)}"
            >
                ${escapeHtml(formatDisplayDate(post.date))}
            </time>

            <span class="post-arrow" aria-hidden="true">
                <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                >
                    <path
                        fill="none"
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 17 17 7M8 7h9v9"
                    />
                </svg>
            </span>
        </div>

        <h3>${escapeHtml(post.title)}</h3>

        <p class="post-description">
            ${escapeHtml(post.summary)}
        </p>

        <div class="post-status">
            ${escapeHtml(post.evaluationLabel)}
            <span>${escapeHtml(post.completionLabel)}</span>
        </div>

        <div class="post-tags">
            ${tagsMarkup}
        </div>
    `;

    return card;
}

function renderGrass() {
    elements.grassGrid.replaceChildren();
    elements.grassPreview.replaceChildren();

    if (state.posts.length === 0 || state.selectedGraphYear === "") {
        elements.grassRange.textContent = "아직 표시할 기록이 없습니다.";
        renderGrassPreview(null);
        return;
    }

    const postsByDate = new Map();
    const selectedYearPosts = state.posts.filter(
        (post) => post.year === state.selectedGraphYear
    );

    selectedYearPosts.forEach((post) => {
        const existingPosts = postsByDate.get(post.date) ?? [];
        existingPosts.push(post);
        postsByDate.set(post.date, existingPosts);
    });

    const yearNumber = Number(state.selectedGraphYear);
    const startDate = new Date(yearNumber, 0, 1);
    const endDate = new Date(yearNumber, 11, 31);
    const dayOffset = startDate.getDay();
    const gridStartDate = addDays(startDate, -dayOffset);
    const gridEndDate = addDays(endDate, 6 - endDate.getDay());
    const gridDays =
        Math.round((gridEndDate - gridStartDate) / 86400000) + 1;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < gridDays; index += 1) {
        const date = addDays(gridStartDate, index);
        const dateKey = formatIsoDate(date);
        const posts = postsByDate.get(dateKey) ?? [];
        const cell = document.createElement(
            posts.length > 0 ? "button" : "span"
        );

        cell.className = "grass-cell";

        if (date < startDate || date > endDate) {
            cell.dataset.outside = "true";
        }

        if (posts.length > 0) {
            let activatedByPointer = false;
            const post = posts[0];
            const label = `${formatDisplayDate(dateKey)} ${posts
                .map((post) => post.title)
                .join(", ")}`;

            cell.type = "button";
            cell.dataset.level = post.completionLevel;
            cell.dataset.state =
                dateKey === state.selectedGrassDate
                    ? "selected"
                    : "recorded";
            cell.style.setProperty("--level-color", post.completionColor);
            cell.setAttribute("aria-label", label);
            cell.setAttribute(
                "aria-pressed",
                String(dateKey === state.selectedGrassDate)
            );
            cell.dataset.date = dateKey;
            cell.addEventListener("pointerdown", (event) => {
                if (event.button !== 0) {
                    return;
                }

                selectGrassDate(dateKey);
                activatedByPointer = true;
            });
            cell.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                    return;
                }

                event.preventDefault();
                selectGrassDate(dateKey);
            });
            cell.addEventListener("click", () => {
                if (activatedByPointer) {
                    activatedByPointer = false;
                    return;
                }

                selectGrassDate(dateKey);
            });
        } else {
            cell.dataset.state = "empty";
            cell.setAttribute("aria-hidden", "true");
        }

        fragment.appendChild(cell);
    }

    elements.grassGrid.appendChild(fragment);
    elements.grassRange.textContent = `${state.selectedGraphYear}년`;
    renderGrassPreview(
        postsByDate.get(state.selectedGrassDate)?.[0] ?? null
    );
}

function selectGrassDate(dateKey) {
    state.selectedGrassDate =
        state.selectedGrassDate === dateKey
            ? ""
            : dateKey;

    updateGrassSelection();

    if (state.selectedGrassDate === "") {
        renderGrassPreview(null);
        return;
    }

    renderGrassPreview(
        state.posts.find(
            (post) => post.date === state.selectedGrassDate
        ) ?? null
    );
}

function updateGrassSelection() {
    elements.grassGrid
        .querySelectorAll("button.grass-cell")
        .forEach((cell) => {
            const isSelected = cell.dataset.date === state.selectedGrassDate;

            cell.dataset.state = isSelected ? "selected" : "recorded";
            cell.setAttribute("aria-pressed", String(isSelected));
        });
}

function renderGrassPreview(post) {
    const renderId = state.previewRenderId + 1;
    state.previewRenderId = renderId;
    elements.grassPreview.classList.remove("is-entering");
    elements.grassPreview.classList.toggle("is-prompt", post === null);

    if (post === null) {
        const promptMarkup = `
            <article class="grass-preview-card grass-preview-card--prompt">
                <span class="grass-preview-eyebrow">
                    TODAY LEARNING PREVIEW
                </span>

                <h3>기록된 날짜를 선택해 주세요.</h3>

                <p>
                    강조된 날을 누르면 그날 작성한 학습 요약을
                    바로 확인할 수 있습니다.
                </p>
            </article>
        `;

        window.setTimeout(() => {
            if (state.previewRenderId !== renderId) {
                return;
            }

            elements.grassPreview.innerHTML = promptMarkup;
            elements.grassPreview.hidden = false;
            elements.grassPreview.getBoundingClientRect();
            elements.grassPreview.classList.add("is-entering");
        }, 130);

        return;
    }

    const tagsMarkup =
        post.tags.length > 0
            ? post.tags
                .map(
                    (tag) =>
                        `<span class="post-tag">${escapeHtml(tag)}</span>`
                )
                .join("")
            : '<span class="post-tag">Learning</span>';

    const previewMarkup = `
        <article
            class="grass-preview-card"
            data-level="${escapeHtml(post.completionLevel)}"
            style="--level-color: ${escapeHtml(post.completionColor)}"
        >
            <div class="grass-preview-main">
                <div>
                    <time datetime="${escapeHtml(post.date)}">
                        ${escapeHtml(formatDisplayDate(post.date))}
                    </time>

                    <h3>${escapeHtml(post.title)}</h3>

                    <p>${escapeHtml(post.summary)}</p>
                </div>

                <p class="grass-preview-status">
                    <span>
                        ${escapeHtml(post.evaluationLabel)} ·
                        ${escapeHtml(post.completionLabel)}
                    </span>
                    ${escapeHtml(post.evaluationSummary)}
                </p>
            </div>

            <div class="grass-preview-footer">
                <div class="post-tags">
                    ${tagsMarkup}
                </div>

                <a href="${escapeHtml(post.pageUrl)}">
                    상세 보기
                </a>
            </div>
        </article>
    `;

    window.setTimeout(() => {
        if (state.previewRenderId !== renderId) {
            return;
        }

        elements.grassPreview.classList.remove("is-prompt");
        elements.grassPreview.innerHTML = previewMarkup;
        elements.grassPreview.hidden = false;
        elements.grassPreview.getBoundingClientRect();
        elements.grassPreview.classList.add("is-entering");
    }, 130);
}

function populateYearFilter() {
    const years = [
        ...new Set(state.posts.map((post) => post.year))
    ].sort((a, b) => b.localeCompare(a));

    elements.yearOptions.replaceChildren(
        createYearOption({
            value: "all",
            label: "전체",
            isSelected: state.selectedYear === "all"
        }),
        ...years.map((year) =>
            createYearOption({
                value: year,
                label: year,
                isSelected: state.selectedYear === year
            })
        )
    );
}

function populateGraphYearFilter() {
    const years = [
        ...new Set(state.posts.map((post) => post.year))
    ].sort((a, b) => b.localeCompare(a));

    elements.graphYearOptions.replaceChildren(
        ...years.map((year) =>
            createYearOption({
                value: year,
                label: year,
                isSelected: state.selectedGraphYear === year
            })
        )
    );
}

function renderSearchYearMenu() {
    updateYearMenuLabel(
        elements.yearButton,
        state.selectedYear === "all" ? "전체" : state.selectedYear
    );
    updateYearOptions(elements.yearOptions, state.selectedYear);
}

function renderGraphYearMenu() {
    updateYearMenuLabel(elements.graphYearButton, state.selectedGraphYear);
    updateYearOptions(elements.graphYearOptions, state.selectedGraphYear);
}

function createYearOption({ value, label, isSelected }) {
    const option = document.createElement("button");

    option.className = "year-menu-option";
    option.type = "button";
    option.tabIndex = -1;
    option.dataset.yearValue = value;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(isSelected));
    option.textContent = label;

    return option;
}

function updateYearMenuLabel(button, label) {
    button.querySelector("[data-year-label]").textContent = label;
}

function updateYearOptions(list, selectedValue) {
    list.querySelectorAll("[data-year-value]").forEach((option) => {
        option.setAttribute(
            "aria-selected",
            String(option.dataset.yearValue === selectedValue)
        );
    });
}

function updateSummary() {
    const totalPosts = state.posts.length;

    elements.totalPostCount.textContent =
        totalPosts.toLocaleString("ko-KR");
}

/* =========================
   UI states
========================= */

function showLoadingState() {
    elements.statusMessage.hidden = false;
    elements.emptyState.hidden = true;
    elements.postGrid.replaceChildren();
}

function showErrorState() {
    elements.statusMessage.hidden = false;

    elements.statusMessage.innerHTML = `
        <div>
            <strong>학습 기록을 불러오지 못했습니다.</strong>
            <p>
                잠시 후 다시 시도하거나
                <a
                    href="${GITHUB_REPOSITORY_URL}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    GitHub 저장소
                </a>
                에서 확인해 주세요.
            </p>
        </div>
    `;

    elements.totalPostCount.textContent = "-";
    elements.grassRange.textContent = "기록을 불러오지 못했습니다.";
    renderGrassPreview(null);
}


async function handleRouteChange() {
    if (state.posts.length === 0) {
        return;
    }

    const post = getPostFromHash();

    if (post === null) {
        showListView();
        return;
    }

    await showReaderView(post);
}

function getPostFromHash() {
    const hash = window.location.hash.replace(/^#/, "");

    if (hash.startsWith("day=")) {
        try {
            return findPostByDate(decodeURIComponent(hash.slice(4))) ?? null;
        } catch {
            return null;
        }
    }

    if (hash.startsWith("post=")) {
        try {
            return findPostByPath(decodeURIComponent(hash.slice(5))) ?? null;
        } catch {
            return null;
        }
    }

    return null;
}

function showListView() {
    state.activePostPath = null;
    state.activeReaderTab = "summary";

    elements.hero.hidden = false;
    elements.summarySection.hidden = false;
    elements.postsSection.hidden = false;
    elements.readerSection.hidden = true;

    elements.readerContent.replaceChildren();
    clearReaderContentTone();
    elements.readerStatus.hidden = true;
}

async function showReaderView(post) {
    state.activePostPath = post.date;
    state.activeReaderTab = "summary";

    elements.hero.hidden = true;
    elements.summarySection.hidden = true;
    elements.postsSection.hidden = true;
    elements.readerSection.hidden = false;

    renderReaderHeader(post);
    await showReaderTab(post, "summary");
    elements.readerTitle.focus({ preventScroll: true });
    resetReaderScroll();
}

function resetReaderScroll() {
    window.scrollTo({ top: 0, behavior: "auto" });

    window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
    });

    window.setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
    }, 80);
}

function renderReaderHeader(post) {
    elements.readerDate.textContent = formatDisplayDate(post.date);
    elements.readerTitle.textContent = post.title;
    elements.readerTitle.tabIndex = -1;
    elements.readerSummary.textContent = post.summary;
    elements.readerSourceLink.href = post.url;

    elements.readerTags.replaceChildren();
    elements.readerTabs.replaceChildren();

    const tags = [
        post.completionLabel,
        ...(post.tags.length > 0 ? post.tags : ["Learning"])
    ];

    tags.forEach((tag) => {
        const tagElement = document.createElement("span");
        tagElement.className = "post-tag";
        tagElement.textContent = tag;
        elements.readerTags.appendChild(tagElement);
    });

    READER_TABS.forEach((tab) => {
        const tabElement = document.createElement("button");
        tabElement.className = "reader-tab";
        tabElement.type = "button";
        tabElement.dataset.readerTab = tab.id;
        tabElement.textContent = tab.label;
        elements.readerTabs.appendChild(tabElement);
    });
}

async function showReaderTab(post, tabId) {
    const renderId = state.readerRenderId + 1;

    state.readerRenderId = renderId;
    state.activeReaderTab = tabId;
    updateReaderTabs();

    if (tabId === "summary") {
        showReaderSummary(post);
        return;
    }

    const path = post.paths[tabId];

    if (path === undefined) {
        showMissingReaderTab(post, tabId);
        return;
    }

    await showMarkdownReaderTab(post, path, renderId, tabId);
}

function updateReaderTabs() {
    elements.readerTabs
        .querySelectorAll("[data-reader-tab]")
        .forEach((tab) => {
            const isSelected =
                tab.dataset.readerTab === state.activeReaderTab;

            tab.classList.toggle("is-selected", isSelected);
            tab.setAttribute("aria-pressed", String(isSelected));
        });
}

function showReaderSummary(post) {
    elements.readerStatus.hidden = true;
    elements.readerSourceLink.hidden = true;
    clearReaderContentTone();
    elements.readerContent.innerHTML = `
        <section
            class="record-summary"
            data-level="${escapeHtml(post.completionLevel)}"
            style="--level-color: ${escapeHtml(post.completionColor)}"
        >
            <p class="record-summary-status">
                학습 정리
                <span>${escapeHtml(post.completionLabel)}</span>
            </p>

            <h3>오늘의 학습 요약</h3>

            <p>
                ${escapeHtml(post.summary)}
            </p>

            <div class="record-summary-notice">
                <div class="record-summary-notice-header">
                    <strong>
                        🤖 ${escapeHtml(post.evaluationLabel)}
                    </strong>
                    <span>
                        ${escapeHtml(post.completionLabel)}
                    </span>
                </div>

                <p class="record-summary-help">
                    ${escapeHtml(AI_CHECKIN_HELP_TEXT)}
                </p>

                <p>${escapeHtml(post.evaluationSummary)}</p>
            </div>
        </section>
    `;
}

function showMissingReaderTab(post, tabId) {
    const message = createMissingReaderTabMessage(post, tabId);

    elements.readerStatus.hidden = true;
    elements.readerSourceLink.hidden = true;
    clearReaderContentTone();
    elements.readerContent.innerHTML = `
        <section class="record-summary record-summary--empty">
            <p class="record-summary-status">
                ${escapeHtml(message.label)}
            </p>

            <h3>${escapeHtml(message.title)}</h3>

            <p>
                ${escapeHtml(message.description)}
            </p>
        </section>
    `;
}

function createMissingReaderTabMessage(post, tabId) {
    if (tabId === "tlp") {
        return {
            label: "TLP 없음",
            title: "계획 기록이 없습니다.",
            description: post.status === "missing-tlp"
                ? post.statusMessage
                : "이 날짜에는 TLP 파일이 연결되어 있지 않습니다."
        };
    }

    if (tabId === "til") {
        return {
            label: "TIL 없음",
            title: "회고 기록이 없습니다.",
            description: post.status === "missing-til"
                ? post.statusMessage
                : "이 날짜에는 TIL 파일이 연결되어 있지 않습니다."
        };
    }

    return {
        label: "AI 정리 없음",
        title: "AI 학습 정리가 없습니다.",
        description: post.statusMessage
    };
}

async function showMarkdownReaderTab(post, path, renderId, tabId) {
    elements.readerSourceLink.hidden = false;
    elements.readerSourceLink.href = createPostUrl(path);
    showReaderLoading();

    try {
        const response = await fetch(encodePath(path));

        if (!response.ok) {
            throw new Error(
                `Markdown 요청 실패: ${response.status}`
            );
        }

        const markdown = stripMarkdownFrontMatter(await response.text());

        if (
            state.activePostPath !== post.date ||
            state.readerRenderId !== renderId
        ) {
            return;
        }

        updateReaderContentTone(post, tabId === "review");
        elements.readerContent.innerHTML = renderMarkdown(markdown);
        highlightReaderCodeBlocks();
        elements.readerStatus.hidden = true;
    } catch (error) {
        if (
            state.activePostPath !== post.date ||
            state.readerRenderId !== renderId
        ) {
            return;
        }

        console.error(error);
        showReaderError("Markdown 파일을 불러오지 못했습니다.");
    }
}

function showReaderLoading() {
    elements.readerStatus.hidden = false;
    elements.readerStatus.innerHTML = `
        <span class="loader" aria-hidden="true"></span>
        Markdown을 불러오는 중입니다.
    `;
    clearReaderContentTone();
    elements.readerContent.replaceChildren();
}

function updateReaderContentTone(post, isAiReview) {
    if (!isAiReview) {
        clearReaderContentTone();
        return;
    }

    elements.readerContent.classList.add("is-ai-review");
    elements.readerContent.dataset.level = post.completionLevel;
    elements.readerContent.style.setProperty(
        "--level-color",
        post.completionColor
    );
}

function clearReaderContentTone() {
    elements.readerContent.classList.remove("is-ai-review");
    delete elements.readerContent.dataset.level;
    elements.readerContent.style.removeProperty("--level-color");
}

function stripMarkdownFrontMatter(markdown) {
    return markdown.replace(
        /^---\r?\n[\s\S]*?\r?\n---\r?\n+/,
        ""
    );
}

function showReaderError(message) {
    elements.summarySection.hidden = true;
    elements.postsSection.hidden = true;
    elements.hero.hidden = true;
    elements.readerSection.hidden = false;

    elements.readerDate.textContent = "";
    elements.readerTitle.textContent = "기록을 열 수 없습니다.";
    elements.readerSummary.textContent = message;
    elements.readerTags.replaceChildren();
    elements.readerSourceLink.removeAttribute("href");
    elements.readerStatus.hidden = true;
    clearReaderContentTone();
    elements.readerContent.innerHTML = `
        <p>
            목록으로 돌아가 다시 시도해 주세요.
        </p>
    `;
}

function navigateToPosts() {
    history.pushState("", document.title, window.location.pathname);
    showListView();
    elements.postsSection.scrollIntoView({ block: "start" });
}


function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let listItems = [];
    let quoteLines = [];
    let codeLines = [];
    let tableRows = [];
    let inCodeBlock = false;
    let codeLanguage = "";

    const flushParagraph = () => {
        if (paragraph.length === 0) {
            return;
        }

        html.push(
            `<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`
        );
        paragraph = [];
    };

    const flushList = () => {
        if (listItems.length === 0) {
            return;
        }

        html.push(renderMarkdownListItems(listItems));
        listItems = [];
    };

    const flushQuote = () => {
        if (quoteLines.length === 0) {
            return;
        }

        html.push(
            `<blockquote>${quoteLines
                .map((item) => `<p>${renderInlineMarkdown(item)}</p>`)
                .join("")}</blockquote>`
        );
        quoteLines = [];
    };

    const flushCodeBlock = () => {
        if (!inCodeBlock) {
            return;
        }

        const languageClass = getMarkdownCodeLanguageClass(codeLanguage);
        const languageLabel = getMarkdownCodeLanguageLabel(codeLanguage);
        const languageAttribute =
            languageLabel === ""
                ? ""
                : ` data-language="${escapeHtml(languageLabel)}"`;

        html.push(
            `<pre class="code-block"${languageAttribute}><code class="${languageClass}">${escapeHtml(codeLines.join("\n"))}</code></pre>`
        );
        codeLines = [];
        codeLanguage = "";
        inCodeBlock = false;
    };

    const flushTable = () => {
        if (tableRows.length === 0) {
            return;
        }

        const [header, ...bodyRows] = tableRows;
        html.push(
            `<table><thead><tr>${header
                .map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`)
                .join("")}</tr></thead><tbody>${bodyRows
                .map(
                    (row) =>
                        `<tr>${row
                            .map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`)
                            .join("")}</tr>`
                )
                .join("")}</tbody></table>`
        );
        tableRows = [];
    };

    lines.forEach((line) => {
        const codeFenceMatch = line.trim().match(/^```([A-Za-z0-9_+.#-]*)\s*$/);

        if (codeFenceMatch !== null) {
            if (inCodeBlock) {
                flushCodeBlock();
            } else {
                flushParagraph();
                flushList();
                flushQuote();
                flushTable();
                inCodeBlock = true;
                codeLanguage = codeFenceMatch[1] ?? "";
                codeLines = [];
            }

            return;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            return;
        }

        const trimmedLine = line.trim();

        if (trimmedLine === "") {
            flushParagraph();
            flushList();
            flushQuote();
            flushTable();
            return;
        }

        if (/^---+$/.test(trimmedLine)) {
            flushParagraph();
            flushList();
            flushQuote();
            flushTable();
            html.push("<hr>");
            return;
        }

        const headingMatch = trimmedLine.match(/^(#{1,4})\s+(.+)$/);

        if (headingMatch !== null) {
            flushParagraph();
            flushList();
            flushQuote();
            flushTable();

            const level = headingMatch[1].length;
            const text = renderInlineMarkdown(headingMatch[2]);
            html.push(`<h${level}>${text}</h${level}>`);
            return;
        }

        const quoteMatch = trimmedLine.match(/^>\s?(.+)$/);

        if (quoteMatch !== null) {
            flushParagraph();
            flushList();
            flushTable();
            quoteLines.push(quoteMatch[1]);
            return;
        }

        const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/);

        if (listMatch !== null) {
            flushParagraph();
            flushQuote();
            flushTable();
            listItems.push({
                depth: getMarkdownListDepth(listMatch[1]),
                content: listMatch[2].trim()
            });
            return;
        }

        if (isMarkdownTableRow(trimmedLine)) {
            flushParagraph();
            flushList();
            flushQuote();

            const cells = parseMarkdownTableRow(trimmedLine);
            const lastRow = tableRows.at(-1);

            if (
                tableRows.length === 1 &&
                cells.length === lastRow.length &&
                cells.every(isMarkdownTableDivider)
            ) {
                return;
            }

            tableRows.push(cells);
            return;
        }

        flushList();
        flushQuote();
        flushTable();
        paragraph.push(trimmedLine);
    });

    flushCodeBlock();
    flushParagraph();
    flushList();
    flushQuote();
    flushTable();

    return html.join("");
}

function highlightReaderCodeBlocks() {
    if (window.Prism === undefined) {
        return;
    }

    window.Prism.highlightAllUnder(elements.readerContent);
}

function getMarkdownCodeLanguageClass(language) {
    const normalizedLanguage = normalizeMarkdownCodeLanguage(language);
    return normalizedLanguage === ""
        ? "language-plaintext"
        : `language-${normalizedLanguage}`;
}

function getMarkdownCodeLanguageLabel(language) {
    const normalizedLanguage = normalizeMarkdownCodeLanguage(language);

    if (normalizedLanguage === "") {
        return "";
    }

    const labels = {
        bash: "Bash",
        css: "CSS",
        html: "HTML",
        java: "Java",
        javascript: "JavaScript",
        json: "JSON",
        jsx: "JSX",
        markup: "HTML",
        markdown: "Markdown",
        plaintext: "Text",
        shell: "Shell",
        text: "Text",
        tsx: "TSX",
        typescript: "TypeScript",
        xml: "XML",
        yaml: "YAML"
    };

    return labels[normalizedLanguage] ?? normalizedLanguage.toUpperCase();
}

function normalizeMarkdownCodeLanguage(language) {
    const normalizedLanguage = String(language)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9+#.-]/g, "");

    const aliases = {
        cjs: "javascript",
        html: "markup",
        js: "javascript",
        mjs: "javascript",
        md: "markdown",
        plaintext: "plaintext",
        py: "python",
        sh: "bash",
        text: "plaintext",
        ts: "typescript",
        yml: "yaml"
    };

    return aliases[normalizedLanguage] ?? normalizedLanguage;
}

function getMarkdownListDepth(indent) {
    const columnCount = [...indent].reduce(
        (count, character) => count + (character === "\t" ? 4 : 1),
        0
    );

    return Math.floor(columnCount / 4);
}

function renderMarkdownListItems(items) {
    const root = [];
    const stack = [{ depth: -1, children: root }];

    items.forEach((item) => {
        while (item.depth <= stack.at(-1).depth) {
            stack.pop();
        }

        const node = {
            content: item.content,
            children: []
        };

        stack.at(-1).children.push(node);
        stack.push({
            depth: item.depth,
            children: node.children
        });
    });

    return renderMarkdownListNodes(root);
}

function renderMarkdownListNodes(nodes) {
    return `<ul>${nodes.map(renderMarkdownListNode).join("")}</ul>`;
}

function renderMarkdownListNode(node) {
    const childrenMarkup =
        node.children.length === 0
            ? ""
            : renderMarkdownListNodes(node.children);

    return `<li>${renderMarkdownListItemContent(node.content)}${childrenMarkup}</li>`;
}

function renderMarkdownListItemContent(content) {
    const taskMatch = content.match(/^\[([ xX])]\s+(.+)$/);

    if (taskMatch === null) {
        return renderInlineMarkdown(content);
    }

    const checked = taskMatch[1].toLowerCase() === "x";

    return [
        '<label class="task-list-item-label">',
        `<input type="checkbox" disabled${checked ? " checked" : ""}>`,
        `<span>${renderInlineMarkdown(taskMatch[2])}</span>`,
        "</label>"
    ].join("");
}

function isMarkdownTableRow(line) {
    return line.startsWith("|") && line.endsWith("|") && line.slice(1, -1).includes("|");
}

function parseMarkdownTableRow(line) {
    return line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());
}

function isMarkdownTableDivider(cell) {
    return /^:?-{3,}:?$/.test(cell);
}

function renderInlineMarkdown(value) {
    return escapeHtml(value)
        .replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        )
        .replace(
            /\*\*([^*]+)\*\*/g,
            "<strong>$1</strong>"
        )
        .replace(
            /\[([^\]]+)]\(([^)]+)\)/g,
            (_match, label, url) => {
                const safeUrl = String(url).replaceAll("&amp;", "&");

                if (!isSafeMarkdownUrl(safeUrl)) {
                    return label;
                }

                const isExternal = /^https?:\/\//.test(safeUrl);
                const target = isExternal
                    ? ' target="_blank" rel="noopener noreferrer"'
                    : "";

                return `<a href="${escapeHtml(safeUrl)}"${target}>${label}</a>`;
            }
        );
}

function isSafeMarkdownUrl(url) {
    return /^(https?:\/\/|\.{0,2}\/|#)/.test(url);
}


/* =========================
   Utilities
========================= */

function sortPostsByNewestDate(firstPost, secondPost) {
    return secondPost.date.localeCompare(firstPost.date);
}

function formatDisplayDate(dateString) {
    return dateString.replaceAll("-", ".");
}

function formatShortDate(dateString) {
    const [, month, day] = dateString.split("-");

    return `${Number(month)}월 ${Number(day)}일`;
}

function parseLocalDate(dateString) {
    const [year, month, day] = dateString
        .split("-")
        .map(Number);

    return new Date(year, month - 1, day);
}

function addDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function formatIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function encodePath(path) {
    return path
        .split("/")
        .map(encodeURIComponent)
        .join("/");
}

function extractDateFromPath(path) {
    const fileName = path.split("/").at(-1);

    return fileName.replace(/\.md$/, "");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
