/** @param {string} hash */
export function decodeHash(hash) {
    const value = hash.replace(/^#/, "");
    try { return decodeURIComponent(value); }
    catch (error) { if (error instanceof URIError) return value; throw error; }
}
