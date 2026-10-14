import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import rehypeSlug from "rehype-slug";
import { remarkReading, readingCodeTransformer } from "../src/lib/remark-reading.mjs";
import { rehypeReading } from "../src/lib/rehype-reading.mjs";
import { rehypeMermaid } from "../src/lib/rehype-mermaid.mjs";

const processor = await createMarkdownProcessor({
    remarkPlugins: [remarkReading], rehypePlugins: [rehypeSlug, rehypeMermaid, rehypeReading],
    shikiConfig: { theme: "css-variables", wrap: false, transformers: [readingCodeTransformer] },
});

test("reading keeps the opening prose and removes only metadata, rules and review", async () => {
    const { code } = await processor.render('# 제목\n\n📅 **작성일:** 2026-10-06\n\n소개 문장\n\n> 인용문\n\n---\n\n## 🎯 목표\n\n목표 문장\n\n## 🔍 복습할 부분\n\n숨기는 문장\n\n## 다음 부분\n\n유지하는 문장');
    assert.match(code, /소개 문장/); assert.match(code, /인용문/); assert.match(code, /🎯 목표/); assert.match(code, /유지하는 문장/);
    assert.doesNotMatch(code, /작성일|숨기는 문장|복습할 부분|<hr|<h1/);
});

test("code is wrapped once and retains original source, title and explicit highlights", async () => {
    const { code } = await processor.render('```java title="Example.java" {2}\n  class Example {\n    String value = "hello";\n  }\n```');
    assert.equal((code.match(/data-code-panel/g) ?? []).length, 1);
    assert.match(code, /Example.java/); assert.match(code, /data-line="2"/); assert.match(code, /highlighted-line/); assert.match(code, /data-source=/);
});

test("only text blocks with arrow-starting lines become flows", async () => {
    const flow = await processor.render('```text\n첫 단계\n  ↓ 이유\n다음 단계\n```');
    assert.match(flow.code, /text-flow/); assert.match(flow.code, /flow-reason/);
    const plain = await processor.render('```text\n화살표 없는 내용\n```');
    assert.match(plain.code, /data-code-panel/); assert.doesNotMatch(plain.code, /text-flow/);
});

test("Mermaid survives Shiki highlighting with its original line breaks", async () => {
    const { code } = await processor.render('```mermaid\nflowchart TD\n    A[처음] --> B[다음]\n```');
    assert.match(code, /class="mermaid-figure"/);
    assert.match(code, /<code>flowchart TD\n    A\[처음\] --> B\[다음\]<\/code>/);
    assert.doesNotMatch(code, /data-code-panel|astro-code-token/);
});

test("numbered subsections retain heading anchors and stop at the next chapter", async () => {
    const { code } = await processor.render('### 1. 장\n\n#### 1.1 소주제\n\n소주제 내용\n\n### 2. 다음 장\n\n다음 장 내용');
    assert.match(code, /id="11-소주제"/); assert.match(code, /data-heading-number="1.1"/); assert.match(code, /subsection-content/);
    assert.match(code, /소주제 내용<\/p>\s*<\/div><\/div>\s*<h3/);
});

test("old TIL with H1 sections is normalized to section, chapter and subsection levels", async () => {
    const { code } = await processor.render('> 📅 **작성일** : 2026-09-04\n\n# 📚 Today I Learned\n\n오늘 학습한 내용을 기록하고 돌아본다.\n\n---\n\n## 🎯 Daily Quest\n\n- [문제](https://example.com)\n\n---\n\n# 🎯 오늘의 학습 목표\n\n목표 문장\n\n# 📚 학습 내용\n\n## 1. 첫 장\n\n### 개념\n\n개념 내용\n\n#### 세부\n\n세부 내용\n\n# 🔍 복습할 부분\n\n숨기는 문장\n\n## 숨기는 하위\n\n# 🔄 함께 복습한 내용\n\n## 1. 복습 장\n\n복습 문장');
    assert.doesNotMatch(code, /<h1|작성일|Today I Learned|기록하고 돌아본다|복습할 부분|숨기는/);
    assert.match(code, /<h2 id="-daily-quest">/); assert.match(code, /<h2 id="-오늘의-학습-목표">/); assert.match(code, /<h2 id="-함께-복습한-내용">/); assert.match(code, /복습 문장/);
    assert.match(code, /<h3 id="1-첫-장" data-heading-number="1" class="chapter-heading"><span class="heading-number">1<\/span>첫 장/);
    assert.match(code, /<div class="subsection" data-subsection=""><h4 id="개념">/); assert.match(code, /<h5 id="세부">/);
});

test("old TIL with numbered H1 chapters keeps H2 inside chapters as subsections and outside as sections", async () => {
    const { code } = await processor.render('> 프로젝트 소개\n\n---\n\n## 오늘의 핵심 요약\n\n요약 문장\n\n# 1. 전체 구조\n\n구조 문장\n\n# 2. 화면 구성\n\n## 소주제\n\n소주제 문장\n\n### 핵심\n\n핵심 문장\n\n# 3. `fetch()` 요청\n\n요청 문장\n\n# 오늘의 정리\n\n정리 문장\n\n# 복습할 부분\n\n숨기는 문장\n\n## ➡\uFE0F 내일 할 일\n\n숨기는 내일 문장\n\n# 한 줄 회고\n\n회고 문장');
    assert.doesNotMatch(code, /<h1|숨기는|내일 할 일/); assert.match(code, /프로젝트 소개/);
    assert.match(code, /<h2 id="오늘의-핵심-요약">/); assert.match(code, /<h2 id="오늘의-정리">/); assert.match(code, /<h2 id="한-줄-회고">/); assert.match(code, /회고 문장/);
    assert.equal((code.match(/class="chapter-heading"/g) ?? []).length, 3); assert.match(code, /<span class="heading-number">3<\/span><code>fetch\(\)<\/code> 요청/);
    assert.match(code, /<div class="subsection" data-subsection=""><h4 id="소주제">/); assert.match(code, /<h5 id="핵심">/);
});

test("new format keeps its heading levels and code lines starting with # are not headings", async () => {
    const { code } = await processor.render('# 제목\n\n## 🎯 목표\n\n목표 문장\n\n```bash\n# 주석 하나\n# 주석 둘\n```\n\n### 1. 장\n\n#### 1.1 소주제\n\n소주제 문장');
    assert.doesNotMatch(code, /<h1|<h5/); assert.match(code, /# 주석 하나/);
    assert.match(code, /<h2 id="-목표">/); assert.match(code, /<h3 id="1-장" data-heading-number="1" class="chapter-heading">/); assert.match(code, /<h4 id="11-소주제" data-heading-number="1.1" class="section-heading-original">/);
});

test("a single body H1 is normalized without changing the surrounding new format levels", async () => {
    const { code } = await processor.render('# 제목\n\n## 섹션\n\n### 1. 장\n\n#### 1.1 소주제\n\n소주제 문장\n\n# 부록\n\n부록 문장');
    assert.doesNotMatch(code, /<h1/); assert.match(code, /<h2 id="섹션">/); assert.match(code, /<h2 id="부록">/); assert.match(code, /부록 문장/);
    assert.match(code, /<h3 id="1-장" data-heading-number="1" class="chapter-heading">/); assert.match(code, /<h4 id="11-소주제" data-heading-number="1.1" class="section-heading-original">/);
});

test("old header is hidden while real opening prose and Daily Quest stay", async () => {
    const opening = await processor.render('📅 **작성일** : 2026-08-10\n\n# 📚 Today I Learned\n\n오늘은 실제 요약 문장이다.\n\n---\n\n## 🎯 Daily Quest\n\n- 문제 풀이');
    assert.doesNotMatch(opening.code, /<h1|작성일|Today I Learned/); assert.match(opening.code, /실제 요약 문장/); assert.match(opening.code, /<h2 id="-daily-quest">/); assert.match(opening.code, /문제 풀이/);
    const short = await processor.render('> 📅 **작성일** : 2026-07-21\n\n---\n\n## ✅ 잘한 점\n\n### 📝 상황\n\n상황 문장');
    assert.doesNotMatch(short.code, /<h1|작성일|<blockquote/); assert.match(short.code, /<h2 id="-잘한-점">/); assert.match(short.code, /<h3 id="-상황">/);
});

test("review notes are hidden at any heading depth while review Q&A stays", async () => {
    const { code } = await processor.render('## 장\n\n장 문장\n\n### 🔍 복습할 부분\n\n숨기는 문장\n\n#### 하위\n\n숨기는 하위 문장\n\n### 💬 복습 Q&A\n\n질문 문장\n\n## 다음 부분\n\n유지 문장');
    assert.doesNotMatch(code, /복습할 부분|숨기는/); assert.match(code, /<h3 id="-복습-qa">💬 복습 Q&#x26;A/); assert.match(code, /질문 문장/); assert.match(code, /장 문장/); assert.match(code, /유지 문장/);
});

test("branch lines become nested unnumbered branches and lone arrows connect steps", async () => {
    const { code } = await processor.render('```text\n요청\n    ↓\nController\n    ├─ 성공 → 응답\n    └─ 실패\n          ├─ 검증 오류 → 400\n          └─ 서버 오류 → 500\n                ↓\n응답 반환\n    ↓ 이유\n완료\n```');
    assert.doesNotMatch(code, /[├└│]/);
    assert.equal((code.match(/class="flow-step"/g) ?? []).length, 4); assert.match(code, /<p class="flow-reason">이유<\/p>/);
    assert.match(code, /<li><p class="flow-step">요청<\/p><p class="flow-reason"><\/p><\/li>/);
    assert.match(code, /<p class="flow-step">Controller<\/p><ul class="flow-branches"><li>성공 → 응답<\/li><li>실패<ul class="flow-branches"><li>검증 오류 → 400<\/li><li>서버 오류 → 500<\/li><\/ul><\/li><\/ul><p class="flow-reason"><\/p><\/li><li><p class="flow-step">응답 반환<\/p>/);
    const diagram = await processor.render('```text\n위치\n ┌──┴──┐\n ↓     ↓\n지도  날씨\n```');
    assert.match(diagram.code, /data-code-panel/); assert.doesNotMatch(diagram.code, /text-flow/);
});
