import assert from "node:assert/strict";
import test from "node:test";

import {
    createReviewMarkdown,
    normalizeEvaluation,
} from "../scripts/github/review.js";

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

test("createReviewMarkdown renders the concise learning report sections", () => {
    const markdown = createReviewMarkdown("2026-08-12", {
        overview: "Java 기본 문법에서 GuessGame 구현과 메모리 구조 정리로 이어졌다.",
        summary: "TLP의 static, 조건문, 반복문 계획이 TIL의 코드 실습과 개념 정리로 연결됐다.",
        keyLearnings: [
            "static 변수와 인스턴스 멤버의 차이",
            "Scanner, Math.random(), printf()를 활용한 입력·처리·출력 흐름",
        ],
        strengths: [],
        improvements: [],
        nextActions: [
            "이전 계약의 다음 액션은 출력하지 않는다.",
        ],
    }, {
        level: "excellent",
        summary: "Java 기본 문법과 메모리 구조",
        reviewedAt: "2026-08-12",
    });

    assert.match(markdown, /# 🤖 AI 학습 리포트/);
    assert.match(markdown, /## 🧭 종합/);
    assert.match(markdown, /## 📝 요약/);
    assert.match(markdown, /## 📚 주요 학습/);
    assert.doesNotMatch(markdown, /다음 액션/);
    assert.doesNotMatch(markdown, /잘한 점/);
    assert.doesNotMatch(markdown, /보완할 점/);
});

test("createReviewMarkdown renders optional strengths and improvements when present", () => {
    const markdown = createReviewMarkdown("2026-08-12", {
        overview: "Java 학습 흐름을 정리했다.",
        summary: "계획과 기록이 Java 기본 문법 중심으로 연결됐다.",
        keyLearnings: [
            "조건문과 반복문",
        ],
        strengths: [
            "문법 개념을 GuessGame 구현으로 연결했다.",
        ],
        improvements: [
            "static과 인스턴스 접근 관계는 예제로 더 확인할 부분이 남았다.",
        ],
    }, {
        level: "good",
        summary: "Java 기본 문법",
        reviewedAt: "2026-08-12",
    });

    assert.match(markdown, /## 👍 잘한 점/);
    assert.match(markdown, /## 🔧 보완할 점/);
    assert.match(markdown, /문법 개념을 GuessGame 구현으로 연결했다./);
    assert.match(markdown, /static과 인스턴스 접근 관계/);
});
