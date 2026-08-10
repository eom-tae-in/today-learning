import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMetadata } from "../scripts/github/metadata.js";

const fallback = {
    title: "2026-08-10",
    summary: "fallback summary",
    tags: [],
};

test("normalizeMetadata keeps valid metadata unchanged", () => {
    const metadata = normalizeMetadata({
        title: "Redis Cache Aside",
        summary: "Redis Cache Aside 전략과 TTL 기반 캐시 관리",
        tags: ["Redis", "TTL"],
    }, fallback);

    assert.deepEqual(metadata, {
        title: "Redis Cache Aside",
        summary: "Redis Cache Aside 전략과 TTL 기반 캐시 관리",
        tags: ["Redis", "TTL"],
    });
});

test("normalizeMetadata truncates long title and summary", () => {
    const metadata = normalizeMetadata({
        title: "A".repeat(60),
        summary: "B".repeat(100),
        tags: [],
    }, fallback);

    assert.equal(metadata.title.length, 50);
    assert.equal(metadata.title.endsWith("..."), true);
    assert.equal(metadata.summary.length, 90);
    assert.equal(metadata.summary.endsWith("..."), true);
});

test("normalizeMetadata deduplicates tags and keeps at most five", () => {
    const metadata = normalizeMetadata({
        title: "Docker",
        summary: "Docker Volume과 Bind Mount 차이",
        tags: [
            " Docker ",
            "docker",
            "Volume",
            "Bind Mount",
            "Nginx",
            "Reverse Proxy",
            "Linux",
        ],
    }, fallback);

    assert.deepEqual(metadata.tags, [
        "Docker",
        "Volume",
        "Bind Mount",
        "Nginx",
        "Reverse Proxy",
    ]);
});

test("normalizeMetadata fails when title and fallback title are empty", () => {
    assert.throws(
        () => normalizeMetadata({
            title: "",
            summary: "valid summary",
            tags: [],
        }, {
            ...fallback,
            title: "",
        }),
        /Generated title is empty/
    );
});

test("normalizeMetadata fails when generated metadata is not an object", () => {
    assert.throws(
        () => normalizeMetadata(null, fallback),
        /Generated metadata must be an object/
    );
});
