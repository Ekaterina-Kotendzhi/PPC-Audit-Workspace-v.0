/**
 * Справочник автопроверок оценки кабинета (синхрон с app/services/direct_health_rules_catalog.py).
 * Только для UI маркетолога — без J16 и технических id в подписях карточек.
 */
import { escapeHtml } from '../core/utils.js';
import { DIRECT_COPY } from './direct-copy.js';

export const DIRECT_HEALTH_INFO = {
    checksTitle: 'Автоматические проверки Excel',
    sourceHint: 'Цифры из Мастер отчёта — ',
    sourceLink: 'открыть «Данные» → «Яндекс Директ»',
};

const ZONES = [
    {
        id: 'semantics',
        label: 'Семантика и условия показа',
        hint: 'Колонка «Условие показа» в Мастер отчёте',
    },
    {
        id: 'campaigns',
        label: 'Кампании',
        hint: 'Строки среза по кампаниям из Excel',
    },
    {
        id: 'dynamics',
        label: 'Динамика по месяцам',
        hint: 'Помесячные KPI и тренды',
    },
    {
        id: 'data_quality',
        label: 'Качество данных',
        hint: 'Сводные цифры за период (лиды, CPL, формы/мессенджеры)',
    },
];

/** id совпадает с direct_health_rules_catalog.py */
const RULES = [
    { id: 'semantics_top3_concentration', zone: 'semantics', severity: 'high',
        title: 'Концентрация расхода в топ-3 условиях',
        checks: 'Большая часть бюджета уходит в три условия показа.',
        action: 'Расширить семантику и добавить минус-слова.' },
    { id: 'semantics_top3_concentration_warn', zone: 'semantics', severity: 'medium',
        title: 'Заметная концентрация в топ-3 условиях',
        checks: 'На топ-3 условий приходится от 60% расхода.',
        action: 'Проверить минус-слова и формулировки.' },
    { id: 'semantics_high_spend_zero_leads', zone: 'semantics', severity: 'high',
        title: 'Расход без лидов в условиях показа',
        checks: 'Есть условия с заметным расходом и нулём лидов.',
        action: 'Минус-слова и снижение ставок по слабым условиям.' },
    { id: 'semantics_cpl_dispersion', zone: 'semantics', severity: 'medium',
        title: 'Разброс CPL между условиями',
        checks: 'CPL у худших условий в разы выше, чем у лучших.',
        action: 'Перенести бюджет в условия с лучшим CPL.' },
    { id: 'semantics_autotarget_share', zone: 'semantics', severity: 'medium',
        title: 'Высокая доля автотаргетинга',
        checks: 'Слишком большая доля расхода на автотаргетинг.',
        action: 'Сузить автотаргетинг, усилить ручную семантику.' },
    { id: 'semantics_narrow_base', zone: 'semantics', severity: 'low',
        title: 'Узкая база условий',
        checks: 'Мало уникальных условий при заметном расходе.',
        action: 'Расширить семантику и проверить охват.' },
    { id: 'semantics_waste_share', zone: 'semantics', severity: 'medium',
        title: 'Доля слива в условиях без лидов',
        checks: 'Заметная доля бюджета уходит в условия без лидов.',
        action: 'Сократить неэффективные условия.' },
    { id: 'semantics_keyword_concentration', zone: 'semantics', severity: 'medium',
        title: 'Концентрация на ключевых фразах',
        checks: 'Большая доля расхода на узкий набор фраз.',
        action: 'Диверсифицировать семантику.' },
    { id: 'campaigns_budget_concentration', zone: 'campaigns', severity: 'medium',
        title: 'Бюджет в одной кампании',
        checks: 'Одна кампания забирает больше половины расхода.',
        action: 'Перераспределить бюджет между кампаниями.' },
    { id: 'campaigns_spend_no_leads', zone: 'campaigns', severity: 'high',
        title: 'Кампании с расходом без лидов',
        checks: 'Есть кампании с расходом от 5 000 ₽ и без лидов.',
        action: 'Пауза или пересмотр настроек кампании.' },
    { id: 'campaigns_cpl_spread', zone: 'campaigns', severity: 'medium',
        title: 'Разброс CPL между кампаниями',
        checks: 'CPL сильно отличается между кампаниями.',
        action: 'Масштабировать эффективные кампании.' },
    { id: 'campaigns_leads_concentration', zone: 'campaigns', severity: 'low',
        title: 'Лиды в одной кампании',
        checks: 'Большинство лидов приходит из одной кампании.',
        action: 'Проверить потенциал остальных кампаний.' },
    { id: 'campaigns_low_conversion', zone: 'campaigns', severity: 'high',
        title: 'Клики без конверсий',
        checks: 'Много кликов, но нет лидов по целям.',
        action: 'Проверить посадочные и цели Метрики.' },
    { id: 'dynamics_short_history', zone: 'dynamics', severity: 'low',
        title: 'Короткая история по месяцам',
        checks: 'В срезе меньше двух полных месяцев.',
        action: 'Загрузить более длинный период в Excel.' },
    { id: 'dynamics_cpl_volatility', zone: 'dynamics', severity: 'medium',
        title: 'Нестабильный CPL',
        checks: 'CPL сильно прыгает от месяца к месяцу.',
        action: 'Проверить сезонность и ставки.' },
    { id: 'dynamics_leads_drop', zone: 'dynamics', severity: 'medium',
        title: 'Падение лидов',
        checks: 'В последнем месяце лидов заметно меньше, чем раньше.',
        action: 'Разобрать ставки и семантику.' },
    { id: 'dynamics_cpl_rise', zone: 'dynamics', severity: 'medium',
        title: 'Рост CPL',
        checks: 'CPL вырос более чем на четверть к прошлому месяцу.',
        action: 'Оптимизировать ставки и условия.' },
    { id: 'dynamics_month_leads_gap', zone: 'dynamics', severity: 'low',
        title: 'Разброс лидов по месяцам',
        checks: 'Сильная разница в числе лидов между месяцами.',
        action: 'Закрепить практики лучшего месяца.' },
    { id: 'dynamics_cost_spike', zone: 'dynamics', severity: 'medium',
        title: 'Скачок расхода',
        checks: 'Резкий рост расхода к прошлому месяцу.',
        action: 'Проверить ставки и дневные бюджеты.' },
    { id: 'dynamics_zero_leads_month', zone: 'dynamics', severity: 'high',
        title: 'Месяц с расходом без лидов',
        checks: 'Есть месяц с расходом от 5 000 ₽ и без лидов.',
        action: 'Проверить цели и счётчики Метрики.' },
    { id: 'data_quality_spend_no_leads', zone: 'data_quality', severity: 'critical',
        title: 'Расход без лидов за период',
        checks: 'За весь период есть расход, но нет лидов.',
        action: 'Срочно проверить цели и трекинг.' },
    { id: 'data_quality_high_account_cpl', zone: 'data_quality', severity: 'medium',
        title: 'CPL выше среднего по месяцам',
        checks: 'Средний CPL по кабинету выше типичного по месяцам.',
        action: 'Снизить CPL через семантику и ставки.' },
    { id: 'data_quality_channel_imbalance', zone: 'data_quality', severity: 'low',
        title: 'Дисбаланс форм и мессенджеров',
        checks: 'Сильный перекос между заявками с формы и из мессенджеров.',
        action: 'Проверить креативы и посадочные.' },
    { id: 'ml_monthly_anomaly', zone: 'dynamics', severity: 'medium',
        title: 'Аномалия по месяцам',
        checks: 'Статистически необычный месяц по расходу или CPL.',
        action: 'Разобрать всплески в отчёте.' },
    { id: 'ml_campaign_underperformers', zone: 'campaigns', severity: 'medium',
        title: 'Кампании-аутсайдеры',
        checks: 'Есть кампании заметно слабее остальных по эффективности.',
        action: 'Перераспределить бюджет.' },
    { id: 'ml_cpl_high_cv', zone: 'dynamics', severity: 'medium',
        title: 'Высокая волатильность CPL',
        checks: 'CPL нестабилен на длинной истории (статистика).',
        action: 'Стабилизировать ставки и бюджеты.' },
];

const SEVERITY_LABEL = {
    critical: 'Критично',
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
};

const UI_MAP = [
    { place: 'Данные → Директ', what: 'Оценка кабинета, графики, риски Excel, этот справочник' },
    { place: 'Выводы', what: 'AI-выводы по рискам — подтверждение и база знаний' },
    { place: 'Отчёт', what: 'Подтверждённые AI-выводы и narrative для клиента' },
    { place: 'AI-чат', what: 'Пояснение оценки — не подменяет цифры Excel' },
];

function rulesByZone() {
    const buckets = {};
    ZONES.forEach((z) => { buckets[z.id] = []; });
    RULES.forEach((r) => {
        if (buckets[r.zone]) buckets[r.zone].push(r);
    });
    return buckets;
}

function renderRuleRow(rule, triggeredSet) {
    const fired = triggeredSet.has(rule.id);
    const sev = SEVERITY_LABEL[rule.severity] || rule.severity;
    return `
        <li class="direct-health-rule-row ${fired ? 'direct-health-rule-row--fired' : ''}">
            <span class="direct-health-rule-sev direct-health-rule-sev--${rule.severity}">${sev}</span>
            <div class="direct-health-rule-body">
                <strong>${escapeHtml(rule.title)}</strong>
                ${fired ? '<span class="direct-health-rule-fired">сработало</span>' : ''}
                <p class="muted">${escapeHtml(rule.checks)}</p>
                <p class="direct-health-rule-action">${escapeHtml(rule.action)}</p>
            </div>
        </li>`;
}

/**
 * @param {object} [health] — direct_analytics.health для подсветки сработавших проверок
 */
export function renderDirectHealthInfoPanel(health = null) {
    const triggered = new Set(health?.rules_triggered_ids || []);
    const buckets = rulesByZone();
    const zonesHtml = ZONES.map((z) => {
        const rules = buckets[z.id] || [];
        if (!rules.length) return '';
        return `
            <details class="direct-health-rules-zone">
                <summary>${escapeHtml(z.label)} <span class="muted">(${rules.length})</span></summary>
                <p class="muted direct-health-zone-hint">${escapeHtml(z.hint)}</p>
                <ul class="direct-health-rules-list">${rules.map((r) => renderRuleRow(r, triggered)).join('')}</ul>
            </details>`;
    }).join('');

    const firedCount = triggered.size;
    const firedNote = health
        ? `<p class="direct-health-fired-summary">${firedCount
            ? `Сработало <strong>${firedCount}</strong> из ${RULES.length} проверок.`
            : `Проверки не сработали — хороший знак или не хватает данных.`}</p>`
        : '';

    return `
        <details class="direct-health-info-card card">
            <summary class="direct-health-info-summary">Как устроена ${DIRECT_COPY.healthScoreShort}</summary>
            <div class="direct-health-info-body">
                <section class="direct-health-info-section">
                    <h5>На чём основано</h5>
                    <ul class="direct-health-info-list muted">
                        <li><strong>Мастер отчёт</strong> (.xlsx) с колонкой «Условие показа» — ${DIRECT_COPY.excelSourceShort}</li>
                        <li><strong>Периоды KPI</strong> — ${DIRECT_COPY.leadsFormula}</li>
                        <li><strong>Не AI:</strong> балл и сигналы считаются по формулам; AI только объясняет и дополняет выводы по материалам</li>
                    </ul>
                </section>
                <section class="direct-health-info-section">
                    <h5>Где смотреть</h5>
                    <dl class="direct-health-ui-map">
                        ${UI_MAP.map((row) => `
                            <dt>${escapeHtml(row.place)}</dt>
                            <dd class="muted">${escapeHtml(row.what)}</dd>`).join('')}
                    </dl>
                </section>
                <section class="direct-health-info-section">
                    <h5>${DIRECT_HEALTH_INFO.checksTitle}</h5>
                    <p class="muted">До ${RULES.length} проверок по зонам. Список полный; в оценку входят только те, для которых хватает данных.</p>
                    ${firedNote}
                    <div class="direct-health-rules-zones">${zonesHtml}</div>
                </section>
            </div>
        </details>`;
}

export function getRuleTitleById(ruleId) {
    const rule = RULES.find((r) => r.id === ruleId);
    return rule?.title || ruleId;
}
