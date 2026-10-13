import type { APIRoute } from "astro";

import { baseUrl } from "../lib/paths";
import { getLearningRecords, getRecordHref } from "../lib/records";

type SitemapEntry = {
    readonly location: URL;
    readonly lastModified: string | undefined;
};

const xmlEntities: Readonly<Record<string, string>> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
};

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => xmlEntities[character] ?? character);
}

function renderEntry(entry: SitemapEntry): string {
    const lastModifiedLines = entry.lastModified === undefined
        ? []
        : [`        <lastmod>${escapeXml(entry.lastModified)}</lastmod>`];
    return [
        "    <url>",
        `        <loc>${escapeXml(entry.location.href)}</loc>`,
        ...lastModifiedLines,
        "    </url>",
    ].join("\n");
}

function renderSitemap(entries: readonly SitemapEntry[]): string {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries.map(renderEntry),
        "</urlset>",
        "",
    ].join("\n");
}

export const GET: APIRoute = async ({ site }) => {
    if (site === undefined) throw new Error("Sitemap requires `site` in astro.config.mjs.");

    const records = await getLearningRecords();
    const latestRecordDate = records[0]?.date;
    const entries: readonly SitemapEntry[] = [
        { location: new URL(baseUrl, site), lastModified: latestRecordDate },
        { location: new URL(`${baseUrl}records/`, site), lastModified: latestRecordDate },
        ...records.map((record) => ({
            location: new URL(getRecordHref(record.date), site),
            lastModified: record.date,
        })),
    ];

    return new Response(renderSitemap(entries), {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
};
