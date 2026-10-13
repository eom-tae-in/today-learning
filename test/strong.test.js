import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import rehypeSlug from "rehype-slug";
import { remarkReading, readingCodeTransformer } from "../src/lib/remark-reading.mjs";
import { rehypeReading } from "../src/lib/rehype-reading.mjs";

const processor = await createMarkdownProcessor({
    remarkPlugins: [remarkReading], rehypePlugins: [rehypeSlug, rehypeReading],
    shikiConfig: { theme: "css-variables", wrap: false, transformers: [readingCodeTransformer] },
});
const render = async markdown => (await processor.render(markdown)).code;

test("bold closing after punctuation and before a Korean particle becomes strong", async () => {
    const code = await render("**코드(Code)**는 동작 규칙이다. **설정(Configuration)**은 값이다. 이 방식을 **외부화된 설정(Externalized Configuration)**이라고 한다.");
    assert.equal(code, "<p><strong>코드(Code)</strong>는 동작 규칙이다. <strong>설정(Configuration)</strong>은 값이다. 이 방식을 <strong>외부화된 설정(Externalized Configuration)</strong>이라고 한다.</p>");
});

test("bold around inline code, links and emphasis is repaired without touching code values", async () => {
    assert.equal(await render("Spring의 `Environment`다. **`Environment`**는 객체다."), "<p>Spring의 <code>Environment</code>다. <strong><code>Environment</code></strong>는 객체다.</p>");
    assert.equal(await render("최종 판단은 **`ANY = 하나라도`, `ALL = 모두`**라는 정의다."), "<p>최종 판단은 <strong><code>ANY = 하나라도</code>, <code>ALL = 모두</code></strong>라는 정의다.</p>");
    assert.equal(await render("**[공식 문서](https://example.com)(Docs)**를 본다. [**링크(Link)**는](https://example.com) 그대로 이동한다."), '<p><strong><a href="https://example.com">공식 문서</a>(Docs)</strong>를 본다. <a href="https://example.com"><strong>링크(Link)</strong>는</a> 그대로 이동한다.</p>');
    assert.equal(await render("**_중요_(Important)**는 강조다."), "<p><strong><em>중요</em>(Important)</strong>는 강조다.</p>");
    assert.equal(await render("`**코드(Code)**는` 그대로 둔다."), "<p><code>**코드(Code)**는</code> 그대로 둔다.</p>");
});

test("table cells, list items and headings are repaired", async () => {
    const table = await render("| 용어 | 뜻 |\n| --- | --- |\n| **JWT(JSON Web Token)**는 | 토큰 형식 |");
    assert.match(table, /<td><strong>JWT\(JSON Web Token\)<\/strong>는<\/td>/); assert.doesNotMatch(table, /\*\*/);
    const list = await render("- AI가 일할 **맥락(Context)**과 **환경(Harness)**을 설계한다.");
    assert.match(list, /<li>AI가 일할 <strong>맥락\(Context\)<\/strong>과 <strong>환경\(Harness\)<\/strong>을 설계한다.<\/li>/);
    const heading = await render("## **JDK(Java Development Kit)**란\n\n본문");
    assert.match(heading, /<h2 id="jdkjava-development-kit란"><strong>JDK\(Java Development Kit\)<\/strong>란<\/h2>/);
});

test("asterisks that are unpaired, spaced, tripled, escaped or inside code blocks stay as written", async () => {
    assert.equal(await render("별표 **하나만 남은 문장(끝)이다."), "<p>별표 **하나만 남은 문장(끝)이다.</p>");
    assert.equal(await render("거듭제곱은 2 ** 3 이고 a ** b 와 같다."), "<p>거듭제곱은 2 ** 3 이고 a ** b 와 같다.</p>");
    assert.equal(await render("***강조(Emphasis)***는 건드리지 않는다."), "<p>***강조(Emphasis)***는 건드리지 않는다.</p>");
    assert.equal(await render("\\*\\*리터럴(Literal)\\*\\*는 그대로다."), "<p>**리터럴(Literal)**는 그대로다.</p>");
    const block = await render("```text\n**코드(Code)**는 그대로\n```");
    assert.doesNotMatch(block, /<strong>/); assert.match(block, /data-source="\*\*코드\(Code\)\*\*는 그대로"/);
});

test("bold that CommonMark already closes keeps its single strong element", async () => {
    assert.equal(await render("**정상**은 이미 굵다. **혼합(Mixed)**과 **정상**도 함께 있다."), "<p><strong>정상</strong>은 이미 굵다. <strong>혼합(Mixed)</strong>과 <strong>정상</strong>도 함께 있다.</p>");
});
