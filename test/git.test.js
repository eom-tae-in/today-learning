import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const moduleUrl = new URL("../scripts/github/git.js", import.meta.url).href;

test("getChangedFiles handles a multi-commit TIL rename without unrelated Markdown", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "til-diff-"));
    const git = (...args) => exec("git", args, { cwd: directory });
    try {
        await git("init", "-q");
        await git("config", "user.name", "Test");
        await git("config", "user.email", "test@example.invalid");
        await fs.mkdir(path.join(directory, "TIL/2026/10"), { recursive: true });
        await fs.writeFile(path.join(directory, "TIL/2026/10/2026-10-06.md"), "# Network");
        await git("add", ".");
        await git("commit", "-qm", "til: initial");
        const base = (await git("rev-parse", "HEAD")).stdout.trim();
        await fs.rename(path.join(directory, "TIL/2026/10/2026-10-06.md"),
            path.join(directory, "TIL/2026/10/2026-10-07.md"));
        await git("add", ".");
        await git("commit", "-qm", "til: rename");
        await fs.writeFile(path.join(directory, "README.md"), "# Notes");
        await git("add", ".");
        await git("commit", "-qm", "docs: notes");
        const { stdout } = await exec(process.execPath, ["--input-type=module", "-e", `
            const { getChangedFiles } = await import(${JSON.stringify(moduleUrl)});
            console.log(JSON.stringify(getChangedFiles()));
        `], {
            cwd: directory,
            env: { ...process.env, DIFF_BASE: base, DIFF_HEAD: "HEAD" },
        });
        assert.deepEqual(JSON.parse(stdout), [{
            status: "R",
            oldPath: "TIL/2026/10/2026-10-06.md",
            newPath: "TIL/2026/10/2026-10-07.md",
        }]);
    } finally {
        await fs.rm(directory, { recursive: true, force: true });
    }
});
