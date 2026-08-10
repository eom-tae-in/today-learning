import assert from "node:assert/strict";
import test from "node:test";

import { parseAnalysisResponse } from "../scripts/github/llm.js";

test("parseAnalysisResponse parses valid JSON", () => {
    assert.deepEqual(
        parseAnalysisResponse("{\"title\":\"Redis\"}"),
        { title: "Redis" }
    );
});

test("parseAnalysisResponse fails clearly for invalid JSON", () => {
    assert.throws(
        () => parseAnalysisResponse("not json"),
        /Generated AI response must be valid JSON/
    );
});
