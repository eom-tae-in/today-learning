const dayLength = 86400000;

/** @param {string} date @param {number} days */
const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * dayLength).toISOString().slice(0, 10);

/** 정확히 7일 전후에 기록이 없으면 그 날짜에서 같은 방향으로 가장 가까운 기록, 그것도 없으면 그 방향의 마지막 기록. @param {readonly string[]} dates @param {number} index @param {-1 | 1} direction */
function findWeekNeighbor(dates, index, direction) {
    const current = dates[index] ?? "";
    const target = shiftDate(current, direction * 7);
    if (direction < 0) return dates.findLast(date => date <= target) ?? dates[0] ?? current;
    return dates.find(date => date >= target) ?? dates.at(-1) ?? current;
}

/**
 * 잔디 그래프에서 방향키로 이동할 기록 날짜를 고릅니다. dates는 오름차순 기록 날짜(YYYY-MM-DD)입니다.
 * @param {readonly string[]} dates @param {string} current @param {string} key @returns {string | null}
 */
export function findGraphTarget(dates, current, key) {
    const index = dates.indexOf(current);
    if (index < 0) return null;
    if (key === "ArrowLeft") return dates[index - 1] ?? current;
    if (key === "ArrowRight") return dates[index + 1] ?? current;
    if (key === "ArrowUp") return findWeekNeighbor(dates, index, -1);
    if (key === "ArrowDown") return findWeekNeighbor(dates, index, 1);
    if (key === "Home") return dates[0] ?? current;
    if (key === "End") return dates.at(-1) ?? current;
    return null;
}
