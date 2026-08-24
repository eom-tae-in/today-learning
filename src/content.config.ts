import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const record = defineCollection({
    loader: glob({
        base: ".",
        pattern: "{TLP,TIL,Reviews}/**/*.md",
    }),
    schema: z.object({
        level: z.enum(["excellent", "good", "needs-work"]).optional(),
        summary: z.string().optional(),
        reviewedAt: z.union([z.string(), z.date()]).optional(),
        title: z.string().optional(),
        date: z.string().optional(),
        tags: z.array(z.string()).optional(),
    }),
});

export const collections = { record };
