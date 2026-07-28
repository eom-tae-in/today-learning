import { execFileSync } from "child_process";

const RECORD_DIRECTORIES = ["TLP", "TIL"];

function isRecordMarkdown(path) {
    return RECORD_DIRECTORIES.some(
        directory => path.startsWith(`${directory}/`)
    ) && path.endsWith(".md");
}

export function getChangedFiles() {
    const output = execFileSync(
        "git",
        [
            "diff",
            "--name-status",
            "--find-renames",
            "-z",
            "HEAD~1",
            "HEAD",
            "--",
            ...RECORD_DIRECTORIES,
        ],
        {
            encoding: "utf8",
        }
    );

    if (!output) {
        return [];
    }

    const fields = output.split("\0");
    const changedFiles = [];

    let index = 0;

    while (index < fields.length) {
        const rawStatus = fields[index++];

        if (!rawStatus) {
            break;
        }

        const status = rawStatus[0];

        if (status === "R") {
            const oldPath = fields[index++];
            const newPath = fields[index++];

            if (
                isRecordMarkdown(oldPath) ||
                isRecordMarkdown(newPath)
            ) {
                changedFiles.push({
                    status: "R",
                    oldPath,
                    newPath,
                });
            }

            continue;
        }

        const path = fields[index++];

        if (
            ["A", "M", "D"].includes(status) &&
            isRecordMarkdown(path)
        ) {
            changedFiles.push({
                status,
                path,
            });
        }
    }

    return changedFiles;
}
