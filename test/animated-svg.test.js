import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { validateAnimatedSvg } from "../src/lib/animated-svg.mjs";
import { rehypeAnimatedSvg } from "../src/lib/rehype-animated-svg.mjs";

const svg = content => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${content}</svg>`;

test("standalone example retains CSS, SMIL, local IDs and accessible description", async () => {
    const result = validateAnimatedSvg(await readFile("public/attachments/examples/build-flow.svg", "utf8"));
    assert.match(result.markup, /@keyframes/);
    assert.match(result.markup, /animateMotion/);
    assert.match(result.markup, /aria-labelledby="title description"/);
    assert.equal(result.aspectRatio, "480 / 600");
});

test("SVG contract rejects active content, external resources, bad clocks and malformed files", () => {
    for (const content of [
        '<script>alert(1)</script>', '<foreignObject/>', '<rect onclick="x()"/>',
        '<use href="https://example.com/a.svg#x"/>', '<rect fill="url(https://example.com/a.svg)"/>',
        '<style>@import "https://example.com/a.css";</style>', '<style>:host{opacity:0}</style>',
        '<style>rect{animation:none!important}</style>', '<style>rect{position:fixed}</style>',
        '<animate attributeName="href" to="https://example.com"/>', '<animate begin="x.click"/>',
        '<svg/>', '<g id="same"/><g id="same"/>', '<rect>',
        String.raw`<rect fill="u\72l(https://example.com/a.svg#x)"/>`,
        String.raw`<animate attributeName="fill" to="u\72l(https://example.com/a.svg#x)"/>`,
    ]) assert.throws(() => validateAnimatedSvg(svg(content)), undefined, content);
    assert.throws(() => validateAnimatedSvg('<!DOCTYPE svg><svg/>'));
    assert.throws(() => validateAnimatedSvg('<svg xmlns="http://www.w3.org/2000/svg"/>'));
});

test("local paint and motion references remain valid", () => {
    assert.doesNotThrow(() => validateAnimatedSvg(svg('<defs><linearGradient id="paint"/></defs><rect fill="url(#paint)"/><style>rect{fill:url(#paint);animation:reveal 2s infinite}@keyframes reveal{to{opacity:1}}</style><animate attributeName="opacity" begin="0s" dur="2s" values="0;1"/>')));
});

test("finite CSS animation regression fixture follows the SVG contract", async () => {
    const fixture = await readFile("test/fixtures/animated-svg-finite.svg", "utf8");
    assert.doesNotThrow(() => validateAnimatedSvg(fixture));
});

test("real Markdown rendering emits isolated inline SVG and a base-aware original", async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins: [rehypeAnimatedSvg] });
    const markdown = await readFile("docs/examples/animated-svg.md", "utf8");
    const { code } = await processor.render(markdown, { fileURL: new URL("../docs/examples/animated-svg.md", import.meta.url) });
    assert.match(code, /data-animated-svg/);
    assert.match(code, /<template><style>/);
    assert.match(code, /<svg/);
    assert.match(code, /animateMotion/);
    assert.match(code, /href="\/today-learning\/attachments\/examples\/build-flow.svg"/);
    assert.doesNotMatch(code, /<p><figure/);
});

test("ordinary images are untouched", async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins: [rehypeAnimatedSvg] });
    const { code } = await processor.render('![photo](https://example.com/photo.png)\n\n![icon](/icons/check.svg)');
    assert.match(code, /src="https:\/\/example.com\/photo.png"/);
    assert.match(code, /src="\/icons\/check.svg"/);
    assert.doesNotMatch(code, /data-animated-svg/);
});

test("repeated SVG instances and alternate deployment bases render independently", async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins: [[rehypeAnimatedSvg, { base: "/preview/" }]] });
    const image = '![pipeline](../../public/attachments/examples/build-flow.svg)';
    const { code } = await processor.render(`${image}\n\n${image}`, { fileURL: new URL("../docs/examples/repeated.md", import.meta.url) });
    assert.equal((code.match(/<template>/g) ?? []).length, 2);
    assert.equal((code.match(/href="\/preview\/attachments\/examples\/build-flow.svg"/g) ?? []).length, 2);
});

test("asset resolution rejects symlink escape and reports a missing attachment", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "til-svg-"));
    try {
        await mkdir(path.join(root, "public/attachments"), { recursive: true });
        await writeFile(path.join(root, "outside.svg"), svg(""));
        await symlink(path.join(root, "outside.svg"), path.join(root, "public/attachments/escape.svg"));
        const transform = rehypeAnimatedSvg({ root, base: "/custom/" });
        const tree = name => ({ children: [{ type: "element", tagName: "p", children: [{ tagName: "img", properties: { src: `public/attachments/${name}.svg` } }] }] });
        await assert.rejects(transform(tree("escape"), { path: path.join(root, "post.md") }), /inside public\/attachments/);
        await assert.rejects(transform(tree("missing"), { path: path.join(root, "post.md") }), /post.md.*missing.svg/);
    } finally { await rm(root, { recursive: true, force: true }); }
});
