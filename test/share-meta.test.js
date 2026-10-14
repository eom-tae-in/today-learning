import assert from "node:assert/strict";
import test from "node:test";
import { buildShareMeta } from "../src/lib/share-meta.mjs";

const imageUrl = "https://eom-tae-in.github.io/today-learning/og-image.png";
const contentOf = (tags, key) => tags.filter(tag => ("property" in tag ? tag.property : tag.name) === key).map(tag => tag.content);

test("ordinary pages are shared as a website with the large image card", () => {
    const tags = buildShareMeta({ title: "학습 기록 | Today Learning", description: "설명", imageUrl, pageUrl: "https://eom-tae-in.github.io/today-learning/records/" });
    assert.deepEqual(contentOf(tags, "og:type"), ["website"]);
    assert.deepEqual(contentOf(tags, "og:site_name"), ["Today Learning"]);
    assert.deepEqual(contentOf(tags, "og:locale"), ["ko_KR"]);
    assert.deepEqual(contentOf(tags, "og:url"), ["https://eom-tae-in.github.io/today-learning/records/"]);
    assert.deepEqual(contentOf(tags, "og:image"), [imageUrl]);
    assert.deepEqual(contentOf(tags, "og:image:width"), ["1200"]);
    assert.deepEqual(contentOf(tags, "og:image:height"), ["630"]);
    assert.equal(contentOf(tags, "og:image:alt").length, 1);
    assert.deepEqual(contentOf(tags, "twitter:card"), ["summary_large_image"]);
    assert.deepEqual(contentOf(tags, "article:published_time"), []);
    assert.ok(tags.filter(tag => "name" in tag).every(tag => tag.name.startsWith("twitter:")));
});

test("records are shared as articles with their date and each distinct tag", () => {
    const tags = buildShareMeta({ title: "기록", description: "요약", imageUrl, pageUrl: "https://eom-tae-in.github.io/today-learning/records/2026-10-08/", type: "article", publishedTime: "2026-10-08", tags: ["JWT", "Spring Security", "JWT"] });
    assert.deepEqual(contentOf(tags, "og:type"), ["article"]);
    assert.deepEqual(contentOf(tags, "article:published_time"), ["2026-10-08"]);
    assert.deepEqual(contentOf(tags, "article:tag"), ["JWT", "Spring Security"]);
});

test("pages without an address, such as the not found page, leave out og:url", () => {
    const tags = buildShareMeta({ title: "페이지를 찾을 수 없어요", description: "설명", imageUrl });
    assert.deepEqual(contentOf(tags, "og:url"), []);
    assert.deepEqual(contentOf(tags, "og:type"), ["website"]);
});
