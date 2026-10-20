import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { parse, walk } from "css-tree";

const elements = new Set("svg g defs title desc style rect circle ellipse line polyline polygon path text tspan linearGradient radialGradient stop clipPath mask marker pattern use animate animateTransform animateMotion mpath set".split(" "));
const attributes = new Set("xmlns xmlns:xlink id class style viewBox width height x y x1 x2 y1 y2 cx cy r rx ry d points dx dy rotate textLength lengthAdjust transform transform-origin fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset opacity color font-family font-size font-weight font-style text-anchor dominant-baseline letter-spacing gradientUnits gradientTransform offset stop-color stop-opacity clip-path clipPathUnits mask maskUnits maskContentUnits marker-start marker-mid marker-end markerWidth markerHeight refX refY orient markerUnits patternUnits patternContentUnits patternTransform preserveAspectRatio vector-effect href xlink:href role aria-label aria-labelledby aria-describedby attributeName attributeType from to by values keyTimes keySplines keyPoints calcMode begin dur end min max restart repeatCount repeatDur additive accumulate type path rotate".split(" "));
const properties = new Set("fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset opacity color font-family font-size font-weight font-style text-anchor dominant-baseline letter-spacing transform transform-origin transform-box clip-path mask marker-start marker-mid marker-end stop-color stop-opacity animation animation-name animation-duration animation-delay animation-timing-function animation-iteration-count animation-direction animation-fill-mode animation-play-state".split(" "));
const animatedAttributes = new Set("x y x1 x2 y1 y2 cx cy r rx ry width height d points transform fill fill-opacity stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset opacity offset stop-color stop-opacity".split(" "));

export class AnimatedSvgError extends Error {
    constructor(message) { super(message); this.name = "AnimatedSvgError"; }
}

function validateCss(source, context = "stylesheet") {
    const ast = parse(source, { context, onParseError(error) { throw new AnimatedSvgError(error.message); } });
    walk(ast, node => {
        if (node.type === "Raw") throw new AnimatedSvgError("CSS must be fully parseable.");
        if (node.type === "Atrule" && !["keyframes", "media"].includes(node.name.toLowerCase())) throw new AnimatedSvgError(`Unsupported CSS rule: @${node.name}`);
        if (node.type === "Declaration" && (!properties.has(node.property.toLowerCase()) || node.important)) throw new AnimatedSvgError(`Unsupported CSS property: ${node.property}`);
        if (node.type === "Url" && !/^#[A-Za-z_][\w:.-]*$/.test(node.value)) throw new AnimatedSvgError("Only local SVG fragment URLs are supported.");
        if (node.type === "PseudoElementSelector" || (node.type === "PseudoClassSelector" && node.name !== "root")) throw new AnimatedSvgError("Use SVG classes and IDs, not CSS pseudo selectors.");
    });
}

export function validateAnimatedSvg(source) {
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new AnimatedSvgError("SVG document types and entities are unsupported.");
    const document = new DOMParser({ onError(level, message) { throw new AnimatedSvgError(`Invalid SVG: ${message}`); } }).parseFromString(source, "image/svg+xml");
    const svg = document.documentElement;
    if (!svg || svg.tagName !== "svg" || svg.namespaceURI !== "http://www.w3.org/2000/svg") throw new AnimatedSvgError("Expected an SVG root with its SVG namespace.");
    const viewBox = svg.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
    if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) throw new AnimatedSvgError("SVG needs a valid viewBox.");
    const ids = new Set();
    for (const node of [svg, ...Array.from(svg.getElementsByTagName("*"))]) {
        if (node.namespaceURI !== svg.namespaceURI || !elements.has(node.tagName)) throw new AnimatedSvgError(`Unsupported SVG element: ${node.tagName}`);
        if (node.tagName === "svg" && node !== svg) throw new AnimatedSvgError("Nested SVG clocks are unsupported; use groups.");
        for (const attribute of Array.from(node.attributes)) {
            const { name, value } = attribute;
            if (!attributes.has(name)) throw new AnimatedSvgError(`Unsupported SVG attribute: ${name}`);
            if (name === "style") validateCss(value, "declarationList");
            if (name === "href" || name === "xlink:href") {
                if (!/^#[A-Za-z_][\w:.-]*$/.test(value)) throw new AnimatedSvgError("SVG references must use local #ids.");
            }
            if (properties.has(name)) validateCss(`${name}:${value}`, "declarationList");
            if (["from", "to", "by", "values"].includes(name) && properties.has(node.getAttribute("attributeName"))) {
                for (const part of value.split(";")) validateCss(`${node.getAttribute("attributeName")}:${part}`, "declarationList");
            }
            if (name === "attributeName" && !animatedAttributes.has(value)) throw new AnimatedSvgError(`Unsupported animation target: ${value}`);
            if ((name === "begin" || name === "end") && !/^(?:\s*(?:\d+(?:\.\d+)?(?:ms|s)?|indefinite)\s*;?)+$/.test(value)) throw new AnimatedSvgError("Use numeric SMIL timing, not event or ID timing.");
        }
        const id = node.getAttribute("id");
        if (id) {
            if (!/^[A-Za-z_][\w:.-]*$/.test(id) || ids.has(id)) throw new AnimatedSvgError(`Invalid or duplicate SVG id: ${id}`);
            ids.add(id);
        }
        if (node.tagName === "style") validateCss(node.textContent ?? "");
    }
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.setAttribute("role", "img");
    return { markup: new XMLSerializer().serializeToString(svg), aspectRatio: `${viewBox[2]} / ${viewBox[3]}`, width: viewBox[2] };
}
