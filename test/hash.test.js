import assert from "node:assert/strict";
import test from "node:test";
import { decodeHash } from "../src/lib/hash.mjs";

test("hashes are decoded without the leading sign", () => {
    assert.equal(decodeHash("#summary"), "summary");
    assert.equal(decodeHash("#22-%EC%84%9C%EB%AA%85"), "22-서명");
    assert.equal(decodeHash(""), "");
});

test("malformed percent encoding falls back to the raw value instead of throwing", () => {
    assert.equal(decodeHash("#%E0%A4%A"), "%E0%A4%A");
    assert.equal(decodeHash("#100%"), "100%");
});
