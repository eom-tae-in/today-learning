const fenceStart = /^ {0,3}(`{3,}|~{3,})/;

function closesFence(line, fence) {
    const marker = line.match(fenceStart)?.[1] ?? "";
    return marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker;
}

export function countReadableCharacters(markdown) {
    let fence = "";
    let count = 0;
    for (const line of markdown.split(/\r?\n/)) {
        if (fence) { if (closesFence(line, fence)) fence = ""; continue; }
        const opening = line.match(fenceStart)?.[1];
        if (opening) { fence = opening; continue; }
        count += [...line.replace(/\s/gu, "")].length;
    }
    return count;
}

export function getReadingMinutes(markdown, charactersPerMinute = 500) {
    return Math.max(1, Math.ceil(countReadableCharacters(markdown) / charactersPerMinute));
}
