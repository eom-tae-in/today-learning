import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const record = defineCollection({
    loader: glob({
        base: ".",
        pattern: "TIL/**/*.md",
    }),
    schema: z.object({
        title: z.string().optional(),
        date: z.string().optional(),
        tags: z.array(z.string()).optional(),
    }),
});

export const collections = { record };
