import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fromHtml } from "hast-util-from-html";
import { validateAnimatedSvg, AnimatedSvgError } from "./animated-svg.mjs";

const element = (tagName, properties, children = []) => ({ type: "element", tagName, properties, children });
const text = value => ({ type: "text", value });
const control = (label, action) => element("button", { type: "button", "data-svg-action": action, hidden: true }, [text(label)]);
const shadowStyle = ":host{display:block;overflow:hidden}svg{display:block;width:100%;height:auto} :host(:not([data-running])) svg,:host(:not([data-running])) svg *{animation-play-state:paused!important}";

export function rehypeAnimatedSvg({ root = process.cwd(), base = "/today-learning/" } = {}) {
    return async (tree, file) => {
        async function transform(parent) {
            if (!parent.children) return;
            for (let index = 0; index < parent.children.length; index++) {
                const node = parent.children[index];
                const image = node.tagName === "p" && node.children?.length === 1 ? node.children[0] : undefined;
                const source = image?.tagName === "img" ? image.properties?.src : undefined;
                if (typeof source !== "string" || !source.endsWith(".svg") || !source.includes("public/attachments/")) { await transform(node); continue; }
                if (!file.path) throw new AnimatedSvgError("Animated SVG requires the source Markdown file path.");
                try {
                    const attachments = await realpath(path.join(root, "public/attachments"));
                    const asset = await realpath(path.resolve(path.dirname(file.path), decodeURIComponent(source)));
                    const relative = path.relative(attachments, asset);
                    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new AnimatedSvgError("SVG must be inside public/attachments.");
                    const { markup, aspectRatio, width } = validateAnimatedSvg(await readFile(asset, "utf8"));
                    const parsed = fromHtml(markup, { fragment: true });
                    const template = element("template", {}, [element("style", {}, [text(shadowStyle)]), ...parsed.children]);
                    const href = `${base.replace(/\/?$/, "/")}attachments/${relative.split(path.sep).map(encodeURIComponent).join("/")}`;
                    const label = image.properties.alt || "학습 과정 애니메이션";
                    parent.children[index] = element("figure", { className: ["animated-svg"], "data-animated-svg": "", "aria-label": label }, [
                        element("div", { className: ["animated-svg-toolbar"] }, [
                            element("span", { className: ["animated-svg-label"] }, [text("ANIMATION")]),
                            control("재생", "toggle"), control("다시 재생", "restart"), control("확대", "expand"),
                            element("a", { href, target: "_blank", rel: "noopener" }, [text("원본")]),
                        ]),
                        element("p", { className: ["animated-svg-pan-hint"] }, [text("확대한 그림은 가로·세로로 스크롤할 수 있습니다.")]),
                        element("div", { className: ["animated-svg-viewport"], tabIndex: 0, role: "region", "aria-label": `${label} 그림 영역` }, [
                            element("div", { "data-svg-host": "", style: `aspect-ratio:${aspectRatio};--svg-width:${width}px`, "aria-label": label }, [template, element("img", { src: href, alt: label, "data-svg-fallback": "" })]),
                        ]),
                        element("figcaption", {}, [text(label)]),
                    ]);
                } catch (error) {
                    if (!(error instanceof Error)) throw error;
                    throw new AnimatedSvgError(`${file.path}: ${source}: ${error.message}`);
                }
            }
        }
        await transform(tree);
    };
}
