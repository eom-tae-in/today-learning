export const shareImage = { path: "og-image.png", width: 1200, height: 630, alt: "Today Learning 로고와 소개 문구: 매일의 학습 내용을 TIL 원문과 쉬운 요약으로 읽는 개인 학습 노트입니다." };

/**
 * @typedef {{ readonly property: string, readonly content: string } | { readonly name: string, readonly content: string }} MetaTag
 * @param {{ readonly title: string, readonly description: string, readonly imageUrl: string, readonly pageUrl?: string | undefined, readonly type?: "website" | "article" | undefined, readonly publishedTime?: string | undefined, readonly tags?: readonly string[] | undefined }} page
 * @returns {MetaTag[]}
 */
export function buildShareMeta(page) {
    const type = page.type ?? "website";
    const pageUrl = page.pageUrl === undefined ? [] : [{ property: "og:url", content: page.pageUrl }];
    const article = type !== "article" ? [] : [
        ...(page.publishedTime === undefined ? [] : [{ property: "article:published_time", content: page.publishedTime }]),
        ...[...new Set(page.tags ?? [])].map(tag => ({ property: "article:tag", content: tag })),
    ];
    return [
        { property: "og:site_name", content: "Today Learning" }, { property: "og:locale", content: "ko_KR" }, { property: "og:type", content: type },
        { property: "og:title", content: page.title }, { property: "og:description", content: page.description }, ...pageUrl,
        { property: "og:image", content: page.imageUrl }, { property: "og:image:width", content: String(shareImage.width) }, { property: "og:image:height", content: String(shareImage.height) }, { property: "og:image:alt", content: shareImage.alt },
        ...article, { name: "twitter:card", content: "summary_large_image" },
    ];
}
