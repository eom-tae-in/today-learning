import { baseUrl } from "../lib/paths";
import { recordsUrlKey, resolveRecordsReturnHref } from "../lib/records-return.mjs";
import { readPreference, savePreference } from "./storage";

export function initializeRecordsReturn(): void {
    document.querySelectorAll<HTMLElement>('[data-record-browser="full"]').forEach(root => root.addEventListener("click", event => {
        if (event.target instanceof Element && event.target.closest(".record-link")) savePreference(recordsUrlKey, location.href, "session");
    }));
    const back = document.querySelector<HTMLAnchorElement>("[data-records-back]");
    const href = resolveRecordsReturnHref(readPreference(recordsUrlKey, "session"), location.href, baseUrl + "records/");
    if (back && href) back.href = href;
}
