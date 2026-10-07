import { z } from "zod";

export const readerSummarySchema = z.object({
    overview: z.string().trim().min(1),
    flow: z.array(z.string().trim().min(1)).min(2).max(5),
});

export const analysisSchema = z.object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    tags: z.array(z.string()),
    readerSummary: readerSummarySchema,
});

export const postSchema = analysisSchema.extend({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    paths: z.object({ til: z.string().min(1) }),
    hashtags: z.array(z.string()).default([]),
});
