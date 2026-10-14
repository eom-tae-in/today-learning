/** @param {string} value @returns {number} */
export function toMilliseconds(value) {
    const time = value.trim(); const amount = parseFloat(time);
    if (!Number.isFinite(amount)) return 0;
    return time.endsWith("ms") ? amount : amount * 1000;
}

/** @param {string} durations @param {string} delays @returns {number} */
export function longestTransition(durations, delays) {
    const durationList = durations.split(",").map(toMilliseconds); const delayList = delays.split(",").map(toMilliseconds);
    return Math.max(0, ...durationList.map((duration, index) => duration + (delayList[index % delayList.length] ?? 0)));
}
