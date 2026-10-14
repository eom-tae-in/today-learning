import assert from "node:assert/strict";
import test from "node:test";
import { findGraphTarget } from "../src/lib/graph-navigation.mjs";

const dates = ["2026-09-03", "2026-09-04", "2026-09-11", "2026-10-01", "2026-10-02", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13"];

test("left and right move to the previous and next record", () => {
    assert.equal(findGraphTarget(dates, "2026-10-06", "ArrowLeft"), "2026-10-02");
    assert.equal(findGraphTarget(dates, "2026-10-06", "ArrowRight"), "2026-10-07");
});

test("the first and last records stay in place at the edges", () => {
    assert.equal(findGraphTarget(dates, "2026-09-03", "ArrowLeft"), "2026-09-03");
    assert.equal(findGraphTarget(dates, "2026-10-13", "ArrowRight"), "2026-10-13");
    assert.equal(findGraphTarget(dates, "2026-09-03", "ArrowUp"), "2026-09-03");
    assert.equal(findGraphTarget(dates, "2026-10-13", "ArrowDown"), "2026-10-13");
});

test("up and down move exactly seven days when a record exists there", () => {
    assert.equal(findGraphTarget(dates, "2026-10-13", "ArrowUp"), "2026-10-06");
    assert.equal(findGraphTarget(dates, "2026-10-01", "ArrowDown"), "2026-10-08");
    assert.equal(findGraphTarget(dates, "2026-09-04", "ArrowDown"), "2026-09-11");
});

test("without a record seven days away the closest record beyond that day is chosen", () => {
    assert.equal(findGraphTarget(dates, "2026-10-07", "ArrowUp"), "2026-09-11");
    assert.equal(findGraphTarget(dates, "2026-10-02", "ArrowUp"), "2026-09-11");
    assert.equal(findGraphTarget(dates, "2026-09-11", "ArrowDown"), "2026-10-01");
    assert.equal(findGraphTarget(dates, "2026-10-02", "ArrowDown"), "2026-10-13");
});

test("when nothing lies beyond seven days the farthest record in that direction is chosen", () => {
    assert.equal(findGraphTarget(dates, "2026-10-08", "ArrowDown"), "2026-10-13");
    assert.equal(findGraphTarget(dates, "2026-09-04", "ArrowUp"), "2026-09-03");
    assert.equal(findGraphTarget(["2026-12-28", "2026-12-30"], "2026-12-28", "ArrowDown"), "2026-12-30");
});

test("home and end jump to the first and last record", () => {
    assert.equal(findGraphTarget(dates, "2026-10-06", "Home"), "2026-09-03");
    assert.equal(findGraphTarget(dates, "2026-10-06", "End"), "2026-10-13");
});

test("other keys and unknown dates are ignored", () => {
    assert.equal(findGraphTarget(dates, "2026-10-06", "Enter"), null);
    assert.equal(findGraphTarget(dates, "2026-10-06", "a"), null);
    assert.equal(findGraphTarget(dates, "2026-10-14", "ArrowLeft"), null);
    assert.equal(findGraphTarget([], "2026-10-14", "End"), null);
});
