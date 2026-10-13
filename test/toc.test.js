import assert from "node:assert/strict";
import test from "node:test";
import { describeToc, formatRangeLabel, formatRangeTitle } from "../src/lib/toc.mjs";

const heading = (depth, number, title) => ({ depth, number, title });
const newFormat = [
    heading(2, "", "오늘의 학습 목표"), heading(2, "", "학습 내용"),
    heading(3, "1", "첫 장"), heading(4, "1.1", "가"), heading(4, "1.2", "나"), heading(4, "1.3", "다"),
    heading(3, "2", "둘째 장"), heading(4, "2.1", "라"),
    heading(2, "", "오늘 이해한 핵심"),
];
const states = (view, key) => view.items.filter(item => item[key]).map(item => item.index);

test("the current chapter has no check while earlier chapters do", () => {
    const view = describeToc(newFormat, 5);
    assert.deepEqual(states(view, "passed"), []);
    assert.deepEqual(states(view, "current"), [5]);
    const next = describeToc(newFormat, 7);
    assert.deepEqual(states(next, "passed"), [2]);
    const end = describeToc(newFormat, 8);
    assert.deepEqual(states(end, "passed"), [2, 6]);
    assert.deepEqual(states(end, "visible"), [0, 1, 2, 6, 8]);
});

test("only the current chapter's subsections are shown and earlier ones are folded into a range", () => {
    const view = describeToc(newFormat, 5);
    assert.deepEqual(states(view, "visible"), [0, 1, 2, 3, 4, 5, 6, 8]);
    assert.deepEqual(states(view, "folded"), [3, 4]);
    assert.deepEqual(view.range, { parent: 2, first: 3, last: 4, count: 2, label: "1.1 – 1.2 · 지난 소주제 2개", title: "1.1 가 – 1.2 나" });
    const chapter = describeToc(newFormat, 6);
    assert.deepEqual(states(chapter, "visible"), [0, 1, 2, 6, 7, 8]);
    assert.equal(chapter.range, null);
});

test("nothing is current before the first heading and subsections stay hidden", () => {
    const view = describeToc(newFormat, -1);
    assert.deepEqual(states(view, "current"), []);
    assert.deepEqual(states(view, "passed"), []);
    assert.deepEqual(states(view, "visible"), [0, 1, 2, 6, 8]);
    assert.equal(view.currentParent, null);
});

test("subsections directly under a section belong to that section", () => {
    const oldFormat = [heading(2, "", "잘한 점"), heading(4, "", "상황"), heading(4, "", "행동"), heading(2, "", "아쉬운 점"), heading(4, "", "원인")];
    const view = describeToc(oldFormat, 2);
    assert.deepEqual(states(view, "visible"), [0, 1, 2, 3]);
    assert.deepEqual(states(view, "folded"), [1]);
    assert.equal(view.range?.label, "지난 소주제 1개");
    assert.equal(view.range?.title, "상황");
});

test("range labels show one number for a single subsection", () => {
    assert.equal(formatRangeLabel(heading(4, "2.1", "가"), heading(4, "2.1", "가"), 1), "2.1 · 지난 소주제 1개");
    assert.equal(formatRangeLabel(heading(4, "2.1", "가"), heading(4, "2.5", "마"), 5), "2.1 – 2.5 · 지난 소주제 5개");
    assert.equal(formatRangeTitle(heading(4, "2.1", "가"), heading(4, "2.1", "가")), "2.1 가");
});
