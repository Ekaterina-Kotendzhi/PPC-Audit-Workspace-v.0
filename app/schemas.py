from pydantic import BaseModel, Field, field_validator, field_serializer
from typing import Optional, List, Any
from datetime import datetime

from app.datetime_utils import serialize_api_datetime

# === Запросы ===

class FriendlyValidationError(ValueError):
    """Raised for user-facing validation messages."""


class CreateAuditRequest(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=255)
    niche: Optional[str] = ""
    niche_category: Optional[str] = ""
    niche_subcategory: Optional[str] = ""
    region: Optional[str] = ""
    website: Optional[str] = ""
    goal: Optional[str] = ""
    comment: Optional[str] = ""

class AddTextNoteRequest(BaseModel):
    title: Optional[str] = ""
    content: str = Field(..., min_length=1)

class AddAudioTranscriptRequest(BaseModel):
    title: Optional[str] = ""
    manual_transcript: str = Field(..., min_length=1)

class AddScreenshotOCRRequest(BaseModel):
    title: Optional[str] = ""
    manual_ocr_text: str = Field(..., min_length=1)

class AddMetricsRequest(BaseModel):
    period: Optional[str] = ""
    budget: Optional[float] = None
    clicks: Optional[int] = None
    leads: Optional[int] = None
    leads_forms: Optional[int] = None
    leads_messenger: Optional[int] = None
    impressions: Optional[int] = None
    sales: Optional[int] = None
    revenue: Optional[float] = None
    gross_profit: Optional[float] = None
    margin_percent: Optional[float] = None
    set_active: bool = True

    @field_validator('budget', 'revenue', 'gross_profit')
    @classmethod
    def money_non_negative(cls, v):
        if v is not None and v < 0:
            raise FriendlyValidationError('Бюджет, выручка и валовая прибыль не могут быть отрицательными')
        return v

    @field_validator('margin_percent')
    @classmethod
    def margin_range(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise FriendlyValidationError('Маржинальность должна быть от 0 до 100%')
        return v

    @field_validator('clicks', 'leads', 'sales', 'leads_forms', 'leads_messenger', 'impressions')
    @classmethod
    def counters_non_negative_int(cls, v, info):
        if v is None:
            return v
        if isinstance(v, bool):
            raise FriendlyValidationError(f'Поле «{info.field_name}» должно быть целым числом')
        if isinstance(v, float) and not v.is_integer():
            raise FriendlyValidationError(f'Поле «{info.field_name}» должно быть целым числом')
        if int(v) < 0:
            raise FriendlyValidationError(f'Поле «{info.field_name}» не может быть отрицательным')
        return int(v)


class MaterialReviewRequest(BaseModel):
    action: str = Field(..., description="verify | exclude_analysis | exclude_report | include")
    reason: Optional[str] = ""

class UpdateMaterialRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    period: Optional[str] = None
    budget: Optional[float] = None
    clicks: Optional[int] = None
    leads: Optional[int] = None
    sales: Optional[int] = None
    revenue: Optional[float] = None
    gross_profit: Optional[float] = None
    margin_percent: Optional[float] = None
    manual_transcript: Optional[str] = None
    transcript_source: Optional[str] = None
    transcript_confirmed: Optional[bool] = None
    direct_setup_kind: Optional[str] = None
    marketer_ai_hint: Optional[str] = None

    @field_validator('budget', 'revenue', 'gross_profit')
    @classmethod
    def update_money_non_negative(cls, v):
        if v is not None and v < 0:
            raise FriendlyValidationError('Бюджет, выручка и валовая прибыль не могут быть отрицательными')
        return v

    @field_validator('margin_percent')
    @classmethod
    def update_margin_range(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise FriendlyValidationError('Маржинальность должна быть от 0 до 100%')
        return v

    @field_validator('clicks', 'leads', 'sales')
    @classmethod
    def update_counters_non_negative_int(cls, v, info):
        if v is None:
            return v
        if isinstance(v, bool):
            raise FriendlyValidationError(f'Поле «{info.field_name}» должно быть целым числом')
        if isinstance(v, float) and not v.is_integer():
            raise FriendlyValidationError(f'Поле «{info.field_name}» должно быть целым числом')
        if int(v) < 0:
            raise FriendlyValidationError(f'Поле «{info.field_name}» не может быть отрицательным')
        return int(v)

class FindingIllustrationRequest(BaseModel):
    material_id: int | None = None
    caption: str | None = None


class FindingUpdateRequest(BaseModel):
    area: Optional[str] = None
    severity: Optional[str] = None
    problem: Optional[str] = None
    evidence: Optional[List[dict[str, Any]]] = None
    recommendation: Optional[str] = None
    expected_impact: Optional[str] = None
    confidence: Optional[float] = None
    needs_review: Optional[bool] = None
    review_reason: Optional[str] = None
    human_comment: Optional[str] = None
    edited_by: Optional[str] = None
    approved_for_kb: Optional[bool] = None

    @field_validator('confidence')
    @classmethod
    def update_confidence_range(cls, v):
        if v is not None and (v < 0 or v > 1):
            raise ValueError('confidence must be between 0 and 1')
        return v

    @field_validator('severity')
    @classmethod
    def update_severity_allowed(cls, v):
        if v is None:
            return v
        allowed = {'low', 'medium', 'high'}
        if v not in allowed:
            raise ValueError(f'severity must be one of {allowed}')
        return v


class FindingFeedbackRequest(BaseModel):
    comment: Optional[str] = None
    reason: Optional[str] = None
    edited_by: Optional[str] = None
    acknowledge_weak_evidence: bool = False


class FindingEvidenceCheckResponse(BaseModel):
    ok: bool
    level: str = "none"
    warnings: List[str] = []
    material_evidence_count: int = 0
    requires_acknowledgement: bool = False


class AcceptLimitationRequest(BaseModel):
    item_id: str = Field(..., min_length=1, max_length=64)
    note: Optional[str] = Field(default="", max_length=500)


class AcceptLimitationResponse(BaseModel):
    item_id: str
    label: str
    accepted: bool = True
    already_accepted: bool = False

# === Ответы ===

class AuditListDataIndicators(BaseModel):
    metrics: bool = False
    notes: bool = False
    documents: bool = False
    files_count: int = 0
    analysis: bool = False
    contacts: bool = False

class AuditListItem(BaseModel):
    id: int
    client_name: str
    niche: Optional[str]
    niche_display: Optional[str] = None
    goal: Optional[str]
    goal_full: Optional[str] = None
    goal_short: Optional[str] = None
    status: str
    status_badge: Optional[str] = None
    list_state: Optional[str] = None
    list_state_label: Optional[str] = None
    findings_count: int
    findings_display: Optional[str] = None
    tasks_display: Optional[str] = None
    issues_open_count: int = 0
    review_queue_count: int = 0
    materials_count: int = 0
    needs_data_attention: bool = False
    analysis_stale: bool = False
    has_contacts: bool = False
    has_analysis: bool = False
    requires_attention: bool = False
    primary_action: Optional[str] = None
    primary_action_label: Optional[str] = None
    export_allowed: bool = False
    export_block_reason: Optional[str] = None
    data_indicators: Optional[AuditListDataIndicators] = None
    data_indicators_label: Optional[str] = None
    data_indicators_tooltip: Optional[str] = None
    timezone_label: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_timezone_label: Optional[str] = None
    source_label: Optional[str] = None
    is_archived: bool = False
    needs_review_count: int = Field(
        0,
        description="Deprecated: use issues_open_count",
        json_schema_extra={"deprecated": True},
    )
    created_at: Optional[datetime]

class ClientContactResponse(BaseModel):
    id: int
    client_id: int
    name: str
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    messenger: Optional[str] = None
    comment: Optional[str] = None
    sort_order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class CreateClientContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    role: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    messenger: Optional[str] = ""
    comment: Optional[str] = ""
    sort_order: Optional[int] = None

class UpdateClientContactRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    messenger: Optional[str] = None
    comment: Optional[str] = None
    sort_order: Optional[int] = None

class UpdateAuditClientRequest(BaseModel):
    client_name: Optional[str] = Field(None, min_length=1, max_length=255)
    region: Optional[str] = None
    niche_category: Optional[str] = None
    niche_subcategory: Optional[str] = None
    website: Optional[str] = None
    comment: Optional[str] = None
    goal: Optional[str] = None

class AuditClientInfoResponse(BaseModel):
    audit_id: int
    client_id: int
    client_name: str
    region: Optional[str] = None
    niche_category: Optional[str] = None
    niche_subcategory: Optional[str] = None
    niche_display: Optional[str] = None
    website: Optional[str] = None
    comment: Optional[str] = None
    goal: Optional[str] = None

class CreateAuditResponse(BaseModel):
    audit_id: int
    client_id: int
    status: str
    needs_review: bool

class DuplicateAuditResponse(BaseModel):
    audit_id: int
    source_audit_id: int
    status: str

class ArchiveAuditRequest(BaseModel):
    archived: bool = True

class ArchiveAuditResponse(BaseModel):
    audit_id: int
    is_archived: bool
    archived_at: Optional[datetime] = None

class MaterialResponse(BaseModel):
    id: int
    type: str
    type_label: Optional[str] = None
    title: Optional[str]
    file_url: Optional[str]
    extracted_text: Optional[str]
    document_slice: Optional[dict[str, Any]] = None
    document_kind: Optional[str] = None
    raw_content: Optional[str]
    needs_review: bool
    review_reason: Optional[str]
    status: str = "ready"
    pipeline_status: Optional[str] = None
    pipeline_label: Optional[str] = None
    excluded_from_analysis: bool = False
    excluded_from_report: bool = False
    exclusion_reason: Optional[str] = None
    marketer_ai_hint: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer("created_at", "updated_at")
    def _serialize_material_timestamps(self, value: datetime | None) -> str | None:
        return serialize_api_datetime(value)


class ReviewQueueItem(BaseModel):
    item_type: str  # material | finding
    id: int
    title: str
    reason: Optional[str] = None
    material_type: Optional[str] = None
    status: Optional[str] = None

# === AI-схемы ===

class EvidenceItem(BaseModel):
    material_id: str
    material_type: str
    quote_or_description: str

class FindingAI(BaseModel):
    area: str
    severity: str
    finding_kind: str = "hypothesis"  # confirmed | hypothesis | needs_data
    title: Optional[str] = None
    problem: str
    evidence: List[EvidenceItem]
    evidence_level: Optional[str] = "weak"
    based_on: Optional[str] = None
    missing_data: Optional[str] = None
    recommendation: str
    recommended_action: Optional[str] = None
    expected_impact: str
    confidence: float
    needs_review: bool
    review_reason: Optional[str] = None

    @field_validator('finding_kind')
    @classmethod
    def finding_kind_allowed(cls, v):
        allowed = {'confirmed', 'hypothesis', 'needs_data', 'risk_pattern'}
        if v not in allowed:
            return 'hypothesis'
        return v

    @field_validator('confidence')
    @classmethod
    def confidence_range(cls, v):
        if v < 0 or v > 1:
            raise ValueError('confidence must be between 0 and 1')
        return v

    @field_validator('severity')
    @classmethod
    def severity_allowed(cls, v):
        allowed = {'low', 'medium', 'high'}
        if v not in allowed:
            raise ValueError(f'severity must be one of {allowed}')
        return v

class ChartAI(BaseModel):
    type: str  # bar | line | funnel | score | pie
    title: str
    description: str
    data: dict
    insight: str
    needs_review: bool
    review_reason: Optional[str] = None

class SchemeAI(BaseModel):
    type: str
    title: str
    code: str
    description: str

class MetricsAI(BaseModel):
    period: Optional[str] = None
    budget: Optional[float] = None
    clicks: Optional[int] = None
    leads: Optional[int] = None
    sales: Optional[int] = None
    revenue: Optional[float] = None
    cpl: Optional[float] = None
    cpa: Optional[float] = None
    romi: Optional[float] = None
    needs_review: bool = False
    review_reason: Optional[str] = None

class AuditSummaryAI(BaseModel):
    client_problem: str
    main_risk: str
    priority: str
    short_conclusion: str

    @field_validator('priority')
    @classmethod
    def priority_allowed(cls, v):
        allowed = {'low', 'medium', 'high'}
        if v not in allowed:
            raise ValueError(f'priority must be one of {allowed}')
        return v

class ForecastScenarioAI(BaseModel):
    headline: str = ""
    assumption: str = ""


class ForecastScenariosAI(BaseModel):
    horizon_months: int = 3
    analytics_disclaimer: str = ""
    conservative: ForecastScenarioAI = Field(default_factory=ForecastScenarioAI)
    target: ForecastScenarioAI = Field(default_factory=ForecastScenarioAI)


class CommercialOfferAI(BaseModel):
    proposal_title: str
    recommended_services: List[str]
    estimated_work_days: int
    sales_argument: str
    next_step: str
    forecast_scenarios: Optional[ForecastScenariosAI] = None

class DirectRiskRefModel(BaseModel):
    kind: str
    id: str


class DirectEnrichmentCoverage(BaseModel):
    direct_risks_total: int = 0
    enriched_count: int = 0
    missing_refs: List[DirectRiskRefModel] = Field(default_factory=list)
    stubs_created: int = 0
    coverage_percent: int = 100


class AIAnalysisResult(BaseModel):
    audit_summary: AuditSummaryAI
    metrics: MetricsAI
    findings: List[FindingAI]
    charts: List[ChartAI]
    schemes: List[SchemeAI]
    commercial_offer: CommercialOfferAI
    global_needs_review: bool
    global_review_reasons: List[str]
    enrichment_coverage: Optional[DirectEnrichmentCoverage] = None

class AnalyzeResponse(BaseModel):
    audit_id: int
    status: str
    global_needs_review: bool
    findings_count: int
    review_reasons: List[str]
    forced_draft: bool = False


class AnalysisCostEstimateResponse(BaseModel):
    model_id: str
    model_label: str
    local_mode: bool = False
    materials_count: int = 0
    feedback_examples_count: int = 0
    estimated_prompt_tokens: int = 0
    estimated_completion_tokens_min: int = 0
    estimated_completion_tokens_max: int = 0
    cost_input_rub: Optional[str] = None
    cost_input_usd: Optional[str] = None
    cost_output_rub_min: Optional[str] = None
    cost_output_rub_max: Optional[str] = None
    cost_output_usd_min: Optional[str] = None
    cost_output_usd_max: Optional[str] = None
    cost_rub_min: Optional[str] = None
    cost_rub_max: Optional[str] = None
    cost_usd_min: Optional[str] = None
    cost_usd_max: Optional[str] = None
    disclaimer: str = ""
    context_included: Optional[dict[str, bool]] = None


class AiMetricsExtractPreviewResponse(BaseModel):
    can_extract: bool
    payload: dict[str, Any] = {}
    preview_lines: List[str] = []
    sources: List[dict[str, Any]] = []
    method: str = "ai"
    model_id: Optional[str] = None
    model_label: Optional[str] = None
    usage: Optional[dict[str, Any]] = None
    cost_rub: Optional[str] = None
    cost_usd: Optional[str] = None
    ai_notes: Optional[str] = None
    confidence: Optional[float] = None
    needs_review: bool = True
    review_reasons: List[str] = []
    note_id: Optional[int] = None
    material_id: Optional[int] = None


class AnalysisReadiness(BaseModel):
    can_run_analysis: bool
    needs_review_count: int
    ai_ready_materials: int
    total_materials: int
    block_reasons: List[str] = []
    warnings: List[str] = []
    force_draft_allowed: bool = True
    is_draft_if_forced: bool = False
    issues_open_count: int = 0
    issues_blocking_count: int = 0


class StaleMaterialSummary(BaseModel):
    id: int
    type: str
    title: str


class MetricsKpiSourcePart(BaseModel):
    kind: str
    title: str
    updated_at: Optional[str] = None


class MetricsKpiProvenance(BaseModel):
    parts: List[MetricsKpiSourcePart] = Field(default_factory=list)
    summary_line: Optional[str] = None
    primary_kind: Optional[str] = None


class AnalysisFreshness(BaseModel):
    analysis_stale: bool = False
    last_analysis_at: Optional[datetime] = None
    stale_materials: List[StaleMaterialSummary] = Field(default_factory=list)
    last_analysis_metrics: Optional[dict] = None
    last_analysis_material_types: List[str] = Field(default_factory=list)
    material_ids_in_last_analysis: List[int] = Field(default_factory=list)


class DataCoverageItem(BaseModel):
    id: str
    label: str
    status: str
    status_label: str
    reason: Optional[str] = None
    action: str = "Добавить данные"


class ZoneCoverageRow(BaseModel):
    zone: str
    status: str
    reason: str
    score: Optional[int] = None


class AuditPlanMetricsTarget(BaseModel):
    revenue: Optional[float] = None
    gross_profit: Optional[float] = None
    drr: Optional[float] = None
    leads: Optional[int] = None
    sales: Optional[int] = None
    budget: Optional[float] = None


class AuditPlanForecastScenario(BaseModel):
    headline: str = ""
    assumption: str = ""


class AuditPlanForecast(BaseModel):
    horizon_months: int = 3
    analytics_disclaimer: str = ""
    conservative: AuditPlanForecastScenario = Field(default_factory=AuditPlanForecastScenario)
    target: AuditPlanForecastScenario = Field(default_factory=AuditPlanForecastScenario)


class AuditPlanBaseline(BaseModel):
    captured_at: Optional[str] = None
    note: str = ""
    metrics: dict = Field(default_factory=dict)


class AuditPlanTargets(BaseModel):
    horizon_months: int = 3
    note: str = ""
    metrics: AuditPlanMetricsTarget = Field(default_factory=AuditPlanMetricsTarget)


class AuditPlan(BaseModel):
    baseline: AuditPlanBaseline = Field(default_factory=AuditPlanBaseline)
    targets: AuditPlanTargets = Field(default_factory=AuditPlanTargets)
    forecast: AuditPlanForecast = Field(default_factory=AuditPlanForecast)


class MetricsPeriodRow(BaseModel):
    material_id: int
    period: Optional[str] = None
    period_valid: bool = False
    is_active: bool = False
    budget: Optional[float] = None
    clicks: Optional[int] = None
    leads: Optional[int] = None
    sales: Optional[int] = None
    revenue: Optional[float] = None
    gross_profit: Optional[float] = None
    drr: Optional[float] = None
    cpl: Optional[float] = None
    cpa: Optional[float] = None
    romi: Optional[float] = None
    needs_review: bool = False
    updated_at: Optional[str] = None


class MetricsPeriodsResponse(BaseModel):
    active_material_id: Optional[int] = None
    periods: List[MetricsPeriodRow] = Field(default_factory=list)


class SetActiveMetricsPeriodRequest(BaseModel):
    material_id: int


class AuditPlanUpdateRequest(BaseModel):
    baseline: Optional[dict] = None
    targets: Optional[dict] = None
    forecast: Optional[dict] = None
    capture_baseline: bool = False


class DataCoverage(BaseModel):
    has_materials: bool = False
    is_preliminary: bool = True
    structure_percent: int = 0
    audit_percent: int = 0
    report_percent: int = 0
    analytics_readiness_percent: int = 0
    checklist: List[DataCoverageItem] = []
    analytics_readiness: List[DataCoverageItem] = []
    missing_items: List[DataCoverageItem] = []
    accepted_limitations: List[dict] = []
    minimum_for_audit: List[dict] = []
    upload_suggestions: List[str] = []
    cannot_evaluate: List[str] = []
    data_collection_recommendation: str = ""
    zone_scores: List[ZoneCoverageRow] = []


class ChatContextAnchor(BaseModel):
    type: str = Field(..., description="finding | metric | comparison | health")
    finding_id: Optional[int] = None


class AskAuditRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)
    include_unverified: bool = True
    model_id: Optional[str] = None
    context_anchor: Optional[ChatContextAnchor] = None
    audience_mode: str = Field(default="internal", description="internal | client")
    response_style: str = Field(default="balanced", description="brief | balanced | deep")
    temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)

    @field_validator("response_style")
    @classmethod
    def validate_response_style(cls, v: str) -> str:
        style = (v or "balanced").strip().lower()
        if style not in {"brief", "balanced", "deep"}:
            raise FriendlyValidationError('response_style: brief, balanced или deep')
        return style

    @field_validator("audience_mode")
    @classmethod
    def validate_audience_mode(cls, v: str) -> str:
        mode = (v or "internal").strip().lower()
        if mode not in {"internal", "client"}:
            raise FriendlyValidationError('audience_mode должен быть internal или client')
        return mode

    @field_validator("context_anchor")
    @classmethod
    def validate_context_anchor(cls, v: Optional["ChatContextAnchor"]) -> Optional["ChatContextAnchor"]:
        if v is None:
            return v
        anchor_type = (v.type or "").strip().lower()
        if anchor_type not in {"finding", "metric", "comparison", "health"}:
            raise FriendlyValidationError('context_anchor.type: finding, metric, comparison или health')
        if anchor_type == "finding" and not v.finding_id:
            raise FriendlyValidationError("Для context_anchor.type=finding укажите finding_id")
        return v


class ChatTrustLayers(BaseModel):
    from_audit_sources: int = 0
    has_kb_examples: bool = False
    has_unsourced_numbers: bool = False


class AskAuditResponse(BaseModel):
    answer: str
    sources: List[dict] = []
    message_id: int
    provider: str = "local"
    needs_review_note: Optional[str] = None
    confidence_level: str = "medium"
    model: Optional[str] = None
    model_label: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost_usd: Optional[str] = None
    cost_rub: Optional[str] = None
    transport: Optional[str] = None
    transport_host: Optional[str] = None
    duration_ms: Optional[int] = None
    fallback_used: bool = False
    context_version: str = "v1"
    kb_examples: List[dict] = []
    niche_patterns: List[dict] = []
    trust_layers: Optional[ChatTrustLayers] = None
    context_anchor_label: Optional[str] = None
    audience_mode: str = "internal"


class PrePdfCheckItem(BaseModel):
    id: str
    label: str
    ok: bool
    detail: str = ""
    severity: str = "blocking"


class PrePdfCheckResponse(BaseModel):
    ready: bool
    items: List[PrePdfCheckItem] = []
    is_ready_for_client: bool = False
    summary: str = ""


class PostAnalysisHint(BaseModel):
    id: str
    title: str
    text: str


class PostAnalysisHintsResponse(BaseModel):
    hints: List[PostAnalysisHint] = []


class DirectHealthExplainRequest(BaseModel):
    model_id: Optional[str] = None


class DirectHealthExplainResponse(BaseModel):
    explain: str
    source: str = "deterministic"
    summary_explain: Optional[str] = None
    model_used: Optional[str] = None
    model_label: Optional[str] = None
    fallback_used: bool = False
    error: Optional[str] = None


class DirectHealthSyncFindingsResponse(BaseModel):
    created: int = 0
    findings: List[dict] = []


class AuthLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=255)


class AuthLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    actor: str
    user_name: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: List[dict] = []
    provider: Optional[str] = None
    model: Optional[str] = None
    model_label: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost_usd: Optional[str] = None
    cost_rub: Optional[str] = None
    transport: Optional[str] = None
    transport_host: Optional[str] = None
    confidence_level: Optional[str] = None
    fallback_used: Optional[bool] = None
    duration_ms: Optional[int] = None
    context_version: Optional[str] = None
    created_at: Optional[str] = None
    kb_examples: List[dict] = []
    niche_patterns: List[dict] = []
    trust_layers: Optional[ChatTrustLayers] = None
    context_anchor_label: Optional[str] = None
    context_anchor: Optional[dict] = None
    reply_context_anchor: Optional[dict] = None
    chat_response_style: Optional[str] = None
    chat_temperature: Optional[float] = None
    audience_mode: Optional[str] = None

class AuditRunResponse(BaseModel):
    id: int
    audit_project_id: int
    action: str
    status: Optional[str]
    error: Optional[str]
    duration_ms: Optional[int]
    created_at: datetime
    input_json: Optional[str] = None
    output_json: Optional[str] = None
    actor: Optional[str] = None

class AuditWorkflowState(BaseModel):
    state: str
    label: str
    can_run_analysis: bool = False
    show_ai_report_sections: bool = False
    show_preliminary_template: bool = True
    analysis_failed: bool = False
    analysis_running: bool = False


class DataIssue(BaseModel):
    id: str
    issue_type: str
    severity: str
    label: str
    status_label: str
    reason: str
    source: str
    ref_type: Optional[str] = None
    ref_id: Optional[int] = None
    actions: List[str] = []
    visible_after_analysis: bool = False
    resolved: bool = False


class WorkflowUIButton(BaseModel):
    id: str
    label: str
    enabled: bool
    reason_disabled: Optional[str] = None


class WorkflowUITab(BaseModel):
    visible: bool = True
    enabled: bool = True
    default: bool = False


class WorkflowUI(BaseModel):
    phase: str
    state: str
    status_label: str
    readiness_percent: int = 0
    issues_open_count: int = 0
    issues_blocking_count: int = 0
    next_action_hint: str = ""
    primary_button: WorkflowUIButton
    secondary_button: WorkflowUIButton
    export_mode: str = "template"
    tabs: dict[str, WorkflowUITab] = {}


class ReportAppendixItemRequest(BaseModel):
    material_id: int
    caption: str = Field(..., min_length=10, max_length=500)


class ReportAppendixUpdateRequest(BaseModel):
    items: List[ReportAppendixItemRequest] = Field(default_factory=list)


class ReportAppendixItemResponse(BaseModel):
    material_id: int
    sort_order: int
    caption: str
    material_title: Optional[str] = None
    material_type: Optional[str] = None
    file_url: Optional[str] = None
    needs_review: bool = False
    review_reason: Optional[str] = None
    ocr_hint: Optional[str] = None
    source_date: Optional[str] = None


class ReportIllustrationsSummary(BaseModel):
    confirmed_findings: int = 0
    findings_with_illustration: int = 0
    findings_missing_caption: int = 0
    appendix_count: int = 0


class ReportAppendixResponse(BaseModel):
    items: List[ReportAppendixItemResponse] = Field(default_factory=list)
    count: int = 0
    max_items: int = 3
    updated_at: Optional[str] = None


class ClientSnapshotDraftPreviewResponse(BaseModel):
    can_generate: bool = False
    draft: Optional[dict] = None
    preview_lines: List[str] = Field(default_factory=list)
    method: str = "unknown"
    model_id: Optional[str] = None
    model_label: Optional[str] = None
    usage: Optional[dict] = None
    cost_rub: Optional[str] = None
    cost_usd: Optional[str] = None
    can_apply: bool = False
    apply_blocked_reason: Optional[str] = None
    review_notes: List[str] = Field(default_factory=list)


class ClientSnapshotDraftApplyRequest(BaseModel):
    draft: dict
    model_id: Optional[str] = None


class ClientSnapshotDraftApplyResponse(BaseModel):
    audit_summary: Optional[dict] = None
    charts: Optional[List[dict]] = None
    limitations_text: Optional[str] = None


class AuditSummaryPatch(BaseModel):
    client_problem: Optional[str] = None
    main_risk: Optional[str] = None
    priority: Optional[str] = None
    short_conclusion: Optional[str] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        p = v.strip().lower()
        if p not in {"low", "medium", "high"}:
            raise FriendlyValidationError("priority: low, medium или high")
        return p


class CommercialOfferPatch(BaseModel):
    proposal_title: Optional[str] = None
    recommended_services: Optional[List[str]] = None
    estimated_work_days: Optional[int] = Field(default=None, ge=1, le=365)
    sales_argument: Optional[str] = None
    next_step: Optional[str] = None


class ReportOutputPatchRequest(BaseModel):
    audit_summary: Optional[AuditSummaryPatch] = None
    commercial_offer: Optional[CommercialOfferPatch] = None


class ReportOutputPatchResponse(BaseModel):
    audit_summary: Optional[dict] = None
    commercial_offer: Optional[dict] = None
    summary_changed: Optional[bool] = None
    offer_changed: Optional[bool] = None
    audit_plan: Optional[dict] = None


class AuditDetailResponse(BaseModel):
    id: int
    client_name: str
    niche: Optional[str]
    niche_display: Optional[str] = None
    niche_category: Optional[str] = None
    niche_subcategory: Optional[str] = None
    region: Optional[str] = None
    website: Optional[str]
    goal: Optional[str]
    comment: Optional[str]
    has_contacts: bool = False
    contacts: List["ClientContactResponse"] = Field(default_factory=list)
    status: str
    needs_review: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    materials: List[MaterialResponse]
    findings: List[dict]
    charts: List[dict]
    schemes: List[dict]
    commercial_offer: Optional[dict]
    audit_summary: Optional[dict]
    metrics_summary: Optional[dict]
    global_needs_review: bool
    global_review_reasons: List[str]
    review_queue: List[ReviewQueueItem] = Field(
        default_factory=list,
        description="Deprecated: use data_issues",
        json_schema_extra={"deprecated": True},
    )
    needs_review_count: int = Field(
        0,
        description="Deprecated: use workflow_ui.issues_open_count",
        json_schema_extra={"deprecated": True},
    )
    analysis_readiness: Optional[AnalysisReadiness] = Field(
        default=None,
        description="Deprecated: use workflow_ui",
        json_schema_extra={"deprecated": True},
    )
    data_coverage: Optional[DataCoverage] = None
    workflow_state: Optional[AuditWorkflowState] = None
    workflow_ui: Optional[WorkflowUI] = None
    data_issues: List[DataIssue] = []
    analysis_freshness: Optional[AnalysisFreshness] = None
    metrics_kpi_provenance: Optional[MetricsKpiProvenance] = None
    audit_plan: Optional[AuditPlan] = None
    metrics_periods: Optional[MetricsPeriodsResponse] = None
    direct_analytics: Optional[dict[str, Any]] = None
    direct_enrichment: Optional[DirectEnrichmentCoverage] = None
    report_appendix: Optional[ReportAppendixResponse] = None
    report_illustrations: Optional[ReportIllustrationsSummary] = None

    @field_serializer("created_at", "updated_at")
    def _serialize_audit_detail_timestamps(self, value: datetime | None) -> str | None:
        return serialize_api_datetime(value)


class ImportDirectPeriodsResponse(BaseModel):
    created_count: int
    material_ids: List[int] = Field(default_factory=list)
    active_material_id: Optional[int] = None