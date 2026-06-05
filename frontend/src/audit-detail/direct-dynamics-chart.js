/** Динамика по месяцам (линейный график + прирост) — вкладка «Директ»; на «Отчёте» — отдельный host id. */
import { escapeHtml } from '../core/utils.js';

export const DIRECT_DYNAMICS_METRICS = [
    { key: 'leads', label: 'Заявки', format: 'number' },
    { key: 'cpl', label: 'CPL', format: 'money' },
    { key: 'budget', label: 'Бюджет', format: 'money' },
    { key: 'clicks', label: 'Клики', format: 'number' },
];

function readThemeVar(name, fallback) {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
}

function getLineChartTheme() {
    return {
        line: readThemeVar('--chart-line', '#2f5aa8'),
        grid: readThemeVar('--chart-grid', 'rgba(23, 43, 77, 0.18)'),
        axis: readThemeVar('--chart-axis', '#94a3b8'),
        surface: readThemeVar('--surface', '#ffffff'),
    };
}

let dynamicsPeriodsCache = [];

export function monthlyRowsToPeriods(monthly) {
    return (monthly || []).map((row) => ({
        period: row?.month || '',
        leads: row?.leads,
        budget: row?.cost,
        clicks: row?.clicks,
        cpl: row?.cpl,
    }));
}

function compactPeriodLabel(value) {
    const text = String(value || '').trim();
    const m = text.match(/^([а-яА-ЯёЁ]+)\s+(\d{4})$/);
    if (!m) return text;
    return `${m[1].slice(0, 3).toLowerCase()} ${m[2].slice(2)}`;
}

function formatMetricValue(value, format) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    if (format === 'money') {
        return `${num.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
    }
    return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function buildSmoothLinePath(points) {
    if (!points.length) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
        const current = points[i];
        const next = points[i + 1];
        const cx = (current.x + next.x) / 2;
        path += ` C ${cx} ${current.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
}

export function renderDynamicsSvgChart(host, periods, metricKey = 'leads') {
    if (!host) return;
    const metric = DIRECT_DYNAMICS_METRICS.find((item) => item.key === metricKey) || DIRECT_DYNAMICS_METRICS[0];
    const rows = (periods || []).map((row) => ({
        rawLabel: row?.period || '',
        label: compactPeriodLabel(row?.period),
        value: Number(row?.[metric.key]),
    })).filter((row) => row.label && Number.isFinite(row.value));

    if (rows.length < 2) {
        host.innerHTML = '<p class="muted comparison-empty-state">Нужно минимум 2 месяца в Excel для графика.</p>';
        return;
    }

    const width = 800;
    const height = 320;
    const pad = { left: 68, right: 24, top: 22, bottom: 42 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const values = rows.map((row) => row.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const spread = Math.max(maxVal - minVal, 1);
    const yMin = minVal - spread * 0.08;
    const yMax = maxVal + spread * 0.08;
    const yScale = (value) => pad.top + plotH - ((value - yMin) / (yMax - yMin)) * plotH;
    const xScale = (index) => pad.left + (index / (rows.length - 1)) * plotW;
    const points = rows.map((row, index) => ({
        x: xScale(index),
        y: yScale(row.value),
        ...row,
    }));
    const formatValue = (value) => formatMetricValue(value, metric.format);

    const yTicks = Array.from({ length: 5 }, (_, index) => {
        const value = yMin + ((yMax - yMin) * index) / 4;
        return { value, y: yScale(value) };
    });
    const chartTheme = getLineChartTheme();
    const gridLines = yTicks.map((tick) => `
        <line x1="${pad.left}" y1="${tick.y}" x2="${width - pad.right}" y2="${tick.y}"
            stroke="${chartTheme.grid}" stroke-dasharray="3 3" />`).join('');
    const yLabels = yTicks.map((tick) => `
        <text x="${pad.left - 10}" y="${tick.y + 4}" text-anchor="end"
            fill="${chartTheme.axis}" font-size="11" font-family="var(--font-sans), system-ui, sans-serif">
            ${escapeHtml(formatValue(tick.value))}
        </text>`).join('');
    const xLabelStep = rows.length > 7 ? 2 : 1;
    const xLabels = points.map((point, index) => {
        if (index % xLabelStep !== 0 && index !== points.length - 1) return '';
        return `
        <text x="${point.x}" y="${height - 14}" text-anchor="middle"
            fill="${chartTheme.axis}" font-size="11" font-family="var(--font-sans), system-ui, sans-serif">
            ${escapeHtml(point.label)}
        </text>`;
    }).join('');
    const minPoint = points.reduce((acc, point) => (point.value < acc.value ? point : acc), points[0]);
    const maxPoint = points.reduce((acc, point) => (point.value > acc.value ? point : acc), points[0]);
    const keyIndexes = new Set([0, points.length - 1, points.indexOf(minPoint), points.indexOf(maxPoint)]);
    const markerDots = points.map((point) => `
        <circle cx="${point.x}" cy="${point.y}" r="3.5" fill="${chartTheme.line}" stroke="${chartTheme.surface}" stroke-width="1.25" />
    `).join('');
    const keyValueLabels = points.map((point, index) => {
        if (!keyIndexes.has(index)) return '';
        const valueText = formatValue(point.value);
        const y = Math.max(14, point.y - 10);
        const isFirst = index === 0;
        const isLast = index === points.length - 1;
        const x = isFirst ? point.x + 16 : (isLast ? point.x - 16 : point.x);
        const anchor = isFirst ? 'start' : (isLast ? 'end' : 'middle');
        return `
        <text x="${x}" y="${y}" text-anchor="${anchor}"
            class="comparison-svg-value-label"
            font-size="10.5" font-family="var(--font-sans), system-ui, sans-serif">
            ${escapeHtml(valueText)}
        </text>`;
    }).join('');
    const hoverDots = points.map((point) => `
        <circle cx="${point.x}" cy="${point.y}" r="10" fill="transparent" class="comparison-svg-hit">
            <title>${escapeHtml(point.rawLabel)}: ${escapeHtml(formatValue(point.value))}</title>
        </circle>`).join('');

    host.innerHTML = `
        <svg class="comparison-line-svg" viewBox="0 0 ${width} ${height}"
            width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
            role="img" aria-label="Динамика ${escapeHtml(metric.label)} по месяцам">
            ${gridLines}
            <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}"
                stroke="${chartTheme.axis}" />
            <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"
                stroke="${chartTheme.axis}" />
            ${yLabels}
            <path d="${buildSmoothLinePath(points)}" fill="none" stroke="${chartTheme.line}"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            ${markerDots}
            ${keyValueLabels}
            ${hoverDots}
            ${xLabels}
        </svg>`;
}

export function pctDelta(current, previous) {
    const c = Number(current);
    const p = Number(previous);
    if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
    return Math.round(((c - p) / p) * 1000) / 10;
}

const DELTA_WORDS = {
    leads: { up: 'Больше заявок', down: 'Меньше заявок', flat: 'Заявки без изменений' },
    cost: { up: 'Трат больше', down: 'Трат меньше', flat: 'Расход без изменений' },
    cpl: { up: 'Лид дороже', down: 'Лид дешевле', flat: 'CPL без изменений' },
};

/** Зелёный / красный / жёлтый — по смыслу для маркетолога, не по знаку «+». */
function changeTone(pct, kind) {
    if (pct == null || pct === 0) return 'neutral';
    const up = pct > 0;
    if (kind === 'leads') return up ? 'good' : 'bad';
    if (kind === 'cost') return up ? 'warn' : 'good';
    return up ? 'bad' : 'good';
}

function deltaLabel(pct, kind) {
    if (pct == null) return '—';
    const up = pct > 0;
    const down = pct < 0;
    const words = DELTA_WORDS[kind] || DELTA_WORDS.leads;
    if (up) return words.up;
    if (down) return words.down;
    return words.flat;
}

/** Плашка с текстом (без «+» и стрелок). */
function renderDeltaTag(pct, kind) {
    if (pct == null) return '<span class="delta-tag delta-tag--neutral">—</span>';
    const tone = changeTone(pct, kind);
    const abs = Math.abs(pct).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
    const label = deltaLabel(pct, kind);
    return `<span class="delta-tag delta-tag--${tone}">${escapeHtml(label)} · ${abs}%</span>`;
}

export function buildKpiGrowthSublines(monthly) {
    const rows = monthly || [];
    if (rows.length < 2) {
        return { cost: '', leads: '', cpl: '', periodNote: '' };
    }
    const first = rows[0];
    const last = rows[rows.length - 1];
    return {
        cost: renderDeltaTag(pctDelta(last.cost, first.cost), 'cost'),
        leads: renderDeltaTag(pctDelta(last.leads, first.leads), 'leads'),
        cpl: renderDeltaTag(pctDelta(last.cpl, first.cpl), 'cpl'),
        periodNote: `<span class="direct-kpi-range muted">${escapeHtml(first.month || '—')} → ${escapeHtml(last.month || '—')}</span>`,
    };
}

function momSummaryText(costPct, leadsPct, cplPct) {
    const parts = [];
    if (costPct != null) {
        parts.push(`${deltaLabel(costPct, 'cost').toLowerCase()} ${Math.abs(costPct).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`);
    }
    if (leadsPct != null) {
        parts.push(`${deltaLabel(leadsPct, 'leads').toLowerCase()} ${Math.abs(leadsPct).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`);
    }
    if (cplPct != null) {
        parts.push(`${deltaLabel(cplPct, 'cpl').toLowerCase()} ${Math.abs(cplPct).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`);
    }
    return parts.join(' · ') || '—';
}

/** Одна таблица с цифрами (без дубля «Динамика по месяцам» и без «Сделать активным»). */
export function renderMonthDetailsTable(monthly) {
    const rows = monthly || [];
    if (!rows.length) return '';
    const body = rows.map((row, idx) => {
        const prev = idx > 0 ? rows[idx - 1] : null;
        const mom = prev
            ? momSummaryText(
                pctDelta(row.cost, prev.cost),
                pctDelta(row.leads, prev.leads),
                pctDelta(row.cpl, prev.cpl),
            )
            : '—';
        return `<tr>
            <td>${escapeHtml(row.month || '—')}</td>
            <td>${formatMetricValue(row.cost, 'money')}</td>
            <td>${formatNumber(row.leads)}</td>
            <td>${row.cpl != null ? formatMetricValue(row.cpl, 'money') : '—'}</td>
            <td class="direct-mom-summary">${escapeHtml(mom)}</td>
        </tr>`;
    }).join('');
    return `
        <details class="direct-mom-details">
            <summary>Цифры по месяцам (таблица)</summary>
            <table class="table table-compact table-compact-direct">
                <thead><tr>
                    <th>Месяц</th><th>Расход</th><th>Заявки</th><th>CPL</th>
                    <th>К прошлому месяцу</th>
                </tr></thead>
                <tbody>${body}</tbody>
            </table>
        </details>`;
}

function formatNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function wireDynamicsMetricTabs(root, periods, chartHostId) {
    const tabs = root.querySelectorAll('.comparison-metric-tab.period-btn');
    const host = root.querySelector(`[data-dynamics-chart-host="${chartHostId}"]`);
    if (!tabs.length || !host) return;
    const cacheKey = chartHostId;
    tabs.forEach((btn) => {
        if (btn.dataset.wired === cacheKey) return;
        btn.dataset.wired = cacheKey;
        btn.addEventListener('click', () => {
            const metricKey = btn.dataset.metric || 'leads';
            tabs.forEach((el) => {
                const isActive = el === btn;
                el.classList.toggle('active', isActive);
                el.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            renderDynamicsSvgChart(host, periods, metricKey);
        });
    });
}

export function mountDirectDynamicsBlock(hostEl, monthly, options = {}) {
    if (!hostEl) return;
    const chartHostId = options.chartHostId || 'direct_dynamics_chart_host';
    const periods = monthlyRowsToPeriods(monthly);
    if (periods.length < 2) {
        hostEl.innerHTML = '';
        hostEl.style.display = 'none';
        return;
    }
    hostEl.style.display = '';
    hostEl.innerHTML = `
        <div class="card comparison-chart-card direct-dynamics-card">
            <h2 class="comparison-chart-title">Динамика по месяцам</h2>
            <div class="period-picker comparison-period-picker" role="tablist" aria-label="Метрика графика">
                <span class="period-picker-label">Метрика</span>
                ${DIRECT_DYNAMICS_METRICS.map((item, idx) => `
                    <button type="button" class="period-btn comparison-metric-tab${idx === 0 ? ' active' : ''}"
                        data-metric="${item.key}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}">
                        ${escapeHtml(item.label)}
                    </button>`).join('')}
            </div>
            <div class="chart-wrap" data-dynamics-chart-host="${escapeHtml(chartHostId)}" role="presentation"></div>
            ${renderMonthDetailsTable(monthly)}
        </div>`;
    setTimeout(() => {
        const chartHost = hostEl.querySelector(`[data-dynamics-chart-host="${chartHostId}"]`);
        renderDynamicsSvgChart(chartHost, periods, 'leads');
        wireDynamicsMetricTabs(hostEl, periods, chartHostId);
    }, 50);
}

/** Alias for report tab (KPI periods from metrics, not Excel months). */
export const COMPARISON_METRIC_OPTIONS = DIRECT_DYNAMICS_METRICS;
export function renderComparisonSvgChart(host, periods, metricKey) {
    return renderDynamicsSvgChart(host, periods, metricKey);
}

export function wireComparisonMetricTabs(container, data) {
    const periods = Array.isArray(data?.periods) ? data.periods : [];
    dynamicsPeriodsCache = periods;
    const tabs = container.querySelectorAll('.comparison-metric-tab.period-btn');
    const host = container.querySelector('#comparison_chart_host');
    if (!tabs.length || !host) return;
    tabs.forEach((btn) => {
        if (btn.dataset.wired === '1') return;
        btn.dataset.wired = '1';
        btn.addEventListener('click', () => {
            const metricKey = btn.dataset.metric || 'leads';
            tabs.forEach((el) => {
                const isActive = el === btn;
                el.classList.toggle('active', isActive);
                el.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            renderDynamicsSvgChart(host, dynamicsPeriodsCache, metricKey);
        });
    });
}
