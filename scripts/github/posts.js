import fs from "fs/promises";

const POSTS_PATH = "../prod/posts.json";

export async function loadPosts() {
    try {
        const data = await fs.readFile(POSTS_PATH, "utf8");
        const posts = JSON.parse(data);

        if (!Array.isArray(posts)) {
            throw new Error(
                "posts.json의 최상위 데이터는 배열이어야 합니다."
            );
        }

        return posts;
    } catch (error) {
        if (error.code === "ENOENT") {
            return [];
        }

        throw error;
    }
}

export async function savePosts(posts) {
    const json = JSON.stringify(posts, null, 2);

    await fs.writeFile(
        POSTS_PATH,
        `${json}\n`,
        "utf8"
    );
}

export function upsertPost(posts, post) {
    const index = posts.findIndex(
        existingPost => existingPost.path === post.path
    );

    if (index === -1) {
        posts.push(post);
        return;
    }

    posts[index] = post;
}

export function removePost(posts, path) {
    const index = posts.findIndex(
        post => post.path === path
    );

    if (index === -1) {
        return;
    }

    posts.splice(index, 1);
}