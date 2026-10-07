import assert from "node:assert/strict";
import test from "node:test";

import { parseAnalysisResponse } from "../scripts/github/llm.js";

const analysis = {
    title: "웹 요청의 흐름",
    summary: "화면에서 보낸 요청이 서버를 거쳐 돌아오는 과정을 설명합니다.",
    tags: ["HTTP"],
    readerSummary: {
        overview: "웹 화면과 서버가 데이터를 주고받는 구조를 설명합니다.",
        flow: ["화면이 서버에 필요한 데이터를 요청합니다.", "서버의 응답을 받아 화면을 바꿉니다."],
    },
};

test("parseAnalysisResponse returns a complete reader summary when JSON is valid", () => {
    assert.deepEqual(parseAnalysisResponse(JSON.stringify(analysis)), analysis);
});

test("parseAnalysisResponse rejects malformed JSON", () => {
    assert.throws(() => parseAnalysisResponse("not json"), /must be valid JSON/);
});

test("parseAnalysisResponse rejects an incomplete summary", () => {
    assert.throws(() => parseAnalysisResponse(JSON.stringify({
        ...analysis,
        readerSummary: { overview: "내용", flow: [] },
    })));
});
