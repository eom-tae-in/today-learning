import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEvaluation } from "../scripts/github/review.js";

test("normalizeEvaluation keeps a valid summary unchanged", () => {
    const evaluation = normalizeEvaluation({
        level: "good",
        summary: "계획과 기록이 일부 연결되고 다음 보완 지점도 남긴 하루",
    }, "2026-08-10");

    assert.deepEqual(evaluation, {
        level: "good",
        summary: "계획과 기록이 일부 연결되고 다음 보완 지점도 남긴 하루",
        reviewedAt: "2026-08-10",
    });
});

test("normalizeEvaluation truncates summaries longer than ninety characters", () => {
    const evaluation = normalizeEvaluation({
        level: "excellent",
        summary: "가".repeat(100),
    }, "2026-08-10");

    assert.equal(evaluation.summary.length, 90);
    assert.equal(evaluation.summary.endsWith("..."), true);
});

test("normalizeEvaluation fails when summary is empty", () => {
    assert.throws(
        () => normalizeEvaluation({
            level: "good",
            summary: " ",
        }, "2026-08-10"),
        /Generated evaluation.summary is empty/
    );
});

test("normalizeEvaluation fails when level is invalid", () => {
    assert.throws(
        () => normalizeEvaluation({
            level: "ok",
            summary: "valid summary",
        }, "2026-08-10"),
        /Invalid generated evaluation.level/
    );
});

test("normalizeEvaluation fails when evaluation is not an object", () => {
    assert.throws(
        () => normalizeEvaluation(null, "2026-08-10"),
        /Generated evaluation must be an object/
    );
});
