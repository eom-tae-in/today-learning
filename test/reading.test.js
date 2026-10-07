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
