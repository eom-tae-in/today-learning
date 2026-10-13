import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(SCRIPT_DIRECTORY, "og-image.html");
const OUTPUT_PATH = path.resolve(SCRIPT_DIRECTORY, "../../public/og-image.png");
const VIEWPORT = { width: 1200, height: 630 };
const FONT_FAMILY = "Pretendard Variable";
const TEXT_SELECTORS = [".brand-mark", ".title", ".description"];

async function launchBrowser() {
    const channel = process.env.PLAYWRIGHT_CHANNEL || "chrome";
    try {
        return await chromium.launch({ channel });
    } catch (error) {
        console.warn(`Playwright 채널 "${channel}" 실행에 실패해 기본 chromium으로 다시 시도합니다.\n${error.message}`);
        return chromium.launch();
    }
}

async function findUnloadedTexts(page) {
    return page.evaluate(async ({ fontFamily, selectors }) => {
        await document.fonts.ready;
        const unloadedTexts = [];
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element === null) {
                unloadedTexts.push(`${selector}: 요소 없음`);
                continue;
            }
            const style = getComputedStyle(element);
            const font = `${style.fontWeight} ${style.fontSize} "${fontFamily}"`;
            const text = element.textContent.trim();
            const loadedFaces = await document.fonts.load(font, text);
            const isPretendardLoaded = loadedFaces.length > 0
                && loadedFaces.every((face) => face.family.replaceAll("\"", "") === fontFamily)
                && document.fonts.check(font, text);
            if (!isPretendardLoaded) {
                unloadedTexts.push(`${selector}: ${font}`);
            }
        }
        return unloadedTexts;
    }, { fontFamily: FONT_FAMILY, selectors: TEXT_SELECTORS });
}

async function renderOgImage() {
    const browser = await launchBrowser();
    try {
        const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
        await page.goto(pathToFileURL(TEMPLATE_PATH).href, { waitUntil: "load" });
        const unloadedTexts = await findUnloadedTexts(page);
        if (unloadedTexts.length > 0) {
            throw new Error(`Pretendard 글꼴을 불러오지 못했습니다.\n${unloadedTexts.join("\n")}`);
        }
        await page.screenshot({ path: OUTPUT_PATH, clip: { x: 0, y: 0, ...VIEWPORT } });
        console.log(`공유 이미지를 저장했습니다: ${path.relative(process.cwd(), OUTPUT_PATH)}`);
    } finally {
        await browser.close();
    }
}

try {
    await renderOgImage();
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
