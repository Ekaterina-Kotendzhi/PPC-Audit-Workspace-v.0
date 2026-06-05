/**
 * Единая терминология «Яндекс Директ» в UI (маркетолог).
 * Подписи автопроверок — в direct-health-rules-reference.js (DIRECT_HEALTH_INFO).
 */

export const DIRECT_COPY = {
    product: 'Яндекс Директ',
    productTab: 'Яндекс Директ',

    healthScoreTitle: 'Оценка здоровья кабинета',
    healthScoreShort: 'оценка кабинета',
    healthScoreLabel: 'Оценка кабинета',
    healthScoreTooltip: 'Оценка здоровья кабинета по автоматическим проверкам Excel (шкала 0–100)',

    excelSource: 'выгрузки Excel из Директа',
    excelSourceShort: 'Excel из Директа',

    sliceTitle: 'Срез Яндекс Директ',

    scrollToDirectRisksBtn: 'К рискам Excel',
    openDirectExcelRiskBtn: 'К риску в Excel',
    recommendationsJumpBtn: 'К рекомендациям',
    risksLabel: 'Риски Директа',
    syncRisksOnDirectPage: 'Обновить риски из Excel',

    aiEnrichmentTitle: 'AI и риски Excel',
    aiEnrichmentLine(enriched, total) {
        return `Связано с AI: ${enriched} из ${total}`;
    },
    nextStepTitle: 'Следующий шаг',
    nextStepBeforeLead: 'Цифры и график выше — из Excel. Дальше AI допишет пояснения к рискам и соберёт черновик отчёта.',
    nextStepBeforeFoot: 'После анализа: сначала вкладка «Выводы» (проверка), затем «Отчёт» (PDF).',
    checkBeforeReportTitle: 'Что проверить',
    stepResultsTitle: 'Выводы',
    stepResultsHint: 'AI-пояснения к важным рискам из Excel',
    stepResultsBtn: 'Открыть «Выводы»',
    stepReportTitle: 'Отчёт',
    stepReportHint: 'Итог для клиента и экспорт PDF',
    stepReportBtn: 'Открыть «Отчёт»',
    rerunAnalysisBtn: 'Перезапустить AI',
    rerunAnalysisFoot: 'только если меняли Excel или материалы на «Источники»',
    dataFlowStep1: 'Директ',
    dataFlowStep2: 'Источники',
    dataFlowStep3Run: 'Запуск AI',
    dataFlowStep3Rerun: 'Перезапуск AI',
    dataFlowStep3Running: 'AI…',
    dataFlowDirectHint: 'Шаг 3 «Запуск AI» — в полосе шагов над вкладками.',
    directRisksOnPageHint: 'Список рисков из Excel — в блоке ниже на этой странице.',
    sourcesAiPanelLead: 'Галочка «В AI» на карточке. Excel Директа подключается автоматически.',
    sourcesAiCount(included, total) {
        return `В AI: ${included} / ${total}`;
    },
    materialAiCheckboxLabel: 'В AI',
    materialAiStatusAccounted: 'Учтён в AI',
    materialAiStatusStale: 'Изменено',
    materialAiStatusPending: 'Будет в AI',
    materialAiStatusQueue: 'В очереди AI',
    materialAiStatusDirect: 'Через Директ',
    materialAiStatusDirectAccounted: 'Директ · в AI',
    materialAiStatusDirectStale: 'Директ · обновите AI',
    materialAiFilterAll: 'Все',
    materialAiFilterInAi: 'В AI',
    materialAiFilterOutAi: 'Не в AI',
    materialAiFilterAccounted: 'Учтены',
    materialAiFilterStale: 'Изменены',
    materialAiFilterLead: 'Фильтр по участию в последнем AI-анализе',
    materialAiStatusTooltip: {
        accounted: 'Материал был в последнем успешном AI-анализе и не менялся после него.',
        stale: 'Материал изменён после последнего AI — перезапустите анализ.',
        pending: 'AI ещё не запускали — материал пойдёт при первом run.',
        queue: 'Отмечен «В AI», но в прошлый run не отправлялся (или был исключён).',
        direct: 'Цифры Excel идут в AI с вкладки «Директ», не текстом файла в списке.',
        direct_accounted: 'Срез Директа учтён в последнем AI-анализе.',
        direct_stale: 'Файл или настройки Директа менялись после AI.',
    },
    materialAiHintLabel: 'Подсказка для AI (необязательно)',
    materialAiHintPlaceholder: 'Например: это структура РСЯ за март, смотри только кампании с меткой «бренд»',
    materialAiHintSave: 'Сохранить подсказку',
    materialAiHintSaved: 'Подсказка сохранена',
    screenshotRerunOcr: 'Распознать текст (OCR)',
    screenshotRerunOcrOk: 'Текст со скрина распознан',
    screenshotRerunOcrFail: 'OCR не сработал — опишите скрин вручную в «Редактировать»',
    screenshotReocrAll: 'Распознать все скрины',
    screenshotReocrAllOk(n, total) {
        return `OCR: распознано ${n} из ${total} скриншотов`;
    },
    screenshotReocrAllPartial(ok, fail) {
        return `OCR: ${ok} успешно, ${fail} без текста — допишите вручную`;
    },
    materialDrawerSoftReview: 'AI учтёт материал; при сомнениях пометит выводы на проверку.',
    openResultsRisksBtn: 'Открыть «Выводы»',
    openExcelBtn: 'Исходный Excel',
    openExcelBtnTitle: 'Открыть загруженный файл Excel',
    aiFindingLinkBtn: 'AI-вывод →',
    directRiskLinkBtn: 'Исходный риск на Директ →',
    filterNoAiEnrichment: 'Без AI-обогащения',
    risksSyncedFromExcel: 'Риски обновлены из Excel.',
    promptRunAnalysisAfterExcel: 'Запустить AI-анализ для обогащения рисков Excel?',
    chatChipLabel: 'Поясни оценку кабинета',
    prePdfConflictBadge: 'Конфликт: Директ и AI',
    prePdf10SecIntro: 'Проверка за 10 секунд (Excel — источник цифр):',
    prePdf10SecItems: [
        'Период в AI-summary совпадает с периодом среза Директа.',
        'Лиды в AI-summary не противоречат числам из Excel.',
        'CPL в AI-summary не противоречит данным Директа.',
        'Бюджет в AI-summary не подменяет значение из Excel.',
    ],

    findingSource: 'Материалы клиента + AI',

    dataSliceReady(months) {
        return `${months} мес. в срезе ${this.product}.`;
    },
    healthMissing() {
        return 'Загрузите Excel-выгрузку статистики из Яндекс Директа за нужный период.';
    },
    uploadHeroTitle: 'Загрузите Excel из Яндекс Директа',
    uploadHeroHint:
        'Обычно это статистика по кампаниям за период (файл вида 2026-01-01_2026-05-31_….xlsx). После загрузки появятся графики и оценка кабинета.',
    uploadHeroBtn: 'Выбрать файл Excel',
    uploadHeroSecondary: 'Скрин или заметку — вкладка «Источники»',
    sliceLoaded(months) {
        return `Срез загружен (${months} мес.) — откройте «${this.productTab}», чтобы посмотреть ${this.healthScoreShort}.`;
    },
    healthCabinetHint() {
        return `По ${this.excelSource}.`;
    },
    leadsFormula: 'лиды = формы + мессенджеры',
    chartsNote: 'Помесячная таблица ниже. Сравнение периодов KPI — вкладка «Динамика».',
    chartsNoteReport: 'Сравнение периодов KPI — блок ниже на этой вкладке.',
    dynamicsLeadTitle: 'Динамика KPI',
    dynamicsLeadHint: 'Сравнение сохранённых периодов метрик. Оценка кабинета и риски Excel — «Данные → Директ».',
    healthReportRules(rulesCount) {
        return `Взвешенная оценка по 5 зонам (${this.excelSourceShort}). Сработало проверок: ${rulesCount}.`;
    },
    healthExplainQuestion:
        'Поясни оценку здоровья кабинета: почему такой балл и что исправлять в первую очередь?',
    syncRisksSuccess(count) {
        return `Обновлено рисков Директа: ${count}. См. блок «${this.risksLabel}» на вкладке «${this.productTab}».`;
    },
    prePdfConsistencyHint:
        'Проверьте оценку кабинета и AI-summary. Если данные обновлялись — перезапустите AI-анализ или уточните в чате.',
    productTabWithScore(score) {
        return `${this.productTab} (${score}/100)`;
    },
};

/** Есть распознанный срез Директа (Excel загружен и разобран). */
export function hasDirectExcelSlice(data) {
    const da = data?.direct_analytics;
    if (!da) return false;
    if ((da.monthly || []).length > 0) return true;
    const totals = da.totals || {};
    if (Number(totals.cost || 0) > 0) return true;
    return (da.campaigns || []).length > 0;
}
