import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SVG_QA_URL ?? "http://127.0.0.1:4322/today-learning/";
const browser = await chromium.launch(process.env.SVG_QA_BROWSER ? { channel: process.env.SVG_QA_BROWSER } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const demo = new URL("examples/animated-svg/", base).href;
const sample = await readFile(new URL("../../test/fixtures/animated-svg-finite.svg", import.meta.url), "utf8");

try {
    await page.route(demo, async route => {
        const response = await route.fetch();
        const html = (await response.text()).replace(/(<template><style>[\s\S]*?<\/style>)[\s\S]*?<\/template>/, `$1${sample}</template>`);
        await route.fulfill({ response, body: html });
    });
    await page.goto(demo);
    const host = page.locator("[data-svg-host]");
    await host.scrollIntoViewIfNeeded();
    await page.locator('[data-svg-action="restart"]').click();
    await page.evaluate(() => {
        const root = document.querySelector("[data-svg-host]").shadowRoot;
        root.getAnimations().forEach(animation => { animation.currentTime = 2500; });
    });
    await page.waitForFunction(() => document.querySelector("[data-svg-host]").shadowRoot.getAnimations().length === 2);
    await page.locator('[data-svg-action="toggle"]').click();
    await page.waitForFunction(() => document.querySelector("[data-svg-host]").shadowRoot.getAnimations().every(animation => !animation.pending && animation.playState === "paused"));
    const appearance = () => page.evaluate(() => {
        const root = document.querySelector("[data-svg-host]").shadowRoot;
        return [".finished", ".loop", ".duplicate"].map(selector => {
            const style = getComputedStyle(root.querySelector(selector));
            return { opacity: style.opacity, transform: style.transform };
        });
    });
    const before = await appearance();
    assert.equal(before[0].opacity, "1");
    await page.locator('[data-svg-action="expand"]').click();
    assert.deepEqual(await appearance(), before, "Expanded view must preserve completed and active animations, including duplicate names.");
    await page.keyboard.press("Escape");
    assert.deepEqual(await appearance(), before, "Closing must preserve animation state.");
    await page.locator('[data-svg-action="restart"]').click();
    assert(Number((await appearance())[0].opacity) < .2, "Restart must include previously finished animations.");
    await page.unroute(demo);

    for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const theme of ["light", "dark"]) {
            await page.addInitScript(value => localStorage.setItem("today-learning-theme", value), theme);
            await page.goto(demo);
            await host.scrollIntoViewIfNeeded();
            await page.locator('[data-svg-action="restart"]').click();
            const time = () => host.evaluate(node => node.shadowRoot.querySelector("svg").getCurrentTime());
            const first = await time();
            await page.waitForFunction(start => document.querySelector("[data-svg-host]").shadowRoot.querySelector("svg").getCurrentTime() > start + .5, first);
            await page.locator('[data-svg-action="toggle"]').click();
            const paused = await time();
            await page.waitForTimeout(150);
            assert(Math.abs(await time() - paused) < .05);
            const normalWidth = await host.evaluate(node => node.clientWidth);
            await page.locator('[data-svg-action="expand"]').click();
            if (width === 390) assert(await host.evaluate(node => node.clientWidth) > normalWidth);
            assert(Math.abs(await time() - paused) < .1);
            await page.keyboard.press("Escape");
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(demo);
    await host.scrollIntoViewIfNeeded();
    assert.equal(await host.getAttribute("data-running"), null);
    await page.locator('[data-svg-action="toggle"]').click();
    await page.waitForFunction(() => document.querySelector("[data-svg-host]").hasAttribute("data-running"));
    const response = await page.request.get(new URL("attachments/examples/build-flow.svg", base).href);
    assert.equal(response.status(), 200);
    console.log("PASS: finite/duplicate CSS animations, expansion/restore/restart, CSS + SMIL demo, mobile/desktop themes, reduced motion, asset URL.");
} finally {
    await browser.close();
}
