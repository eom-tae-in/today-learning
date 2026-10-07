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
