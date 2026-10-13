import assert from "node:assert/strict";
import test from "node:test";
import { resolveRecordsReturnHref } from "../src/lib/records-return.mjs";

const current = "https://eom-tae-in.github.io/today-learning/records/2026-10-08/";
const listPath = "/today-learning/records/";

test("a saved list address keeps its filter query", () => {
    assert.equal(resolveRecordsReturnHref("https://eom-tae-in.github.io/today-learning/records/?tag=JWT&year=2026#top", current, listPath), "/today-learning/records/?tag=JWT&year=2026");
    assert.equal(resolveRecordsReturnHref("https://eom-tae-in.github.io/today-learning/records?q=%EB%A1%9C%EA%B7%B8%EC%9D%B8", current, listPath), "/today-learning/records/?q=%EB%A1%9C%EA%B7%B8%EC%9D%B8");
});

test("missing, invalid, other origin and other page addresses are ignored", () => {
    assert.equal(resolveRecordsReturnHref(null, current, listPath), null);
    assert.equal(resolveRecordsReturnHref("not a url", current, listPath), null);
    assert.equal(resolveRecordsReturnHref("javascript:alert(1)", current, listPath), null);
    assert.equal(resolveRecordsReturnHref("https://example.com/today-learning/records/?tag=JWT", current, listPath), null);
    assert.equal(resolveRecordsReturnHref("https://eom-tae-in.github.io/today-learning/records/2026-10-07/", current, listPath), null);
    assert.equal(resolveRecordsReturnHref("https://eom-tae-in.github.io/today-learning/", current, listPath), null);
});
