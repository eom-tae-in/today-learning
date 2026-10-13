export const recordsUrlKey = "today-learning-records-url";

/** @param {string | null} stored @param {string} currentHref @param {string} listPath */
export function resolveRecordsReturnHref(stored, currentHref, listPath) {
    if (!stored) return null;
    let url;
    try { url = new URL(stored); }
    catch (error) { if (error instanceof TypeError) return null; throw error; }
    const path = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
    if (url.origin !== new URL(currentHref).origin || path !== listPath) return null;
    return path + url.search;
}
