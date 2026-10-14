import assert from "node:assert/strict";
import test from "node:test";
import { getPopularTagLabels, getSortedTagLabels, getTagKey, groupTags, hasTag, resolveTagLabel } from "../src/lib/tags.mjs";

const records = [
    { date: "2026-10-08", tags: ["Spring Security", "JWT"] },
    { date: "2026-09-21", tags: ["fetch API", "React"] },
    { date: "2026-09-04", tags: ["React", "Fetch API", "JWT"] },
    { date: "2026-08-07", tags: ["Fetch API", "React", "Axios"] },
    { date: "2026-08-01", tags: ["Axios", "React"] },
];

test("tags that differ only by case are grouped under the most used spelling", () => {
    const groups = groupTags(records);
    assert.equal(groups.length, 5);
    assert.deepEqual(groups.find(group => group.key === "fetch api"), { key: "fetch api", label: "Fetch API", count: 3, latest: "2026-09-21" });
});

test("a spelling tie keeps the most recently used spelling", () => {
    const groups = groupTags([{ date: "2026-01-02", tags: ["vite"] }, { date: "2026-03-04", tags: ["Vite"] }]);
    assert.deepEqual(groups, [{ key: "vite", label: "Vite", count: 2, latest: "2026-03-04" }]);
});

test("a record counts each tag group once", () => {
    const [group] = groupTags([{ date: "2026-10-01", tags: ["JWT", "jwt", " JWT "] }]);
    assert.equal(group?.count, 1);
    assert.equal(group?.label, "JWT");
});

test("popular tags are ranked by usage and then by the latest use", () => {
    assert.deepEqual(getPopularTagLabels(groupTags(records), 3), ["React", "Fetch API", "JWT"]);
    assert.deepEqual(getPopularTagLabels(groupTags(records), 8), ["React", "Fetch API", "JWT", "Axios", "Spring Security"]);
});

test("all tags are sorted alphabetically without regard to case", () => {
    const groups = groupTags([{ date: "2026-10-01", tags: ["final", "Filter", "AI Agent", "Algorithm", "json-server", "JSON", "자바"] }]);
    assert.deepEqual(getSortedTagLabels(groups), ["자바", "AI Agent", "Algorithm", "Filter", "final", "JSON", "json-server"]);
});

test("a requested tag resolves to its representative spelling", () => {
    const labels = ["Fetch API", "Spring Security"];
    assert.equal(resolveTagLabel("fetch API", labels), "Fetch API");
    assert.equal(resolveTagLabel(" spring security ", labels), "Spring Security");
    assert.equal(resolveTagLabel("Kubernetes", labels), "Kubernetes");
    assert.equal(resolveTagLabel("", labels), "");
});

test("tag matching ignores case and surrounding spaces", () => {
    assert.equal(hasTag(["fetch API", "React"], "Fetch API"), true);
    assert.equal(hasTag(["React"], "react "), true);
    assert.equal(hasTag(["React Router"], "React"), false);
    assert.equal(getTagKey(" Spring Boot "), "spring boot");
});
