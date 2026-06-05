/** Russian month labels for «с …» (genitive). Mirrors period_service.MONTH_GENITIVE. */
const MONTH_GENITIVE = {
    1: 'января', 2: 'февраля', 3: 'марта', 4: 'апреля', 5: 'мая', 6: 'июня',
    7: 'июля', 8: 'августа', 9: 'сентября', 10: 'октября', 11: 'ноября', 12: 'декабря',
};

const MONTH_PREFIXES = [
    ['январ', 1], ['феврал', 2], ['март', 3], ['апрел', 4],
    ['май', 5], ['мая', 5], ['июн', 6], ['июл', 7], ['август', 8],
    ['сентябр', 9], ['октябр', 10], ['ноябр', 11], ['декабр', 12],
];

function parseMonthYear(text) {
    const raw = String(text || '').trim().toLowerCase().replace(/ё/g, 'е');
    if (!raw) return null;
    const m = raw.match(/(\d{4})\s*$/);
    if (!m) return null;
    const year = Number(m[1]);
    const head = raw.slice(0, raw.length - m[0].length).trim();
    for (const [prefix, month] of MONTH_PREFIXES) {
        if (head.startsWith(prefix)) return { month, year };
    }
    return null;
}

/** «июнь 2026» → «июня 2026» for «Прогноз с …». */
export function periodLabelPrepositionS(raw) {
    const parsed = parseMonthYear(raw);
    if (!parsed) return String(raw || '').trim() || '';
    const label = MONTH_GENITIVE[parsed.month];
    return label ? `${label} ${parsed.year}` : String(raw || '').trim();
}
