export function readPreference(key: string): string | null {
    try { return localStorage.getItem(key); }
    catch (error) { if (error instanceof DOMException) return null; throw error; }
}

export function savePreference(key: string, value: string): void {
    try { localStorage.setItem(key, value); }
    catch (error) { if (!(error instanceof DOMException)) throw error; }
}
