import { getChangedFiles } from "./git.js";
import { summarizeMarkdown } from "./llm.js";
import {
    loadPosts,
    savePosts,
    upsertPost,
    removePost,
} from "./posts.js";

function isTilMarkdown(path) {
    return path.startsWith("TIL/") && path.endsWith(".md");
}

async function createPost(path) {
    const metadata = await summarizeMarkdown(path);

    return {
        ...metadata,
        path,
    };
}

async function main() {
    const changedFiles = getChangedFiles();

    if (changedFiles.length === 0) {
        console.log("변경된 TIL Markdown 파일이 없습니다.");
        return;
    }

    const posts = await loadPosts();

    for (const file of changedFiles) {
        switch (file.status) {
            case "A": {
                const post = await createPost(file.path);

                upsertPost(posts, post);

                console.log(`추가 완료: ${file.path}`);
                break;
            }

            case "M": {
                const post = await createPost(file.path);

                upsertPost(posts, post);

                console.log(`수정 완료: ${file.path}`);
                break;
            }

            case "D": {
                removePost(posts, file.path);

                console.log(`삭제 완료: ${file.path}`);
                break;
            }

            case "R": {
                if (isTilMarkdown(file.oldPath)) {
                    removePost(posts, file.oldPath);

                    console.log(
                        `기존 경로 삭제 완료: ${file.oldPath}`
                    );
                }

                if (isTilMarkdown(file.newPath)) {
                    const post = await createPost(file.newPath);

                    upsertPost(posts, post);

                    console.log(
                        `새 경로 등록 완료: ${file.newPath}`
                    );
                }

                break;
            }

            default:
                console.warn(
                    `지원하지 않는 Git 상태입니다: ${file.status}`
                );
        }
    }

    await savePosts(posts);

    console.log("posts.json 저장 완료");
}

main().catch(error => {
    console.error("posts.json 갱신 중 오류가 발생했습니다.");
    console.error(error);

    process.exit(1);
});