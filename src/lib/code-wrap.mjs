const breakAfter = new Set([".", "(", ","]);
const closing = new Set([")", "]", "}"]);

/** @param {string | undefined} character */
const isSpace = character => character === undefined || /\s/.test(character);

/** @param {string | undefined} character */
const isDigit = character => character !== undefined && /\d/.test(character);

/** @param {string} text @param {number} offset */
function canBreakAt(text, offset) {
    const previous = text[offset - 1]; const beforePrevious = text[offset - 2]; const next = text[offset];
    if (previous === undefined || next === undefined || !breakAfter.has(previous)) return false;
    if (isSpace(beforePrevious) || isSpace(next) || next === previous || closing.has(next)) return false;
    return previous !== "." || (beforePrevious !== "." && !(isDigit(beforePrevious) && isDigit(next)));
}

/** @param {string} text @returns {number[]} */
export function findCodeBreakPoints(text) {
    const points = [];
    for (let offset = 1; offset < text.length; offset++) if (canBreakAt(text, offset)) points.push(offset);
    return points;
}
