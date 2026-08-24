import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { rehypeMermaid } from "./src/lib/rehype-mermaid.mjs";

export default defineConfig({
    site: "https://eom-tae-in.github.io",
    base: "/today-learning",
    integrations: [mdx()],
    markdown: {
        processor: unified({
            remarkPlugins: [remarkGfm],
            rehypePlugins: [
                rehypeSlug,
                [
                    rehypeAutolinkHeadings,
                    {
                        behavior: "wrap",
                        properties: {
                            className: ["heading-anchor"],
                        },
                    },
                ],
                rehypeMermaid,
            ],
        }),
        shikiConfig: {
            theme: "github-light",
            wrap: true,
        },
    },
});
