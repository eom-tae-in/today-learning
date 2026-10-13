type StorageArea = "local" | "session";

const storageOf = (area: StorageArea): Storage => area === "session" ? sessionStorage : localStorage;

export function readPreference(key: string, area: StorageArea = "local"): string | null {
    try { return storageOf(area).getItem(key); }
    catch (error) { if (error instanceof DOMException) return null; throw error; }
}

export function savePreference(key: string, value: string, area: StorageArea = "local"): void {
    try { storageOf(area).setItem(key, value); }
    catch (error) { if (!(error instanceof DOMException)) throw error; }
}
