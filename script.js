"use strict";

const CONFIG = Object.freeze({
    owner: "eom-tae-in",
    repository: "TIL",
    branch: "main",

    tilDirectory: "TIL",
    maximumMetadataRequests: 30,

    githubRepositoryUrl: "https://github.com/eom-tae-in/TIL"
});

const API_URL =
    `https://api.github.com/repos/${CONFIG.owner}` +
    `/${CONFIG.repository}/git/trees/${CONFIG.branch}?recursive=1`;

const state = {
    posts: [],
    searchText: "",
    selectedYear: "all"
};

const elements = {
    html: document.documentElement,
    header: document.querySelector(".site-header"),

    themeToggle: document.querySelector("#theme-toggle"),
    themeColorMeta: document.querySelector('meta[name="theme-color"]'),

    searchInput: document.querySelector("#post-search"),
    yearSelect: document.querySelector("#year-select"),
    resetFilterButton: document.querySelector("#reset-filter"),

    statusMessage: document.querySelector("#status-message"),
    postGrid: document.querySelector("#post-grid"),
    emptyState: document.querySelector("#empty-state"),

    totalPostCount: document.querySelector("#total-post-count"),
    recordPeriod: document.querySelector("#record-period"),
    latestDate: document.querySelector("#latest-date"),
    currentYear: document.querySelector("#current-year")
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
    const savedTheme = localStorage.getItem("til-theme");

    const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
    ).matches;

    const initialTheme =
        savedTheme === "light" || savedTheme === "dark"
            ? savedTheme
            : systemPrefersDark
                ? "dark"
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
    localStorage.setItem("til-theme", nextTheme);
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

    elements.yearSelect.addEventListener("change", (event) => {
        state.selectedYear = event.target.value;
        renderPosts();
    });

    elements.resetFilterButton.addEventListener("click", () => {
        state.searchText = "";
        state.selectedYear = "all";

        elements.searchInput.value = "";
        elements.yearSelect.value = "all";

        renderPosts();
        elements.searchInput.focus();
    });

    window.addEventListener(
        "scroll",
        handleHeaderScroll,
        { passive: true }
    );

    handleHeaderScroll();
}

function handleHeaderScroll() {
    elements.header.classList.toggle(
        "is-scrolled",
        window.scrollY > 8
    );
}


/* =========================
   GitHub data
========================= */

async function loadPosts() {
    showLoadingState();

    try {
        const response = await fetch(API_URL, {
            headers: {
                Accept: "application/vnd.github+json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `GitHub API 요청 실패: ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data.tree)) {
            throw new Error("저장소 파일 목록 형식이 올바르지 않습니다.");
        }

        const postFiles = data.tree
            .filter(isTilMarkdownFile)
            .map(createPostFromTreeItem)
            .sort(sortPostsByNewestDate);

        const metadataTargetPosts = postFiles.slice(
            0,
            CONFIG.maximumMetadataRequests
        );

        const postsWithMetadata = await Promise.all(
            metadataTargetPosts.map(loadPostMetadata)
        );

        const postsWithoutMetadata = postFiles.slice(
            CONFIG.maximumMetadataRequests
        );

        state.posts = [
            ...postsWithMetadata,
            ...postsWithoutMetadata
        ];

        populateYearFilter();
        updateSummary();
        renderPosts();
    } catch (error) {
        console.error(error);
        showErrorState();
    }
}

function isTilMarkdownFile(item) {
    if (item.type !== "blob") {
        return false;
    }

    const escapedDirectory = escapeRegExp(CONFIG.tilDirectory);

    const pattern = new RegExp(
        `^${escapedDirectory}/` +
        `(\\d{4})/(\\d{2})/` +
        `(\\d{4}-\\d{2}-\\d{2})\\.md$`
    );

    return pattern.test(item.path);
}

function createPostFromTreeItem(item) {
    const pathParts = item.path.split("/");
    const fileName = pathParts.at(-1);
    const date = fileName.replace(/\.md$/, "");

    return {
        path: item.path,
        date,
        year: date.slice(0, 4),
        title: formatKoreanDate(date),
        description: "오늘 학습한 내용과 문제 해결 과정을 정리했습니다.",
        tags: [],
        url:
            `${CONFIG.githubRepositoryUrl}/blob/` +
            `${CONFIG.branch}/${encodePath(item.path)}`
    };
}

async function loadPostMetadata(post) {
    const rawUrl =
        `https://raw.githubusercontent.com/` +
        `${CONFIG.owner}/${CONFIG.repository}/` +
        `${CONFIG.branch}/${encodePath(post.path)}`;

    try {
        const response = await fetch(rawUrl);

        if (!response.ok) {
            return post;
        }

        const markdown = await response.text();
        const tags = extractTags(markdown);
        const firstHeading = extractFirstHeading(markdown);

        return {
            ...post,
            title:
                firstHeading ||
                createTitleFromTags(tags) ||
                formatKoreanDate(post.date),
            description: createDescription(tags),
            tags
        };
    } catch (error) {
        console.warn(
            `${post.path}의 메타데이터를 불러오지 못했습니다.`,
            error
        );

        return post;
    }
}

function extractTags(markdown) {
    const tagLine = markdown
        .split(/\r?\n/)
        .find((line) => line.includes("태그"));

    if (!tagLine) {
        return [];
    }

    const tagText = tagLine
        .replace(/^>\s*/, "")
        .replace(/🏷️/g, "")
        .replace(/\*\*/g, "")
        .replace(/태그\s*:/, "")
        .trim();

    if (!tagText) {
        return [];
    }

    return tagText
        .split(/[,#|/]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5);
}

function extractFirstHeading(markdown) {
    const heading = markdown
        .split(/\r?\n/)
        .find((line) => /^#\s+/.test(line));

    if (!heading) {
        return "";
    }

    return heading
        .replace(/^#\s+/, "")
        .trim();
}

function createTitleFromTags(tags) {
    if (tags.length === 0) {
        return "";
    }

    if (tags.length === 1) {
        return `${tags[0]} 학습 기록`;
    }

    return `${tags.slice(0, 2).join(" · ")} 학습 기록`;
}

function createDescription(tags) {
    if (tags.length === 0) {
        return "오늘 학습한 내용과 문제 해결 과정을 정리했습니다.";
    }

    return `${tags.join(", ")}에 대해 학습하고 배운 내용을 기록했습니다.`;
}


/* =========================
   Rendering
========================= */

function renderPosts() {
    const filteredPosts = state.posts.filter((post) => {
        const matchesYear =
            state.selectedYear === "all" ||
            post.year === state.selectedYear;

        const searchableText = [
            post.date,
            post.title,
            post.description,
            ...post.tags
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            state.searchText === "" ||
            searchableText.includes(state.searchText);

        return matchesYear && matchesSearch;
    });

    elements.postGrid.replaceChildren();

    elements.statusMessage.hidden = true;

    if (filteredPosts.length === 0) {
        elements.emptyState.hidden = false;
        return;
    }

    elements.emptyState.hidden = true;

    const fragment = document.createDocumentFragment();

    filteredPosts.forEach((post, index) => {
        fragment.appendChild(createPostCard(post, index));
    });

    elements.postGrid.appendChild(fragment);
}

function createPostCard(post, index) {
    const card = document.createElement("a");

    card.className = "post-card";
    card.href = post.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.style.animationDelay = `${Math.min(index * 45, 360)}ms`;

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
            : '<span class="post-tag">TIL</span>';

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
            ${escapeHtml(post.description)}
        </p>

        <div class="post-tags">
            ${tagsMarkup}
        </div>
    `;

    return card;
}

function populateYearFilter() {
    const years = [
        ...new Set(state.posts.map((post) => post.year))
    ].sort((a, b) => b.localeCompare(a));

    const options = years.map((year) => {
        const option = document.createElement("option");

        option.value = year;
        option.textContent = year;

        return option;
    });

    elements.yearSelect.append(...options);
}

function updateSummary() {
    const totalPosts = state.posts.length;

    elements.totalPostCount.textContent =
        totalPosts.toLocaleString("ko-KR");

    if (totalPosts === 0) {
        elements.recordPeriod.textContent = "-";
        elements.latestDate.textContent = "-";
        return;
    }

    const newestPost = state.posts[0];
    const oldestPost = state.posts.at(-1);

    elements.latestDate.textContent =
        formatShortDate(newestPost.date);

    elements.recordPeriod.textContent =
        newestPost.year === oldestPost.year
            ? newestPost.year
            : `${oldestPost.year}–${newestPost.year}`;
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
                    href="${CONFIG.githubRepositoryUrl}"
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
    elements.recordPeriod.textContent = "-";
    elements.latestDate.textContent = "-";
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

function formatKoreanDate(dateString) {
    const [year, month, day] = dateString.split("-");

    return `${year}년 ${Number(month)}월 ${Number(day)}일의 기록`;
}

function encodePath(path) {
    return path
        .split("/")
        .map(encodeURIComponent)
        .join("/");
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}