import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { rehypeMermaid } from "./src/lib/rehype-mermaid.mjs";
import { remarkReading, readingCodeTransformer } from "./src/lib/remark-reading.mjs";
import { rehypeReading } from "./src/lib/rehype-reading.mjs";

export default defineConfig({
    site: "https://eom-tae-in.github.io",
    base: "/today-learning",
    vite: {
        cacheDir: `node_modules/.vite/${process.env.NODE_ENV ?? "development"}`,
        optimizeDeps: { include: ["mermaid"] },
    },
    integrations: [mdx()],
    markdown: {
        processor: unified({
            remarkPlugins: [remarkGfm, remarkReading],
            rehypePlugins: [
                rehypeSlug,
                [
                    rehypeAutolinkHeadings,
                    {
                        behavior: "append",
                        properties: {
                            className: ["heading-anchor"],
                            ariaLabel: "제목 주소 복사",
                        },
                        content: { type: "element", tagName: "span", properties: { className: ["heading-link-icon"], ariaHidden: "true" }, children: [] },
                    },
                ],
                rehypeMermaid,
                rehypeReading,
            ],
        }),
        shikiConfig: {
            theme: "css-variables",
            wrap: false,
            transformers: [readingCodeTransformer],
        },
    },
});
