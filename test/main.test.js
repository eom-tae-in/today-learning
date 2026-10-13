import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const moduleUrl = new URL("../scripts/github/main.js", import.meta.url).href;

test("syncRecords creates a TIL-only summary and removes deleted records", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "til-summary-"));
    const source = {
        title: "웹 요청",
        summary: "화면과 서버가 데이터를 주고받는 과정입니다.",
        tags: ["HTTP"],
        readerSummary: {
            overview: "요청이 서버에 전달되어 응답으로 돌아오는 과정을 설명합니다.",
            flow: ["화면이 서버에 요청합니다.", "응답 데이터를 화면에 표시합니다."],
        },
    };

    try {
        await fs.mkdir(path.join(directory, "TIL/2026/10"), { recursive: true });
        await fs.writeFile(path.join(directory, "TIL/2026/10/2026-10-07.md"), "# 웹 요청");
        await fs.writeFile(path.join(directory, "posts.json"), JSON.stringify([
            { date: "2026-10-06", paths: { til: "TIL/2026/10/2026-10-06.md" } },
        ]));

        await exec(process.execPath, ["--input-type=module", "-e", `
            const { syncRecords } = await import(${JSON.stringify(moduleUrl)});
            await syncRecords(["2026-10-07", "2026-10-07", "2026-10-06"], async (paths) => {
                if (Object.keys(paths).join() !== "til") throw new Error("Unexpected source");
                return ${JSON.stringify(source)};
            });
        `], { cwd: directory, env: { ...process.env, OUTPUT_DIRECTORY: "." } });

        const posts = JSON.parse(await fs.readFile(path.join(directory, "posts.json"), "utf8"));
        assert.deepEqual(posts, [{
            ...source,
            date: "2026-10-07",
            paths: { til: "TIL/2026/10/2026-10-07.md" },
            hashtags: ["LG CNS 6기", "개발자", "LGNSINSPIRECMAP"],
        }]);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

const generatedAnalysis = {
    title: "생성된 제목",
    summary: "생성된 설명입니다.",
    tags: ["생성"],
    readerSummary: { overview: "생성된 개요입니다.", flow: ["첫 흐름입니다.", "둘째 흐름입니다."] },
};

function createExistingPost(date) {
    return {
        title: `기존 ${date}`,
        summary: "기존 설명입니다.",
        tags: ["기존"],
        readerSummary: { overview: "기존 개요입니다.", flow: ["기존 첫 흐름입니다.", "기존 둘째 흐름입니다."] },
        date,
        paths: { til: `TIL/2026/10/${date}.md` },
        hashtags: [],
    };
}

function createGeneratedPost(date) {
    return {
        ...generatedAnalysis,
        date,
        paths: { til: `TIL/2026/10/${date}.md` },
        hashtags: ["LG CNS 6기", "개발자", "LGNSINSPIRECMAP"],
    };
}

async function prepareRepository({ tilDates, posts }) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "til-sync-"));
    await fs.mkdir(path.join(directory, "TIL/2026/10"), { recursive: true });
    for (const date of tilDates) {
        await fs.writeFile(path.join(directory, `TIL/2026/10/${date}.md`), `# ${date}`);
    }
    await fs.writeFile(path.join(directory, "posts.json"), JSON.stringify(posts));
    return directory;
}

async function runSyncIn(directory, { changedFiles, summaryDate = "", args = [] }) {
    const listChangedFiles = changedFiles === undefined
        ? "() => { throw new Error(\"git diff must not run\"); }"
        : `() => ${JSON.stringify(changedFiles)}`;
    const { stdout } = await exec(process.execPath, ["--input-type=module", "-e", `
        const fs = await import("node:fs/promises");
        const { runSync } = await import(${JSON.stringify(moduleUrl)});
        const summarizedPaths = [];
        await runSync({
            listChangedFiles: ${listChangedFiles},
            summarize: async ({ til }) => {
                summarizedPaths.push(til);
                return ${JSON.stringify(generatedAnalysis)};
            },
        });
        await fs.writeFile("summarized.json", JSON.stringify(summarizedPaths));
    `, "--", ...args], { cwd: directory, env: { ...process.env, OUTPUT_DIRECTORY: ".", SUMMARY_DATE: summaryDate } });

    return {
        stdout,
        posts: JSON.parse(await fs.readFile(path.join(directory, "posts.json"), "utf8")),
        summarizedPaths: JSON.parse(await fs.readFile(path.join(directory, "summarized.json"), "utf8")),
    };
}

test("runSync summarizes TIL files missing from posts.json even without changed files", async () => {
    const directory = await prepareRepository({
        tilDates: ["2026-10-06", "2026-10-07"],
        posts: [createExistingPost("2026-10-06")],
    });
    try {
        const { posts, summarizedPaths } = await runSyncIn(directory, { changedFiles: [] });

        assert.deepEqual(summarizedPaths, ["TIL/2026/10/2026-10-07.md"]);
        assert.deepEqual(posts, [createExistingPost("2026-10-06"), createGeneratedPost("2026-10-07")]);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("runSync merges changed and missing dates once while keeping rename handling", async () => {
    const directory = await prepareRepository({
        tilDates: ["2026-10-06", "2026-10-07", "2026-10-08"],
        posts: [createExistingPost("2026-10-05"), createExistingPost("2026-10-06")],
    });
    try {
        const { posts, summarizedPaths } = await runSyncIn(directory, {
            changedFiles: [{
                status: "R",
                oldPath: "TIL/2026/10/2026-10-05.md",
                newPath: "TIL/2026/10/2026-10-07.md",
            }],
        });

        assert.deepEqual(summarizedPaths, ["TIL/2026/10/2026-10-07.md", "TIL/2026/10/2026-10-08.md"]);
        assert.deepEqual(posts, [
            createExistingPost("2026-10-06"),
            createGeneratedPost("2026-10-07"),
            createGeneratedPost("2026-10-08"),
        ]);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("runSync adds missing dates to SUMMARY_DATE without reading git changes", async () => {
    const directory = await prepareRepository({
        tilDates: ["2026-10-06", "2026-10-07"],
        posts: [createExistingPost("2026-10-06")],
    });
    try {
        const { posts, summarizedPaths } = await runSyncIn(directory, { summaryDate: "2026-10-06" });

        assert.deepEqual(summarizedPaths, ["TIL/2026/10/2026-10-06.md", "TIL/2026/10/2026-10-07.md"]);
        assert.deepEqual(posts, [createGeneratedPost("2026-10-06"), createGeneratedPost("2026-10-07")]);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("runSync with --all summarizes every TIL once without reading git changes", async () => {
    const directory = await prepareRepository({
        tilDates: ["2026-10-06", "2026-10-07"],
        posts: [createExistingPost("2026-10-06")],
    });
    try {
        const { posts, summarizedPaths } = await runSyncIn(directory, { args: ["--all"] });

        assert.deepEqual(summarizedPaths.toSorted(), ["TIL/2026/10/2026-10-06.md", "TIL/2026/10/2026-10-07.md"]);
        assert.deepEqual(posts, [createGeneratedPost("2026-10-06"), createGeneratedPost("2026-10-07")]);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("runSync ignores TIL files outside the standard record path", async () => {
    const directory = await prepareRepository({
        tilDates: ["2026-10-06"],
        posts: [createExistingPost("2026-10-06")],
    });
    try {
        await fs.writeFile(path.join(directory, "TIL/2026/10/2026-10-07-network.md"), "# 비정규 이름");
        await fs.mkdir(path.join(directory, "TIL/2026/10/sub"), { recursive: true });
        await fs.writeFile(path.join(directory, "TIL/2026/10/sub/2026-10-08.md"), "# 비정규 위치");

        const { stdout, posts, summarizedPaths } = await runSyncIn(directory, { changedFiles: [] });

        assert.deepEqual(summarizedPaths, []);
        assert.deepEqual(posts, [createExistingPost("2026-10-06")]);
        assert.doesNotMatch(stdout, /삭제 완료|posts\.json에 없는 TIL/);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("runSync skips summarization when nothing is changed or missing", async () => {
    const directory = await prepareRepository({
        tilDates: ["2026-10-06"],
        posts: [createExistingPost("2026-10-06")],
    });
    try {
        const { posts, summarizedPaths } = await runSyncIn(directory, { changedFiles: [] });

        assert.deepEqual(summarizedPaths, []);
        assert.deepEqual(posts, [createExistingPost("2026-10-06")]);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
