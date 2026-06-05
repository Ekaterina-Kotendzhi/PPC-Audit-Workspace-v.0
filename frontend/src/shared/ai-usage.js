/** AI cost / token display helpers (chat, analysis progress, captions). */
import { escapeHtml } from '../core/utils.js';

export function formatTokenCount(value) {
    if (value == null || Number.isNaN(Number(value))) return '—';
    return Number(value).toLocaleString('ru-RU');
}

export function formatRubAmount(value) {
    if (value == null || value === '') return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return `${num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export function formatUsdAmount(value) {
    if (value == null || value === '') return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return `$${num.toFixed(4)}`;
}

function buildAiUsageTooltip(meta) {
    const label = meta.model_label || meta.model || 'AI';
    const host = meta.transport_host || 'api.proxyapi.ru';
    const lines = [
        `Модель: ${label}`,
        `Канал: ProxyAPI (${host})`,
        `Вход: ${formatTokenCount(meta.prompt_tokens)} токенов`,
        `Выход: ${formatTokenCount(meta.completion_tokens)} токенов`,
        `Итого: ${formatTokenCount(meta.total_tokens)} токенов · ${formatRubAmount(meta.cost_rub)} · ${formatUsdAmount(meta.cost_usd)}`,
    ];
    const rubIn = meta.tariff_input_rub_per_1m || meta.tariff_input_rub_per_1k;
    const rubOut = meta.tariff_output_rub_per_1m || meta.tariff_output_rub_per_1k;
    const usdIn = meta.tariff_input_usd_per_1m || meta.tariff_input_usd_per_1k;
    const usdOut = meta.tariff_output_usd_per_1m || meta.tariff_output_usd_per_1k;
    if (rubIn || usdIn) {
        lines.push(`Тариф (оценка): ${rubIn || '—'} ₽ / 1M вход · ${rubOut || '—'} ₽ / 1M выход`);
        lines.push(`              ($${usdIn || '—'} / 1M вход · $${usdOut || '—'} / 1M выход)`);
    }
    if (meta.pricing_updated_at) lines.push(`Обновление цен: ${meta.pricing_updated_at}`);
    if (meta.fallback_used) lines.push(`Фактически: fallback (${meta.fallback_model_label || 'да'})`);
    lines.push('Счёт ProxyAPI: ориентир; фактическое списание — в ЛК proxyapi.ru');
    return escapeHtml(lines.join('\n')).replace(/\n/g, '<br>');
}

export function buildAiUsageCaption(meta) {
    if (!meta) return '';
    const label = meta.model_label || meta.model || 'AI';
    if (meta.transport === 'local' || meta.provider === 'local' || label === 'Локальный режим') {
        return `<span class="ai-usage-caption">🤖 Локальный режим</span>`;
    }
    const tokens = formatTokenCount(meta.total_tokens);
    const rub = formatRubAmount(meta.cost_rub);
    const usd = formatUsdAmount(meta.cost_usd);
    const tooltipId = `ai_usage_${meta.message_id || Math.random().toString(36).slice(2, 8)}`;
    const tooltip = buildAiUsageTooltip(meta);
    return `
        <span class="ai-usage-caption" tabindex="0" aria-describedby="${tooltipId}">🤖 ${escapeHtml(label)} · ${tokens} токенов · ${escapeHtml(rub)} · ${escapeHtml(usd)}</span>
        <div id="${tooltipId}" class="ai-usage-tooltip" role="tooltip">${tooltip}</div>
    `;
}
