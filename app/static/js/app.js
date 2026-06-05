(() => {
  // src/core/utils.js
  function normalizeOpsAlertSummary(message) {
    const text = String(message || "").trim();
    const failedMatch = text.match(/(\d+)\s+неуспешн/i);
    if (failedMatch) {
      const n = failedMatch[1];
      const word = n === "1" ? "\u0437\u0430\u043F\u0443\u0441\u043A" : n.endsWith("1") && !n.endsWith("11") ? "\u0437\u0430\u043F\u0443\u0441\u043A" : "\u0437\u0430\u043F\u0443\u0441\u043A\u0430";
      return `${n} \u043D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u044B\u0445 ${word} \u0437\u0430 24 \u0447\u0430\u0441\u0430`;
    }
    return text.replace(/^За последние 24\s*ч\.?\s*(есть\s*)?/i, "").replace(/^Есть предупреждения:\s*/i, "").trim();
  }
  function humanizeDisplayText(text) {
    if (text === null || text === void 0 || text === "") return text;
    return String(text).replace(/\[name hidden\]/gi, "\u0430\u0443\u0434\u0438\u0442\u0430").replace(/Audit Score/gi, "\u041E\u0446\u0435\u043D\u043A\u0430").replace(/\[название скрыто\]/gi, "\u043A\u043B\u0438\u0435\u043D\u0442\u0430");
  }
  function getActiveWorkflowTab() {
    const active = document.querySelector(".tab-content.active");
    return active?.id?.replace("tab-", "") || "data";
  }
  function formatMoney(value) {
    if (value === null || value === void 0 || value === "") return "\u2014";
    const n = Number(value);
    if (Number.isNaN(n)) return "\u2014";
    return n.toLocaleString("ru-RU") + " \u20BD";
  }
  function formatNumber(value) {
    if (value === null || value === void 0 || value === "") return "\u2014";
    const n = Number(value);
    if (Number.isNaN(n)) return "\u2014";
    return n.toLocaleString("ru-RU");
  }
  function showLoader() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("active");
  }
  function hideLoader() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.remove("active");
  }
  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function jsAttr(value) {
    return String(value == null ? "" : value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  // src/core/alerts.js
  var ALERT_MAX_VISIBLE = 3;
  var ALERT_DURATION_MS = { danger: 1e4, warning: 8e3, success: 5e3, info: 5e3 };
  function showAlert(message, type = "info") {
    const container = document.getElementById("alertContainer");
    if (!container) return;
    while (container.children.length >= ALERT_MAX_VISIBLE) {
      container.firstElementChild?.remove();
    }
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.setAttribute("role", type === "danger" ? "alert" : "status");
    const icon = type === "warning" ? "\u26A0\uFE0F" : type === "danger" ? "\u274C" : type === "success" ? "\u2705" : "\u2139\uFE0F";
    alert.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <span class="alert-text">${escapeHtml(String(message ?? ""))}</span>
        <button type="button" class="alert-dismiss" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435">\xD7</button>
    `;
    alert.querySelector(".alert-dismiss")?.addEventListener("click", () => alert.remove());
    container.appendChild(alert);
    const duration = ALERT_DURATION_MS[type] || ALERT_DURATION_MS.info;
    setTimeout(() => alert.remove(), duration);
  }
  function dismissAlertsMatching(pattern) {
    const container = document.getElementById("alertContainer");
    if (!container) return;
    container.querySelectorAll(".alert").forEach((el) => {
      const text = el.textContent || "";
      if (pattern.test(text)) el.remove();
    });
  }

  // src/core/runtime-bridge.js
  var runtimeBridge = {
    getCurrentAuditId: () => null,
    getAuditIdFromUrl: () => null,
    getAuditData: () => null,
    setAuditData: (_data) => {
    },
    getDocumentIssueContext: () => null,
    setDocumentIssueContext: (_value) => {
    },
    applyDocumentModalGuidance: (_itemId) => {
    },
    getMediaRecorder: () => null,
    clearEditingMaterialId: () => {
    },
    getPrivacySettings: () => null,
    loadPrivacySettings: async () => {
    },
    buildAnalysisPayload: async () => null,
    applyRoleUiRestrictions: () => {
    },
    applyAdminUiSegmentation: () => {
    },
    onClientSaved: (_auditId, _updated) => {
    },
    onAuthSessionChanged: async () => {
    },
    onAuthLogoutNavigate: async () => {
    },
    renderAuditDetail: (_data) => {
    },
    renderFindings: (_findings, _coverage) => {
    },
    switchTab: (_tab) => {
    },
    openModal: (_id) => {
    },
    closeModal: (_id) => {
    },
    openMetricsEditor: (_focusIssue, _materialId) => {
    },
    openMetricsEditorEdit: (_materialId) => {
    },
    scrollToMetricsPeriodsPanel: () => {
    },
    openMetricsEditorForNewPeriod: (_focusIssue) => {
    },
    openNewMaterial: (_modalId) => {
    },
    openDataItemAction: (_itemId, _issue) => {
    },
    editMaterial: (_id) => {
    },
    getMaterialById: (_id) => null,
    goToAddAuditData: async () => {
    },
    loadAuditDetail: async () => {
    },
    runAuditAnalysis: (_forceDraft) => {
    },
    openReportPanel: () => {
    },
    acceptDataLimitation: async (_itemId) => {
    },
    updateExtractMetricsButtonVisibility: (_data) => {
    },
    getStatusLabel: (_status) => "",
    renderAnalysisStaleBar: (_data) => {
    },
    renderCoverageProgress: (_coverage) => {
    },
    isAnalysisLikelyStuck: (_data) => false,
    resetStuckAnalysis: async () => {
    },
    showAnalysisProgress: (_payload) => {
    },
    hideAnalysisProgress: () => {
    },
    connectAnalysisProgress: (_auditId) => {
    },
    goToDataImprovements: async () => {
    },
    isAnalysisStale: (_data) => false,
    focusScrollTarget: (_el) => {
    },
    loadKbStatusCard: () => {
    },
    getCurrentScreenState: () => "UNKNOWN",
    renderChatHistory: () => {
    },
    askInChat: async (_opts) => {
    },
    loadComparison: () => {
    },
    getSelectedModelId: (_scope) => null,
    fillMetricsFromSummary: (_summary) => {
    },
    focusMetricsModalField: () => {
    }
  };
  function configureRuntimeBridge(partial) {
    Object.assign(runtimeBridge, partial);
  }

  // src/core/modals.js
  var modalEscapeCleanups = /* @__PURE__ */ new Map();
  function bindModalEscape(modal, onEscape) {
    const handler = (event) => {
      if (event.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn(`Modal not found: ${modalId}`);
      return null;
    }
    if (modalId === "documentModal") {
      runtimeBridge.applyDocumentModalGuidance(runtimeBridge.getDocumentIssueContext());
    }
    modalEscapeCleanups.get(modalId)?.();
    modalEscapeCleanups.set(modalId, bindModalEscape(modal, () => closeModal(modalId)));
    modal.classList.add("active");
    modal.setAttribute("aria-modal", "true");
    const focusTarget = modal.querySelector("input, textarea, select, button:not(.modal-close)");
    if (focusTarget) setTimeout(() => focusTarget.focus(), 0);
    return modal;
  }
  function closeModal(modalId) {
    const mediaRecorder2 = runtimeBridge.getMediaRecorder();
    if (modalId === "audioModal" && mediaRecorder2 && mediaRecorder2.state === "recording") {
      showAlert("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u0438\u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C.", "warning");
      return null;
    }
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn(`Modal not found: ${modalId}`);
      return null;
    }
    modalEscapeCleanups.get(modalId)?.();
    modalEscapeCleanups.delete(modalId);
    modal.classList.remove("active");
    modal.removeAttribute("aria-modal");
    if (["textNoteModal", "audioModal", "screenshotModal", "metricsModal"].includes(modalId)) {
      runtimeBridge.clearEditingMaterialId();
    }
    if (modalId === "documentModal") {
      runtimeBridge.setDocumentIssueContext(null);
    }
    return modal;
  }
  async function showConfirmDialog({
    title = "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
    message = "\u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B?",
    confirmText = "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C",
    cancelText = "\u041E\u0442\u043C\u0435\u043D\u0430",
    confirmType = "danger"
  } = {}) {
    const modal = document.getElementById("uxConfirmModal");
    const titleEl = document.getElementById("uxConfirmTitle");
    const messageEl = document.getElementById("uxConfirmMessage");
    const okBtn = document.getElementById("uxConfirmOkBtn");
    const cancelBtn = document.getElementById("uxConfirmCancelBtn");
    const closeBtn = document.getElementById("uxConfirmCloseBtn");
    if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
      return false;
    }
    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    okBtn.classList.remove("btn-primary", "btn-danger", "btn-success", "btn-outline");
    okBtn.classList.add(confirmType === "primary" ? "btn-primary" : confirmType === "success" ? "btn-success" : "btn-danger");
    return await new Promise((resolve) => {
      const onOk = () => finish(true);
      const onCancel = () => finish(false);
      const onClose = () => finish(false);
      const onOverlay = (event) => {
        if (event.target === modal) finish(false);
      };
      const onEscape = (event) => {
        if (event.key === "Escape") finish(false);
      };
      const finish = (result) => {
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        closeBtn.removeEventListener("click", onClose);
        modal.removeEventListener("click", onOverlay);
        document.removeEventListener("keydown", onEscape);
        closeModal("uxConfirmModal");
        resolve(result);
      };
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      closeBtn.addEventListener("click", onClose);
      modal.addEventListener("click", onOverlay);
      document.addEventListener("keydown", onEscape);
      openModal("uxConfirmModal");
      setTimeout(() => okBtn.focus(), 0);
    });
  }
  async function showPromptDialog2({
    title = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439",
    message = "",
    placeholder = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442...",
    initialValue = "",
    confirmText = "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
    cancelText = "\u041E\u0442\u043C\u0435\u043D\u0430",
    required = false
  } = {}) {
    const modal = document.getElementById("uxPromptModal");
    const titleEl = document.getElementById("uxPromptTitle");
    const messageEl = document.getElementById("uxPromptMessage");
    const inputEl = document.getElementById("uxPromptInput");
    const okBtn = document.getElementById("uxPromptOkBtn");
    const cancelBtn = document.getElementById("uxPromptCancelBtn");
    const closeBtn = document.getElementById("uxPromptCloseBtn");
    if (!modal || !titleEl || !messageEl || !inputEl || !okBtn || !cancelBtn || !closeBtn) {
      return false;
    }
    titleEl.textContent = title;
    messageEl.textContent = message;
    messageEl.style.display = message ? "block" : "none";
    messageEl.style.whiteSpace = message && String(message).includes("\n") ? "pre-line" : "";
    inputEl.placeholder = placeholder;
    inputEl.value = initialValue || "";
    okBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    return await new Promise((resolve) => {
      let settled = false;
      const onOk = () => {
        const value = (inputEl.value || "").trim();
        if (required && !value) {
          showAlert("\u041F\u043E\u043B\u0435 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C", "warning");
          inputEl.focus();
          return;
        }
        finish(value);
      };
      const onCancel = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        finish(false);
      };
      const onClose = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        finish(false);
      };
      const onOverlay = (event) => {
        if (event.target === modal) finish(false);
      };
      const onEscape = (event) => {
        if (event.key === "Escape") finish(false);
      };
      const onEnter = (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          onOk();
        }
      };
      const finish = (result) => {
        if (settled) return;
        settled = true;
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        closeBtn.removeEventListener("click", onClose);
        modal.removeEventListener("click", onOverlay);
        document.removeEventListener("keydown", onEscape);
        inputEl.removeEventListener("keydown", onEnter);
        closeModal("uxPromptModal");
        resolve(result);
      };
      okBtn.addEventListener("click", onOk);
      cancelBtn.addEventListener("click", onCancel);
      closeBtn.addEventListener("click", onClose);
      modal.addEventListener("click", onOverlay);
      document.addEventListener("keydown", onEscape);
      inputEl.addEventListener("keydown", onEnter);
      openModal("uxPromptModal");
      setTimeout(() => inputEl.focus(), 0);
    });
  }
  function initModalOverlayClose() {
    document.addEventListener("click", (event) => {
      if (event.target.classList.contains("modal-overlay") && event.target.id) {
        closeModal(event.target.id);
      }
    });
  }

  // src/shared/timezone.js
  var DISPLAY_TIMEZONE = window.__DISPLAY_TIMEZONE || "Europe/Moscow";
  var DISPLAY_TZ_SUFFIX = window.__DISPLAY_TZ_SUFFIX || "UTC+3";
  var AUDIT_LIST_TZ_OFFSET = window.__AUDIT_LIST_TZ_OFFSET || "UTC+3";
  function parseApiDateTime(dateStr) {
    if (!dateStr) return null;
    const raw = String(dateStr).trim();
    if (!raw) return null;
    if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
      const d2 = new Date(raw);
      return Number.isNaN(d2.getTime()) ? null : d2;
    }
    const iso = raw.includes("T") ? raw : `${raw}T00:00:00`;
    const d = /* @__PURE__ */ new Date(`${iso}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function parseApiDateMs(dateStr) {
    const d = parseApiDateTime(dateStr);
    return d ? d.getTime() : 0;
  }
  function formatDate(dateStr) {
    if (!dateStr) return "\u2014";
    const d = parseApiDateTime(dateStr);
    if (!d) return "\u2014";
    const parts = new Intl.DateTimeFormat("ru-RU", {
      timeZone: DISPLAY_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(d);
    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    return `${get("day")}.${get("month")}.${get("year")} \xB7 ${get("hour")}:${get("minute")} ${DISPLAY_TZ_SUFFIX}`;
  }
  function formatAuditListDateTime(dateStr) {
    if (!dateStr) return { date: "\u2014", time: "\u2014", full: "\u2014" };
    const d = parseApiDateTime(dateStr);
    if (!d) return { date: "\u2014", time: "\u2014", full: "\u2014" };
    const parts = new Intl.DateTimeFormat("ru-RU", {
      timeZone: DISPLAY_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(d);
    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    const hm = `${get("hour")}:${get("minute")}`;
    const offset = AUDIT_LIST_TZ_OFFSET;
    const date = `${get("day")}.${get("month")}.${get("year")}`;
    return {
      date,
      time: `${hm} ${offset}`,
      full: `${date} ${hm} ${offset}`
    };
  }

  // src/core/api.js
  function getAuthHeaders({ json = true } = {}) {
    const headers = {};
    if (json) headers["Content-Type"] = "application/json";
    const role = localStorage.getItem("ppc_user_role");
    const userId = localStorage.getItem("ppc_user_id");
    const userName = localStorage.getItem("ppc_user_name");
    const accessToken = localStorage.getItem("ppc_access_token");
    if (role) headers["X-User-Role"] = role;
    if (userId) headers["X-User-Id"] = userId;
    if (userName) headers["X-User-Name"] = userName;
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    return headers;
  }
  function parseApiErrorPayload(errorBody, response, url = "") {
    const detail = errorBody?.detail;
    let message = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430";
    if (typeof detail === "string" && detail) {
      message = detail;
      if (response?.status === 404 && detail === "Not Found" && String(url).includes("/findings/")) {
        message = "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E (\u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0435\u0440\u0432\u0435\u0440 \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 Ctrl+F5)";
      }
    } else if (Array.isArray(detail) && detail.length) {
      message = detail.map((item) => {
        if (typeof item === "string") return item;
        return item.msg ? item.msg.replace(/^Value error,\s*/i, "") : JSON.stringify(item);
      }).join("; ");
    } else if (detail && typeof detail === "object") {
      message = detail.message || detail.detail || JSON.stringify(detail);
    }
    return message;
  }
  function enrichApiError(errorBody, response, url = "") {
    const message = parseApiErrorPayload(errorBody, response, url);
    const detail = errorBody?.detail;
    const err = new Error(message);
    if (detail && typeof detail === "object") {
      if (detail.code) err.code = detail.code;
      if (detail.evidence_check) err.evidenceCheck = detail.evidence_check;
      if (detail.retryable != null) err.retryable = detail.retryable;
    }
    return err;
  }
  async function apiFetch(url, options = {}) {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = {
      ...getAuthHeaders({ json: !isFormData }),
      ...options.headers || {}
    };
    if (isFormData) {
      delete headers["Content-Type"];
    }
    const { signal, ...rest } = options;
    const response = await fetch(url, { ...rest, headers, signal });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw enrichApiError(error, response, url);
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response;
  }
  async function apiRequest(url, options = {}) {
    try {
      return await apiFetch(url, options);
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }
  function findingFeedbackUrl(findingId, action) {
    const auditId = runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (auditId) {
      return `/api/audits/${auditId}/findings/${findingId}/${action}`;
    }
    return `/api/findings/${findingId}/${action}`;
  }
  async function openProtectedFileUrl(url, { downloadName = "file" } = {}) {
    if (!url) {
      showAlert("\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", "warning");
      return;
    }
    try {
      const response = await apiFetch(url, { method: "GET" });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const popup = window.open(objectUrl, "_blank", "noopener");
      if (!popup) {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = downloadName;
        link.rel = "noopener";
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 6e4);
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u0430\u0439\u043B: " + error.message, "danger");
    }
  }

  // src/core/auth.js
  var authEnabled = false;
  var currentUserRole = "admin";
  var currentActor = "local_admin";
  var currentUserName = "local_admin";
  var strictViewerMode = true;
  function canWrite() {
    return !authEnabled || currentUserRole === "admin" || currentUserRole === "marketer";
  }
  function isAdminUser() {
    if (!authEnabled) return false;
    return currentUserRole === "admin";
  }
  function isViewerReadOnly() {
    return authEnabled && currentUserRole === "viewer";
  }
  function requireWriteAccess(actionLabel = "\u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435") {
    if (canWrite()) return true;
    showAlert(`${actionLabel} \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E: \u0443 \u0432\u0430\u0441 \u0440\u0435\u0436\u0438\u043C \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430. \u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443.`, "warning");
    return false;
  }
  async function loadAuthContext() {
    try {
      const me = await apiRequest("/api/auth/me");
      authEnabled = Boolean(me?.auth_enabled);
      currentUserRole = String(me?.role || "admin").toLowerCase();
      currentActor = String(me?.actor || "local_admin");
      currentUserName = String(me?.user_name || currentActor || "local_admin");
      strictViewerMode = me?.ui_strict_viewer_mode !== false;
    } catch (_err) {
      authEnabled = false;
      currentUserRole = "admin";
      currentActor = "local_admin";
      currentUserName = "local_admin";
      strictViewerMode = true;
    }
  }
  function renderIdentityBadges() {
    if (!authEnabled) {
      ["userIdentityBadge", "userIdentityIndexBadge"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = "none";
      });
      return;
    }
    const text = `\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: ${currentUserName} \xB7 ${currentUserRole}`;
    ["userIdentityBadge", "userIdentityIndexBadge"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = "inline-flex";
      el.classList.toggle("viewer", isViewerReadOnly());
      el.textContent = text;
      el.title = "\u0420\u043E\u043B\u044C \u0438 \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438\u0437 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u0437\u0430\u043F\u0440\u043E\u0441\u0430";
    });
  }
  function renderAuthControls() {
    const wrap = document.getElementById("authControls");
    const mini = document.getElementById("authUserMini");
    const loginBtn = document.getElementById("btnAuthLogin");
    const logoutBtn = document.getElementById("btnAuthLogout");
    const devFillBtn = document.getElementById("btnAuthDevFill");
    if (!wrap || !mini || !loginBtn || !logoutBtn) return;
    if (!authEnabled) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "inline-flex";
    const token = localStorage.getItem("ppc_access_token");
    const hasToken = Boolean(token && token.trim());
    mini.textContent = hasToken ? `${currentUserName} \xB7 ${currentUserRole}` : "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C (\u0431\u0435\u0437 \u0432\u0445\u043E\u0434\u0430)";
    loginBtn.style.display = hasToken ? "none" : "inline-flex";
    logoutBtn.style.display = hasToken ? "inline-flex" : "none";
    if (devFillBtn) {
      const localHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      devFillBtn.style.display = localHost && !hasToken ? "inline-flex" : "none";
    }
  }
  function openAuthLoginModal() {
    const u = document.getElementById("authLoginUsername");
    const p = document.getElementById("authLoginPassword");
    if (u) u.value = "admin";
    if (p) p.value = "";
    openModal("authLoginModal");
    if (p) p.focus();
  }
  function fillDevAuthCredentials() {
    const u = document.getElementById("authLoginUsername");
    const p = document.getElementById("authLoginPassword");
    if (u) u.value = "admin";
    if (p) p.value = "admin";
    if (p) p.focus();
  }
  async function submitAuthLogin() {
    const username = (document.getElementById("authLoginUsername")?.value || "").trim();
    const password = (document.getElementById("authLoginPassword")?.value || "").trim();
    if (!username || !password) {
      showAlert("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C", "warning");
      return;
    }
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      const token = data?.access_token;
      if (token) localStorage.setItem("ppc_access_token", token);
      closeModal("authLoginModal");
      await loadAuthContext();
      renderIdentityBadges();
      renderAuthControls();
      await runtimeBridge.onAuthSessionChanged();
      showAlert("\u0412\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0445\u043E\u0434\u0430: " + error.message, "danger");
    }
  }
  async function logoutAuth() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (_error) {
    }
    localStorage.removeItem("ppc_access_token");
    await loadAuthContext();
    renderIdentityBadges();
    renderAuthControls();
    showAlert("\u0412\u044B \u0432\u044B\u0448\u043B\u0438 \u0438\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430", "info");
    await runtimeBridge.onAuthLogoutNavigate();
  }

  // src/register-window-handlers.js
  function registerWindowHandlers(handlers) {
    Object.assign(window, handlers);
  }

  // src/audits-list/index.js
  var AUDITS_FILTER_STORAGE_KEY = "ppc_audits_filter";
  var AUDITS_FILTER_INITIALIZED_KEY = "ppc_audits_filter_initialized";
  var AUDITS_PAGE_SIZE_STORAGE_KEY = "ppc_audits_page_size";
  var AUDITS_LIST_FILTER_MODES = /* @__PURE__ */ new Set(["all", "drafts", "review", "ready", "archive"]);
  var auditsListCache = [];
  var auditsActiveTabCache = [];
  var auditsListTotal = 0;
  var auditsActiveTotal = 0;
  var auditsArchiveTotal = 0;
  var auditsListFilter = "all";
  var auditsListSort = "-updated_at";
  var auditsListPage = 1;
  var auditsListPageSize = 10;
  var auditsListSearchTimer = null;
  var AUDITS_TABLE_COLSPAN = 6;
  var AUDIT_ACTIONS_MENU_ID = "auditActionsMenuFloating";
  var auditActionsOpenForId = null;
  var auditActionsMenuIgnoreOutsideClick = false;
  function auditIssuesOpenCount(a) {
    return Number(a?.issues_open_count ?? a?.needs_review_count ?? 0) || 0;
  }
  function resolveAuditListUx(a) {
    if (a?.list_state && a?.primary_action) {
      return {
        listState: a.list_state,
        findingsDisplay: a.findings_display || "\u2014",
        tasksDisplay: a.tasks_display || "\u2014",
        primaryAction: a.primary_action,
        primaryActionLabel: a.primary_action_label || "\u041E\u0442\u043A\u0440\u044B\u0442\u044C",
        exportAllowed: Boolean(a.export_allowed),
        exportBlockReason: a.export_block_reason || "\u0414\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u043F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0432\u044B\u0432\u043E\u0434\u043E\u0432",
        goalFull: a.goal_full || a.goal || "",
        goalShort: a.goal_short || _goalShortClient(a.goal),
        statusLabel: a.list_state_label || a.status,
        statusBadge: a.status_badge || a.status,
        dataIndicatorsLabel: a.data_indicators_label || "\u2014",
        dataIndicatorsTitle: a.data_indicators_tooltip || "",
        timezoneLabel: a.timezone_label || formatDate(a.created_at)
      };
    }
    const legacy = deriveAuditListUx(a);
    return {
      ...legacy,
      statusLabel: AUDITS_STATUS_LABELS[a?.status] || a?.status,
      statusBadge: a?.status,
      dataIndicatorsLabel: "\u2014",
      dataIndicatorsTitle: "",
      timezoneLabel: formatDate(a.created_at)
    };
  }
  function _goalShortClient(goal) {
    const text = (goal || "").trim();
    if (!text) return "\u2014";
    return text.length > 50 ? `${text.substring(0, 50)}\u2026` : text;
  }
  function deriveAuditListUx(a) {
    const status = a?.status || "draft";
    const findings = Number(a?.findings_count ?? 0) || 0;
    const materials = Number(a?.materials_count ?? 0) || 0;
    const issues = auditIssuesOpenCount(a);
    const stale = Boolean(a?.analysis_stale);
    const needsData = Boolean(a?.needs_data_attention);
    let listState;
    if (status === "in_progress") {
      listState = "ANALYSIS_RUNNING";
    } else if (status === "failed") {
      listState = "ANALYSIS_FAILED";
    } else if (stale && findings > 0) {
      listState = "STALE";
    } else if (status === "draft") {
      if (materials === 0) listState = "DRAFT_EMPTY";
      else if (needsData || issues > 0) listState = "DRAFT_DATA";
      else listState = "READY_ANALYSIS";
    } else if (issues > 0 || status === "needs_review") {
      listState = "REVIEW_PENDING";
    } else if (status === "completed") {
      listState = "REPORT_READY";
    } else {
      listState = "DRAFT_DATA";
    }
    let findingsDisplay;
    if (listState === "DRAFT_EMPTY") findingsDisplay = "\u2014 \xB7 \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445";
    else if (listState === "DRAFT_DATA" || listState === "READY_ANALYSIS") findingsDisplay = "\u2014 \xB7 \u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u043B\u0441\u044F";
    else if (listState === "ANALYSIS_RUNNING" || listState === "ANALYSIS_FAILED") findingsDisplay = "\u2014";
    else if (findings > 0 && stale) findingsDisplay = `${findings} \xB7 \u0443\u0441\u0442\u0430\u0440.`;
    else if (findings > 0) findingsDisplay = String(findings);
    else findingsDisplay = "0 \xB7 \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445";
    let tasksDisplay;
    if (listState === "DRAFT_EMPTY") tasksDisplay = "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
    else if (listState === "DRAFT_DATA") {
      tasksDisplay = issues > 0 ? `${issues} \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435` : needsData ? "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" : "\u2014";
    } else if (listState === "READY_ANALYSIS") tasksDisplay = "\u2014";
    else if (listState === "ANALYSIS_RUNNING") tasksDisplay = "\u2014";
    else if (listState === "ANALYSIS_FAILED") tasksDisplay = "1 \xB7 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C";
    else if (issues > 0) tasksDisplay = `${issues} \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435`;
    else tasksDisplay = "\u2014";
    let primaryAction;
    let primaryActionLabel;
    if (listState === "ANALYSIS_RUNNING") {
      primaryAction = "disabled_running";
      primaryActionLabel = "\u0410\u043D\u0430\u043B\u0438\u0437\u2026";
    } else if (listState === "ANALYSIS_FAILED" || listState === "STALE") {
      primaryAction = "run_analysis";
      primaryActionLabel = listState === "STALE" ? "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI" : "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437";
    } else if (listState === "READY_ANALYSIS") {
      primaryAction = "run_analysis";
      primaryActionLabel = "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437";
    } else if (listState === "REVIEW_PENDING") {
      primaryAction = "review_findings";
      primaryActionLabel = "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u044B";
    } else if (listState === "REPORT_READY") {
      primaryAction = "open";
      primaryActionLabel = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442";
    } else {
      primaryAction = "continue";
      primaryActionLabel = "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C";
    }
    const exportAllowed = listState === "REPORT_READY" && findings > 0;
    const exportBlockReason = exportAllowed ? "" : "\u0414\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u043F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0432\u044B\u0432\u043E\u0434\u043E\u0432";
    const goalFull = a?.goal || "";
    const goalShort = goalFull ? goalFull.length > 50 ? `${goalFull.substring(0, 50)}\u2026` : goalFull : "\u2014";
    return {
      listState,
      findingsDisplay,
      tasksDisplay,
      primaryAction,
      primaryActionLabel,
      exportAllowed,
      exportBlockReason,
      goalFull,
      goalShort
    };
  }
  function auditNeedsAttention(a) {
    if (typeof a?.requires_attention === "boolean") return a.requires_attention;
    const ux = resolveAuditListUx(a);
    const issues = auditIssuesOpenCount(a);
    if (ux.listState === "REPORT_READY" && issues === 0) return false;
    return issues > 0 || a?.status === "needs_review" || a?.status === "failed" || ux.listState === "DRAFT_EMPTY" || ux.listState === "DRAFT_DATA" && Boolean(a?.needs_data_attention) || Boolean(a?.analysis_stale);
  }
  function countAuditsNeedingAttention(audits) {
    return (audits || []).filter(auditNeedsAttention).length;
  }
  function auditIsDraft(a) {
    const ux = resolveAuditListUx(a);
    return ["DRAFT_EMPTY", "DRAFT_DATA", "READY_ANALYSIS"].includes(ux.listState);
  }
  function auditIsDraftOnly(a) {
    return auditIsDraft(a) && !auditNeedsAttention(a);
  }
  function auditIsReady(a) {
    return resolveAuditListUx(a).listState === "REPORT_READY";
  }
  function countAuditsDrafts(audits) {
    return (audits || []).filter(auditIsDraftOnly).length;
  }
  function countAuditsReady(audits) {
    return (audits || []).filter(auditIsReady).length;
  }
  function auditsListFilterUsesTabLock() {
    return auditsListFilter !== "all";
  }
  function setAuditsListFilter(mode) {
    if (!AUDITS_LIST_FILTER_MODES.has(mode)) return;
    auditsListFilter = mode;
    auditsListPage = 1;
    sessionStorage.setItem(AUDITS_FILTER_STORAGE_KEY, mode);
    sessionStorage.setItem(AUDITS_FILTER_INITIALIZED_KEY, "1");
    syncAuditsListFilterControls();
    loadAuditsList();
  }
  function auditsListToolbarFiltersActive() {
    const q = document.getElementById("auditsSearchInput")?.value?.trim();
    const statusEl = document.getElementById("auditsStatusFilter");
    const status = statusEl?.disabled ? "" : statusEl?.value || "";
    const exportReady = Boolean(document.getElementById("auditsExportReadyFilter")?.checked);
    const errors = Boolean(document.getElementById("auditsErrorsFilter")?.checked);
    return Boolean(q || status || exportReady || errors);
  }
  function auditsListFiltersAreActive() {
    return auditsListToolbarFiltersActive() || auditsListFilter !== "all";
  }
  function auditsListWorkspaceHasAudits() {
    return auditsActiveTotal > 0 || auditsArchiveTotal > 0 || auditsActiveTabCache.length > 0;
  }
  function auditsListChromeShouldShow(totalLoaded) {
    return totalLoaded > 0 || auditsListWorkspaceHasAudits() || auditsListToolbarFiltersActive() || auditsListFilter !== "all";
  }
  async function refreshAuditsTabBaseline() {
    try {
      const response = await fetch("/api/audits/?archived=false&limit=100&sort=-updated_at", {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return;
      const audits = await response.json();
      auditsActiveTabCache = audits;
      auditsActiveTotal = parseInt(response.headers.get("X-Total-Count") || String(audits.length), 10);
    } catch {
    }
  }
  function resolveAuditsListEmptyState() {
    if (auditsListToolbarFiltersActive()) {
      return {
        title: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E",
        body: "\u041F\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u043C\u0443 \u0444\u0438\u043B\u044C\u0442\u0440\u0443 \u0430\u0443\u0434\u0438\u0442\u043E\u0432 \u043D\u0435\u0442. \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u0441\u0442\u0430\u0442\u0443\u0441 \u0438\u043B\u0438 \u043F\u043E\u0438\u0441\u043A \u043B\u0438\u0431\u043E \u0441\u0431\u0440\u043E\u0441\u044C\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u044B.",
        showResetFilters: true,
        showShowAllTab: false
      };
    }
    if (auditsListFilter !== "all") {
      const msg2 = auditsListEmptyMessage(auditsListFilter);
      return { ...msg2, showResetFilters: false, showShowAllTab: true };
    }
    if (auditsListWorkspaceHasAudits()) {
      return {
        title: "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E",
        body: "\u0412 \u0442\u0435\u043A\u0443\u0449\u0435\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \u043D\u0435\u0442 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0430\u0443\u0434\u0438\u0442\u043E\u0432.",
        showResetFilters: false,
        showShowAllTab: false
      };
    }
    const msg = auditsListEmptyMessage("all");
    return { ...msg, showResetFilters: false, showShowAllTab: false };
  }
  function renderAuditsListEmptyHtml(emptyState) {
    const buttons = [];
    if (emptyState.showResetFilters) {
      buttons.push('<button type="button" class="btn btn-outline btn-sm btn-mt-section" onclick="resetAuditsListFilters()">\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B</button>');
    }
    if (emptyState.showShowAllTab) {
      buttons.push(`<button type="button" class="btn btn-outline btn-sm btn-mt-section" onclick="setAuditsListFilter('all')">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435</button>`);
    }
    return `
        <p class="audit-list-empty-title">${escapeHtml(emptyState.title)}</p>
        <p class="muted audit-list-empty-body">${escapeHtml(emptyState.body)}</p>
        ${buttons.length ? `<div class="audit-list-empty-actions">${buttons.join(" ")}</div>` : ""}`;
  }
  function updateAuditsResetFiltersVisibility() {
    const btn = document.getElementById("auditsResetFiltersBtn");
    const row = document.querySelector(".audits-toolbar-row-primary");
    const active = auditsListFiltersAreActive();
    if (btn) {
      btn.classList.toggle("is-hidden", !active);
      if (active) btn.removeAttribute("hidden");
      else btn.setAttribute("hidden", "");
    }
    if (row) row.classList.toggle("has-active-filters", active);
  }
  function resetAuditsListFilters() {
    const searchInput = document.getElementById("auditsSearchInput");
    const statusFilter = document.getElementById("auditsStatusFilter");
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "";
    ["auditsExportReadyFilter", "auditsErrorsFilter"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
    auditsListPage = 1;
    if (auditsListFilter !== "all") {
      setAuditsListFilter("all");
    } else {
      loadAuditsList();
    }
    updateAuditsResetFiltersVisibility();
  }
  function syncAuditsListFilterControls() {
    const statusEl = document.getElementById("auditsStatusFilter");
    const mode = auditsListFilter;
    const tabLocksStatus = mode !== "all";
    if (statusEl) {
      statusEl.disabled = tabLocksStatus;
      statusEl.title = tabLocksStatus ? "\u041D\u0430 \u044D\u0442\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \u0444\u0438\u043B\u044C\u0442\u0440 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u0437\u0430\u0434\u0430\u043D \u0432\u043A\u043B\u0430\u0434\u043A\u043E\u0439 \u0441\u043F\u0438\u0441\u043A\u0430" : "";
      if (tabLocksStatus) statusEl.value = "";
    }
    updateAuditsResetFiltersVisibility();
  }
  function paginateAudits(list) {
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / auditsListPageSize));
    if (auditsListPage > totalPages) auditsListPage = totalPages;
    if (auditsListPage < 1) auditsListPage = 1;
    const startIndex = (auditsListPage - 1) * auditsListPageSize;
    return {
      items: list.slice(startIndex, startIndex + auditsListPageSize),
      total,
      totalPages,
      start: total ? startIndex + 1 : 0,
      end: Math.min(startIndex + auditsListPageSize, total)
    };
  }
  function goToAuditsPage(page) {
    auditsListPage = Math.max(1, page);
    applyAuditsListView();
  }
  function setAuditsListPageSize(size) {
    const next = parseInt(size, 10);
    if (![10, 25, 50].includes(next)) return;
    auditsListPageSize = next;
    auditsListPage = 1;
    sessionStorage.setItem(AUDITS_PAGE_SIZE_STORAGE_KEY, String(next));
    applyAuditsListView();
  }
  function renderAuditsPagination(meta) {
    const wrap = document.getElementById("auditsPagination");
    if (!wrap) return;
    if (!meta.total) {
      wrap.style.display = "none";
      wrap.innerHTML = "";
      return;
    }
    wrap.style.display = "flex";
    const { totalPages, total, start, end } = meta;
    const cur = auditsListPage;
    let pageButtons = "";
    const addPage = (p) => {
      const active = p === cur ? " is-active" : "";
      pageButtons += `<button type="button" class="btn btn-outline btn-sm audits-page-btn${active}" onclick="goToAuditsPage(${p})">${p}</button>`;
    };
    if (totalPages <= 7) {
      for (let p = 1; p <= totalPages; p += 1) addPage(p);
    } else {
      addPage(1);
      if (cur > 3) pageButtons += '<span class="muted audits-page-ellipsis">\u2026</span>';
      const from = Math.max(2, cur - 1);
      const to = Math.min(totalPages - 1, cur + 1);
      for (let p = from; p <= to; p += 1) addPage(p);
      if (cur < totalPages - 2) pageButtons += '<span class="muted audits-page-ellipsis">\u2026</span>';
      addPage(totalPages);
    }
    const prevDisabled = cur <= 1 ? " disabled" : "";
    const nextDisabled = cur >= totalPages ? " disabled" : "";
    wrap.innerHTML = `
        <span class="audits-pagination-info">\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ${start}\u2013${end} \u0438\u0437 ${total}</span>
        <div class="audits-pagination-pages" role="navigation" aria-label="\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u044B">
            <button type="button" class="btn btn-outline btn-sm audits-page-btn" onclick="goToAuditsPage(${cur - 1})"${prevDisabled} aria-label="\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430">\u2190</button>
            ${pageButtons}
            <button type="button" class="btn btn-outline btn-sm audits-page-btn" onclick="goToAuditsPage(${cur + 1})"${nextDisabled} aria-label="\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430">\u2192</button>
        </div>
        <label class="audits-pagination-size">\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043F\u043E:
            <select id="auditsPageSizeSelect" class="form-control" aria-label="\u0417\u0430\u043F\u0438\u0441\u0435\u0439 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435" onchange="setAuditsListPageSize(this.value)">
                <option value="10"${auditsListPageSize === 10 ? " selected" : ""}>10</option>
                <option value="25"${auditsListPageSize === 25 ? " selected" : ""}>25</option>
                <option value="50"${auditsListPageSize === 50 ? " selected" : ""}>50</option>
            </select>
        </label>`;
  }
  async function fetchAuditsArchiveCount() {
    try {
      const response = await fetch("/api/audits/?archived=true&limit=1", {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return;
      auditsArchiveTotal = parseInt(response.headers.get("X-Total-Count") || "0", 10);
    } catch {
      auditsArchiveTotal = 0;
    }
  }
  async function fetchAuditsActiveCount() {
    try {
      const response = await fetch("/api/audits/?archived=false&limit=1", {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return;
      auditsActiveTotal = parseInt(response.headers.get("X-Total-Count") || "0", 10);
    } catch {
      auditsActiveTotal = 0;
    }
  }
  function sortAuditsForDisplay(audits, filterMode) {
    const list = [...audits || []];
    if (filterMode === "review" && (!auditsListSort || auditsListSort === "-updated_at" || auditsListSort === "-created_at")) {
      list.sort((a, b) => {
        const diff = auditIssuesOpenCount(b) - auditIssuesOpenCount(a);
        if (diff !== 0) return diff;
        return parseApiDateMs(b.created_at) - parseApiDateMs(a.created_at);
      });
      return list;
    }
    const sort = auditsListSort || "-updated_at";
    const reverse = sort.startsWith("-");
    const field = sort.replace(/^-/, "");
    list.sort((a, b) => {
      let av;
      let bv;
      if (field === "client_name") {
        av = (a.client_name || "").toLowerCase();
        bv = (b.client_name || "").toLowerCase();
        return reverse ? bv.localeCompare(av, "ru") : av.localeCompare(bv, "ru");
      }
      if (field === "findings_count") {
        av = Number(a.findings_count) || 0;
        bv = Number(b.findings_count) || 0;
        return reverse ? bv - av : av - bv;
      }
      if (field === "status") {
        av = (a.list_state_label || a.status || "").toLowerCase();
        bv = (b.list_state_label || b.status || "").toLowerCase();
        return reverse ? bv.localeCompare(av, "ru") : av.localeCompare(bv, "ru");
      }
      if (field === "updated_at") {
        av = parseApiDateMs(a.updated_at || a.created_at);
        bv = parseApiDateMs(b.updated_at || b.created_at);
        return reverse ? bv - av : av - bv;
      }
      av = parseApiDateMs(a.created_at);
      bv = parseApiDateMs(b.created_at);
      return reverse ? bv - av : av - bv;
    });
    return list;
  }
  function filterAuditsForView(audits, filterMode) {
    const list = audits || [];
    switch (filterMode) {
      case "drafts":
        return list.filter(auditIsDraftOnly);
      case "review":
        return list.filter(auditNeedsAttention);
      case "ready":
        return list.filter(auditIsReady);
      case "archive":
        return [...list];
      case "all":
      default:
        return [...list];
    }
  }
  function auditsListEmptyMessage(filterMode) {
    switch (filterMode) {
      case "drafts":
        return {
          title: "\u041D\u0435\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u043E\u0432",
          body: "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0438 \u0431\u0435\u0437 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u0447 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0430\u0443\u0434\u0438\u0442\u0430."
        };
      case "ready":
        return {
          title: "\u041D\u0435\u0442 \u0433\u043E\u0442\u043E\u0432\u044B\u0445 \u043E\u0442\u0447\u0451\u0442\u043E\u0432",
          body: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0430\u0443\u0434\u0438\u0442\u044B \u0441 \u0433\u043E\u0442\u043E\u0432\u044B\u043C \u043E\u0442\u0447\u0451\u0442\u043E\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u043F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430."
        };
      case "archive":
        return {
          title: "\u0410\u0440\u0445\u0438\u0432 \u043F\u0443\u0441\u0442",
          body: "\u0410\u0440\u0445\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0430\u0443\u0434\u0438\u0442\u044B \u0431\u0443\u0434\u0443\u0442 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u0437\u0434\u0435\u0441\u044C."
        };
      case "review":
        return {
          title: "\u041D\u0435\u0442 \u0430\u0443\u0434\u0438\u0442\u043E\u0432, \u0442\u0440\u0435\u0431\u0443\u044E\u0449\u0438\u0445 \u0432\u0430\u0448\u0435\u0433\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F",
          body: "\u0421\u0440\u0435\u0434\u0438 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0445 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0437\u0430\u0434\u0430\u0447 \u0438 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u043E\u0432 \u0431\u0435\u0437 \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435\u0442."
        };
      default:
        return {
          title: "\u041D\u0435\u0442 \u0430\u0443\u0434\u0438\u0442\u043E\u0432",
          body: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u0439 \u0430\u0443\u0434\u0438\u0442, \u043D\u0430\u0436\u0430\u0432 \u043A\u043D\u043E\u043F\u043A\u0443 \xAB\u041D\u043E\u0432\u044B\u0439 \u0430\u0443\u0434\u0438\u0442\xBB"
        };
    }
  }
  function updateAuditsFilterChrome(reviewCount, totalLoaded) {
    const bar = document.getElementById("auditsListFilter");
    const toolbar = document.getElementById("auditsListToolbar");
    const tabs = {
      all: document.getElementById("auditsFilterAll"),
      drafts: document.getElementById("auditsFilterDrafts"),
      review: document.getElementById("auditsFilterReview"),
      ready: document.getElementById("auditsFilterReady"),
      archive: document.getElementById("auditsFilterArchive")
    };
    const counts = {
      all: document.getElementById("auditsFilterAllCount"),
      drafts: document.getElementById("auditsFilterDraftsCount"),
      review: document.getElementById("auditsFilterReviewCount"),
      ready: document.getElementById("auditsFilterReadyCount"),
      archive: document.getElementById("auditsFilterArchiveCount")
    };
    if (!bar || !tabs.all) return;
    const countSource = auditsListFilter === "archive" ? auditsActiveTabCache : auditsActiveTabCache.length ? auditsActiveTabCache : auditsListCache;
    const keepChrome = auditsListChromeShouldShow(totalLoaded);
    bar.style.display = keepChrome ? "flex" : "none";
    if (toolbar) toolbar.style.display = keepChrome ? "flex" : "none";
    const allCount = auditsListFilter === "archive" ? auditsActiveTotal || auditsActiveTabCache.length : auditsActiveTotal || totalLoaded;
    const draftCount = countAuditsDrafts(countSource);
    const readyCount = countAuditsReady(countSource);
    const reviewTabCount = countAuditsNeedingAttention(countSource);
    if (counts.all) counts.all.textContent = String(allCount);
    if (counts.drafts) counts.drafts.textContent = String(draftCount);
    if (counts.review) counts.review.textContent = String(reviewTabCount);
    if (counts.ready) counts.ready.textContent = String(readyCount);
    if (counts.archive) counts.archive.textContent = String(auditsArchiveTotal);
    Object.entries(tabs).forEach(([mode, btn]) => {
      if (!btn) return;
      const active = auditsListFilter === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    updateAuditsSortHeaderChrome();
  }
  function updateAuditsListHint(totalLoaded, filteredCount) {
    const hint = document.getElementById("auditsListHint");
    if (!hint) return;
    if (totalLoaded === 0 && auditsListFilter !== "archive") {
      if (auditsListToolbarFiltersActive() && auditsActiveTotal > 0) {
        hint.innerHTML = `\u041D\u0435\u0442 \u0430\u0443\u0434\u0438\u0442\u043E\u0432 \u043F\u043E \u0444\u0438\u043B\u044C\u0442\u0440\u0443 \xB7 \u0432\u0441\u0435\u0433\u043E \u0432 \u0431\u0430\u0437\u0435 <strong>${auditsActiveTotal}</strong>`;
        hint.style.display = "block";
        return;
      }
      if (auditsListToolbarFiltersActive()) {
        hint.textContent = "\u041D\u0435\u0442 \u0430\u0443\u0434\u0438\u0442\u043E\u0432 \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u043C";
        hint.style.display = "block";
        return;
      }
      hint.style.display = "none";
      hint.textContent = "";
      hint.innerHTML = "";
      return;
    }
    const reviewCount = countAuditsNeedingAttention(
      auditsListFilter === "archive" ? auditsActiveTabCache : auditsListCache
    );
    const shown = auditsListFilter === "archive" ? totalLoaded : totalLoaded;
    const parts = [];
    if (auditsListFilter !== "archive") {
      hint.innerHTML = `<strong>${reviewCount}</strong> \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0438\u0437 <strong>${shown}</strong> \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0445`;
      hint.style.display = "block";
    } else {
      hint.textContent = `\u0412 \u0430\u0440\u0445\u0438\u0432\u0435: ${shown} \u0430\u0443\u0434\u0438\u0442\u043E\u0432`;
      hint.style.display = shown ? "block" : "none";
    }
    if (auditsListTotal > totalLoaded && auditsListFilter !== "archive") {
      parts.push(`\u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E ${totalLoaded} \u0438\u0437 ${auditsListTotal} \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u043C`);
    }
    if (auditsListFilter === "review" && filteredCount === 0 && totalLoaded > 0) {
      parts.push("\u043D\u0435\u0442 \u0430\u0443\u0434\u0438\u0442\u043E\u0432, \u0442\u0440\u0435\u0431\u0443\u044E\u0449\u0438\u0445 \u0432\u0430\u0448\u0435\u0433\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F");
    }
    if (parts.length) {
      hint.innerHTML += `<span class="audits-hint-extra"> \xB7 ${escapeHtml(parts.join(" \xB7 "))}</span>`;
    }
  }
  var AUDITS_STATUS_LABELS = {
    draft: "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A",
    in_progress: "\u0412 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435",
    completed: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D",
    needs_review: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438",
    failed: "\u041E\u0448\u0438\u0431\u043A\u0430"
  };
  function resolveAuditPrimaryShortLabel(ux) {
    if (ux.primaryActionLabel) {
      return ux.primaryActionLabel;
    }
    switch (ux.listState) {
      case "ANALYSIS_RUNNING":
        return "\u0410\u043D\u0430\u043B\u0438\u0437\u2026";
      case "ANALYSIS_FAILED":
        return "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437";
      case "STALE":
        return "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI";
      default:
        break;
    }
    if (ux.primaryAction === "disabled_running") return "\u0410\u043D\u0430\u043B\u0438\u0437\u2026";
    if (ux.primaryAction === "run_analysis") return "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437";
    if (ux.primaryAction === "review_findings") return "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u044B";
    if (ux.primaryAction === "open") return "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442";
    return "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C";
  }
  function renderAuditPrimaryAction(a, ux) {
    const id = a.id;
    const shortLabel = resolveAuditPrimaryShortLabel(ux);
    const label = escapeHtml(shortLabel);
    const fullLabel = ux.primaryActionLabel || shortLabel;
    const titleAttr = fullLabel !== shortLabel ? ` title="${escapeHtml(fullLabel)}"` : fullLabel ? ` title="${escapeHtml(fullLabel)}"` : "";
    if (ux.primaryAction === "run_analysis") {
      return `<button type="button" class="btn btn-primary btn-sm btn-audit-primary"${titleAttr} onclick="runAnalysis(${id})">${label}</button>`;
    }
    if (ux.primaryAction === "disabled_running") {
      return `<button type="button" class="btn btn-primary btn-sm btn-audit-primary" disabled${titleAttr}>${label}</button>`;
    }
    return `<button type="button" class="btn btn-primary btn-sm btn-audit-primary"${titleAttr} onclick="openAudit(${id})">${label}</button>`;
  }
  function renderAuditRowActionsCell(a, ux) {
    const primary = `
        <div class="audit-row-actions-stack">
            ${renderAuditPrimaryAction(a, ux)}
            ${renderAuditActionsMenu(a, ux)}
        </div>`;
    return renderAuditRowSurface(primary, "", { compact: true });
  }
  function formatClientNameDisplay(name) {
    const text = (name || "").trim();
    if (!text) return { display: "\u2014", full: "" };
    return { display: text, full: text };
  }
  function updateAuditsSortHeaderChrome() {
    const sort = auditsListSort || "-updated_at";
    const field = sort.replace(/^-/, "");
    const reverse = sort.startsWith("-");
    document.querySelectorAll(".audits-sort-btn").forEach((btn) => {
      const btnField = btn.getAttribute("data-sort-field");
      const active = btnField === field;
      btn.classList.toggle("is-active", active);
      let indicator = btn.querySelector(".sort-indicator");
      if (!indicator) {
        indicator = document.createElement("span");
        indicator.className = "sort-indicator";
        btn.appendChild(indicator);
      }
      indicator.textContent = active ? reverse ? "\u25BC" : "\u25B2" : "";
    });
  }
  function toggleAuditsListSort(field) {
    if (auditsListSort === field) {
      auditsListSort = `-${field}`;
    } else if (auditsListSort === `-${field}`) {
      auditsListSort = field;
    } else {
      auditsListSort = field === "updated_at" ? "-updated_at" : `-${field}`;
    }
    auditsListPage = 1;
    applyAuditsListView();
  }
  function buildAuditsListUrl() {
    const params = new URLSearchParams({ limit: "100" });
    const q = document.getElementById("auditsSearchInput")?.value?.trim();
    const statusEl = document.getElementById("auditsStatusFilter");
    const status = statusEl?.disabled ? "" : statusEl?.value;
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (document.getElementById("auditsExportReadyFilter")?.checked) params.set("export_ready", "true");
    if (document.getElementById("auditsErrorsFilter")?.checked) params.set("has_errors", "true");
    params.set("archived", auditsListFilter === "archive" ? "true" : "false");
    if (auditsListSort) params.set("sort", auditsListSort);
    return `/api/audits/?${params.toString()}`;
  }
  function initAuditsListToolbar() {
    const savedPageSize = parseInt(sessionStorage.getItem(AUDITS_PAGE_SIZE_STORAGE_KEY) || "10", 10);
    if ([10, 25, 50].includes(savedPageSize)) auditsListPageSize = savedPageSize;
    const searchInput = document.getElementById("auditsSearchInput");
    const statusFilter = document.getElementById("auditsStatusFilter");
    const exportReady = document.getElementById("auditsExportReadyFilter");
    const errorsFilter = document.getElementById("auditsErrorsFilter");
    if (!searchInput) return;
    const reload = () => {
      auditsListPage = 1;
      updateAuditsResetFiltersVisibility();
      loadAuditsList();
    };
    searchInput.addEventListener("input", () => {
      clearTimeout(auditsListSearchTimer);
      auditsListSearchTimer = setTimeout(reload, 350);
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        clearTimeout(auditsListSearchTimer);
        reload();
      }
    });
    searchInput.addEventListener("input", updateAuditsResetFiltersVisibility);
    statusFilter?.addEventListener("change", () => {
      if (auditsListFilterUsesTabLock()) setAuditsListFilter("all");
      reload();
    });
    [exportReady, errorsFilter].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", reload);
    });
    syncAuditsListFilterControls();
    updateAuditsResetFiltersVisibility();
    window.addEventListener("resize", closeAllAuditActionsMenus);
    window.addEventListener("scroll", closeAllAuditActionsMenus, true);
  }
  function renderStatusNote(ux) {
    const draftStates = ["DRAFT_EMPTY", "DRAFT_DATA", "READY_ANALYSIS"];
    if (draftStates.includes(ux.listState)) return "\u0411\u0435\u0437 \u0430\u043D\u0430\u043B\u0438\u0437\u0430";
    const fd = (ux.findingsDisplay || "").toLowerCase();
    if (fd.includes("\u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u043B\u0441\u044F") || fd.includes("\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445")) return "\u0411\u0435\u0437 \u0430\u043D\u0430\u043B\u0438\u0437\u0430";
    if (fd.includes("\u0443\u0441\u0442\u0430\u0440")) return ux.findingsDisplay;
    return "";
  }
  function resolveAuditRowAccentClass(listState) {
    return resolveAuditPlaqueClass(listState).replace("is-plaque-", "audit-row-accent-");
  }
  function renderAuditRowSurface(primaryHtml, secondaryHtml, options = {}) {
    const secondary = (secondaryHtml || "").trim();
    const compact = options.compact ? " audit-row-surface-compact" : "";
    const secondaryClass = secondary ? "audit-row-line-secondary" : "audit-row-line-secondary is-empty";
    return `
        <div class="audit-row-surface${compact}">
            <div class="audit-row-line-primary">${primaryHtml}</div>
            <div class="${secondaryClass}">${secondary ? secondary : ""}</div>
        </div>`;
  }
  function renderDataIndicatorsBadges(a, ux) {
    const ind = a?.data_indicators && typeof a.data_indicators === "object" ? a.data_indicators : {};
    const badge = (label, ok) => {
      const cls = ok ? "audit-data-badge is-ok" : "audit-data-badge is-empty";
      const check = ok ? '<span class="audit-data-check" aria-hidden="true">\u2713</span>' : "";
      return `<span class="${cls}">${escapeHtml(label)}${check}</span>`;
    };
    const filesCount = Number(ind.files_count) || 0;
    const primary = `<div class="audit-data-inline">
        ${badge("\u041C\u0435\u0442\u0440\u0438\u043A\u0430", Boolean(ind.metrics))}
        ${badge("\u0417\u0430\u043C\u0435\u0442\u043A\u0438", Boolean(ind.notes))}
    </div>`;
    const secondary = badge(`\u0424\u0430\u0439\u043B\u044B ${filesCount}`, filesCount > 0);
    return renderAuditRowSurface(primary, secondary);
  }
  function normalizeTasksLabel(rawLabel, hasCount) {
    const text = (rawLabel || "").trim();
    if (!text || text === "\u2014") return "\u2014";
    if (text === "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435") return text;
    if (hasCount || /^\d+\s/.test(text) || /проверк/i.test(text)) return "\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435";
    return text;
  }
  function parseTasksDisplay(tasksDisplay) {
    const text = (tasksDisplay || "").trim();
    if (!text || text === "\u2014" || text === "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435") {
      return { count: null, label: text || "\u2014", showOpen: false };
    }
    const match = text.match(/^(\d+)\s*(.*)$/);
    if (match) {
      return { count: match[1], label: normalizeTasksLabel(text, true), showOpen: true };
    }
    return { count: null, label: normalizeTasksLabel(text, false), showOpen: /проверк/i.test(text) };
  }
  function renderTasksCell(a, ux) {
    const parsed = parseTasksDisplay(ux.tasksDisplay);
    const showLink = Boolean(parsed.count) || parsed.label === "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
    const openLink = showLink ? `<a href="/audit/${a.id}" class="audit-task-link" onclick="event.preventDefault(); openAudit(${a.id})">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u2192</a>` : "";
    const labelCls = !parsed.count && parsed.label === "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" ? "audit-task-muted" : !parsed.count ? "audit-list-cell-muted" : "audit-task-label";
    const primary = `
        <div class="audit-task-stack">
            <span class="audit-task-count${parsed.count ? "" : " is-empty"}">${escapeHtml(parsed.count || "")}</span>
            <span class="${labelCls}">${escapeHtml(parsed.label)}</span>
        </div>`;
    return renderAuditRowSurface(primary, openLink);
  }
  function resolveAuditPlaqueClass(listState) {
    switch (listState) {
      case "REPORT_READY":
        return "is-plaque-ready";
      case "REVIEW_PENDING":
        return "is-plaque-review";
      case "READY_ANALYSIS":
        return "is-plaque-ready";
      case "ANALYSIS_RUNNING":
        return "is-plaque-running";
      case "ANALYSIS_FAILED":
      case "STALE":
        return "is-plaque-warn";
      default:
        return "is-plaque-draft";
    }
  }
  function renderAuditRowPlaque(a, ux) {
    const plaqueClass = resolveAuditPlaqueClass(ux.listState);
    const statusLabel = ux.statusLabel || "";
    const title = statusLabel ? ` title="${escapeHtml(statusLabel)}"` : "";
    return `<span class="audit-row-plaque ${plaqueClass}"${title} aria-label="\u0410\u0443\u0434\u0438\u0442 ${a.id}${statusLabel ? `, ${statusLabel}` : ""}">${a.id}</span>`;
  }
  function _isPlaceholderText(text) {
    const t = (text || "").trim();
    return !t || t === "\u2014";
  }
  function renderAuditClientCell(a, ux) {
    const client = formatClientNameDisplay(a.client_name);
    const clientTitle = client.full ? ` title="${escapeHtml(client.full)}"` : "";
    const nicheRaw = (a.niche_display || a.niche || "").trim();
    const goalText = ux.goalShort || "";
    const secondaryParts = [];
    if (!_isPlaceholderText(nicheRaw)) secondaryParts.push(nicheRaw);
    if (!_isPlaceholderText(goalText)) secondaryParts.push(goalText);
    if (a.has_contacts) secondaryParts.push("\u043A\u043E\u043D\u0442\u0430\u043A\u0442 \u2713");
    const secondaryText = secondaryParts.join(" \xB7 ");
    const secondaryTitle = secondaryParts.length ? ` title="${escapeHtml(secondaryParts.join(" \xB7 "))}"` : "";
    const primary = `<a href="/audit/${a.id}" class="audit-client-name"${clientTitle}
            onclick="event.preventDefault(); openAudit(${a.id})">${escapeHtml(client.display)}</a>`;
    const surface = renderAuditRowSurface(primary, secondaryText ? escapeHtml(secondaryText) : "");
    return `
        <div class="audit-client-head">
            ${renderAuditRowPlaque(a, ux)}
            ${surface.replace('class="audit-row-surface"', `class="audit-row-surface"${secondaryTitle}`)}
        </div>`;
  }
  function resolveAuditStatusBadgeClass(ux) {
    if (ux.listState === "READY_ANALYSIS") return "is-status-ready";
    return "";
  }
  function renderAuditStatusCell(a, ux) {
    const note = renderStatusNote(ux);
    const statusClass = resolveAuditStatusBadgeClass(ux);
    const extraCls = statusClass ? ` ${statusClass}` : "";
    const primary = `<span class="audit-status-badge is-list-status${extraCls}">${escapeHtml(ux.statusLabel)}</span>`;
    return renderAuditRowSurface(primary, note ? escapeHtml(note) : "");
  }
  function renderAuditDateCell(a, ux) {
    const dt = a.updated_at || a.created_at;
    const primary = formatAuditListDateTime(dt);
    const created = formatAuditListDateTime(a.created_at);
    const showCreatedHint = a.created_at && a.updated_at && a.created_at !== a.updated_at;
    const source = a.source_label ? ` \xB7 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A: ${a.source_label}` : "";
    const title = showCreatedHint ? `\u0421\u043E\u0437\u0434\u0430\u043D: ${created.full}
\u0418\u0437\u043C\u0435\u043D\u0451\u043D: ${primary.full}${source}` : `${primary.full}${source}`;
    const primaryHtml = `<span class="audit-date-day">${escapeHtml(primary.date)}</span>`;
    const secondaryHtml = `<span class="audit-date-time">${escapeHtml(primary.time)}</span>`;
    return `
        <div class="audit-row-surface audit-row-surface-date" title="${escapeHtml(title)}">
            <div class="audit-row-line-primary">${primaryHtml}</div>
            <div class="audit-row-line-secondary">${secondaryHtml}</div>
        </div>`;
  }
  function buildAuditActionsMenuItems(a, ux) {
    const id = a.id;
    const isDraft = ["DRAFT_EMPTY", "DRAFT_DATA", "READY_ANALYSIS"].includes(ux.listState);
    const items = [];
    items.push({ label: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u0430", onclick: `openEditClientModal(${id})` });
    items.push({
      label: a.has_contacts ? "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043D\u0442\u0430\u043A\u0442",
      onclick: `openContactModalFromList(${id})`
    });
    items.push({ divider: true });
    items.push({ label: "\u0414\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u0443\u0434\u0438\u0442", onclick: `duplicateAudit(${id})` });
    if (!isDraft) {
      items.push({ label: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432", onclick: `window.location.href='/audit-runs?audit_id=${id}'` });
    }
    if (a.is_archived) {
      items.push({ label: "\u0418\u0437 \u0430\u0440\u0445\u0438\u0432\u0430", onclick: `toggleArchiveAudit(${id}, false)` });
    } else {
      items.push({ label: "\u0410\u0440\u0445\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u0442\u044C", onclick: `toggleArchiveAudit(${id}, true)` });
    }
    if (ux.exportAllowed && !["export"].includes(ux.primaryAction)) {
      items.push({ label: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 PDF", onclick: `exportAudit(${id})` });
    }
    items.push({ divider: true });
    items.push({ label: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u0442", onclick: `deleteAudit(${id})`, className: "is-danger" });
    return items;
  }
  function renderAuditActionsMenu(a, ux) {
    const id = a.id;
    return `
        <div class="audit-actions-menu-wrap" data-audit-menu-wrap="${id}">
            <button type="button" id="auditActionsBtn-${id}" class="btn btn-outline btn-sm audit-actions-menu-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="${AUDIT_ACTIONS_MENU_ID}" aria-label="\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F" onclick="toggleAuditActionsMenu(event, ${id})" title="\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F"><span class="menu-chevron" aria-hidden="true">\u25BE</span></button>
        </div>`;
  }
  function ensureAuditActionsFloatingMenu() {
    let menu = document.getElementById(AUDIT_ACTIONS_MENU_ID);
    if (!menu) {
      menu = document.createElement("div");
      menu.id = AUDIT_ACTIONS_MENU_ID;
      menu.className = "audit-actions-menu";
      menu.hidden = true;
      menu.setAttribute("role", "menu");
      document.body.appendChild(menu);
    }
    return menu;
  }
  function buildAuditActionsMenuHtml(a, ux) {
    const items = buildAuditActionsMenuItems(a, ux);
    return items.map((item) => {
      if (item.divider) return '<div class="audit-actions-menu-divider" role="separator"></div>';
      return `
            <button type="button" class="audit-actions-menu-item ${item.className || ""}" role="menuitem"
                onclick="closeAllAuditActionsMenus(); ${item.onclick}">${escapeHtml(item.label)}</button>`;
    }).join("");
  }
  function closeAllAuditActionsMenus() {
    const menu = document.getElementById(AUDIT_ACTIONS_MENU_ID);
    if (menu) {
      menu.hidden = true;
      menu.innerHTML = "";
      menu.style.top = "";
      menu.style.left = "";
      menu.style.maxHeight = "";
      menu.style.overflowY = "";
      menu.style.visibility = "";
      menu.classList.remove("is-open");
    }
    document.querySelectorAll(".audit-actions-menu-btn").forEach((el) => el.setAttribute("aria-expanded", "false"));
    auditActionsOpenForId = null;
  }
  function positionAuditActionsMenu(menu, btn) {
    menu.hidden = false;
    menu.classList.add("is-open");
    menu.style.position = "fixed";
    menu.style.zIndex = "10000";
    menu.style.visibility = "hidden";
    menu.style.top = "0";
    menu.style.left = "0";
    menu.style.maxHeight = "none";
    menu.style.overflowY = "visible";
    const margin = 8;
    const gap = 6;
    const rect = btn.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 230;
    const menuHeight = menu.scrollHeight;
    let left = rect.right - menuWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));
    let top = rect.bottom + gap;
    if (top + menuHeight > window.innerHeight - margin) {
      top = rect.top - menuHeight - gap;
    }
    if (top < margin) {
      top = margin;
    }
    if (top + menuHeight > window.innerHeight - margin) {
      menu.style.maxHeight = `${window.innerHeight - margin * 2}px`;
      menu.style.overflowY = "auto";
    }
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = "visible";
  }
  function toggleAuditActionsMenu(event, auditId) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    const btn = event.currentTarget;
    if (!btn) return;
    if (auditActionsOpenForId === auditId) {
      closeAllAuditActionsMenus();
      return;
    }
    const audit = auditsListCache.find((row) => String(row.id) === String(auditId));
    if (!audit) return;
    const ux = resolveAuditListUx(audit);
    const menu = ensureAuditActionsFloatingMenu();
    closeAllAuditActionsMenus();
    menu.innerHTML = buildAuditActionsMenuHtml(audit, ux);
    positionAuditActionsMenu(menu, btn);
    btn.setAttribute("aria-expanded", "true");
    auditActionsOpenForId = auditId;
    auditActionsMenuIgnoreOutsideClick = true;
    requestAnimationFrame(() => {
      auditActionsMenuIgnoreOutsideClick = false;
    });
  }
  document.addEventListener("click", (event) => {
    if (auditActionsMenuIgnoreOutsideClick) return;
    if (!event.target.closest(".audit-actions-menu-wrap") && !event.target.closest(`#${AUDIT_ACTIONS_MENU_ID}`)) {
      closeAllAuditActionsMenus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllAuditActionsMenus();
  });
  function renderAuditTableRow(a) {
    const ux = resolveAuditListUx(a);
    const dataTitle = ux.dataIndicatorsTitle ? ` title="${escapeHtml(ux.dataIndicatorsTitle)}"` : "";
    const rowAccent = resolveAuditRowAccentClass(ux.listState);
    return `
        <tr class="audit-table-row ${rowAccent}">
            <td class="audit-client-cell">${renderAuditClientCell(a, ux)}</td>
            <td class="audit-col-status">${renderAuditStatusCell(a, ux)}</td>
            <td class="audit-list-data-cell"${dataTitle}>${renderDataIndicatorsBadges(a, ux)}</td>
            <td class="audit-col-tasks">${renderTasksCell(a, ux)}</td>
            <td class="col-date">${renderAuditDateCell(a, ux)}</td>
            <td class="col-actions">${renderAuditRowActionsCell(a, ux)}</td>
        </tr>`;
  }
  function renderAuditsListError(tbody, message, cardsWrap) {
    const errorHtml = `
        <p class="audit-list-error-title">\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A</p>
        <p class="muted audit-list-error-body">${escapeHtml(message)}</p>
        <button type="button" class="btn btn-outline btn-sm" onclick="loadAuditsList()">\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C</button>`;
    if (tbody) {
      tbody.innerHTML = `
            <tr>
                <td colspan="${AUDITS_TABLE_COLSPAN}" class="audit-list-state-cell audit-list-state-cell--error">
                    ${errorHtml}
                </td>
            </tr>`;
    }
    if (cardsWrap) {
      cardsWrap.innerHTML = `<div class="audit-list-card audit-list-card-error">${errorHtml}</div>`;
    }
  }
  function renderAuditsCards(audits, cardsWrap, emptyKind) {
    if (!cardsWrap) return;
    if (!audits.length) {
      const empty = emptyKind === "filter" || emptyKind === "toolbar" ? resolveAuditsListEmptyState() : auditsListEmptyMessage("all");
      const emptyState = emptyKind === "filter" || emptyKind === "toolbar" ? empty : { ...empty, showResetFilters: false, showShowAllTab: false };
      cardsWrap.innerHTML = `
            <div class="audit-list-card audit-list-card-empty">
                ${renderAuditsListEmptyHtml(emptyState)}
            </div>`;
      return;
    }
    cardsWrap.innerHTML = audits.map((a) => {
      const ux = resolveAuditListUx(a);
      const dataTitle = ux.dataIndicatorsTitle ? ` title="${escapeHtml(ux.dataIndicatorsTitle)}"` : "";
      return `
        <article class="audit-list-card">
            <div class="audit-list-card-section audit-list-card-client-wrap">
                ${renderAuditClientCell(a, ux)}
            </div>
            <div class="audit-list-card-section audit-list-card-status-wrap">
                ${renderAuditStatusCell(a, ux)}
            </div>
            <div class="audit-list-card-section audit-list-data-cell"${dataTitle}>
                ${renderDataIndicatorsBadges(a, ux)}
            </div>
            <div class="audit-list-card-section audit-col-tasks">
                ${renderTasksCell(a, ux)}
            </div>
            <div class="audit-list-card-section audit-list-card-date-wrap col-date">
                ${renderAuditDateCell(a, ux)}
            </div>
            <div class="audit-list-card-actions">
                ${renderAuditRowActionsCell(a, ux)}
            </div>
        </article>`;
    }).join("");
  }
  function applyAuditsListView() {
    const tbody = document.getElementById("auditsTableBody");
    const cardsWrap = document.getElementById("auditsCardsWrap");
    if (!tbody) return;
    closeAllAuditActionsMenus();
    syncAuditsListFilterControls();
    const totalLoaded = auditsListCache.length;
    const reviewCount = countAuditsNeedingAttention(
      auditsListFilter === "archive" ? auditsActiveTabCache : auditsListCache
    );
    updateAuditsFilterChrome(reviewCount, totalLoaded);
    if (totalLoaded === 0) {
      const emptyState = resolveAuditsListEmptyState();
      tbody.innerHTML = `
            <tr>
                <td colspan="${AUDITS_TABLE_COLSPAN}" class="audit-list-state-cell audit-list-state-cell--muted">
                    ${renderAuditsListEmptyHtml(emptyState)}
                </td>
            </tr>`;
      renderAuditsCards([], cardsWrap, auditsListToolbarFiltersActive() ? "toolbar" : "filter");
      updateAuditsListHint(0, 0);
      renderAuditsPagination({ total: 0, totalPages: 1, start: 0, end: 0, items: [] });
      runtimeBridge.applyRoleUiRestrictions?.();
      runtimeBridge.applyAdminUiSegmentation?.();
      return;
    }
    const filtered = filterAuditsForView(auditsListCache, auditsListFilter);
    const sorted = sortAuditsForDisplay(filtered, auditsListFilter);
    const page = paginateAudits(sorted);
    updateAuditsListHint(totalLoaded, filtered.length);
    renderAuditsPagination(page);
    if (!page.items.length) {
      const emptyState = resolveAuditsListEmptyState();
      tbody.innerHTML = `
            <tr>
                <td colspan="${AUDITS_TABLE_COLSPAN}" class="audit-list-state-cell audit-list-state-cell--muted">
                    ${renderAuditsListEmptyHtml(emptyState)}
                </td>
            </tr>`;
      renderAuditsCards([], cardsWrap, "filter");
    } else {
      tbody.innerHTML = page.items.map(renderAuditTableRow).join("");
      renderAuditsCards(page.items, cardsWrap, "none");
    }
    runtimeBridge.applyRoleUiRestrictions?.();
    runtimeBridge.applyAdminUiSegmentation?.();
    updateAuditsSortHeaderChrome();
  }
  async function loadAuditsList() {
    const tbody = document.getElementById("auditsTableBody");
    const cardsWrap = document.getElementById("auditsCardsWrap");
    const hint = document.getElementById("auditsListHint");
    if (!tbody) return;
    const savedFilter = sessionStorage.getItem(AUDITS_FILTER_STORAGE_KEY);
    if (savedFilter && AUDITS_LIST_FILTER_MODES.has(savedFilter)) {
      auditsListFilter = savedFilter;
    }
    const loadingHtml = `
        <div class="loader loader-dark audit-list-loader"></div>
        \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...`;
    tbody.innerHTML = `
        <tr>
            <td colspan="${AUDITS_TABLE_COLSPAN}" class="audit-list-state-cell">
                ${loadingHtml}
            </td>
        </tr>`;
    if (cardsWrap) {
      cardsWrap.innerHTML = `<div class="audit-list-card audit-list-loader-wrap">${loadingHtml}</div>`;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3e4);
    try {
      const response = await fetch(buildAuditsListUrl(), {
        headers: { "Accept": "application/json" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const detail = error.detail;
        let message = typeof detail === "string" ? detail : "";
        if (!message && response.status === 500) {
          message = "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 (500). \u0427\u0430\u0441\u0442\u043E: \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D\u043D\u0430\u044F \u0431\u0430\u0437\u0430 data/app.db \u2014 \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 Docker, \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 scripts/reset-dev-data.ps1 -Force \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0441\u0435\u0440\u0432\u0435\u0440.";
        }
        if (!message) {
          message = `\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 (${response.status})`;
        }
        throw new Error(message);
      }
      const audits = await response.json();
      const toolbarFiltered = auditsListToolbarFiltersActive();
      auditsListCache = audits;
      auditsListTotal = parseInt(response.headers.get("X-Total-Count") || String(audits.length), 10);
      if (auditsListFilter === "archive") {
        auditsArchiveTotal = auditsListTotal;
      } else if (!toolbarFiltered) {
        auditsActiveTabCache = audits;
        auditsActiveTotal = auditsListTotal;
      }
      if (!sessionStorage.getItem(AUDITS_FILTER_INITIALIZED_KEY)) {
        const reviewSource = toolbarFiltered ? auditsActiveTabCache : audits;
        const reviewCount = countAuditsNeedingAttention(reviewSource.length ? reviewSource : audits);
        if (reviewCount > 0) {
          auditsListFilter = "review";
          sessionStorage.setItem(AUDITS_FILTER_STORAGE_KEY, "review");
        }
        sessionStorage.setItem(AUDITS_FILTER_INITIALIZED_KEY, "1");
      }
      const finalizeListLoad = async () => {
        if (auditsListFilter !== "archive" && toolbarFiltered) {
          await refreshAuditsTabBaseline();
        } else if (auditsListFilter === "archive" && !auditsActiveTabCache.length) {
          await fetchAuditsActiveCount();
        }
        await fetchAuditsArchiveCount();
        applyAuditsListView();
      };
      await finalizeListLoad();
    } catch (error) {
      clearTimeout(timeoutId);
      auditsListCache = [];
      auditsListTotal = 0;
      const message = error.name === "AbortError" ? "\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D\u043E \u0432\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u0447\u0442\u043E \u0441\u0435\u0440\u0432\u0435\u0440 \u0437\u0430\u043F\u0443\u0449\u0435\u043D." : error.message || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430";
      renderAuditsListError(tbody, message, cardsWrap);
      const filterBar = document.getElementById("auditsListFilter");
      if (filterBar) filterBar.style.display = "none";
      if (hint) hint.style.display = "none";
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0441\u043F\u0438\u0441\u043A\u0430 \u0430\u0443\u0434\u0438\u0442\u043E\u0432: " + message, "danger");
    }
  }
  async function loadOpsAlerts() {
    const banner = document.getElementById("opsAlertBanner");
    if (!banner) return;
    try {
      const data = await apiRequest("/api/telemetry/ops?hours=24");
      const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
      if (!alerts.length) {
        banner.style.display = "none";
        banner.classList.remove("critical");
        banner.innerHTML = "";
        return;
      }
      const hasCritical = alerts.some((a) => String(a?.severity || "").toLowerCase() === "critical");
      banner.classList.toggle("critical", hasCritical);
      const failedLine = alerts.find((a) => /неуспешн/i.test(String(a.message || "")));
      const summary = normalizeOpsAlertSummary(
        failedLine?.message || alerts[0]?.message || "\u0415\u0441\u0442\u044C \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0435 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u044F"
      );
      banner.innerHTML = `
            <div class="ops-alert-compact">
                <span class="ops-alert-icon" aria-hidden="true">\u26A0</span>
                <p class="ops-alert-title">${escapeHtml(summary)}</p>
                <a class="ops-alert-link" href="/audit-runs?status=failed">\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u2192</a>
            </div>`;
      banner.style.display = "flex";
    } catch (_error) {
      banner.style.display = "none";
    }
  }
  var nichePresetsCache = null;
  async function ensureNichePresetsLoaded() {
    if (nichePresetsCache) return nichePresetsCache;
    try {
      nichePresetsCache = await apiRequest("/api/niche-presets");
    } catch (_e) {
      nichePresetsCache = { categories: [] };
    }
    return nichePresetsCache;
  }
  function nicheFormIds(mode) {
    const prefix = mode === "create" ? "create" : "edit";
    return {
      category: `${prefix}NicheCategory`,
      subcategory: `${prefix}NicheSubcategory`,
      hint: `${prefix}NicheSubnicheHint`,
      preview: `${prefix}NichePreview`
    };
  }
  function populateNicheCategorySelect(mode) {
    const ids = nicheFormIds(mode);
    const select = document.getElementById(ids.category);
    if (!select || !nichePresetsCache?.categories) return;
    const current = select.value;
    select.innerHTML = '<option value="">\u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u2014</option>' + nichePresetsCache.categories.map(
      (cat) => `<option value="${escapeHtml(cat.label)}">${escapeHtml(cat.label)}</option>`
    ).join("");
    if (current) select.value = current;
    updateNicheSubnicheUi(mode);
  }
  function updateNicheSubnicheUi(mode) {
    const ids = nicheFormIds(mode);
    const select = document.getElementById(ids.category);
    const hint = document.getElementById(ids.hint);
    const label = select?.value || "";
    const cat = (nichePresetsCache?.categories || []).find((c) => c.label === label);
    if (hint) {
      hint.textContent = cat?.subniche_placeholder || "\u0423\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u043F\u043E\u0434\u043D\u0438\u0448\u0443 \u0434\u043B\u044F \u0431\u043E\u043B\u0435\u0435 \u0442\u043E\u0447\u043D\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430";
    }
    updateNichePreview(mode);
  }
  function updateNichePreview(mode) {
    const ids = nicheFormIds(mode);
    const select = document.getElementById(ids.category);
    const sub = document.getElementById(ids.subcategory);
    const preview = document.getElementById(ids.preview);
    if (!preview) return;
    const cat = (select?.value || "").trim();
    const subVal = (sub?.value || "").trim();
    if (!cat && !subVal) {
      preview.style.display = "none";
      preview.textContent = "";
      return;
    }
    preview.style.display = "block";
    preview.textContent = cat && subVal ? `\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A: ${cat} / ${subVal}` : cat || subVal;
  }
  function fillEditClientForm(data) {
    const form = document.getElementById("editClientForm");
    if (!form || !data) return;
    form.querySelector("#editClientAuditId").value = data.audit_id;
    form.client_name.value = data.client_name || "";
    if (form.region) form.region.value = data.region || "";
    form.niche_category.value = data.niche_category || "";
    form.niche_subcategory.value = data.niche_subcategory || "";
    if (!data.niche_category && !data.niche_subcategory && data.niche_display) {
      const preview = document.getElementById("editNichePreview");
      if (preview) {
        preview.style.display = "block";
        preview.textContent = `Legacy-\u043D\u0438\u0448\u0430: \xAB${data.niche_display}\xBB. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E \u0438 \u043F\u043E\u0434\u043D\u0438\u0448\u0443 \u0434\u043B\u044F \u0443\u0442\u043E\u0447\u043D\u0435\u043D\u0438\u044F.`;
      }
    }
    form.website.value = data.website || "";
    form.goal.value = data.goal || "";
    form.comment.value = data.comment || "";
    updateNicheSubnicheUi("edit");
  }
  async function openEditClientModal(auditId) {
    if (!requireWriteAccess("\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0430")) return;
    const id = auditId || runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (!id) return;
    showLoader();
    try {
      await ensureNichePresetsLoaded();
      populateNicheCategorySelect("edit");
      const data = await apiRequest(`/api/audits/${id}/client`);
      fillEditClientForm(data);
      openModal("editClientModal");
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0430: " + error.message, "danger");
    } finally {
      hideLoader();
    }
  }
  async function saveEditClient() {
    if (!requireWriteAccess("\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0430")) return;
    const form = document.getElementById("editClientForm");
    if (!form) return;
    const auditId = form.querySelector("#editClientAuditId")?.value;
    if (!auditId) return;
    const formData = new FormData(form);
    const payload = {
      client_name: formData.get("client_name"),
      region: formData.get("region"),
      niche_category: formData.get("niche_category"),
      niche_subcategory: formData.get("niche_subcategory"),
      website: formData.get("website"),
      goal: formData.get("goal"),
      comment: formData.get("comment")
    };
    if (!String(payload.client_name || "").trim()) {
      showAlert("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0430", "warning");
      return;
    }
    showLoader();
    try {
      const updated = await apiRequest(`/api/audits/${auditId}/client`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      closeModal("editClientModal");
      const path = window.location.pathname;
      if (path === "/" || path === "/index.html") {
        loadAuditsList();
      } else {
        runtimeBridge.onClientSaved?.(auditId, updated);
      }
      showAlert("\u0414\u0430\u043D\u043D\u044B\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F: " + error.message, "danger");
    } finally {
      hideLoader();
    }
  }
  var clientContactsCache = [];
  var listPageContactAuditId = null;
  async function openContactModalFromList(auditId) {
    if (!requireWriteAccess("\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B \u043A\u043B\u0438\u0435\u043D\u0442\u0430")) return;
    listPageContactAuditId = auditId;
    showLoader();
    try {
      const contacts = await apiRequest(`/api/audits/${auditId}/contacts`);
      clientContactsCache = contacts || [];
      if (clientContactsCache.length > 0) {
        window.location.href = `/audits/${auditId}#client-contacts`;
        return;
      }
      fillContactForm(null);
      const title = document.getElementById("editContactModalTitle");
      if (title) title.textContent = "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043D\u0442\u0430\u043A\u0442";
      openModal("editContactModal");
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B: " + error.message, "danger");
    } finally {
      hideLoader();
    }
  }
  function renderClientContacts(contacts) {
    clientContactsCache = contacts || [];
    const wrap = document.getElementById("clientContactsList");
    if (!wrap) return;
    if (!clientContactsCache.length) {
      wrap.innerHTML = '<p class="muted">\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u044B. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u041B\u041F\u0420 \u0438\u043B\u0438 \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\u0430 \u2014 \u0434\u0430\u043D\u043D\u044B\u0435 \u043D\u0435 \u0443\u0445\u043E\u0434\u044F\u0442 \u0432 AI.</p>';
      return;
    }
    wrap.innerHTML = clientContactsCache.map((c) => {
      const lines = [
        c.phone ? `<div>\u0422\u0435\u043B.: ${escapeHtml(c.phone)}</div>` : "",
        c.email ? `<div>Email: ${escapeHtml(c.email)}</div>` : "",
        c.messenger ? `<div>\u041C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440: ${escapeHtml(c.messenger)}</div>` : "",
        c.comment ? `<div class="muted">${escapeHtml(c.comment)}</div>` : ""
      ].filter(Boolean).join("");
      return `
            <article class="client-contact-card">
                <div class="client-contact-head">
                    <div>
                        <span class="client-contact-name">${escapeHtml(c.name)}</span>
                        ${c.role ? `<span class="client-contact-role">${escapeHtml(c.role)}</span>` : ""}
                    </div>
                    <div class="client-contact-actions">
                        <button type="button" class="btn btn-outline btn-sm" onclick="openContactModal(${c.id})">\u0418\u0437\u043C.</button>
                        <button type="button" class="btn btn-outline btn-sm" onclick="deleteContact(${c.id})">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>
                    </div>
                </div>
                ${lines ? `<div class="client-contact-lines">${lines}</div>` : ""}
            </article>`;
    }).join("");
  }
  function fillContactForm(contact) {
    const form = document.getElementById("editContactForm");
    if (!form) return;
    form.name.value = contact?.name || "";
    form.role.value = contact?.role || "";
    form.phone.value = contact?.phone || "";
    form.email.value = contact?.email || "";
    form.messenger.value = contact?.messenger || "";
    form.comment.value = contact?.comment || "";
    document.getElementById("editContactId").value = contact?.id || "";
  }
  function openContactModal(contactId) {
    if (!requireWriteAccess("\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B \u043A\u043B\u0438\u0435\u043D\u0442\u0430")) return;
    const title = document.getElementById("editContactModalTitle");
    if (contactId) {
      const contact = clientContactsCache.find((c) => c.id === contactId);
      if (!contact) return;
      fillContactForm(contact);
      if (title) title.textContent = "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u043D\u0442\u0430\u043A\u0442";
    } else {
      fillContactForm(null);
      if (title) title.textContent = "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043D\u0442\u0430\u043A\u0442";
    }
    openModal("editContactModal");
  }
  async function refreshClientContacts() {
    const auditId = runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (!auditId) return [];
    const contacts = await apiRequest(`/api/audits/${auditId}/contacts`);
    const auditData2 = runtimeBridge.getAuditData?.();
    if (auditData2) {
      auditData2.contacts = contacts;
      auditData2.has_contacts = contacts.length > 0;
    }
    renderClientContacts(contacts);
    return contacts;
  }
  async function saveContact() {
    if (!requireWriteAccess("\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B \u043A\u043B\u0438\u0435\u043D\u0442\u0430")) return;
    const auditId = listPageContactAuditId || runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (!auditId) return;
    const form = document.getElementById("editContactForm");
    if (!form) return;
    const formData = new FormData(form);
    const payload = {
      name: formData.get("name"),
      role: formData.get("role"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      messenger: formData.get("messenger"),
      comment: formData.get("comment")
    };
    if (!String(payload.name || "").trim()) {
      showAlert("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043C\u044F \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u0430", "warning");
      return;
    }
    const contactId = formData.get("contact_id");
    showLoader();
    try {
      if (contactId) {
        await apiRequest(`/api/audits/${auditId}/contacts/${contactId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest(`/api/audits/${auditId}/contacts`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      closeModal("editContactModal");
      const fromList = Boolean(listPageContactAuditId);
      if (fromList) {
        listPageContactAuditId = null;
        await loadAuditsList();
      } else {
        await refreshClientContacts();
      }
      showAlert("\u041A\u043E\u043D\u0442\u0430\u043A\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u0430: " + error.message, "danger");
    } finally {
      hideLoader();
    }
  }
  async function deleteContact(contactId) {
    if (!requireWriteAccess("\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B \u043A\u043B\u0438\u0435\u043D\u0442\u0430")) return;
    const auditId = runtimeBridge.getCurrentAuditId() || runtimeBridge.getAuditIdFromUrl();
    if (!auditId || !contactId) return;
    const ok = await showConfirmDialog({
      title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043A\u043E\u043D\u0442\u0430\u043A\u0442",
      message: "\u041A\u043E\u043D\u0442\u0430\u043A\u0442 \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0451\u043D \u0438\u0437 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043A\u043B\u0438\u0435\u043D\u0442\u0430.",
      confirmText: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"
    });
    if (!ok) return;
    showLoader();
    try {
      await apiRequest(`/api/audits/${auditId}/contacts/${contactId}`, { method: "DELETE" });
      await refreshClientContacts();
      showAlert("\u041A\u043E\u043D\u0442\u0430\u043A\u0442 \u0443\u0434\u0430\u043B\u0451\u043D", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F: " + error.message, "danger");
    } finally {
      hideLoader();
    }
  }
  async function initNicheFormUi() {
    if (!document.getElementById("createNicheCategory") && !document.getElementById("editNicheCategory")) return;
    await ensureNichePresetsLoaded();
    if (document.getElementById("createNicheCategory")) populateNicheCategorySelect("create");
  }
  async function createAudit() {
    if (!requireWriteAccess("\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0430\u0443\u0434\u0438\u0442\u0430")) return;
    const form = document.getElementById("createAuditForm");
    const formData = new FormData(form);
    const data = {
      client_name: formData.get("client_name"),
      region: formData.get("region"),
      niche_category: formData.get("niche_category"),
      niche_subcategory: formData.get("niche_subcategory"),
      website: formData.get("website"),
      goal: formData.get("goal"),
      comment: formData.get("comment")
    };
    if (!data.client_name) {
      showAlert("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0430", "warning");
      return;
    }
    showLoader();
    try {
      await apiRequest("/api/audits/", {
        method: "POST",
        body: JSON.stringify(data)
      });
      closeModal("createAuditModal");
      form.reset();
      loadAuditsList();
      showAlert("\u0410\u0443\u0434\u0438\u0442 \u0441\u043E\u0437\u0434\u0430\u043D", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0430\u0443\u0434\u0438\u0442\u0430: " + error.message, "danger");
    } finally {
      hideLoader();
    }
  }
  function openAudit(id) {
    window.location.href = `/audits/${id}`;
  }
  async function runAnalysis(id) {
    if (!requireWriteAccess("\u0417\u0430\u043F\u0443\u0441\u043A \u0430\u043D\u0430\u043B\u0438\u0437\u0430")) return;
    if (!runtimeBridge.getPrivacySettings?.()) await runtimeBridge.loadPrivacySettings?.();
    const payload = await runtimeBridge.buildAnalysisPayload?.();
    if (!payload) return;
    showLoader();
    try {
      await apiRequest(`/api/audits/${id}/analyze/start`, { method: "POST", body: JSON.stringify(payload) });
      window.location.href = `/audits/${id}`;
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u043D\u0430\u043B\u0438\u0437\u0430: " + error.message, "danger");
      hideLoader();
    }
  }
  function previewAudit(id) {
    window.open(`/api/audits/${id}/export/html`, "_blank");
  }
  function exportAudit(id) {
    window.open(`/api/audits/${id}/export/pdf`, "_blank");
  }
  async function duplicateAudit(id) {
    if (!requireWriteAccess("\u0414\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0430\u0443\u0434\u0438\u0442\u0430")) return;
    try {
      const data = await apiRequest(`/api/audits/${id}/duplicate`, { method: "POST" });
      showAlert("\u041A\u043E\u043F\u0438\u044F \u0430\u0443\u0434\u0438\u0442\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430", "success");
      await loadAuditsList();
      if (data?.audit_id) openAudit(data.audit_id);
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0434\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F: " + error.message, "danger");
    }
  }
  async function toggleArchiveAudit(id, archive) {
    if (!requireWriteAccess("\u0410\u0440\u0445\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0430\u0443\u0434\u0438\u0442\u0430")) return;
    const ok = archive ? await showConfirmDialog({
      title: "\u0410\u0440\u0445\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u0443\u0434\u0438\u0442",
      message: "\u0410\u0443\u0434\u0438\u0442 \u0441\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u0438\u0437 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0433\u043E \u0441\u043F\u0438\u0441\u043A\u0430. \u0415\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u043D\u0430\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 \u0444\u0438\u043B\u044C\u0442\u0440 \xAB\u0410\u0440\u0445\u0438\u0432\xBB.",
      confirmText: "\u0410\u0440\u0445\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u0442\u044C"
    }) : true;
    if (!ok) return;
    try {
      await apiRequest(`/api/audits/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({ archived: archive })
      });
      showAlert(archive ? "\u0410\u0443\u0434\u0438\u0442 \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D" : "\u0410\u0443\u0434\u0438\u0442 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0451\u043D \u0438\u0437 \u0430\u0440\u0445\u0438\u0432\u0430", "success");
      loadAuditsList();
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F: " + error.message, "danger");
    }
  }
  async function deleteAudit(id) {
    if (!requireWriteAccess("\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0430\u0443\u0434\u0438\u0442\u0430")) return;
    const ok = await showConfirmDialog({
      title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u0443\u0434\u0438\u0442",
      message: "\u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043E\u0431\u0440\u0430\u0442\u0438\u043C\u043E. \u0410\u0443\u0434\u0438\u0442 \u0438 \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u044B.",
      confirmText: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/audits/${id}`, { method: "DELETE" });
      showAlert("\u0410\u0443\u0434\u0438\u0442 \u0443\u0434\u0430\u043B\u0451\u043D", "success");
      loadAuditsList();
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F: " + error.message, "danger");
    }
  }
  var auditTemplatesCache = [];
  async function loadAuditTemplates() {
    const select = document.getElementById("auditTemplateSelect");
    if (!select) return;
    try {
      auditTemplatesCache = await apiRequest("/api/templates");
      const current = select.value;
      select.innerHTML = '<option value="">\u0411\u0435\u0437 \u0448\u0430\u0431\u043B\u043E\u043D\u0430</option>' + auditTemplatesCache.map(
        (t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`
      ).join("");
      select.value = current;
    } catch (error) {
      console.warn("Templates load error:", error);
    }
  }
  function applyAuditTemplate(templateId) {
    const box = document.getElementById("templateChecklist");
    if (!templateId) {
      if (box) box.style.display = "none";
      return;
    }
    const template = auditTemplatesCache.find((t) => t.id === templateId);
    if (!template) return;
    const form = document.getElementById("createAuditForm");
    if (form) {
      const goal = form.querySelector('[name="goal"]');
      const comment = form.querySelector('[name="comment"]');
      const category = form.querySelector('[name="niche_category"]');
      const sub = form.querySelector('[name="niche_subcategory"]');
      if (template.niche && category && !category.value) {
        const match = (nichePresetsCache?.categories || []).find(
          (c) => c.label.toLowerCase() === String(template.niche).toLowerCase()
        );
        if (match) {
          category.value = match.label;
          updateNicheSubnicheUi("create");
        } else if (sub && !sub.value) {
          sub.value = template.niche;
          updateNichePreview("create");
        }
      }
      if (goal && !goal.value) goal.value = template.goal || "";
      if (comment && !comment.value) comment.value = template.starter_note || "";
    }
    if (box) {
      box.style.display = "block";
      box.innerHTML = `<strong>${escapeHtml(template.name)}</strong><ul>${(template.checklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }
  }

  // src/audit-detail/direct-copy.js
  var DIRECT_COPY = {
    product: "\u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442",
    productTab: "\u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442",
    healthScoreTitle: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430",
    healthScoreShort: "\u043E\u0446\u0435\u043D\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430",
    healthScoreLabel: "\u041E\u0446\u0435\u043D\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430",
    healthScoreTooltip: "\u041E\u0446\u0435\u043D\u043A\u0430 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 \u043F\u043E \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430\u043C Excel (\u0448\u043A\u0430\u043B\u0430 0\u2013100)",
    excelSource: "\u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0438 Excel \u0438\u0437 \u0414\u0438\u0440\u0435\u043A\u0442\u0430",
    excelSourceShort: "Excel \u0438\u0437 \u0414\u0438\u0440\u0435\u043A\u0442\u0430",
    sliceTitle: "\u0421\u0440\u0435\u0437 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442",
    scrollToDirectRisksBtn: "\u041A \u0440\u0438\u0441\u043A\u0430\u043C Excel",
    openDirectExcelRiskBtn: "\u041A \u0440\u0438\u0441\u043A\u0443 \u0432 Excel",
    recommendationsJumpBtn: "\u041A \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F\u043C",
    risksLabel: "\u0420\u0438\u0441\u043A\u0438 \u0414\u0438\u0440\u0435\u043A\u0442\u0430",
    syncRisksOnDirectPage: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0440\u0438\u0441\u043A\u0438 \u0438\u0437 Excel",
    aiEnrichmentTitle: "AI \u0438 \u0440\u0438\u0441\u043A\u0438 Excel",
    aiEnrichmentLine(enriched, total) {
      return `\u0421\u0432\u044F\u0437\u0430\u043D\u043E \u0441 AI: ${enriched} \u0438\u0437 ${total}`;
    },
    nextStepTitle: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433",
    nextStepBeforeLead: "\u0426\u0438\u0444\u0440\u044B \u0438 \u0433\u0440\u0430\u0444\u0438\u043A \u0432\u044B\u0448\u0435 \u2014 \u0438\u0437 Excel. \u0414\u0430\u043B\u044C\u0448\u0435 AI \u0434\u043E\u043F\u0438\u0448\u0435\u0442 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u044F \u043A \u0440\u0438\u0441\u043A\u0430\u043C \u0438 \u0441\u043E\u0431\u0435\u0440\u0451\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043E\u0442\u0447\u0451\u0442\u0430.",
    nextStepBeforeFoot: "\u041F\u043E\u0441\u043B\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0430: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0412\u044B\u0432\u043E\u0434\u044B\xBB (\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430), \u0437\u0430\u0442\u0435\u043C \xAB\u041E\u0442\u0447\u0451\u0442\xBB (PDF).",
    checkBeforeReportTitle: "\u0427\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C",
    stepResultsTitle: "\u0412\u044B\u0432\u043E\u0434\u044B",
    stepResultsHint: "AI-\u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u044F \u043A \u0432\u0430\u0436\u043D\u044B\u043C \u0440\u0438\u0441\u043A\u0430\u043C \u0438\u0437 Excel",
    stepResultsBtn: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u0412\u044B\u0432\u043E\u0434\u044B\xBB",
    stepReportTitle: "\u041E\u0442\u0447\u0451\u0442",
    stepReportHint: "\u0418\u0442\u043E\u0433 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430 \u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 PDF",
    stepReportBtn: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u041E\u0442\u0447\u0451\u0442\xBB",
    rerunAnalysisBtn: "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI",
    rerunAnalysisFoot: "\u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u043C\u0435\u043D\u044F\u043B\u0438 Excel \u0438\u043B\u0438 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043D\u0430 \xAB\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438\xBB",
    dataFlowStep1: "\u0414\u0438\u0440\u0435\u043A\u0442",
    dataFlowStep2: "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438",
    dataFlowStep3Run: "\u0417\u0430\u043F\u0443\u0441\u043A AI",
    dataFlowStep3Rerun: "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A AI",
    dataFlowStep3Running: "AI\u2026",
    dataFlowDirectHint: "\u0428\u0430\u0433 3 \xAB\u0417\u0430\u043F\u0443\u0441\u043A AI\xBB \u2014 \u0432 \u043F\u043E\u043B\u043E\u0441\u0435 \u0448\u0430\u0433\u043E\u0432 \u043D\u0430\u0434 \u0432\u043A\u043B\u0430\u0434\u043A\u0430\u043C\u0438.",
    directRisksOnPageHint: "\u0421\u043F\u0438\u0441\u043E\u043A \u0440\u0438\u0441\u043A\u043E\u0432 \u0438\u0437 Excel \u2014 \u0432 \u0431\u043B\u043E\u043A\u0435 \u043D\u0438\u0436\u0435 \u043D\u0430 \u044D\u0442\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435.",
    sourcesAiPanelLead: "\u0413\u0430\u043B\u043E\u0447\u043A\u0430 \xAB\u0412 AI\xBB \u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435. Excel \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438.",
    sourcesAiCount(included, total) {
      return `\u0412 AI: ${included} / ${total}`;
    },
    materialAiCheckboxLabel: "\u0412 AI",
    materialAiStatusAccounted: "\u0423\u0447\u0442\u0451\u043D \u0432 AI",
    materialAiStatusStale: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u043E",
    materialAiStatusPending: "\u0411\u0443\u0434\u0435\u0442 \u0432 AI",
    materialAiStatusQueue: "\u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 AI",
    materialAiStatusDirect: "\u0427\u0435\u0440\u0435\u0437 \u0414\u0438\u0440\u0435\u043A\u0442",
    materialAiStatusDirectAccounted: "\u0414\u0438\u0440\u0435\u043A\u0442 \xB7 \u0432 AI",
    materialAiStatusDirectStale: "\u0414\u0438\u0440\u0435\u043A\u0442 \xB7 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 AI",
    materialAiFilterAll: "\u0412\u0441\u0435",
    materialAiFilterInAi: "\u0412 AI",
    materialAiFilterOutAi: "\u041D\u0435 \u0432 AI",
    materialAiFilterAccounted: "\u0423\u0447\u0442\u0435\u043D\u044B",
    materialAiFilterStale: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u044B",
    materialAiFilterLead: "\u0424\u0438\u043B\u044C\u0442\u0440 \u043F\u043E \u0443\u0447\u0430\u0441\u0442\u0438\u044E \u0432 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u043C AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0435",
    materialAiStatusTooltip: {
      accounted: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0431\u044B\u043B \u0432 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u043C \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u043C AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0435 \u0438 \u043D\u0435 \u043C\u0435\u043D\u044F\u043B\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043D\u0435\u0433\u043E.",
      stale: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0438\u0437\u043C\u0435\u043D\u0451\u043D \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E AI \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0430\u043D\u0430\u043B\u0438\u0437.",
      pending: "AI \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u043B\u0438 \u2014 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043F\u043E\u0439\u0434\u0451\u0442 \u043F\u0440\u0438 \u043F\u0435\u0440\u0432\u043E\u043C run.",
      queue: "\u041E\u0442\u043C\u0435\u0447\u0435\u043D \xAB\u0412 AI\xBB, \u043D\u043E \u0432 \u043F\u0440\u043E\u0448\u043B\u044B\u0439 run \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u043B\u0441\u044F (\u0438\u043B\u0438 \u0431\u044B\u043B \u0438\u0441\u043A\u043B\u044E\u0447\u0451\u043D).",
      direct: "\u0426\u0438\u0444\u0440\u044B Excel \u0438\u0434\u0443\u0442 \u0432 AI \u0441 \u0432\u043A\u043B\u0430\u0434\u043A\u0438 \xAB\u0414\u0438\u0440\u0435\u043A\u0442\xBB, \u043D\u0435 \u0442\u0435\u043A\u0441\u0442\u043E\u043C \u0444\u0430\u0439\u043B\u0430 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435.",
      direct_accounted: "\u0421\u0440\u0435\u0437 \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u0443\u0447\u0442\u0451\u043D \u0432 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u043C AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0435.",
      direct_stale: "\u0424\u0430\u0439\u043B \u0438\u043B\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u043C\u0435\u043D\u044F\u043B\u0438\u0441\u044C \u043F\u043E\u0441\u043B\u0435 AI."
    },
    materialAiHintLabel: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0434\u043B\u044F AI (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)",
    materialAiHintPlaceholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u044D\u0442\u043E \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0420\u0421\u042F \u0437\u0430 \u043C\u0430\u0440\u0442, \u0441\u043C\u043E\u0442\u0440\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438 \u0441 \u043C\u0435\u0442\u043A\u043E\u0439 \xAB\u0431\u0440\u0435\u043D\u0434\xBB",
    materialAiHintSave: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0443",
    materialAiHintSaved: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430",
    screenshotRerunOcr: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 (OCR)",
    screenshotRerunOcrOk: "\u0422\u0435\u043A\u0441\u0442 \u0441\u043E \u0441\u043A\u0440\u0438\u043D\u0430 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D",
    screenshotRerunOcrFail: "OCR \u043D\u0435 \u0441\u0440\u0430\u0431\u043E\u0442\u0430\u043B \u2014 \u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u043A\u0440\u0438\u043D \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u0432 \xAB\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C\xBB",
    screenshotReocrAll: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C \u0432\u0441\u0435 \u0441\u043A\u0440\u0438\u043D\u044B",
    screenshotReocrAllOk(n, total) {
      return `OCR: \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043E ${n} \u0438\u0437 ${total} \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432`;
    },
    screenshotReocrAllPartial(ok, fail) {
      return `OCR: ${ok} \u0443\u0441\u043F\u0435\u0448\u043D\u043E, ${fail} \u0431\u0435\u0437 \u0442\u0435\u043A\u0441\u0442\u0430 \u2014 \u0434\u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E`;
    },
    materialDrawerSoftReview: "AI \u0443\u0447\u0442\u0451\u0442 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B; \u043F\u0440\u0438 \u0441\u043E\u043C\u043D\u0435\u043D\u0438\u044F\u0445 \u043F\u043E\u043C\u0435\u0442\u0438\u0442 \u0432\u044B\u0432\u043E\u0434\u044B \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443.",
    openResultsRisksBtn: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u0412\u044B\u0432\u043E\u0434\u044B\xBB",
    openExcelBtn: "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 Excel",
    openExcelBtnTitle: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0439 \u0444\u0430\u0439\u043B Excel",
    aiFindingLinkBtn: "AI-\u0432\u044B\u0432\u043E\u0434 \u2192",
    directRiskLinkBtn: "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0440\u0438\u0441\u043A \u043D\u0430 \u0414\u0438\u0440\u0435\u043A\u0442 \u2192",
    filterNoAiEnrichment: "\u0411\u0435\u0437 AI-\u043E\u0431\u043E\u0433\u0430\u0449\u0435\u043D\u0438\u044F",
    risksSyncedFromExcel: "\u0420\u0438\u0441\u043A\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B \u0438\u0437 Excel.",
    promptRunAnalysisAfterExcel: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0434\u043B\u044F \u043E\u0431\u043E\u0433\u0430\u0449\u0435\u043D\u0438\u044F \u0440\u0438\u0441\u043A\u043E\u0432 Excel?",
    chatChipLabel: "\u041F\u043E\u044F\u0441\u043D\u0438 \u043E\u0446\u0435\u043D\u043A\u0443 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430",
    prePdfConflictBadge: "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442: \u0414\u0438\u0440\u0435\u043A\u0442 \u0438 AI",
    prePdf10SecIntro: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0437\u0430 10 \u0441\u0435\u043A\u0443\u043D\u0434 (Excel \u2014 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0446\u0438\u0444\u0440):",
    prePdf10SecItems: [
      "\u041F\u0435\u0440\u0438\u043E\u0434 \u0432 AI-summary \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u043C \u0441\u0440\u0435\u0437\u0430 \u0414\u0438\u0440\u0435\u043A\u0442\u0430.",
      "\u041B\u0438\u0434\u044B \u0432 AI-summary \u043D\u0435 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u0440\u0435\u0447\u0430\u0442 \u0447\u0438\u0441\u043B\u0430\u043C \u0438\u0437 Excel.",
      "CPL \u0432 AI-summary \u043D\u0435 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u0440\u0435\u0447\u0438\u0442 \u0434\u0430\u043D\u043D\u044B\u043C \u0414\u0438\u0440\u0435\u043A\u0442\u0430.",
      "\u0411\u044E\u0434\u0436\u0435\u0442 \u0432 AI-summary \u043D\u0435 \u043F\u043E\u0434\u043C\u0435\u043D\u044F\u0435\u0442 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0438\u0437 Excel."
    ],
    findingSource: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043A\u043B\u0438\u0435\u043D\u0442\u0430 + AI",
    dataSliceReady(months) {
      return `${months} \u043C\u0435\u0441. \u0432 \u0441\u0440\u0435\u0437\u0435 ${this.product}.`;
    },
    healthMissing() {
      return "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 Excel-\u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0443 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438 \u0438\u0437 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u0437\u0430 \u043D\u0443\u0436\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434.";
    },
    uploadHeroTitle: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 Excel \u0438\u0437 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442\u0430",
    uploadHeroHint: "\u041E\u0431\u044B\u0447\u043D\u043E \u044D\u0442\u043E \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434 (\u0444\u0430\u0439\u043B \u0432\u0438\u0434\u0430 2026-01-01_2026-05-31_\u2026.xlsx). \u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0433\u0440\u0430\u0444\u0438\u043A\u0438 \u0438 \u043E\u0446\u0435\u043D\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430.",
    uploadHeroBtn: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0444\u0430\u0439\u043B Excel",
    uploadHeroSecondary: "\u0421\u043A\u0440\u0438\u043D \u0438\u043B\u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u2014 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438\xBB",
    sliceLoaded(months) {
      return `\u0421\u0440\u0435\u0437 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D (${months} \u043C\u0435\u0441.) \u2014 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \xAB${this.productTab}\xBB, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C ${this.healthScoreShort}.`;
    },
    healthCabinetHint() {
      return `\u041F\u043E ${this.excelSource}.`;
    },
    leadsFormula: "\u043B\u0438\u0434\u044B = \u0444\u043E\u0440\u043C\u044B + \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u044B",
    chartsNote: "\u041F\u043E\u043C\u0435\u0441\u044F\u0447\u043D\u0430\u044F \u0442\u0430\u0431\u043B\u0438\u0446\u0430 \u043D\u0438\u0436\u0435. \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u0432 KPI \u2014 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430\xBB.",
    chartsNoteReport: "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u0432 KPI \u2014 \u0431\u043B\u043E\u043A \u043D\u0438\u0436\u0435 \u043D\u0430 \u044D\u0442\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435.",
    dynamicsLeadTitle: "\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 KPI",
    dynamicsLeadHint: "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u0432 \u043C\u0435\u0442\u0440\u0438\u043A. \u041E\u0446\u0435\u043D\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 \u0438 \u0440\u0438\u0441\u043A\u0438 Excel \u2014 \xAB\u0414\u0430\u043D\u043D\u044B\u0435 \u2192 \u0414\u0438\u0440\u0435\u043A\u0442\xBB.",
    healthReportRules(rulesCount) {
      return `\u0412\u0437\u0432\u0435\u0448\u0435\u043D\u043D\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430 \u043F\u043E 5 \u0437\u043E\u043D\u0430\u043C (${this.excelSourceShort}). \u0421\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u043E\u043A: ${rulesCount}.`;
    },
    healthExplainQuestion: "\u041F\u043E\u044F\u0441\u043D\u0438 \u043E\u0446\u0435\u043D\u043A\u0443 \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430: \u043F\u043E\u0447\u0435\u043C\u0443 \u0442\u0430\u043A\u043E\u0439 \u0431\u0430\u043B\u043B \u0438 \u0447\u0442\u043E \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0432 \u043F\u0435\u0440\u0432\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C?",
    syncRisksSuccess(count) {
      return `\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0440\u0438\u0441\u043A\u043E\u0432 \u0414\u0438\u0440\u0435\u043A\u0442\u0430: ${count}. \u0421\u043C. \u0431\u043B\u043E\u043A \xAB${this.risksLabel}\xBB \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB${this.productTab}\xBB.`;
    },
    prePdfConsistencyHint: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0446\u0435\u043D\u043A\u0443 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 \u0438 AI-summary. \u0415\u0441\u043B\u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u043B\u0438\u0441\u044C \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0438\u043B\u0438 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0432 \u0447\u0430\u0442\u0435.",
    productTabWithScore(score) {
      return `${this.productTab} (${score}/100)`;
    }
  };
  function hasDirectExcelSlice(data) {
    const da = data?.direct_analytics;
    if (!da) return false;
    if ((da.monthly || []).length > 0) return true;
    const totals = da.totals || {};
    if (Number(totals.cost || 0) > 0) return true;
    return (da.campaigns || []).length > 0;
  }

  // src/audit-detail/direct-enrichment-ux.js
  function directRiskRefKey(ref) {
    if (!ref?.kind || ref.id == null) return "";
    return `${ref.kind}:${ref.id}`;
  }
  function buildDirectRiskCatalogFromHealth(health) {
    if (!health) return [];
    const catalog = [];
    const seen = /* @__PURE__ */ new Set();
    for (const template of health.template_findings || []) {
      const id = String(template.template_id || "").trim();
      if (!id) continue;
      const key = `template:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      catalog.push({
        direct_risk_ref: { kind: "template", id },
        title: template.title || ""
      });
    }
    for (const rule of health.performance_issues || []) {
      if (rule.zone === "coverage") continue;
      if (!["critical", "high"].includes(rule.severity)) continue;
      if (rule.id == null) continue;
      const key = `rule:${rule.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      catalog.push({
        direct_risk_ref: { kind: "rule", id: String(rule.id) },
        title: rule.title || ""
      });
    }
    return catalog;
  }
  function isDirectHealthFinding(f) {
    if (!f) return false;
    if (f.finding_source === "direct_health") return true;
    if (f.original_ai_output?.source === "direct_health") return true;
    if ((f.evidence || []).some((e) => e?.source === "direct_health")) return true;
    return false;
  }
  function getDirectRiskRef(f) {
    if (!f) return null;
    const fromField = f.direct_risk_ref;
    if (fromField?.kind && fromField.id != null) {
      return { kind: String(fromField.kind), id: String(fromField.id) };
    }
    const fromOrig = f.original_ai_output?.direct_risk_ref;
    if (fromOrig?.kind && fromOrig.id != null) {
      return { kind: String(fromOrig.kind), id: String(fromOrig.id) };
    }
    const ev = (f.evidence || []).find((e) => e?.source === "direct_health");
    if (ev?.kind === "template" && ev.template_id) {
      return { kind: "template", id: String(ev.template_id) };
    }
    if (ev?.kind === "rule" && ev.rule_id != null) {
      return { kind: "rule", id: String(ev.rule_id) };
    }
    return null;
  }
  function isAiInterpretationFinding(f) {
    return Boolean(f) && !isDirectHealthFinding(f) && Boolean(getDirectRiskRef(f));
  }
  function isStubEnrichmentFinding(f) {
    if (!f || isDirectHealthFinding(f)) return false;
    const orig = f.original_ai_output || {};
    if (orig.enrichment_status === "stub" || f.enrichment_status === "stub") return true;
    return Boolean(f.needs_review && /AI не детализировал/i.test(String(f.review_reason || "")));
  }
  function hasCompletedAnalysis(data) {
    const ws = data?.workflow_state || {};
    if (ws.analysis_running || data?.status === "in_progress") return false;
    return ws.state === "ANALYSIS_DONE" || ws.state === "REPORT_READY" || data?.status === "completed";
  }
  function deriveDirectEnrichmentFromFindings(data, catalog) {
    const total = catalog.length;
    const covered = /* @__PURE__ */ new Set();
    let stubs = 0;
    for (const f of data?.findings || []) {
      if (!isAiInterpretationFinding(f)) continue;
      const key = directRiskRefKey(getDirectRiskRef(f));
      if (key) covered.add(key);
      if (isStubEnrichmentFinding(f)) stubs += 1;
    }
    const enriched = covered.size;
    return {
      direct_risks_total: total,
      enriched_count: enriched,
      stubs_created: stubs,
      coverage_percent: total ? Math.round(100 * enriched / total) : 100
    };
  }
  function resolveDirectEnrichment(data) {
    const api = data?.direct_enrichment;
    const health = data?.direct_analytics?.health;
    const catalog = buildDirectRiskCatalogFromHealth(health);
    if (api && typeof api === "object") {
      const total = Number(api.direct_risks_total ?? catalog.length);
      const enriched = Number(api.enriched_count ?? 0);
      const stubs = Number(api.stubs_created ?? 0);
      return {
        direct_risks_total: total,
        enriched_count: enriched,
        stubs_created: stubs,
        coverage_percent: Number(api.coverage_percent ?? (total ? Math.round(100 * enriched / total) : 100))
      };
    }
    return deriveDirectEnrichmentFromFindings(data, catalog);
  }
  function goToDirectResultsRisks() {
    runtimeBridge.switchTab?.("results");
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        runtimeBridge.scrollToDirectRisks?.();
      }, 120);
    });
  }
  function renderDirectStepRow(num, title, hint, btnHtml) {
    return `
        <div class="direct-steps-flow-item">
            <span class="direct-steps-flow-num" aria-hidden="true">${num}</span>
            <div class="direct-steps-flow-body">
                <strong>${escapeHtml(title)}</strong>
                <p class="muted direct-steps-flow-hint">${escapeHtml(hint)}</p>
                ${btnHtml}
            </div>
        </div>`;
  }
  function renderDirectStepsCard(data) {
    const ws = data?.workflow_state || {};
    const running = ws.analysis_running || data?.status === "in_progress";
    const analysisDone = hasCompletedAnalysis(data);
    const ui = data?.workflow_ui?.primary_button || {};
    if (!analysisDone) {
      let actionHtml;
      if (running) {
        actionHtml = `<p class="muted">${escapeHtml(DIRECT_COPY.dataFlowStep3Running)} \u2014 \u0448\u0430\u0433 3 \u0432 \u043F\u043E\u043B\u043E\u0441\u0435 \u0441\u0432\u0435\u0440\u0445\u0443.</p>`;
      } else if (document.getElementById("dataSubtabRunAi")) {
        const disabled = ui.enabled === false;
        const warn = disabled && ui.reason_disabled ? `<p class="direct-steps-warn muted">${escapeHtml(ui.reason_disabled)}</p>` : "";
        actionHtml = `<p class="muted">${escapeHtml(DIRECT_COPY.dataFlowDirectHint)}</p>${warn}`;
      } else {
        const disabled = ui.enabled === false;
        const title = escapeHtml(ui.reason_disabled || "");
        actionHtml = `<button type="button" class="btn btn-success btn-lg" onclick="runAnalysis()"${disabled ? " disabled" : ""}${title ? ` title="${title}"` : ""}>\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437</button>`;
        if (disabled && title) {
          actionHtml += `<p class="direct-steps-warn muted">${title}</p>`;
        }
      }
      return `
        <div id="direct-slice-ai-enrichment" class="direct-steps-card">
            <p class="direct-steps-title">${escapeHtml(DIRECT_COPY.nextStepTitle)}</p>
            <p class="muted direct-steps-lead">${escapeHtml(DIRECT_COPY.nextStepBeforeLead)}</p>
            <div class="direct-steps-primary-action">${actionHtml}</div>
            <p class="muted direct-steps-foot">${escapeHtml(DIRECT_COPY.nextStepBeforeFoot)}</p>
        </div>`;
    }
    const cov = resolveDirectEnrichment(data);
    const total = cov.direct_risks_total || 0;
    const enriched = cov.enriched_count;
    const statusClass = total > 0 && enriched >= total ? "direct-steps-card--ok" : "direct-steps-card--warn";
    const progressHint = total ? `\u0421\u0432\u044F\u0437\u0430\u043D\u043E \u0441 AI: ${enriched} \u0438\u0437 ${total} \u0432\u0430\u0436\u043D\u044B\u0445 \u0440\u0438\u0441\u043A\u043E\u0432.` : "";
    const rerunFootExtra = document.getElementById("dataSubtabRunAi") ? " \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A \u2014 \u0448\u0430\u0433 <strong>3</strong> \u0432 \u043F\u043E\u043B\u043E\u0441\u0435 \u0441\u0432\u0435\u0440\u0445\u0443." : `<button type="button" class="btn btn-link btn-sm direct-steps-rerun" onclick="rerunAuditAnalysis()" title="${escapeHtml(DIRECT_COPY.rerunAnalysisFoot)}">${escapeHtml(DIRECT_COPY.rerunAnalysisBtn)}</button>
                <span class="muted"> \u2014 ${escapeHtml(DIRECT_COPY.rerunAnalysisFoot)}</span>`;
    return `
        <div id="direct-slice-ai-enrichment" class="direct-steps-card ${statusClass}">
            <p class="direct-steps-title">${escapeHtml(DIRECT_COPY.checkBeforeReportTitle)}</p>
            ${progressHint ? `<p class="muted direct-steps-lead">${escapeHtml(progressHint)}</p>` : ""}
            <div class="direct-steps-flow">
                ${renderDirectStepRow(
      1,
      DIRECT_COPY.stepResultsTitle,
      DIRECT_COPY.stepResultsHint,
      `<button type="button" class="btn btn-primary btn-sm" onclick="goToDirectResultsRisks()">${escapeHtml(DIRECT_COPY.stepResultsBtn)}</button>`
    )}
                ${renderDirectStepRow(
      2,
      DIRECT_COPY.stepReportTitle,
      DIRECT_COPY.stepReportHint,
      `<button type="button" class="btn btn-outline btn-sm" onclick="switchTab('report')">${escapeHtml(DIRECT_COPY.stepReportBtn)}</button>`
    )}
            </div>
            <p class="muted direct-steps-foot">${escapeHtml(DIRECT_COPY.directRisksOnPageHint)}${rerunFootExtra}</p>
        </div>`;
  }
  function openFindingsStubEnrichment() {
    const data = runtimeBridge.getAuditData?.() || null;
    const stubs = (data?.findings || []).filter(isStubEnrichmentFinding);
    const missing = Math.max(
      0,
      (resolveDirectEnrichment(data).direct_risks_total || 0) - (resolveDirectEnrichment(data).enriched_count || 0)
    );
    runtimeBridge.switchTab?.("results");
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (stubs.length) {
          const target = document.getElementById(`finding-${stubs[0].id}`) || document.querySelector(".finding-item--enrichment-stub");
          target?.scrollIntoView({ behavior: "smooth", block: "start" });
          target?.classList.add("direct-slice-highlight");
          window.setTimeout(() => target?.classList.remove("direct-slice-highlight"), 2200);
          return;
        }
        if (missing > 0) {
          runtimeBridge.scrollToPendingFindings?.();
          return;
        }
        runtimeBridge.scrollToPendingFindings?.();
      }, 120);
    });
  }
  function getCatalogRefsWithoutAi(data) {
    const catalog = buildDirectRiskCatalogFromHealth(data?.direct_analytics?.health);
    const covered = /* @__PURE__ */ new Set();
    for (const f of data?.findings || []) {
      if (!isAiInterpretationFinding(f)) continue;
      const key = directRiskRefKey(getDirectRiskRef(f));
      if (key) covered.add(key);
    }
    return catalog.filter((entry) => {
      const key = directRiskRefKey(entry.direct_risk_ref);
      return key && !covered.has(key);
    });
  }

  // src/audit-detail/data-tab-ux.js
  var DATA_SUBTAB_KEY = "ppc_data_subtab";
  var activeDataSubtab = "direct";
  var MATERIAL_GROUP_ORDER = [
    { id: "documents", label: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u0438 Excel", types: ["document", "table"] },
    { id: "screenshots", label: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B", types: ["screenshot", "screenshot_ocr"] },
    { id: "notes", label: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438 \u0438 \u0430\u0443\u0434\u0438\u043E", types: ["text_note", "audio", "audio_transcript"] },
    { id: "other", label: "\u041F\u0440\u043E\u0447\u0435\u0435", types: [] },
    { id: "system", label: "\u0421\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0435", types: [], system: true }
  ];
  var materialsSearchQuery = "";
  var sourcesAiFilter = "all";
  var lastMaterialsPayload = null;
  var SOURCES_AI_FILTERS = [
    { id: "all", labelKey: "materialAiFilterAll" },
    { id: "in_ai", labelKey: "materialAiFilterInAi" },
    { id: "out_ai", labelKey: "materialAiFilterOutAi" },
    { id: "accounted", labelKey: "materialAiFilterAccounted" },
    { id: "stale", labelKey: "materialAiFilterStale" }
  ];
  var TYPE_LABELS = {
    text_note: "\u0417\u0430\u043C\u0435\u0442\u043A\u0430",
    audio: "\u0410\u0443\u0434\u0438\u043E",
    audio_transcript: "\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430",
    screenshot: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442",
    screenshot_ocr: "OCR",
    manual_metrics: "\u041C\u0435\u0442\u0440\u0438\u043A\u0438",
    table: "\u0422\u0430\u0431\u043B\u0438\u0446\u0430",
    document: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442"
  };
  var MATERIAL_CARD_THEME = {
    document: { accent: "var(--accent-doc)", label: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442" },
    table: { accent: "var(--accent-doc)", label: "\u0422\u0430\u0431\u043B\u0438\u0446\u0430" },
    screenshot: { accent: "var(--primary)", label: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442" },
    text_note: { accent: "var(--accent-note)", label: "\u0417\u0430\u043C\u0435\u0442\u043A\u0430" },
    audio: { accent: "var(--accent-audio)", label: "\u0410\u0443\u0434\u0438\u043E" },
    audio_transcript: { accent: "var(--accent-audio)", label: "\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430" }
  };
  function isDirectDataSubtabActive() {
    const pane = document.getElementById("dataPaneDirect");
    return Boolean(pane && !pane.hidden && pane.classList.contains("is-active"));
  }
  function isSourcesDataSubtabActive() {
    const pane = document.getElementById("dataPaneSources");
    return Boolean(pane && !pane.hidden && pane.classList.contains("is-active"));
  }
  function findScreenshotOcrSibling(materials, screenshot) {
    if (!screenshot || screenshot.type !== "screenshot") return null;
    const label = `OCR/\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: ${screenshot.title || ""}`;
    return (materials || []).find((o) => o.type === "screenshot_ocr" && o.title === label) || null;
  }
  function switchDataSubtab(name) {
    const normalized = name === "now" ? "direct" : name;
    const allowed = ["sources", "direct"];
    const tab = allowed.includes(normalized) ? normalized : "direct";
    activeDataSubtab = tab;
    try {
      sessionStorage.setItem(DATA_SUBTAB_KEY, tab);
    } catch (_e) {
    }
    document.querySelectorAll("[data-flow-tab]").forEach((btn) => {
      const match = btn.getAttribute("data-flow-tab") === tab;
      btn.classList.toggle("is-active", match);
      btn.setAttribute("aria-selected", match ? "true" : "false");
    });
    const panes = {
      sources: document.getElementById("dataPaneSources"),
      direct: document.getElementById("dataPaneDirect")
    };
    Object.entries(panes).forEach(([key, el]) => {
      if (!el) return;
      const on = key === tab;
      el.classList.toggle("is-active", on);
      el.hidden = !on;
    });
    runtimeBridge.renderDataIssues?.();
    const data = runtimeBridge.getAuditData?.();
    if (data) {
      runtimeBridge.renderGuidedFirstRun?.(data);
      updateDataSubtabsFlow(data);
      if (tab === "sources") {
        updateSourcesToolbar((data.materials || []).filter((m) => m.type !== "manual_metrics"));
      }
    }
  }
  function restoreDataSubtab(data) {
    const hasDirect = hasDirectExcelSlice(data);
    try {
      const saved = sessionStorage.getItem(DATA_SUBTAB_KEY);
      if (saved && ["sources", "direct", "now"].includes(saved)) {
        activeDataSubtab = saved === "now" ? "direct" : saved;
      } else if (hasDirect) {
        activeDataSubtab = "direct";
      } else {
        activeDataSubtab = "direct";
      }
    } catch (_e) {
    }
    switchDataSubtab(activeDataSubtab);
  }
  function isAuditAnalysisCompleted(data) {
    if (!data) return false;
    const ws = data?.workflow_state || {};
    if (ws.analysis_running || data.status === "in_progress") return false;
    return ws.state === "ANALYSIS_DONE" || ws.state === "REPORT_READY" || data.status === "completed";
  }
  function handleDataFlowRunAi() {
    const data = runtimeBridge.getAuditData?.();
    if (!data) return;
    if (isAuditAnalysisCompleted(data)) {
      runtimeBridge.rerunAuditAnalysis?.();
    } else {
      runtimeBridge.runAuditAnalysis?.();
    }
  }
  function updateDataSubtabsFlow(data) {
    const nav = document.getElementById("dataSubtabs");
    const dirBtn = document.getElementById("dataSubtabDirect");
    const srcBtn = document.getElementById("dataSubtabSources");
    const runBtn = document.getElementById("dataSubtabRunAi");
    const runLabel = document.getElementById("dataSubtabRunAiLabel");
    if (!nav || !runBtn) return;
    const step1Done = hasDirectExcelSlice(data);
    const materials = (data?.materials || []).filter(
      (m) => m.type !== "manual_metrics" && !isSystemMaterial(m)
    );
    const step2Done = materials.length > 0;
    const ws = data?.workflow_state || {};
    const running = Boolean(ws.analysis_running || data?.status === "in_progress");
    const analysisDone = isAuditAnalysisCompleted(data);
    const ui = data?.workflow_ui?.primary_button || {};
    nav.classList.toggle("data-flow--s1-done", step1Done);
    nav.classList.toggle("data-flow--s2-done", step2Done);
    nav.classList.toggle("data-flow--s3-done", analysisDone);
    dirBtn?.classList.toggle("data-flow-btn--done", step1Done);
    srcBtn?.classList.toggle("data-flow-btn--done", step2Done);
    runBtn.classList.toggle("data-flow-btn--done", analysisDone);
    runBtn.classList.toggle("data-flow-btn--ready", step1Done && !running && !analysisDone);
    runBtn.classList.toggle("data-flow-btn--running", running);
    runBtn.disabled = running || !step1Done || !analysisDone && ui.enabled === false;
    if (runLabel) {
      if (running) runLabel.textContent = DIRECT_COPY.dataFlowStep3Running;
      else if (analysisDone) runLabel.textContent = DIRECT_COPY.dataFlowStep3Rerun;
      else runLabel.textContent = DIRECT_COPY.dataFlowStep3Run;
    }
    runBtn.title = analysisDone ? DIRECT_COPY.rerunAnalysisFoot : step1Done ? ui.reason_disabled || "Excel \u0414\u0438\u0440\u0435\u043A\u0442\u0430 + \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0441 \u0433\u0430\u043B\u043E\u0447\u043A\u043E\u0439 \xAB\u0412 AI\xBB" : "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 Excel \u043D\u0430 \u0448\u0430\u0433\u0435 1 \xB7 \u0414\u0438\u0440\u0435\u043A\u0442";
    if (dirBtn) {
      dirBtn.title = step1Done ? DIRECT_COPY.healthScoreTooltip : "\u0428\u0430\u0433 1: \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 Excel \u0438\u0437 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442\u0430";
    }
    if (srcBtn) {
      const srcCount = materials.length;
      srcBtn.title = srcCount > 0 ? `\u0428\u0430\u0433 2: \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 ${srcCount}. \u041E\u0442\u043C\u0435\u0442\u044C\u0442\u0435 \xAB\u0412 AI\xBB \u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u0445.` : "\u0428\u0430\u0433 2: \u0437\u0430\u043C\u0435\u0442\u043A\u0438, \u0441\u043A\u0440\u0438\u043D\u044B, \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B (\u043F\u043E \u0436\u0435\u043B\u0430\u043D\u0438\u044E)";
    }
  }
  function updateDataSubtabBadges(data) {
    updateDataSubtabsFlow(data);
    const materials = data?.materials || [];
    if (isSourcesDataSubtabActive()) {
      updateSourcesToolbar(materials.filter((m) => m.type !== "manual_metrics"));
    }
  }
  function isMaterialAiSelectable(m) {
    if (!m || isSystemMaterial(m)) return false;
    if (m.type === "manual_metrics" || m.type === "audio" || m.type === "screenshot_ocr") return false;
    return ["text_note", "document", "screenshot", "audio_transcript", "table"].includes(m.type);
  }
  function isMaterialAiIncluded(m) {
    if (!isMaterialAiSelectable(m)) return false;
    return !m.excluded_from_analysis;
  }
  function isDirectExcelMaterial(m) {
    const sl = m?.document_slice;
    return Boolean(sl && sl.format === "yandex_direct_xlsx");
  }
  function buildAiRunContext(data) {
    const fresh = data?.analysis_freshness || {};
    return {
      hasRun: Boolean(fresh.last_analysis_at),
      staleIds: new Set((fresh.stale_materials || []).map((x) => Number(x.id))),
      lastIds: new Set((fresh.material_ids_in_last_analysis || []).map((x) => Number(x)))
    };
  }
  function getMaterialAiRunState(m, ctx) {
    if (isSystemMaterial(m)) {
      return { code: "system", label: null, badgeClass: "" };
    }
    if (isDirectExcelMaterial(m)) {
      if (!ctx.hasRun) {
        return {
          code: "direct_pending",
          label: DIRECT_COPY.materialAiStatusDirect,
          badgeClass: "badge-info",
          title: DIRECT_COPY.materialAiStatusTooltip.direct
        };
      }
      if (ctx.staleIds.has(Number(m.id))) {
        return {
          code: "direct_stale",
          label: DIRECT_COPY.materialAiStatusDirectStale,
          badgeClass: "badge-warning",
          title: DIRECT_COPY.materialAiStatusTooltip.direct_stale
        };
      }
      return {
        code: "direct_accounted",
        label: DIRECT_COPY.materialAiStatusDirectAccounted,
        badgeClass: "badge-ready",
        title: DIRECT_COPY.materialAiStatusTooltip.direct_accounted
      };
    }
    if (!isMaterialAiSelectable(m)) {
      return { code: "na", label: null, badgeClass: "" };
    }
    if (!isMaterialAiIncluded(m)) {
      return {
        code: "excluded",
        label: DIRECT_COPY.materialAiFilterOutAi,
        badgeClass: "badge-draft",
        title: "\u0418\u0441\u043A\u043B\u044E\u0447\u0451\u043D \u0438\u0437 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430"
      };
    }
    if (!ctx.hasRun) {
      return {
        code: "pending_first",
        label: DIRECT_COPY.materialAiStatusPending,
        badgeClass: "badge-info",
        title: DIRECT_COPY.materialAiStatusTooltip.pending
      };
    }
    if (ctx.staleIds.has(Number(m.id))) {
      return {
        code: "stale",
        label: DIRECT_COPY.materialAiStatusStale,
        badgeClass: "badge-warning",
        title: DIRECT_COPY.materialAiStatusTooltip.stale
      };
    }
    if (ctx.lastIds.has(Number(m.id))) {
      return {
        code: "accounted",
        label: DIRECT_COPY.materialAiStatusAccounted,
        badgeClass: "badge-ready",
        title: DIRECT_COPY.materialAiStatusTooltip.accounted
      };
    }
    return {
      code: "queue",
      label: DIRECT_COPY.materialAiStatusQueue,
      badgeClass: "badge-info",
      title: DIRECT_COPY.materialAiStatusTooltip.queue
    };
  }
  function materialAiStatusBadgeHtml(state) {
    if (!state?.label) return "";
    const cls = state.badgeClass || "badge-draft";
    const title = state.title ? ` title="${escapeHtml(state.title)}"` : "";
    return `<span class="badge source-card__status ${cls}"${title}>${escapeHtml(state.label)}</span>`;
  }
  function materialMatchesAiFilter(m, filter, ctx) {
    if (filter === "all" || !filter) return true;
    const state = getMaterialAiRunState(m, ctx);
    if (filter === "in_ai") {
      return isMaterialAiIncluded(m) || isDirectExcelMaterial(m);
    }
    if (filter === "out_ai") {
      return state.code === "excluded";
    }
    if (filter === "accounted") {
      return state.code === "accounted" || state.code === "direct_accounted";
    }
    if (filter === "stale") {
      return state.code === "stale" || state.code === "direct_stale";
    }
    return true;
  }
  function setSourcesAiFilter(filterId) {
    const allowed = SOURCES_AI_FILTERS.map((f) => f.id);
    sourcesAiFilter = allowed.includes(filterId) ? filterId : "all";
    if (lastMaterialsPayload) {
      renderMaterialsGrouped(
        lastMaterialsPayload.materials,
        lastMaterialsPayload.coverage,
        lastMaterialsPayload.helpers
      );
    }
  }
  function getMaterialAiHint(m) {
    return (m?.marketer_ai_hint || "").trim();
  }
  function isSemanticsExportMaterial(m) {
    if (m?.document_kind === "direct_semantics_export") return true;
    if (m?.document_slice?.format === "direct_semantics_export") return true;
    const head = (m?.extracted_text || "").slice(0, 400).toLowerCase();
    return head.includes("\u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u0444\u0440\u0430\u0437") || head.includes("## \u0442\u0435\u043A\u0441\u0442\u044B") && !head.includes("\u043C\u0430\u0441\u0442\u0435\u0440 \u043E\u0442\u0447\u0451\u0442");
  }
  function materialCardExcerptLine(m, materials) {
    if (isSemanticsExportMaterial(m)) {
      const sheets = m.document_slice?.sheets;
      const sheetHint = Array.isArray(sheets) && sheets.length ? `\u041B\u0438\u0441\u0442\u044B: ${sheets.slice(0, 4).join(", ")}` : "\u0422\u0435\u043A\u0441\u0442\u044B, \u0444\u0440\u0430\u0437\u044B, \u043C\u0438\u043D\u0443\u0441-\u0441\u043B\u043E\u0432\u0430";
      return { tone: "muted", text: `${sheetHint} \u2014 \u0441\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0430 \u0434\u043B\u044F AI, \u043D\u0435 KPI-\u043E\u0442\u0447\u0451\u0442` };
    }
    if (m.type === "screenshot") {
      const ocr = findScreenshotOcrSibling(materials, m);
      const text2 = (ocr?.extracted_text || "").trim();
      if (text2) {
        return { tone: "muted", text: text2.slice(0, 120) + (text2.length > 120 ? "\u2026" : "") };
      }
      return { tone: "muted", text: "\u0411\u0435\u0437 OCR \u2014 AI \u043E\u043F\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" };
    }
    const text = (m.extracted_text || "").trim();
    if (text) {
      if (/не удалось распознать|не распознан/i.test(text)) {
        return {
          tone: "warn",
          text: "\u041D\u0443\u0436\u0435\u043D \xAB\u041C\u0430\u0441\u0442\u0435\u0440 \u043E\u0442\u0447\u0451\u0442\u043E\u0432\xBB \u0414\u0438\u0440\u0435\u043A\u0442\u0430 (\u0420\u0430\u0441\u0445\u043E\u0434, \u041A\u043B\u0438\u043A\u0438, \u041A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438, \u0441\u0442\u0440\u043E\u043A\u0430 \xAB\u0418\u0442\u043E\u0433\u043E\xBB)."
        };
      }
      if (text.length > 100 && (text.startsWith("#") || text.includes("## "))) {
        return { tone: "muted", text: "\u0422\u0435\u043A\u0441\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D \u2014 \u0434\u0435\u0442\u0430\u043B\u0438 \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435" };
      }
      return { tone: "muted", text: text.slice(0, 120) + (text.length > 120 ? "\u2026" : "") };
    }
    if (m.type === "audio" && m.file_url) {
      return { tone: "muted", text: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0443 \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435" };
    }
    return { tone: "muted", text: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443" };
  }
  function materialCardPreview(m, materials) {
    if (m.type === "screenshot" && m.file_url) {
      return `<div class="source-card__thumb"><img src="${m.file_url}" alt="" loading="lazy" /></div>`;
    }
    const line = materialCardExcerptLine(m, materials);
    const cls = line.tone === "warn" ? "source-card__excerpt source-card__excerpt--warn" : "source-card__excerpt muted";
    return `<p class="${cls}">${escapeHtml(line.text)}</p>`;
  }
  function countSourcesAiSelection(materials) {
    const rows = (materials || []).filter((m) => isMaterialAiSelectable(m) && m.type !== "screenshot_ocr");
    const included = rows.filter((m) => isMaterialAiIncluded(m)).length;
    return { total: rows.length, included };
  }
  function renderSourcesAiFilters(data, materials) {
    const wrap = document.getElementById("sourcesAiFilterWrap");
    if (!wrap) return;
    const rows = (materials || []).filter((m) => m.type !== "manual_metrics" && !isSystemMaterial(m));
    if (!rows.length) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      return;
    }
    const ctx = buildAiRunContext(data || runtimeBridge.getAuditData?.() || {});
    const counts = { all: rows.length, in_ai: 0, out_ai: 0, accounted: 0, stale: 0 };
    rows.forEach((m) => {
      if (materialMatchesAiFilter(m, "in_ai", ctx)) counts.in_ai += 1;
      if (materialMatchesAiFilter(m, "out_ai", ctx)) counts.out_ai += 1;
      if (materialMatchesAiFilter(m, "accounted", ctx)) counts.accounted += 1;
      if (materialMatchesAiFilter(m, "stale", ctx)) counts.stale += 1;
    });
    wrap.hidden = false;
    wrap.title = DIRECT_COPY.materialAiFilterLead;
    wrap.innerHTML = SOURCES_AI_FILTERS.map((f) => {
      const active = sourcesAiFilter === f.id;
      const n = counts[f.id] ?? 0;
      const label = DIRECT_COPY[f.labelKey] || f.id;
      return `<button type="button" class="sources-ai-filters__chip${active ? " is-active" : ""}"
            data-ai-filter="${f.id}" onclick="setSourcesAiFilter('${f.id}')">${escapeHtml(label)}${n ? ` (${n})` : ""}</button>`;
    }).join("");
  }
  function updateSourcesToolbar(materials) {
    const badge = document.getElementById("sourcesAiCountBadge");
    const searchWrap = document.getElementById("sourcesSearchWrap");
    const reocrBtn = document.getElementById("btnReocrAllScreenshots");
    const data = runtimeBridge.getAuditData?.() || null;
    const screenshotCount = (materials || []).filter((m) => m.type === "screenshot").length;
    if (reocrBtn) {
      const show = screenshotCount > 0 && typeof canWrite === "function" && canWrite();
      reocrBtn.style.display = show ? "" : "none";
      reocrBtn.textContent = DIRECT_COPY.screenshotReocrAll || "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C \u0432\u0441\u0435 \u0441\u043A\u0440\u0438\u043D\u044B";
      reocrBtn.title = "Tesseract: \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 AI-\u0430\u043D\u0430\u043B\u0438\u0437";
    }
    const { total, included } = countSourcesAiSelection(materials);
    if (badge) {
      if (!total) {
        badge.hidden = true;
        badge.textContent = "";
      } else {
        badge.hidden = false;
        badge.textContent = DIRECT_COPY.sourcesAiCount(included, total);
        badge.title = DIRECT_COPY.sourcesAiPanelLead;
      }
    }
    if (searchWrap) {
      searchWrap.hidden = total < 4;
    }
    renderSourcesAiFilters(data, materials);
  }
  function isSystemMaterial(m) {
    const title = String(m?.title || "").toLowerCase();
    if (m?.type === "document" && /срез данных|яндекс директ/i.test(title)) return true;
    if (m?.type === "text_note" && title.startsWith("# \u0441\u0440\u0435\u0437")) return true;
    return false;
  }
  function renderDataNowSummary(data) {
    const el = document.getElementById("dataNowSummary");
    if (!el) return;
    if (isDirectDataSubtabActive() || !hasDirectExcelSlice(data)) {
      el.innerHTML = "";
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    const da = data?.direct_analytics;
    const health = da?.health;
    const monthly = da?.monthly || [];
    let summaryLine = "";
    let directActions = "";
    if (health || monthly.length) {
      summaryLine = monthly.length ? DIRECT_COPY.sliceLoaded(monthly.length) : `\u0421\u0440\u0435\u0437 ${DIRECT_COPY.product} \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D.`;
      directActions = `
            <button type="button" class="btn btn-outline btn-sm" onclick="switchDataSubtab('direct'); scrollToDirectRisks()">${DIRECT_COPY.scrollToDirectRisksBtn}</button>`;
    } else {
      summaryLine = DIRECT_COPY.healthMissing();
    }
    const blockingBlock = "";
    el.innerHTML = `
        <div class="card data-now-summary-card data-now-summary-card--compact">
            <p class="data-now-value">${summaryLine}</p>
            ${blockingBlock}
            ${directActions ? `<div class="data-now-summary-actions">${directActions}</div>` : ""}
        </div>`;
  }
  function wrapDirectCollapsible(title, innerHtml, { open = false, extraClass = "", id = "" } = {}) {
    if (!innerHtml?.trim()) return "";
    const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
    return `
        <details class="direct-collapsible ${extraClass}"${idAttr} ${open ? "open" : ""}>
            <summary class="direct-collapsible-summary">${escapeHtml(title)}</summary>
            <div class="direct-collapsible-body">${innerHtml}</div>
        </details>`;
  }
  function scrollToDirectSliceAnchor(anchorId) {
    const el = document.getElementById(anchorId);
    if (!el) return false;
    const details = el.closest("details.direct-collapsible") || (el.tagName === "DETAILS" ? el : null);
    if (details) details.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("direct-slice-highlight");
    window.setTimeout(() => el.classList.remove("direct-slice-highlight"), 2200);
    return true;
  }
  function closeMaterialDrawer() {
    const drawer = document.getElementById("materialDrawer");
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("material-drawer-open");
  }
  function openMaterialDrawer(materialId, helpers) {
    const m = (helpers.getMaterialById || (() => null))(materialId);
    if (!m) return;
    const drawer = document.getElementById("materialDrawer");
    const body = document.getElementById("materialDrawerBody");
    const footer = document.getElementById("materialDrawerFooter");
    const titleEl = document.getElementById("materialDrawerTitle");
    if (!drawer || !body || !footer || !titleEl) return;
    const typeLabel = TYPE_LABELS[m.type] || m.type_label || m.type;
    const cardTitle = m.type === "manual_metrics" ? helpers.manualMetricsTitle?.(m) || "\u041C\u0435\u0442\u0440\u0438\u043A\u0438" : `${typeLabel}${m.title ? ` \u2014 ${m.title}` : ""}`;
    titleEl.textContent = cardTitle;
    const materials = helpers.getAuditData?.()?.materials || [];
    const included = isMaterialAiIncluded(m);
    const hint = getMaterialAiHint(m);
    const auditData2 = helpers.getAuditData?.() || {};
    const runState = getMaterialAiRunState(m, buildAiRunContext(auditData2));
    const badges = [
      included ? '<span class="badge badge-ready">\u0412 AI</span>' : '<span class="badge badge-draft">\u041D\u0435 \u0432 AI</span>',
      runState.label ? `<span class="badge ${runState.badgeClass || "badge-draft"}" title="${escapeHtml(runState.title || "")}">${escapeHtml(runState.label)}</span>` : null,
      m.needs_review ? '<span class="badge badge-draft">\u041C\u043E\u0436\u043D\u043E \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u044C</span>' : null
    ].filter(Boolean).join(" ");
    let snippet = "";
    if (m.type === "screenshot") {
      const ocr = findScreenshotOcrSibling(materials, m);
      const ocrText = (ocr?.extracted_text || "").trim();
      if (ocrText) {
        snippet = `<div class="material-drawer-section"><h4 class="material-drawer-section-title">\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 / OCR</h4><p class="material-drawer-snippet">${escapeHtml(ocrText)}</p></div>`;
      }
    } else if (m.extracted_text && m.type !== "manual_metrics") {
      snippet = `<p class="material-drawer-snippet">${escapeHtml(m.extracted_text.slice(0, 4e3))}${m.extracted_text.length > 4e3 ? "\u2026" : ""}</p>`;
    }
    const metricsBlock = m.type === "manual_metrics" && m.raw_content && helpers.renderMetricsCompact ? helpers.renderMetricsCompact(m.raw_content) : "";
    const img = m.file_url && m.type === "screenshot" ? `<div class="material-drawer-preview"><img src="${m.file_url}" class="material-drawer-img" alt="" /></div>` : "";
    const audio = m.file_url && m.type === "audio" ? `<audio controls src="${m.file_url}" class="material-drawer-audio"></audio>` : "";
    const canWriteUser = helpers.canWrite?.() ?? false;
    const hintBlock = isMaterialAiSelectable(m) && canWriteUser ? `<div class="material-drawer-hint">
            <label class="form-label-compact" for="materialAiHintInput">${escapeHtml(DIRECT_COPY.materialAiHintLabel)}</label>
            <textarea id="materialAiHintInput" class="form-control" rows="3" placeholder="${escapeHtml(DIRECT_COPY.materialAiHintPlaceholder)}">${escapeHtml(hint)}</textarea>
            <button type="button" class="btn btn-outline btn-sm" onclick="saveMaterialAiHint(${m.id}, document.getElementById('materialAiHintInput').value)">${escapeHtml(DIRECT_COPY.materialAiHintSave)}</button>
           </div>` : hint ? `<p class="material-drawer-hint-readonly"><strong>\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430:</strong> ${escapeHtml(hint)}</p>` : "";
    const softReview = m.needs_review && m.review_reason ? `<p class="material-drawer-soft-review muted">${escapeHtml(DIRECT_COPY.materialDrawerSoftReview)} ${escapeHtml(m.review_reason)}</p>` : "";
    body.innerHTML = `
        <div class="material-drawer-meta">${badges}</div>
        ${helpers.formatTimestamps?.(m.created_at, m.updated_at) || ""}
        ${img}
        ${audio}
        ${snippet}
        ${metricsBlock}
        ${hintBlock}
        ${softReview}`;
    const actions = [];
    if (m.type === "document") {
      actions.push(`<button class="btn btn-primary btn-sm" onclick="openDocumentMaterialById(${m.id}); closeMaterialDrawer();">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0444\u0430\u0439\u043B</button>`);
      if (canWriteUser) actions.push(`<button class="btn btn-outline btn-sm" onclick="editDocumentText(${m.id}); closeMaterialDrawer();">\u0422\u0435\u043A\u0441\u0442</button>`);
    } else if (canWriteUser) {
      if (m.type === "screenshot") {
        actions.push(`<button class="btn btn-outline btn-sm" onclick="rerunScreenshotOcr(${m.id})">${escapeHtml(DIRECT_COPY.screenshotRerunOcr)}</button>`);
      }
      actions.push(`<button class="btn btn-primary btn-sm" onclick="editMaterial(${m.id}); closeMaterialDrawer();">\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C</button>`);
    }
    if (canWriteUser) {
      actions.push(`<button class="btn btn-danger btn-sm" onclick="deleteMaterial(${m.id}); closeMaterialDrawer();">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>`);
    }
    if (isMaterialAiSelectable(m) && canWriteUser) {
      actions.unshift(`<label class="material-ai-toggle material-ai-toggle--drawer">
            <input type="checkbox"${included ? " checked" : ""}
                onchange="setMaterialAiInclusion(${m.id}, this.checked)" />
            <span>${escapeHtml(DIRECT_COPY.materialAiCheckboxLabel)}</span>
        </label>`);
    }
    footer.innerHTML = actions.join("");
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("material-drawer-open");
  }
  function materialDisplayName(m, helpers) {
    if (m.__kpiLink) return "KPI \u043F\u0435\u0440\u0438\u043E\u0434\u044B";
    const typeLabel = TYPE_LABELS[m.type] || m.type || "";
    if (m.type === "manual_metrics") {
      return helpers.manualMetricsTitle?.(m) || "\u041C\u0435\u0442\u0440\u0438\u043A\u0438";
    }
    return (m.title || typeLabel || "").trim();
  }
  function materialMatchesSearch(m, query, helpers) {
    if (!query) return true;
    if (m.__kpiLink) return "kpi \u043F\u0435\u0440\u0438\u043E\u0434 \u043C\u0435\u0442\u0440\u0438\u043A".includes(query);
    const typeLabel = TYPE_LABELS[m.type] || m.type || "";
    const haystack = `${materialDisplayName(m, helpers)} ${typeLabel} ${m.type || ""}`.toLowerCase();
    return haystack.includes(query);
  }
  function filterMaterialsList() {
    const input = document.getElementById("materialsSearchInput");
    materialsSearchQuery = (input?.value || "").trim().toLowerCase();
    if (lastMaterialsPayload) {
      renderMaterialsGrouped(
        lastMaterialsPayload.materials,
        lastMaterialsPayload.coverage,
        lastMaterialsPayload.helpers
      );
    }
  }
  function renderMaterialsGrouped(materials, coverage, helpers) {
    const container = document.getElementById("materialsList");
    if (!container) return;
    lastMaterialsPayload = { materials, coverage, helpers };
    const searchQuery = materialsSearchQuery;
    const auditData2 = helpers.getAuditData?.() || runtimeBridge.getAuditData?.() || {};
    const aiCtx = buildAiRunContext(auditData2);
    const filtered = materials.filter((m) => m.type !== "manual_metrics");
    if (!filtered.length) {
      const optional = (coverage?.upload_suggestions || []).slice(0, 8).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
      updateSourcesToolbar([]);
      container.innerHTML = `
            <div class="empty-state-card">
                <h3>\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B</h3>
                <p class="muted">Excel \u2014 \u043D\u0430 \xAB\u0414\u0438\u0440\u0435\u043A\u0442\xBB. \u0417\u0434\u0435\u0441\u044C \u2014 \u0437\u0430\u043C\u0435\u0442\u043A\u0438, \u0441\u043A\u0440\u0438\u043D\u044B, \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C\xBB.</p>
                <ul class="empty-checklist">${optional || "<li>\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442, \u0441\u043A\u0440\u0438\u043D, \u0437\u0430\u043C\u0435\u0442\u043A\u0430</li>"}</ul>
            </div>`;
      return;
    }
    const buckets = {};
    MATERIAL_GROUP_ORDER.forEach((g) => {
      buckets[g.id] = [];
    });
    filtered.forEach((m) => {
      if (m.type === "screenshot_ocr") return;
      if (!materialMatchesAiFilter(m, sourcesAiFilter, aiCtx)) return;
      if (isSystemMaterial(m)) {
        buckets.system.push(m);
        return;
      }
      const g = MATERIAL_GROUP_ORDER.find((gr) => gr.types.includes(m.type));
      if (g) buckets[g.id].push(m);
      else buckets.other.push(m);
    });
    const renderCard = (m) => {
      const theme = MATERIAL_CARD_THEME[m.type] || { accent: "var(--text-muted)", label: TYPE_LABELS[m.type] || m.type };
      const name = (m.title || theme.label).trim();
      const selectable = isMaterialAiSelectable(m);
      const included = isMaterialAiIncluded(m);
      const runState = getMaterialAiRunState(m, aiCtx);
      const hint = getMaterialAiHint(m);
      const statusBadge = materialAiStatusBadgeHtml(runState);
      const aiToggle = selectable ? `<label class="source-card__ai" onclick="event.stopPropagation()">
                <input type="checkbox"${included ? " checked" : ""}${canWrite() ? "" : " disabled"}
                    onchange="setMaterialAiInclusion(${m.id}, this.checked)" />
                <span>${escapeHtml(DIRECT_COPY.materialAiCheckboxLabel)}</span>
               </label>` : "";
      const cardClass = [
        "source-card",
        included ? "source-card--in-ai" : "source-card--out-ai",
        runState.code === "accounted" || runState.code === "direct_accounted" ? "source-card--accounted" : "",
        runState.code === "stale" || runState.code === "direct_stale" ? "source-card--stale" : "",
        m.needs_review ? "source-card--soft-review" : ""
      ].filter(Boolean).join(" ");
      return `
            <article class="${cardClass}"
                role="button" tabindex="0"
                onclick="openMaterialDrawer(${m.id})"
                onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMaterialDrawer(${m.id})}">
                <div class="source-card__row">
                    <div class="source-card__body">
                        <div class="source-card__meta">
                            <span class="source-card__type" style="--type-accent:${theme.accent}">${escapeHtml(theme.label)}</span>
                            ${statusBadge ? `<div class="source-card__status-row">${statusBadge}</div>` : ""}
                        </div>
                        <h4 class="source-card__name">${escapeHtml(name)}</h4>
                        ${materialCardPreview(m, filtered)}
                        ${hint ? `<p class="source-card__hint-line">${escapeHtml(hint.slice(0, 72))}${hint.length > 72 ? "\u2026" : ""}</p>` : ""}
                    </div>
                    ${aiToggle ? `<div class="source-card__aside">${aiToggle}</div>` : ""}
                </div>
            </article>`;
    };
    const visibleBuckets = {};
    MATERIAL_GROUP_ORDER.forEach((g) => {
      visibleBuckets[g.id] = (buckets[g.id] || []).filter((m) => materialMatchesSearch(m, searchQuery, helpers));
    });
    const groupsHtml = MATERIAL_GROUP_ORDER.map((g) => {
      const items = visibleBuckets[g.id] || [];
      if (!items.length) return "";
      return `
            <section class="sources-group">
                <header class="sources-group__head">
                    <h3 class="sources-group__title">${escapeHtml(g.label)}</h3>
                    <span class="sources-group__count">${items.length}</span>
                </header>
                <div class="sources-grid">${items.map(renderCard).join("")}</div>
            </section>`;
    }).filter(Boolean).join("");
    const visibleCount = Object.values(visibleBuckets).reduce((n, arr) => n + arr.length, 0);
    if (searchQuery && visibleCount === 0 && filtered.length > 0) {
      container.innerHTML = `<p class="materials-search-empty">\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \xAB${escapeHtml(searchQuery)}\xBB. <button type="button" class="btn btn-link btn-sm" onclick="clearMaterialsSearch()">\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C</button></p>`;
      return;
    }
    if (visibleCount === 0 && filtered.length > 0) {
      const filterLabel = (SOURCES_AI_FILTERS.find((f) => f.id === sourcesAiFilter) || {}).labelKey;
      const name = filterLabel ? DIRECT_COPY[filterLabel] || sourcesAiFilter : sourcesAiFilter;
      container.innerHTML = `<p class="materials-search-empty">\u041D\u0435\u0442 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0432 \u0444\u0438\u043B\u044C\u0442\u0440\u0435 \xAB${escapeHtml(name)}\xBB. <button type="button" class="btn btn-link btn-sm" onclick="setSourcesAiFilter('all')">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0432\u0441\u0435</button></p>`;
      updateSourcesToolbar(filtered);
      return;
    }
    updateSourcesToolbar(filtered);
    container.innerHTML = groupsHtml || '<p class="muted">\u041D\u0435\u0442 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0434\u043B\u044F \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F.</p>';
  }
  function clearMaterialsSearch() {
    const input = document.getElementById("materialsSearchInput");
    if (input) input.value = "";
    filterMaterialsList();
  }
  function openDirectConditionsModalHost(renderTablesFn) {
    const modal = document.getElementById("directConditionsModal");
    const body = document.getElementById("directConditionsModalBody");
    if (!modal || !body) return;
    body.innerHTML = `
        <p class="muted direct-conditions-meta">\u041F\u043E\u043B\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A \u0443\u0441\u043B\u043E\u0432\u0438\u0439 \u0438\u0437 Excel. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438.</p>
        <div class="form-group direct-conditions-modal-filter">
            <label class="form-label-compact" for="directConditionsCampaignFilterModal">\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u044F</label>
            <select id="directConditionsCampaignFilterModal" class="form-control form-control-compact"
                onchange="updateDirectConditionsViewModal()">
                <option value="">\u0412\u0441\u0435 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438</option>
            </select>
        </div>
        <div id="directConditionsTablesModal"></div>`;
    renderTablesFn?.("directConditionsTablesModal", "directConditionsCampaignFilterModal");
    openModal("directConditionsModal");
  }

  // src/audit-detail/workflow.js
  function getAuditData() {
    return runtimeBridge.getAuditData?.() || null;
  }
  function getCurrentAuditId() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
  }
  var guidedStepState = null;
  var guidedLastRenderedStep = null;
  var focusModeEnabled = localStorage.getItem("ppc_focus_mode") !== "off";
  var focusModeSecondaryExpanded = false;
  var focusActionState = { mode: "none" };
  var focusKpiTrendState = { auditKey: null, blocking: null, open: null };
  var currentScreenState = "UNKNOWN";
  var jumpToPostAnalysisTab = false;
  var pendingAnalysisCompleteModal = false;
  var analysisCompleteModalShownForRun = null;
  function workflowUi2() {
    return getAuditData()?.workflow_ui || {};
  }
  function isPreliminaryAudit() {
    const ui = workflowUi2();
    return ui.export_mode === "template" || Boolean(getAuditData()?.data_coverage?.is_preliminary);
  }
  function hasGuidedRequiredMetrics(data) {
    return hasDirectExcelSlice(data);
  }
  function isConfirmedTranscriptMaterial(material) {
    if (material?.type !== "audio_transcript") return false;
    try {
      const raw = JSON.parse(material.raw_content || "{}");
      return Boolean(raw.confirmed);
    } catch (_error) {
      return false;
    }
  }
  function hasGuidedEvidenceSource(data) {
    const materials = data?.materials || [];
    return materials.some((material) => {
      if (!material || material.excluded_from_analysis) return false;
      if (material.type === "document" || material.type === "screenshot" || material.type === "text_note") return true;
      return isConfirmedTranscriptMaterial(material);
    });
  }
  function hasGuidedCompletedAnalysis(data) {
    const ws = data?.workflow_state || {};
    if (ws.analysis_running) return false;
    return ws.state === "ANALYSIS_DONE" || ws.state === "REPORT_READY" || data?.status === "completed";
  }
  function getOpenDataIssues(data, options = {}) {
    const all = (data?.data_issues || []).filter((i) => !i.resolved && !i.visible_after_analysis);
    if (options.blockingOnly) {
      return all.filter((i) => i.severity === "blocking");
    }
    return all;
  }
  function getPostAnalysisDataImprovements(data) {
    return (data?.data_issues || []).filter(
      (i) => !i.resolved && i.visible_after_analysis && i.issue_type === "missing_data"
    );
  }
  function isPostAnalysisScreen(state) {
    return ["RESULTS_READY", "PRELIMINARY_REPORT", "RESULTS_NEED_REVIEW"].includes(state);
  }
  function usesPostAnalysisHero(state) {
    return isPostAnalysisScreen(state);
  }
  function setAuditCommandBarVisible(visible) {
    const commandBar = document.getElementById("auditCommandBar");
    if (commandBar) commandBar.style.display = visible ? "" : "none";
    const strip = document.getElementById("dataCommandStrip");
    if (strip) strip.classList.toggle("is-guided-only", !visible);
  }
  function syncDataCommandStrip(screenState, guidedVisible = false) {
    const strip = document.getElementById("dataCommandStrip");
    if (!strip) return;
    document.body.classList.remove("guided-hide-commandbar");
    const showBar = screenState !== "BLOCKED_REQUIRED";
    setAuditCommandBarVisible(showBar);
    strip.classList.toggle("has-guided", Boolean(guidedVisible));
    strip.classList.toggle("is-guided-only", showBar === false && guidedVisible);
  }
  function syncPostAnalysisChrome(screenState) {
    const topBtn = document.getElementById("btnAnalyze");
    const hero = usesPostAnalysisHero(screenState);
    setAuditCommandBarVisible(!hero);
    if (topBtn && hero) topBtn.style.display = "none";
  }
  function getLatestMetricsMaterial(data, { includeExcluded = false } = {}) {
    const materials = data?.materials || [];
    return materials.filter((m) => m?.type === "manual_metrics" && (includeExcluded || !m.excluded_from_analysis)).sort((a, b) => parseApiDateMs(b.updated_at || b.created_at) - parseApiDateMs(a.updated_at || a.created_at))[0] || null;
  }
  function getGuidedMetricFixIssue(data) {
    const issues = getOpenDataIssues(data, { blockingOnly: true });
    const latestMetrics = getLatestMetricsMaterial(data);
    const keywordRe = /(метрик|бюджет|клик|заявк|продаж|выруч|cpa|cpl|romi)/i;
    const idRe = /^(period|budget|clicks|leads|sales|revenue|metrics)$/i;
    const issue = issues.find((i) => {
      const actions = i.actions || [];
      const hasFixAction = actions.includes("fix") || actions.includes("add_data");
      if (!hasFixAction) return false;
      if (i.ref_type === "material" && Number(i.ref_id) > 0) {
        if (!latestMetrics) return true;
        return Number(i.ref_id) === Number(latestMetrics.id);
      }
      const text = `${i.id || ""} ${i.label || ""} ${i.reason || ""}`;
      return keywordRe.test(text) || idRe.test(String(i.id || ""));
    }) || null;
    if (!issue) return null;
    const materialId = Number(issue.ref_id) > 0 ? Number(issue.ref_id) : latestMetrics?.id || null;
    return { issue, materialId };
  }
  function getGuidedStepState(data) {
    const blockingIssues = getOpenDataIssues(data, { blockingOnly: true });
    const hasBlocking = blockingIssues.length > 0;
    const done1 = hasDirectExcelSlice(data);
    const done2 = hasGuidedEvidenceSource(data);
    const done3 = done1 && done2 && hasGuidedCompletedAnalysis(data);
    const metricFix = getGuidedMetricFixIssue(data);
    let step = "done";
    if (hasBlocking) {
      if (!done1) step = 1;
      else if (!done2) step = 2;
      else if (!done3) step = 3;
    } else {
      step = done3 ? "done" : 3;
    }
    return { step, done1, done2, done3, metricFix };
  }
  function resolveScreenState(data) {
    const ws = data?.workflow_state || {};
    if (ws.analysis_running || data?.status === "in_progress") return "RUNNING";
    if (ws.analysis_failed || data?.status === "failed") return "FAILED";
    const analysisDone = hasGuidedCompletedAnalysis(data);
    if (!analysisDone && hasDirectExcelSlice(data)) {
      return "READY_TO_RUN";
    }
    const blockingCount = getOpenDataIssues(data, { blockingOnly: true }).length;
    if (blockingCount > 0 && !analysisDone) {
      return "BLOCKED_REQUIRED";
    }
    if (analysisDone) {
      if (data?.data_coverage?.is_preliminary) return "PRELIMINARY_REPORT";
      if (getFindingReviewProgress(data).pending > 0) return "RESULTS_NEED_REVIEW";
      return "RESULTS_READY";
    }
    return "READY_TO_RUN";
  }
  function buildScreenStateUiModel(screenState, ctx = {}) {
    const {
      blockingCount = 0,
      optionalCount = 0,
      missingLabels = [],
      reviewCount = 0,
      reviewProgress = { reviewed: 0, total: 0, pending: 0 }
    } = ctx;
    const missingText = missingLabels.join(", ") || "\u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432";
    return {
      BLOCKED_REQUIRED: {
        status: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445",
        hint: "",
        primaryLabel: "",
        primaryClass: "",
        primaryAction: "guided"
      },
      READY_TO_RUN: {
        status: "\u0413\u043E\u0442\u043E\u0432 \u043A AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0443",
        hint: "",
        primaryLabel: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437",
        primaryClass: "btn-success",
        primaryAction: "run"
      },
      RUNNING: {
        status: "AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F",
        hint: "AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0430\u0442\u0443\u0441 \u0447\u0435\u0440\u0435\u0437 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434.",
        primaryLabel: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441",
        primaryClass: "btn-outline",
        primaryAction: "refresh"
      },
      FAILED: {
        status: "\u041E\u0448\u0438\u0431\u043A\u0430 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430",
        hint: "\u0418\u0441\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437.",
        primaryLabel: "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437",
        primaryClass: "btn-danger",
        primaryAction: "run"
      },
      RESULTS_NEED_REVIEW: {
        status: reviewProgress.total > 0 ? `\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u2014 ${formatReviewProgressLine2(reviewProgress)}` : "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0433\u043E\u0442\u043E\u0432",
        hint: reviewProgress.pending > 0 ? `${formatReviewProgressLine2(reviewProgress)}. ${formatReviewRemainingLine2(reviewProgress)}.` : "\u0412\u0441\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B. \u041C\u043E\u0436\u043D\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043E\u0442\u0447\u0451\u0442\u0430.",
        primaryLabel: reviewProgress.pending === 1 ? "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u044B\u0432\u043E\u0434" : reviewProgress.pending > 0 ? "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u044B" : "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043E\u0442\u0447\u0451\u0442\u0430",
        primaryClass: "btn-primary",
        primaryAction: reviewProgress.pending > 0 ? "open_review" : "open_report"
      },
      RESULTS_READY: {
        status: "\u041E\u0442\u0447\u0451\u0442 \u0433\u043E\u0442\u043E\u0432",
        hint: "\u0412\u0441\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043E\u0442\u0447\u0451\u0442 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430.",
        primaryLabel: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442",
        primaryClass: "btn-outline",
        primaryAction: "open_report"
      },
      PRELIMINARY_REPORT: {
        status: "\u041F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442 \u043F\u043E \u0431\u0430\u0437\u043E\u0432\u044B\u043C \u0434\u0430\u043D\u043D\u044B\u043C",
        hint: `\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B. \u0414\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0446\u0435\u043D\u043D\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442: ${missingText}.`,
        primaryLabel: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442",
        primaryClass: "btn-outline",
        primaryAction: "open_report"
      }
    }[screenState] || {
      status: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0430\u0443\u0434\u0438\u0442\u0430",
      hint: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u0430\u0443\u0434\u0438\u0442\u0430.",
      primaryLabel: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437",
      primaryClass: "btn-success",
      primaryAction: "run"
    };
  }
  function syncCommandBarWithGuidedStep() {
    const btn = document.getElementById("btnAnalyze");
    if (!btn) return;
    if (currentScreenState !== "BLOCKED_REQUIRED") return;
    if (guidedStepState?.step === 1) {
      btn.textContent = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u0414\u0438\u0440\u0435\u043A\u0442\xBB";
      btn.classList.remove("btn-success");
      btn.classList.add("btn-outline");
      btn.disabled = false;
      btn.title = "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C Excel \u0438\u0437 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442\u0430";
      return;
    }
    if (guidedStepState?.step === 2) {
      btn.textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A";
      btn.classList.remove("btn-success");
      btn.classList.add("btn-outline");
      btn.disabled = false;
      btn.title = "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442, \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0438\u043B\u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0443";
      return;
    }
    if (guidedStepState?.step === 3) {
      btn.textContent = "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437";
      btn.classList.remove("btn-outline");
      btn.classList.add("btn-success");
      btn.disabled = false;
      btn.title = "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437 \u043F\u043E \u0441\u043E\u0431\u0440\u0430\u043D\u043D\u044B\u043C \u0434\u0430\u043D\u043D\u044B\u043C";
    }
  }
  function renderGuidedFirstRun(data) {
    const container = document.getElementById("guidedFirstRun");
    const badge = document.getElementById("guidedStepBadge");
    const dots = document.getElementById("guidedStepDots");
    const title = document.getElementById("guidedTitle");
    const hint = document.getElementById("guidedHint");
    const primary = document.getElementById("guidedPrimaryBtn");
    const secondary = document.getElementById("guidedSecondaryBtn");
    if (!container || !badge || !dots || !title || !hint || !primary || !secondary) return;
    const state = getGuidedStepState(data);
    const previousRenderedStep = guidedLastRenderedStep;
    guidedStepState = state;
    guidedLastRenderedStep = state.step;
    const hideGuidedOnDirect = isDirectDataSubtabActive();
    const hideGuidedOnSources = isSourcesDataSubtabActive() && isPostAnalysisScreen(currentScreenState);
    const showGuided = !hideGuidedOnDirect && !hideGuidedOnSources && (currentScreenState === "BLOCKED_REQUIRED" || currentScreenState === "RESULTS_NEED_REVIEW" || currentScreenState === "RESULTS_READY" || currentScreenState === "PRELIMINARY_REPORT");
    container.style.display = showGuided ? "grid" : "none";
    syncDataCommandStrip(currentScreenState, showGuided);
    container.classList.remove("is-step-1", "is-step-2", "is-step-3", "is-done", "is-review");
    const reviewMode = currentScreenState === "RESULTS_NEED_REVIEW";
    container.classList.toggle("is-review", reviewMode);
    container.classList.toggle("is-done", state.step === "done" && !reviewMode);
    secondary.style.display = "none";
    secondary.textContent = "";
    secondary.title = "";
    primary.style.display = "inline-flex";
    if (state.step === 1 && currentScreenState === "BLOCKED_REQUIRED") {
      container.classList.add("is-step-1");
      badge.textContent = "1/3 \xB7 \u0414\u0438\u0440\u0435\u043A\u0442";
      dots.textContent = "\u25CF\u25CB\u25CB";
      title.textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 Excel \u0438\u0437 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442\u0430";
      hint.textContent = "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434 (\u0444\u0430\u0439\u043B \u041C\u0430\u0441\u0442\u0435\u0440\u0430 \u043E\u0442\u0447\u0451\u0442\u043E\u0432). \u0426\u0438\u0444\u0440\u044B \u0438 \u0440\u0438\u0441\u043A\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0414\u0438\u0440\u0435\u043A\u0442\xBB.";
      primary.textContent = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u0414\u0438\u0440\u0435\u043A\u0442\xBB";
    } else if (state.step === 2 && currentScreenState === "BLOCKED_REQUIRED") {
      container.classList.add("is-step-2");
      badge.textContent = "2/3 \xB7 \u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A";
      dots.textContent = "\u25CF\u25CF\u25CB";
      title.textContent = "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u043C";
      hint.textContent = "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043C\u0438\u043D\u0438\u043C\u0443\u043C \u043E\u0434\u0438\u043D \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B: \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442, \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0438\u043B\u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0443.";
      primary.textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A";
      secondary.style.display = "inline-flex";
      secondary.textContent = "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0443";
    } else if (state.step === 3 && currentScreenState === "BLOCKED_REQUIRED") {
      container.classList.add("is-step-3");
      badge.textContent = "3/3 \xB7 \u0410\u043D\u0430\u043B\u0438\u0437";
      dots.textContent = "\u25CF\u25CF\u25CF";
      title.textContent = "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437";
      hint.textContent = "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043E\u0431\u0440\u0430\u043D\u044B. \u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0430\u043D\u0430\u043B\u0438\u0437 \u0434\u043B\u044F \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u043E\u0442\u0447\u0451\u0442\u0430.";
      primary.textContent = "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437";
    } else {
      const banner = buildFindingReviewBannerModel(data);
      const improvements = banner.improvements;
      if (currentScreenState === "RESULTS_NEED_REVIEW") {
        badge.textContent = banner.badge;
        dots.style.display = "none";
        title.textContent = banner.title;
        let hintText = banner.hint;
        if (improvements.length > 0) {
          hintText += ` \u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u044F \u0434\u0430\u043D\u043D\u044B\u0445 (\u043D\u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u0443\u044E\u0442 \u043E\u0442\u0447\u0451\u0442): ${improvements.length}.`;
        }
        hint.textContent = hintText;
        primary.textContent = banner.pending > 0 ? banner.pending === 1 ? "\u041A \u0432\u044B\u0432\u043E\u0434\u0443" : "\u041A \u0432\u044B\u0432\u043E\u0434\u0430\u043C" : "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043E\u0442\u0447\u0451\u0442\u0430";
        secondary.style.display = "inline-flex";
        if (improvements.length > 0 && banner.pending === 0) {
          secondary.textContent = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A";
          secondary.title = "\u0412\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB, \u0431\u043B\u043E\u043A \xAB\u041C\u043E\u0436\u043D\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C\xBB";
        } else {
          secondary.textContent = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043E\u0442\u0447\u0451\u0442\u0430";
          secondary.title = "\u0412\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u041E\u0442\u0447\u0451\u0442\xBB \u0431\u0435\u0437 \u0444\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F";
        }
      } else {
        dots.style.display = "";
        badge.textContent = "\u0413\u043E\u0442\u043E\u0432\u043E";
        dots.textContent = "\u2713";
      }
      if (currentScreenState === "RESULTS_READY") {
        const hasLimits = auditHasDataLimitations(data);
        const stale = runtimeBridge.isAnalysisStale?.(data);
        if (stale) {
          title.textContent = hasLimits ? "\u041E\u0442\u0447\u0451\u0442 \u0443\u0441\u0442\u0430\u0440\u0435\u043B (\u0435\u0441\u0442\u044C \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F)" : "\u0414\u0430\u043D\u043D\u044B\u0435 \u043D\u043E\u0432\u0435\u0435 \u043E\u0442\u0447\u0451\u0442\u0430";
          hint.textContent = hasLimits ? "\u0412\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B. KPI \u0432 \u0442\u0430\u0431\u043B\u0438\u0446\u0435 \u0443\u0436\u0435 \u043D\u043E\u0432\u044B\u0435 \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437, \u0447\u0442\u043E\u0431\u044B \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434 \u0438 findings. \u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F (CRM, \u0437\u0430\u043F\u0440\u043E\u0441\u044B) \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F, \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432." : "\u0412\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B. KPI \u0432 \u0442\u0430\u0431\u043B\u0438\u0446\u0435 \u0443\u0436\u0435 \u043D\u043E\u0432\u044B\u0435 \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437, \u0447\u0442\u043E\u0431\u044B \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434 \u0438 \u0433\u0440\u0430\u0444\u0438\u043A\u0438.";
          primary.textContent = "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437";
          secondary.style.display = "inline-flex";
          secondary.textContent = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442";
          secondary.title = "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A: \u0442\u0430\u0431\u043B\u0438\u0446\u0430 KPI \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430, \u0442\u0435\u043A\u0441\u0442 AI \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u0441\u0442\u0430\u0432\u0430\u0442\u044C";
        } else {
          title.textContent = hasLimits ? "\u041E\u0442\u0447\u0451\u0442 \u0433\u043E\u0442\u043E\u0432 \u0441 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F\u043C\u0438" : "\u041E\u0442\u0447\u0451\u0442 \u0433\u043E\u0442\u043E\u0432";
          hint.textContent = hasLimits ? "\u0412\u0441\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B. \u0412 \u043E\u0442\u0447\u0451\u0442\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C (\u043D\u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u0443\u044E\u0442 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440)." : "\u0412\u0441\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B. \u041C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430.";
          primary.textContent = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442";
          secondary.style.display = "inline-flex";
          secondary.textContent = "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437";
          secondary.title = "\u041F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u043C";
        }
      } else if (currentScreenState === "PRELIMINARY_REPORT") {
        const missingLabels = (data?.data_coverage?.missing_items || []).slice(0, 4).map((i) => i.label).filter(Boolean);
        title.textContent = "\u041F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442 \u043F\u043E \u0431\u0430\u0437\u043E\u0432\u044B\u043C \u0434\u0430\u043D\u043D\u044B\u043C";
        hint.textContent = `\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B. \u0414\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0446\u0435\u043D\u043D\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442: ${missingLabels.join(", ") || "\u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432"}.`;
        primary.textContent = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442";
        secondary.style.display = "inline-flex";
        secondary.textContent = "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437";
        secondary.title = "\u041F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437 \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u043C";
      } else if (currentScreenState !== "RESULTS_NEED_REVIEW") {
        title.textContent = "\u0413\u043E\u0442\u043E\u0432\u043E \u043A \u0437\u0430\u043F\u0443\u0441\u043A\u0443";
        hint.textContent = "\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0448\u0430\u0433\u0438 \u0437\u0430\u043A\u0440\u044B\u0442\u044B. \u041C\u043E\u0436\u043D\u043E \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437.";
        primary.textContent = "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437";
      }
    }
    if (currentScreenState === "BLOCKED_REQUIRED") {
      const step = guidedStepState?.step;
      if (step === 1 || step === 2 || step === 3) {
        primary.style.display = "inline-flex";
        if (step === 1 && !primary.textContent?.trim()) {
          primary.textContent = "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u0414\u0438\u0440\u0435\u043A\u0442\xBB";
        }
      } else {
        primary.style.display = "none";
      }
    } else {
      primary.style.display = ["RESULTS_READY", "PRELIMINARY_REPORT", "RESULTS_NEED_REVIEW"].includes(currentScreenState) ? "inline-flex" : "none";
    }
    const keepSecondary = currentScreenState === "RESULTS_NEED_REVIEW" || currentScreenState === "RESULTS_READY" || currentScreenState === "PRELIMINARY_REPORT" || currentScreenState === "BLOCKED_REQUIRED" && guidedStepState?.step === 2;
    if (!keepSecondary && secondary.style.display === "inline-flex") {
      secondary.style.display = "none";
    }
    syncCommandBarWithGuidedStep();
    syncPostAnalysisChrome(currentScreenState);
    if (previousRenderedStep && previousRenderedStep !== state.step) {
      dots.classList.remove("is-pulse");
      void dots.offsetWidth;
      dots.classList.add("is-pulse");
      setTimeout(() => dots.classList.remove("is-pulse"), 420);
    }
  }
  function handleGuidedPrimaryAction() {
    if (currentScreenState === "RESULTS_NEED_REVIEW") {
      scrollToPendingFindings();
      return;
    }
    if (currentScreenState === "RESULTS_READY" || currentScreenState === "PRELIMINARY_REPORT") {
      if (currentScreenState === "RESULTS_READY" && runtimeBridge.isAnalysisStale?.(getAuditData())) {
        rerunAuditAnalysis();
        return;
      }
      openReportPanel();
      return;
    }
    if (currentScreenState === "READY_TO_RUN" || currentScreenState === "FAILED") {
      runtimeBridge.runAuditAnalysis?.();
      return;
    }
    if (currentScreenState === "RUNNING") {
      runtimeBridge.loadAuditDetail?.();
      return;
    }
    if (guidedStepState?.step === 1) {
      runtimeBridge.switchTab?.("data");
      runtimeBridge.switchDataSubtab?.("direct");
      return;
    }
    if (guidedStepState?.step === 2) {
      runtimeBridge.openModal?.("documentModal");
      return;
    }
    if (guidedStepState?.step === 3) {
      runtimeBridge.runAuditAnalysis?.();
      return;
    }
    runtimeBridge.loadAuditDetail?.();
  }
  function handleGuidedSecondaryAction() {
    if (currentScreenState === "RESULTS_NEED_REVIEW") {
      const pending = getFindingReviewProgress(getAuditData() || {}).pending;
      const improvements = getPostAnalysisDataImprovements(getAuditData() || {});
      if (pending === 0 && improvements.length > 0) {
        runtimeBridge.goToDataImprovements?.();
        return;
      }
      openReportPanel();
      return;
    }
    if (currentScreenState === "RESULTS_READY" || currentScreenState === "PRELIMINARY_REPORT") {
      rerunAuditAnalysis();
      return;
    }
    if (guidedStepState?.step === 2) {
      runtimeBridge.openNewMaterial?.("textNoteModal");
    }
  }
  async function rerunAuditAnalysis() {
    if (!requireWriteAccess("\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430")) return;
    if (!runtimeBridge.getPrivacySettings?.()) await runtimeBridge.loadPrivacySettings?.();
    const payload = await runtimeBridge.buildAnalysisPayload?.();
    if (!payload) return;
    try {
      runtimeBridge.showAnalysisProgress?.({ percent: 0, message: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0437\u0430\u043F\u0443\u0441\u043A\u0430...", status: "in_progress" });
      runtimeBridge.connectAnalysisProgress?.(getCurrentAuditId());
      await apiRequest(`/api/audits/${getCurrentAuditId()}/analyze/start`, { method: "POST", body: JSON.stringify(payload) });
      showAlert("AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0449\u0435\u043D. \u0421\u043B\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u043E\u043C \u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u0430\u0443\u0434\u0438\u0442\u0430.", "info");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u043D\u0430\u043B\u0438\u0437\u0430: " + error.message, "danger");
      runtimeBridge.hideAnalysisProgress?.();
    }
  }
  function runPrimaryAction() {
    const model = buildScreenStateUiModel(currentScreenState);
    if (model.primaryAction === "guided") return handleGuidedPrimaryAction();
    if (model.primaryAction === "run") return runtimeBridge.runAuditAnalysis?.();
    if (model.primaryAction === "refresh") return runtimeBridge.loadAuditDetail?.();
    if (model.primaryAction === "open_report") return openReportPanel();
    if (model.primaryAction === "open_review") return scrollToPendingFindings();
    if (guidedStepState?.step && guidedStepState.step !== "done") {
      handleGuidedPrimaryAction();
      return;
    }
    runtimeBridge.runAuditAnalysis?.();
  }
  function scrollToPendingFindings() {
    runtimeBridge.switchTab?.("results");
    const target = document.querySelector(".finding-item.finding-needs-review") || document.querySelector(".finding-item--enrichment-stub") || document.querySelector('[id^="finding-"]') || document.querySelector('[id^="finding-pending-"]') || document.getElementById("resultsIssuesList") || document.getElementById("findingsList");
    if (!target) {
      showAlert("\u0412\u044B\u0432\u043E\u0434\u044B \u0434\u043B\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443.", "warning");
      return;
    }
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("focus-target");
      setTimeout(() => target.classList.remove("focus-target"), 1400);
    }, 80);
  }
  function openIssuesPanel() {
    if (currentScreenState === "RESULTS_NEED_REVIEW") {
      scrollToPendingFindings();
      return;
    }
    if (isPostAnalysisScreen(currentScreenState)) {
      runtimeBridge.switchTab?.("results");
      const box2 = document.getElementById("resultsIssuesList");
      if (!box2) return;
      setTimeout(() => {
        box2.scrollIntoView({ behavior: "smooth", block: "start" });
        box2.classList.add("focus-target");
        setTimeout(() => box2.classList.remove("focus-target"), 1400);
      }, 80);
      return;
    }
    const data = getAuditData();
    const blocking = getOpenDataIssues(data, { blockingOnly: true });
    runtimeBridge.switchTab?.("data");
    if (blocking[0]) {
      runtimeBridge.openDataItemAction?.(blocking[0].id, blocking[0]);
      return;
    }
    runtimeBridge.switchDataSubtab?.("direct");
    const box = document.getElementById("dataNowSummary") || document.getElementById("dataSubtabs");
    if (!box) return;
    setTimeout(() => {
      box.scrollIntoView({ behavior: "smooth", block: "start" });
      box.classList.add("focus-target");
      setTimeout(() => box.classList.remove("focus-target"), 1400);
    }, 80);
  }
  function openRecommendationsPanel() {
    runtimeBridge.switchTab?.("results");
    runtimeBridge.setFindingsMarketerFilter?.("recs");
    runtimeBridge.loadKbStatusCard?.();
    const summaryPanel = document.getElementById("findingsRecSummaryPanel");
    if (summaryPanel) summaryPanel.open = true;
    setTimeout(() => {
      const campaignBlock = document.getElementById("campaignRecommendationsBlock") || document.querySelector(".rec-card-ads");
      const offerBox = document.getElementById("offerContainer");
      const list = document.getElementById("recommendationsList");
      const target = campaignBlock || (offerBox?.innerHTML?.trim() ? offerBox : null) || list;
      if (!target) {
        showAlert("\u0411\u043B\u043E\u043A \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 (Ctrl+F5).", "warning");
        return;
      }
      if (!target.innerHTML?.trim() || target.textContent.trim().length < 8) {
        showAlert("\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0441 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F\u043C\u0438.", "info");
        return;
      }
      runtimeBridge.focusScrollTarget?.(target);
    }, 120);
  }
  function openReportPanel() {
    runtimeBridge.switchTab?.("report");
    const target = [
      document.getElementById("reportConfirmedPreviewCard"),
      document.getElementById("reportAiSummaryCard"),
      document.getElementById("reportAuditPlanCard"),
      document.getElementById("chartsContainer"),
      document.getElementById("tab-report")
    ].find((el) => el && el.style.display !== "none");
    if (!target) return;
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("focus-target");
      setTimeout(() => target.classList.remove("focus-target"), 1400);
    }, 80);
  }
  function toggleFocusMode() {
    focusModeEnabled = !focusModeEnabled;
    localStorage.setItem("ppc_focus_mode", focusModeEnabled ? "on" : "off");
    applyFocusModeLayout(getAuditData());
  }
  function toggleDataSecondaryArea() {
    focusModeSecondaryExpanded = !focusModeSecondaryExpanded;
    applyFocusModeLayout(getAuditData());
  }
  function applyFocusModeLayout(data) {
    const workspace = document.getElementById("auditWorkspace");
    const toggleBtn = document.getElementById("btnFocusModeToggle");
    const toggleWrap = document.getElementById("focusSecondaryToggleWrap");
    const toggleSecondaryBtn = document.getElementById("btnToggleDataSecondary");
    const secondary = document.getElementById("dataSecondaryArea");
    const primaryTopBtn = document.getElementById("btnAnalyze");
    if (!workspace || !toggleBtn || !toggleWrap || !toggleSecondaryBtn || !secondary) return;
    const blockingCount = getOpenDataIssues(data, { blockingOnly: true }).length;
    const useFocusMode = focusModeEnabled && blockingCount > 0;
    const keepWorkflowTabs = useFocusMode && hasDirectExcelSlice(data);
    workspace.classList.toggle("focus-mode", useFocusMode);
    workspace.classList.toggle("focus-mode--keep-tabs", keepWorkflowTabs);
    toggleBtn.textContent = `\u0420\u0435\u0436\u0438\u043C \u0444\u043E\u043A\u0443\u0441\u0430: ${focusModeEnabled ? "\u0432\u043A\u043B" : "\u0432\u044B\u043A\u043B"}`;
    toggleBtn.classList.toggle("btn-primary", focusModeEnabled);
    toggleBtn.classList.toggle("btn-outline", !focusModeEnabled);
    if (useFocusMode) {
      runtimeBridge.switchTab?.("data");
      if (!runtimeBridge.isSourcesDataSubtabActive?.()) {
        runtimeBridge.switchDataSubtab?.("direct");
      }
      toggleWrap.style.display = "block";
      secondary.style.display = focusModeSecondaryExpanded ? "block" : "none";
      toggleSecondaryBtn.textContent = focusModeSecondaryExpanded ? "\u0421\u043A\u0440\u044B\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0443\u044E \u043E\u0431\u043B\u0430\u0441\u0442\u044C" : "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0443\u044E \u043E\u0431\u043B\u0430\u0441\u0442\u044C";
    } else {
      toggleWrap.style.display = "none";
      secondary.style.display = "block";
      focusModeSecondaryExpanded = false;
      toggleSecondaryBtn.textContent = "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0440\u0430\u0431\u043E\u0447\u0443\u044E \u043E\u0431\u043B\u0430\u0441\u0442\u044C";
      if (primaryTopBtn) primaryTopBtn.style.display = "";
    }
  }
  function scrollGuidedFirstRunIntoView() {
    const guided = document.getElementById("guidedFirstRun");
    if (!guided) return;
    guided.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function guidedStepCompletionMessage(prevStep) {
    if (prevStep === 1) return "\u0428\u0430\u0433 1 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D: Excel \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D. \u041F\u0435\u0440\u0435\u0445\u043E\u0434\u0438\u043C \u043A \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430\u043C.";
    if (prevStep === 2) return "\u0428\u0430\u0433 2 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D: \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D. \u0422\u0435\u043F\u0435\u0440\u044C \u043C\u043E\u0436\u043D\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437.";
    if (prevStep === 3) return "\u0428\u0430\u0433 3 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D: \u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u043F\u0443\u0449\u0435\u043D.";
    return "";
  }
  async function refreshAuditAndAdvanceGuidedFlow(previousStep = null) {
    await runtimeBridge.loadAuditDetail?.();
    const nextStep = guidedStepState?.step;
    if (!previousStep || previousStep === "done") return;
    if (nextStep && nextStep !== previousStep) {
      const message = guidedStepCompletionMessage(previousStep);
      if (message) showAlert(message, "success");
      scrollGuidedFirstRunIntoView();
    }
  }
  function getPrimaryOpenIssue(data) {
    const issues = getOpenDataIssues(data);
    return issues.find((i) => i.severity === "blocking") || issues[0] || null;
  }
  function runFocusAction() {
    const state = focusActionState || {};
    if (state.mode === "rerun") {
      runtimeBridge.runAuditAnalysis?.();
      return;
    }
    if (state.mode === "wait") {
      runtimeBridge.loadAuditDetail?.();
      return;
    }
    if (state.mode !== "issue" || !state.issueId) {
      runtimeBridge.switchTab?.("data");
      return;
    }
    const issue = (getAuditData()?.data_issues || []).find((i) => i.id === state.issueId);
    runtimeBridge.switchTab?.("data");
    if (!issue) return;
    const actions = issue.actions || [];
    if (actions.includes("fix") && issue.ref_type === "material" && issue.ref_id) {
      runtimeBridge.editMaterial?.(issue.ref_id);
      return;
    }
    if (actions.includes("add_data") || actions.includes("fix")) {
      runtimeBridge.openDataItemAction?.(issue.id, issue);
      return;
    }
    if (actions.includes("accept_limitation")) {
      runtimeBridge.acceptDataLimitation?.(issue.id);
    }
  }
  function updateMoreMenuDraft(data) {
    const draftBtn = document.getElementById("btnAnalyzeDraft");
    const divider = document.getElementById("moreMenuDivider");
    if (!draftBtn || !data) return;
    const ui = data.workflow_ui || {};
    const primary = ui.primary_button || {};
    const analysisDone = hasGuidedCompletedAnalysis(data);
    const running = currentScreenState === "RUNNING";
    const show = analysisDone && !running;
    draftBtn.style.display = show ? "block" : "none";
    if (divider) divider.style.display = show ? "block" : "none";
    const canRerun = primary.id === "rerun_analysis" ? primary.enabled !== false : analysisDone;
    draftBtn.disabled = !canRerun;
    draftBtn.textContent = "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437";
    draftBtn.title = primary.reason_disabled || "\u041F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0439 \u0437\u0430\u043F\u0443\u0441\u043A AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u043C";
  }
  function renderAuditCommandBar(data) {
    if (!data) return;
    const ui = data.workflow_ui || {};
    const ws = data.workflow_state || {};
    const coverage = data.data_coverage || {};
    const openIssues = getOpenDataIssues(data);
    const blockingIssues = openIssues.filter((i) => i.severity === "blocking");
    const issueCount = openIssues.length;
    const blockingCount = blockingIssues.length;
    const optionalCount = Math.max(0, issueCount - blockingCount);
    const missingLabels = (coverage.missing_items || []).slice(0, 4).map((i) => i.label).filter(Boolean);
    const reviewProgress = getFindingReviewProgress(data);
    const screenState = resolveScreenState(data);
    currentScreenState = screenState;
    if (screenState !== "RUNNING") {
      dismissAlertsMatching(/AI-анализ запущен|Черновой AI-анализ запущен/i);
    }
    const uiModel = buildScreenStateUiModel(screenState, {
      blockingCount,
      optionalCount,
      missingLabels,
      reviewCount: reviewProgress.pending,
      reviewProgress
    });
    const readyBar = document.getElementById("readyToRunBar");
    const readyText = document.getElementById("readyToRunText");
    const primaryBtn = document.getElementById("btnAnalyze");
    const running = ws.analysis_running || data.status === "in_progress";
    const onDirectTab = isDirectDataSubtabActive();
    const directExcelReady = hasDirectExcelSlice(data);
    const analysisDone = hasGuidedCompletedAnalysis(data);
    const hideCommandBar = screenState === "BLOCKED_REQUIRED" && !(onDirectTab && directExcelReady);
    const showCommandStrip = onDirectTab ? directExcelReady || analysisDone || screenState === "RUNNING" : !hideCommandBar;
    setAuditCommandBarVisible(showCommandStrip);
    const statusEl = document.getElementById("auditStatus");
    const simplifyDirectChrome = onDirectTab && directExcelReady && !hasGuidedCompletedAnalysis(data);
    const showHeaderProgress = !simplifyDirectChrome && !running && screenState !== "BLOCKED_REQUIRED" && (coverage.has_materials || (coverage.structure_percent ?? 0) > 0 || (coverage.audit_percent ?? 0) > 0 || ["READY_FOR_ANALYSIS", "DATA_NEEDS_REVIEW", "ANALYSIS_DONE", "REPORT_READY"].includes(ws.state));
    if (statusEl) {
      const showStatusBadge = ["RUNNING", "FAILED", "RESULTS_NEED_REVIEW", "PRELIMINARY_REPORT"].includes(screenState) || !showHeaderProgress && screenState !== "READY_TO_RUN";
      if (!showStatusBadge) {
        statusEl.style.display = "none";
      } else {
        statusEl.style.display = "";
        let statusText = uiModel.status || ui.status_label || ws.label || runtimeBridge.getStatusLabel?.(data.status);
        if (screenState === "RESULTS_NEED_REVIEW" && reviewProgress.total > 0) {
          statusText = formatReviewProgressLine2(reviewProgress);
        }
        statusEl.textContent = statusText;
        const badgeClass = ws.analysis_failed ? "failed" : ws.analysis_running ? "in_progress" : blockingCount > 0 ? "needs_review" : issueCount > 0 ? "needs_review" : data.status;
        statusEl.className = `badge badge-${badgeClass}`;
      }
    }
    const hintEl = document.getElementById("auditNextStepHint");
    if (hintEl) {
      let hintText = simplifyDirectChrome ? "" : uiModel.hint || "";
      if (!hintText && screenState !== "READY_TO_RUN") {
        hintText = ui.next_action_hint || "";
      }
      hintEl.textContent = hintText;
      hintEl.style.display = hintText ? "" : "none";
    }
    if (statusEl && simplifyDirectChrome) {
      statusEl.style.display = "none";
    }
    if (primaryBtn) {
      primaryBtn.style.display = screenState === "BLOCKED_REQUIRED" || usesPostAnalysisHero(screenState) ? "none" : "";
      primaryBtn.classList.remove("btn-outline", "btn-success", "btn-danger", "btn-primary");
      if (uiModel.primaryLabel) primaryBtn.textContent = uiModel.primaryLabel;
      if (uiModel.primaryClass) primaryBtn.classList.add(uiModel.primaryClass);
      const serverPrimary = ui.primary_button || {};
      const serverBlocksRun = serverPrimary.enabled === false && uiModel.primaryAction === "run" && ["READY_TO_RUN", "FAILED", "PRELIMINARY_REPORT"].includes(screenState);
      if (serverBlocksRun) {
        primaryBtn.disabled = true;
        primaryBtn.classList.remove("btn-success", "btn-primary");
        primaryBtn.classList.add("btn-outline");
        primaryBtn.title = serverPrimary.reason_disabled || "\u0418\u0441\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0435\u0440\u0435\u0434 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C";
      } else {
        primaryBtn.disabled = false;
        primaryBtn.title = serverPrimary.reason_disabled || uiModel.hint || primaryBtn.textContent;
      }
    }
    runtimeBridge.renderAnalysisStaleBar?.(data);
    if (readyBar && readyText) {
      readyBar.style.display = "none";
      readyText.textContent = "";
    }
    const renderFocus = () => {
      const focusBox = document.getElementById("auditFocusBanner");
      const focusKpi = document.getElementById("auditFocusKpi");
      const focusProblem = document.getElementById("auditFocusProblem");
      const focusWhy = document.getElementById("auditFocusWhy");
      const focusAction = document.getElementById("auditFocusAction");
      const focusBtn = document.getElementById("auditFocusActionBtn");
      if (!focusBox || !focusKpi || !focusProblem || !focusWhy || !focusAction || !focusBtn) return "is-warning";
      const primary = ui.primary_button || {};
      let actionLabel = (primary.label || "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437").replace(/^[🤖📝🔄⏳]\s*/, "");
      if (hasGuidedCompletedAnalysis(data) && /запустить ai-анализ/i.test(actionLabel)) {
        actionLabel = "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437";
      }
      const coveragePct = Number(coverage.audit_percent || 0);
      const topIssue = getPrimaryOpenIssue(data);
      let tone = "is-warning";
      let problemText = "\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435 \u0442\u0430\u043A: \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430.";
      let whyText = "\u0411\u0435\u0437 \u043C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043D\u0430\u0431\u043E\u0440\u0430 \u0432\u0445\u043E\u0434\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 AI \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0434\u0430\u0442\u044C \u043D\u0430\u0434\u0451\u0436\u043D\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B.";
      let actionText = `\u0427\u0442\u043E \u043D\u0430\u0436\u0430\u0442\u044C \u0434\u0430\u043B\u044C\u0448\u0435: ${actionLabel}.`;
      let buttonText = "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441";
      let kpiText = "\u0414\u043E \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438: \u0441\u0447\u0438\u0442\u0430\u0435\u043C\u2026";
      focusActionState = { mode: "issue", issueId: topIssue?.id || null };
      if (ws.analysis_running || data.status === "in_progress") {
        tone = "is-warning";
        kpiText = `\u0414\u043E \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438: ${blockingCount} \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0445, ${issueCount} \u0432\u0441\u0435\u0433\u043E.`;
        problemText = "\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435 \u0442\u0430\u043A: \u0430\u043D\u0430\u043B\u0438\u0437 \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D.";
        whyText = "\u041F\u043E\u043A\u0430 \u0440\u0430\u0441\u0447\u0451\u0442 \u043D\u0435 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u0442\u0441\u044F, \u0432\u044B\u0432\u043E\u0434\u044B \u0438 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043C\u043E\u0433\u0443\u0442 \u0431\u044B\u0442\u044C \u043D\u0435\u043F\u043E\u043B\u043D\u044B\u043C\u0438.";
        actionText = "\u0427\u0442\u043E \u043D\u0430\u0436\u0430\u0442\u044C \u0434\u0430\u043B\u044C\u0448\u0435: \u0434\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442.";
        buttonText = "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441";
        focusActionState = { mode: "wait" };
      } else if (ws.analysis_failed || data.status === "failed") {
        tone = "is-danger";
        kpiText = `\u0414\u043E \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438: ${blockingCount} \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0445, ${issueCount} \u0432\u0441\u0435\u0433\u043E.`;
        problemText = "\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435 \u0442\u0430\u043A: \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0437\u0430\u043F\u0443\u0441\u043A \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043E\u0448\u0438\u0431\u043A\u043E\u0439.";
        whyText = "\u0411\u0435\u0437 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u043E\u0442\u0447\u0451\u0442 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0447\u0430\u0441\u0442\u0438\u0447\u043D\u044B\u043C \u0438 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432 \u043A \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044E.";
        actionText = `\u0427\u0442\u043E \u043D\u0430\u0436\u0430\u0442\u044C \u0434\u0430\u043B\u044C\u0448\u0435: ${actionLabel}.`;
        buttonText = "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437";
        focusActionState = { mode: "rerun" };
      } else if (blockingCount > 0) {
        tone = "is-danger";
        kpiText = `\u0414\u043E \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438: ${blockingCount} \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0445, ${issueCount} \u0432\u0441\u0435\u0433\u043E.`;
        problemText = `\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435 \u0442\u0430\u043A: ${blockingCount} \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043F\u0443\u043D\u043A\u0442\u043E\u0432 \u0431\u043B\u043E\u043A\u0438\u0440\u0443\u044E\u0442 \u0437\u0430\u043F\u0443\u0441\u043A \u0430\u0443\u0434\u0438\u0442\u0430.`;
        whyText = topIssue?.reason ? `\u041F\u043E\u0447\u0435\u043C\u0443 \u043C\u0435\u0448\u0430\u0435\u0442: ${topIssue.reason}` : "\u041F\u043E\u0447\u0435\u043C\u0443 \u043C\u0435\u0448\u0430\u0435\u0442: \u0431\u0435\u0437 \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u0438\u0442\u043E\u0433\u043E\u0432\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u0431\u0443\u0434\u0443\u0442 \u043D\u0435\u0434\u043E\u0441\u0442\u043E\u0432\u0435\u0440\u043D\u044B.";
        actionText = `\u0427\u0442\u043E \u043D\u0430\u0436\u0430\u0442\u044C \u0434\u0430\u043B\u044C\u0448\u0435: \u0438\u0441\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u044B\u0439 \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0439 \u043F\u0443\u043D\u043A\u0442 \u0438 \u0437\u0430\u0442\u0435\u043C ${actionLabel.toLowerCase()}.`;
        buttonText = "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0439 \u043F\u0443\u043D\u043A\u0442";
      } else if (optionalCount > 0) {
        tone = "is-ok";
        kpiText = `\u0414\u043E \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438: 0 \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0445, \u0443\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0439 ${optionalCount}.`;
        problemText = "\u041A \u0437\u0430\u043F\u0443\u0441\u043A\u0443 \u0433\u043E\u0442\u043E\u0432\u043E: \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0431\u043B\u043E\u043A\u0435\u0440\u043E\u0432 \u043D\u0435\u0442.";
        whyText = topIssue?.reason ? `\u0427\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C: ${topIssue.reason}` : "\u0427\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C: \u0437\u0430\u043A\u0440\u043E\u0439\u0442\u0435 \u0436\u0435\u043B\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043F\u0443\u043D\u043A\u0442\u044B, \u0435\u0441\u043B\u0438 \u0445\u043E\u0442\u0438\u0442\u0435 \u043F\u043E\u0432\u044B\u0441\u0438\u0442\u044C \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u043E\u0442\u0447\u0451\u0442\u0430.";
        actionText = `\u0427\u0442\u043E \u043D\u0430\u0436\u0430\u0442\u044C \u0434\u0430\u043B\u044C\u0448\u0435: ${actionLabel}.`;
        buttonText = actionLabel;
        focusActionState = { mode: "rerun" };
      } else if (coveragePct >= 95 || ws.state === "REPORT_READY" || ws.state === "ANALYSIS_DONE") {
        tone = "is-ok";
        kpiText = "\u0414\u043E \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438: 0 \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0445, 0 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445.";
        problemText = "\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435 \u0442\u0430\u043A: \u043A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0445 \u0431\u043B\u043E\u043A\u0435\u0440\u043E\u0432 \u043D\u0435\u0442.";
        whyText = "\u041F\u043E\u0447\u0435\u043C\u0443 \u044D\u0442\u043E \u0432\u0430\u0436\u043D\u043E: \u0434\u0430\u043D\u043D\u044B\u0435 \u0443\u0436\u0435 \u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u044B, \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u043D\u043E\u0446\u0435\u043D\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442.";
        actionText = `\u0427\u0442\u043E \u043D\u0430\u0436\u0430\u0442\u044C \u0434\u0430\u043B\u044C\u0448\u0435: ${actionLabel}.`;
        buttonText = actionLabel;
        focusActionState = { mode: "rerun" };
      }
      const auditKey = String(data?.id || getCurrentAuditId() || "unknown");
      if (focusKpiTrendState.auditKey !== auditKey) {
        focusKpiTrendState = { auditKey, blocking: null, open: null };
      }
      const prevBlocking = focusKpiTrendState.blocking;
      const prevOpen = focusKpiTrendState.open;
      if (Number.isFinite(prevBlocking) && Number.isFinite(prevOpen) && (prevBlocking !== blockingCount || prevOpen !== issueCount)) {
        const trendPrefix = blockingCount <= prevBlocking && issueCount <= prevOpen ? "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441" : "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435";
        kpiText += ` \xB7 ${trendPrefix}: \u0431\u044B\u043B\u043E ${prevBlocking}/${prevOpen}, \u0441\u0435\u0439\u0447\u0430\u0441 ${blockingCount}/${issueCount}`;
      }
      focusKpiTrendState.blocking = blockingCount;
      focusKpiTrendState.open = issueCount;
      focusBox.classList.remove("is-danger", "is-warning", "is-ok");
      focusBox.classList.add(tone);
      focusKpi.textContent = kpiText;
      focusProblem.textContent = problemText;
      focusWhy.textContent = whyText;
      focusAction.textContent = actionText;
      focusBtn.textContent = buttonText;
      focusBtn.style.display = canWrite() ? "inline-flex" : "none";
      const hideFocusBecauseGuided = screenState === "BLOCKED_REQUIRED" || usesPostAnalysisHero(screenState);
      focusBox.style.display = blockingCount > 0 && !hideFocusBecauseGuided ? "grid" : "none";
      return tone;
    };
    const focusTone = renderFocus();
    const issuesBadge = document.getElementById("issuesStatusBadge");
    const badgeCount = document.getElementById("issuesCountBadge");
    const badgeText = document.getElementById("issuesTextBadge");
    if (issuesBadge && badgeCount) {
      const showReviewBadge = currentScreenState === "RESULTS_NEED_REVIEW" && reviewProgress.pending > 0 && !usesPostAnalysisHero(currentScreenState);
      const showBlockingBeforeRun = !simplifyDirectChrome && !(onDirectTab && !hasGuidedCompletedAnalysis(data)) && !isPostAnalysisScreen(currentScreenState) && currentScreenState !== "RESULTS_NEED_REVIEW" && blockingCount > 0;
      const showPostAnalysisReview = isPostAnalysisScreen(currentScreenState) && reviewProgress.pending > 0;
      issuesBadge.style.display = showReviewBadge || showBlockingBeforeRun || showPostAnalysisReview ? "inline-flex" : "none";
      if (showBlockingBeforeRun) {
        badgeCount.textContent = blockingCount;
        if (badgeText) {
          badgeText.textContent = blockingCount === 1 ? "\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043F\u0443\u043D\u043A\u0442" : "\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043F\u0443\u043D\u043A\u0442\u043E\u0432";
        }
        issuesBadge.title = `${blockingCount} \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043F\u0443\u043D\u043A\u0442\u043E\u0432 \u0432 \u0434\u0430\u043D\u043D\u044B\u0445`;
      } else if (showReviewBadge || showPostAnalysisReview) {
        const displayCount = reviewProgress.pending;
        badgeCount.textContent = displayCount;
        if (badgeText) {
          badgeText.textContent = currentScreenState === "RESULTS_NEED_REVIEW" ? displayCount === 1 ? "\u0432\u044B\u0432\u043E\u0434 \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435" : "\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435" : "\u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438";
        }
        issuesBadge.title = pluralizeFindingsReview2(displayCount);
      }
    }
    const strip = document.getElementById("auditProgressStrip");
    if (strip) {
      strip.style.display = showHeaderProgress ? "flex" : "none";
      if (showHeaderProgress) runtimeBridge.renderCoverageProgress?.(coverage);
    }
    updateMoreMenuDraft(data);
    if (running) {
      const stuck = runtimeBridge.isAnalysisLikelyStuck?.(data);
      runtimeBridge.showAnalysisProgress?.({
        percent: 50,
        status: "in_progress",
        message: stuck ? "AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0434\u043E\u043B\u0433\u043E \u043D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442. \u041C\u043E\u0436\u043D\u043E \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441 \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0441\u043D\u043E\u0432\u0430." : ui.next_action_hint || "AI \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B\u2026"
      });
      const bar = document.getElementById("analysisProgress");
      if (bar && stuck && canWrite()) {
        let resetBtn2 = document.getElementById("btnResetStuckAnalysis");
        if (!resetBtn2) {
          resetBtn2 = document.createElement("button");
          resetBtn2.id = "btnResetStuckAnalysis";
          resetBtn2.type = "button";
          resetBtn2.className = "btn btn-outline btn-sm btn-mt-xs";
          resetBtn2.textContent = "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0437\u0430\u0432\u0438\u0441\u0448\u0438\u0439 \u0430\u043D\u0430\u043B\u0438\u0437";
          resetBtn2.onclick = () => runtimeBridge.resetStuckAnalysis?.();
          bar.appendChild(resetBtn2);
        }
        resetBtn2.style.display = "inline-flex";
      } else {
        const resetBtn2 = document.getElementById("btnResetStuckAnalysis");
        if (resetBtn2) resetBtn2.style.display = "none";
      }
      return;
    }
    const resetBtn = document.getElementById("btnResetStuckAnalysis");
    if (resetBtn) resetBtn.style.display = "none";
    runtimeBridge.hideAnalysisProgress?.();
    if (ws.analysis_failed || data.status === "failed") {
      const bar = document.getElementById("analysisProgress");
      if (bar) {
        bar.style.display = "block";
        bar.classList.add("audit-running-failed");
        const msg = document.getElementById("analysisProgressMessage");
        if (msg) msg.textContent = ui.next_action_hint || "\u0410\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043E\u0448\u0438\u0431\u043A\u043E\u0439. \u0418\u0441\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u0437\u0430\u043F\u0443\u0441\u043A.";
      }
    } else {
      const bar = document.getElementById("analysisProgress");
      if (bar) bar.classList.remove("audit-running-failed");
    }
  }
  function applyWorkflowReportVisibility(data) {
    const ws = data?.workflow_state || {};
    const failed = ws.analysis_failed || data?.status === "failed";
    const showAi = ws.show_ai_report_sections && !failed;
    const hasMonthly = (data?.direct_analytics?.monthly || []).length > 0;
    const dynamicsOnly = !showAi && hasMonthly && !failed;
    const failedBanner = document.getElementById("analysisFailedBanner");
    if (failedBanner) {
      failedBanner.style.display = failed ? "block" : "none";
      failedBanner.innerHTML = failed ? `
            <div class="analysis-failed-banner">
                <strong>AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D</strong>
                <p>AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043E\u0448\u0438\u0431\u043A\u043E\u0439. \u041D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430\xBB \u2014 \u0442\u043E\u043B\u044C\u043A\u043E KPI; \u043F\u043E\u043B\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442 \u043F\u043E\u0441\u043B\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>
            </div>` : "";
    }
    const setBlock = (id, visible) => {
      const el = document.getElementById(id);
      if (el) el.style.display = visible ? "" : "none";
    };
    const clientReportIds = [
      "reportSendStatus",
      "reportExecutiveHero",
      "reportAiSummaryCard",
      "reportConfirmedPreviewCard",
      "reportOfferCard",
      "reportAuditPlanCard",
      "reportIllustrationsGuideCard",
      "reportAppendixCard"
    ];
    clientReportIds.forEach((id) => setBlock(id, showAi));
    const prePdfCard = document.querySelector(".report-pre-pdf-card");
    if (prePdfCard) prePdfCard.style.display = showAi ? "" : "none";
    const internalDetails = document.querySelector(".report-internal-details");
    if (internalDetails) internalDetails.style.display = showAi ? "" : "none";
    setBlock("chartsContainer", showAi);
    setBlock("auditFlowContainer", showAi);
    const zoneBox = document.getElementById("zoneScoresContainer");
    if (zoneBox && !showAi) {
      zoneBox.innerHTML = "";
      zoneBox.style.display = "none";
    }
    setBlock("reportDynamicsLead", dynamicsOnly);
    const dynamicsTitle = document.getElementById("reportDynamicsLeadTitle");
    const dynamicsHint = document.getElementById("reportDynamicsLeadHint");
    if (dynamicsTitle && dynamicsOnly) {
      dynamicsTitle.textContent = DIRECT_COPY.dynamicsLeadTitle;
    }
    if (dynamicsHint && dynamicsOnly) {
      dynamicsHint.textContent = DIRECT_COPY.dynamicsLeadHint;
    }
    const showDynamicsBlock = dynamicsOnly || showAi;
    setBlock("comparisonContainer", showDynamicsBlock);
    setBlock("reportMetricsCard", showDynamicsBlock);
    setBlock("healthKpiStrip", showDynamicsBlock && Boolean(data?.direct_analytics?.health));
    if (failed) {
      if (zoneBox) zoneBox.innerHTML = "";
      const chartsBox = document.getElementById("chartsContainer");
      if (chartsBox) chartsBox.innerHTML = "";
      const flowBox = document.getElementById("auditFlowContainer");
      if (flowBox) flowBox.innerHTML = "";
    }
  }
  async function showAnalysisCompleteModal(data) {
    if (!data || !hasGuidedCompletedAnalysis(data)) return;
    const runAt = data?.analysis_freshness?.last_analysis_at || data?.updated_at || "latest";
    const runKey = `${getCurrentAuditId()}:${runAt}`;
    if (analysisCompleteModalShownForRun === runKey) return;
    const findings = data?.findings || [];
    const progress = getFindingReviewProgress(data);
    const confirmed = findings.filter((f) => ["human_confirmed", "human_edited"].includes(f.status)).length;
    const rejected = findings.filter((f) => f.status === "human_rejected").length;
    const total = findings.length;
    const pending = progress.pending;
    let hintsBlock = "";
    try {
      const auditId = getCurrentAuditId();
      if (auditId) {
        const { hints } = await apiRequest(`/api/audits/${auditId}/post-analysis-hints`);
        if (hints?.length) {
          hintsBlock = "\n\n\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438:\n" + hints.map((h) => `\u2022 ${h.title}: ${h.text}`).join("\n");
        }
      }
    } catch (_e) {
    }
    const goReview = await showConfirmDialog({
      title: "AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D",
      message: `\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0432\u044B\u0432\u043E\u0434\u043E\u0432: ${total}
\u2014 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E: ${confirmed}
\u2014 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E: ${rejected}
\u2014 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438: ${pending}${hintsBlock}`,
      confirmText: pending > 0 ? "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0432\u044B\u0432\u043E\u0434\u0430\u043C" : "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442",
      cancelText: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
      confirmType: "primary"
    });
    analysisCompleteModalShownForRun = runKey;
    if (!goReview) return;
    if (pending > 0) {
      runtimeBridge.switchTab?.("results");
      setTimeout(() => scrollToPendingFindings(), 120);
    } else {
      openReportPanel();
    }
  }
  function queuePostAnalysisUiJump(enabled) {
    jumpToPostAnalysisTab = Boolean(enabled);
    pendingAnalysisCompleteModal = Boolean(enabled);
  }
  function consumePostAnalysisNavigation() {
    if (jumpToPostAnalysisTab && isPostAnalysisScreen(currentScreenState)) {
      const target = ["RESULTS_READY", "RESULTS_NEED_REVIEW"].includes(currentScreenState) ? "results" : "report";
      runtimeBridge.switchTab?.(target);
      jumpToPostAnalysisTab = false;
      return true;
    }
    return false;
  }
  function consumeAnalysisCompleteModal(data) {
    if (pendingAnalysisCompleteModal && hasGuidedCompletedAnalysis(data)) {
      pendingAnalysisCompleteModal = false;
      showAnalysisCompleteModal(data);
    }
  }
  function getGuidedStepSnapshot() {
    return guidedStepState?.step ?? null;
  }
  function getCurrentScreenState() {
    return currentScreenState;
  }

  // src/audit-detail/direct-health-rules-reference.js
  var DIRECT_HEALTH_INFO = {
    checksTitle: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 Excel",
    sourceHint: "\u0426\u0438\u0444\u0440\u044B \u0438\u0437 \u041C\u0430\u0441\u0442\u0435\u0440 \u043E\u0442\u0447\u0451\u0442\u0430 \u2014 ",
    sourceLink: "\u043E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB \u2192 \xAB\u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442\xBB"
  };
  var ZONES = [
    {
      id: "semantics",
      label: "\u0421\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0430 \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u0430",
      hint: "\u041A\u043E\u043B\u043E\u043D\u043A\u0430 \xAB\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\xBB \u0432 \u041C\u0430\u0441\u0442\u0435\u0440 \u043E\u0442\u0447\u0451\u0442\u0435"
    },
    {
      id: "campaigns",
      label: "\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u0438",
      hint: "\u0421\u0442\u0440\u043E\u043A\u0438 \u0441\u0440\u0435\u0437\u0430 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C \u0438\u0437 Excel"
    },
    {
      id: "dynamics",
      label: "\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C",
      hint: "\u041F\u043E\u043C\u0435\u0441\u044F\u0447\u043D\u044B\u0435 KPI \u0438 \u0442\u0440\u0435\u043D\u0434\u044B"
    },
    {
      id: "data_quality",
      label: "\u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u0430\u043D\u043D\u044B\u0445",
      hint: "\u0421\u0432\u043E\u0434\u043D\u044B\u0435 \u0446\u0438\u0444\u0440\u044B \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434 (\u043B\u0438\u0434\u044B, CPL, \u0444\u043E\u0440\u043C\u044B/\u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u044B)"
    }
  ];
  var RULES = [
    {
      id: "semantics_top3_concentration",
      zone: "semantics",
      severity: "high",
      title: "\u041A\u043E\u043D\u0446\u0435\u043D\u0442\u0440\u0430\u0446\u0438\u044F \u0440\u0430\u0441\u0445\u043E\u0434\u0430 \u0432 \u0442\u043E\u043F-3 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u0445",
      checks: "\u0411\u043E\u043B\u044C\u0448\u0430\u044F \u0447\u0430\u0441\u0442\u044C \u0431\u044E\u0434\u0436\u0435\u0442\u0430 \u0443\u0445\u043E\u0434\u0438\u0442 \u0432 \u0442\u0440\u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u0430.",
      action: "\u0420\u0430\u0441\u0448\u0438\u0440\u0438\u0442\u044C \u0441\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0443 \u0438 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043C\u0438\u043D\u0443\u0441-\u0441\u043B\u043E\u0432\u0430."
    },
    {
      id: "semantics_top3_concentration_warn",
      zone: "semantics",
      severity: "medium",
      title: "\u0417\u0430\u043C\u0435\u0442\u043D\u0430\u044F \u043A\u043E\u043D\u0446\u0435\u043D\u0442\u0440\u0430\u0446\u0438\u044F \u0432 \u0442\u043E\u043F-3 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u0445",
      checks: "\u041D\u0430 \u0442\u043E\u043F-3 \u0443\u0441\u043B\u043E\u0432\u0438\u0439 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u043E\u0442 60% \u0440\u0430\u0441\u0445\u043E\u0434\u0430.",
      action: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043C\u0438\u043D\u0443\u0441-\u0441\u043B\u043E\u0432\u0430 \u0438 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0438."
    },
    {
      id: "semantics_high_spend_zero_leads",
      zone: "semantics",
      severity: "high",
      title: "\u0420\u0430\u0441\u0445\u043E\u0434 \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432 \u0432 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u0445 \u043F\u043E\u043A\u0430\u0437\u0430",
      checks: "\u0415\u0441\u0442\u044C \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0441 \u0437\u0430\u043C\u0435\u0442\u043D\u044B\u043C \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u043C \u0438 \u043D\u0443\u043B\u0451\u043C \u043B\u0438\u0434\u043E\u0432.",
      action: "\u041C\u0438\u043D\u0443\u0441-\u0441\u043B\u043E\u0432\u0430 \u0438 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 \u0441\u0442\u0430\u0432\u043E\u043A \u043F\u043E \u0441\u043B\u0430\u0431\u044B\u043C \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u043C."
    },
    {
      id: "semantics_cpl_dispersion",
      zone: "semantics",
      severity: "medium",
      title: "\u0420\u0430\u0437\u0431\u0440\u043E\u0441 CPL \u043C\u0435\u0436\u0434\u0443 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u043C\u0438",
      checks: "CPL \u0443 \u0445\u0443\u0434\u0448\u0438\u0445 \u0443\u0441\u043B\u043E\u0432\u0438\u0439 \u0432 \u0440\u0430\u0437\u044B \u0432\u044B\u0448\u0435, \u0447\u0435\u043C \u0443 \u043B\u0443\u0447\u0448\u0438\u0445.",
      action: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u0431\u044E\u0434\u0436\u0435\u0442 \u0432 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0441 \u043B\u0443\u0447\u0448\u0438\u043C CPL."
    },
    {
      id: "semantics_autotarget_share",
      zone: "semantics",
      severity: "medium",
      title: "\u0412\u044B\u0441\u043E\u043A\u0430\u044F \u0434\u043E\u043B\u044F \u0430\u0432\u0442\u043E\u0442\u0430\u0440\u0433\u0435\u0442\u0438\u043D\u0433\u0430",
      checks: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u0430\u044F \u0434\u043E\u043B\u044F \u0440\u0430\u0441\u0445\u043E\u0434\u0430 \u043D\u0430 \u0430\u0432\u0442\u043E\u0442\u0430\u0440\u0433\u0435\u0442\u0438\u043D\u0433.",
      action: "\u0421\u0443\u0437\u0438\u0442\u044C \u0430\u0432\u0442\u043E\u0442\u0430\u0440\u0433\u0435\u0442\u0438\u043D\u0433, \u0443\u0441\u0438\u043B\u0438\u0442\u044C \u0440\u0443\u0447\u043D\u0443\u044E \u0441\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0443."
    },
    {
      id: "semantics_narrow_base",
      zone: "semantics",
      severity: "low",
      title: "\u0423\u0437\u043A\u0430\u044F \u0431\u0430\u0437\u0430 \u0443\u0441\u043B\u043E\u0432\u0438\u0439",
      checks: "\u041C\u0430\u043B\u043E \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0445 \u0443\u0441\u043B\u043E\u0432\u0438\u0439 \u043F\u0440\u0438 \u0437\u0430\u043C\u0435\u0442\u043D\u043E\u043C \u0440\u0430\u0441\u0445\u043E\u0434\u0435.",
      action: "\u0420\u0430\u0441\u0448\u0438\u0440\u0438\u0442\u044C \u0441\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0443 \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043E\u0445\u0432\u0430\u0442."
    },
    {
      id: "semantics_waste_share",
      zone: "semantics",
      severity: "medium",
      title: "\u0414\u043E\u043B\u044F \u0441\u043B\u0438\u0432\u0430 \u0432 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u0445 \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432",
      checks: "\u0417\u0430\u043C\u0435\u0442\u043D\u0430\u044F \u0434\u043E\u043B\u044F \u0431\u044E\u0434\u0436\u0435\u0442\u0430 \u0443\u0445\u043E\u0434\u0438\u0442 \u0432 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432.",
      action: "\u0421\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u044C \u043D\u0435\u044D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F."
    },
    {
      id: "semantics_keyword_concentration",
      zone: "semantics",
      severity: "medium",
      title: "\u041A\u043E\u043D\u0446\u0435\u043D\u0442\u0440\u0430\u0446\u0438\u044F \u043D\u0430 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0445 \u0444\u0440\u0430\u0437\u0430\u0445",
      checks: "\u0411\u043E\u043B\u044C\u0448\u0430\u044F \u0434\u043E\u043B\u044F \u0440\u0430\u0441\u0445\u043E\u0434\u0430 \u043D\u0430 \u0443\u0437\u043A\u0438\u0439 \u043D\u0430\u0431\u043E\u0440 \u0444\u0440\u0430\u0437.",
      action: "\u0414\u0438\u0432\u0435\u0440\u0441\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0443."
    },
    {
      id: "campaigns_budget_concentration",
      zone: "campaigns",
      severity: "medium",
      title: "\u0411\u044E\u0434\u0436\u0435\u0442 \u0432 \u043E\u0434\u043D\u043E\u0439 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438",
      checks: "\u041E\u0434\u043D\u0430 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F \u0437\u0430\u0431\u0438\u0440\u0430\u0435\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u043E\u043B\u043E\u0432\u0438\u043D\u044B \u0440\u0430\u0441\u0445\u043E\u0434\u0430.",
      action: "\u041F\u0435\u0440\u0435\u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0431\u044E\u0434\u0436\u0435\u0442 \u043C\u0435\u0436\u0434\u0443 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C\u0438."
    },
    {
      id: "campaigns_spend_no_leads",
      zone: "campaigns",
      severity: "high",
      title: "\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u0438 \u0441 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u043C \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432",
      checks: "\u0415\u0441\u0442\u044C \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438 \u0441 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u043C \u043E\u0442 5 000 \u20BD \u0438 \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432.",
      action: "\u041F\u0430\u0443\u0437\u0430 \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438."
    },
    {
      id: "campaigns_cpl_spread",
      zone: "campaigns",
      severity: "medium",
      title: "\u0420\u0430\u0437\u0431\u0440\u043E\u0441 CPL \u043C\u0435\u0436\u0434\u0443 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C\u0438",
      checks: "CPL \u0441\u0438\u043B\u044C\u043D\u043E \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F \u043C\u0435\u0436\u0434\u0443 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C\u0438.",
      action: "\u041C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438."
    },
    {
      id: "campaigns_leads_concentration",
      zone: "campaigns",
      severity: "low",
      title: "\u041B\u0438\u0434\u044B \u0432 \u043E\u0434\u043D\u043E\u0439 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438",
      checks: "\u0411\u043E\u043B\u044C\u0448\u0438\u043D\u0441\u0442\u0432\u043E \u043B\u0438\u0434\u043E\u0432 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442 \u0438\u0437 \u043E\u0434\u043D\u043E\u0439 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438.",
      action: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0445 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0439."
    },
    {
      id: "campaigns_low_conversion",
      zone: "campaigns",
      severity: "high",
      title: "\u041A\u043B\u0438\u043A\u0438 \u0431\u0435\u0437 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0439",
      checks: "\u041C\u043D\u043E\u0433\u043E \u043A\u043B\u0438\u043A\u043E\u0432, \u043D\u043E \u043D\u0435\u0442 \u043B\u0438\u0434\u043E\u0432 \u043F\u043E \u0446\u0435\u043B\u044F\u043C.",
      action: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u044B\u0435 \u0438 \u0446\u0435\u043B\u0438 \u041C\u0435\u0442\u0440\u0438\u043A\u0438."
    },
    {
      id: "dynamics_short_history",
      zone: "dynamics",
      severity: "low",
      title: "\u041A\u043E\u0440\u043E\u0442\u043A\u0430\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C",
      checks: "\u0412 \u0441\u0440\u0435\u0437\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u0434\u0432\u0443\u0445 \u043F\u043E\u043B\u043D\u044B\u0445 \u043C\u0435\u0441\u044F\u0446\u0435\u0432.",
      action: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0431\u043E\u043B\u0435\u0435 \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434 \u0432 Excel."
    },
    {
      id: "dynamics_cpl_volatility",
      zone: "dynamics",
      severity: "medium",
      title: "\u041D\u0435\u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u044B\u0439 CPL",
      checks: "CPL \u0441\u0438\u043B\u044C\u043D\u043E \u043F\u0440\u044B\u0433\u0430\u0435\u0442 \u043E\u0442 \u043C\u0435\u0441\u044F\u0446\u0430 \u043A \u043C\u0435\u0441\u044F\u0446\u0443.",
      action: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0435\u0437\u043E\u043D\u043D\u043E\u0441\u0442\u044C \u0438 \u0441\u0442\u0430\u0432\u043A\u0438."
    },
    {
      id: "dynamics_leads_drop",
      zone: "dynamics",
      severity: "medium",
      title: "\u041F\u0430\u0434\u0435\u043D\u0438\u0435 \u043B\u0438\u0434\u043E\u0432",
      checks: "\u0412 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u043C \u043C\u0435\u0441\u044F\u0446\u0435 \u043B\u0438\u0434\u043E\u0432 \u0437\u0430\u043C\u0435\u0442\u043D\u043E \u043C\u0435\u043D\u044C\u0448\u0435, \u0447\u0435\u043C \u0440\u0430\u043D\u044C\u0448\u0435.",
      action: "\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u0441\u0442\u0430\u0432\u043A\u0438 \u0438 \u0441\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0443."
    },
    {
      id: "dynamics_cpl_rise",
      zone: "dynamics",
      severity: "medium",
      title: "\u0420\u043E\u0441\u0442 CPL",
      checks: "CPL \u0432\u044B\u0440\u043E\u0441 \u0431\u043E\u043B\u0435\u0435 \u0447\u0435\u043C \u043D\u0430 \u0447\u0435\u0442\u0432\u0435\u0440\u0442\u044C \u043A \u043F\u0440\u043E\u0448\u043B\u043E\u043C\u0443 \u043C\u0435\u0441\u044F\u0446\u0443.",
      action: "\u041E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u0432\u043A\u0438 \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F."
    },
    {
      id: "dynamics_month_leads_gap",
      zone: "dynamics",
      severity: "low",
      title: "\u0420\u0430\u0437\u0431\u0440\u043E\u0441 \u043B\u0438\u0434\u043E\u0432 \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C",
      checks: "\u0421\u0438\u043B\u044C\u043D\u0430\u044F \u0440\u0430\u0437\u043D\u0438\u0446\u0430 \u0432 \u0447\u0438\u0441\u043B\u0435 \u043B\u0438\u0434\u043E\u0432 \u043C\u0435\u0436\u0434\u0443 \u043C\u0435\u0441\u044F\u0446\u0430\u043C\u0438.",
      action: "\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u043F\u0440\u0430\u043A\u0442\u0438\u043A\u0438 \u043B\u0443\u0447\u0448\u0435\u0433\u043E \u043C\u0435\u0441\u044F\u0446\u0430."
    },
    {
      id: "dynamics_cost_spike",
      zone: "dynamics",
      severity: "medium",
      title: "\u0421\u043A\u0430\u0447\u043E\u043A \u0440\u0430\u0441\u0445\u043E\u0434\u0430",
      checks: "\u0420\u0435\u0437\u043A\u0438\u0439 \u0440\u043E\u0441\u0442 \u0440\u0430\u0441\u0445\u043E\u0434\u0430 \u043A \u043F\u0440\u043E\u0448\u043B\u043E\u043C\u0443 \u043C\u0435\u0441\u044F\u0446\u0443.",
      action: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0442\u0430\u0432\u043A\u0438 \u0438 \u0434\u043D\u0435\u0432\u043D\u044B\u0435 \u0431\u044E\u0434\u0436\u0435\u0442\u044B."
    },
    {
      id: "dynamics_zero_leads_month",
      zone: "dynamics",
      severity: "high",
      title: "\u041C\u0435\u0441\u044F\u0446 \u0441 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u043C \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432",
      checks: "\u0415\u0441\u0442\u044C \u043C\u0435\u0441\u044F\u0446 \u0441 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u043C \u043E\u0442 5 000 \u20BD \u0438 \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432.",
      action: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0446\u0435\u043B\u0438 \u0438 \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0438 \u041C\u0435\u0442\u0440\u0438\u043A\u0438."
    },
    {
      id: "data_quality_spend_no_leads",
      zone: "data_quality",
      severity: "critical",
      title: "\u0420\u0430\u0441\u0445\u043E\u0434 \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432 \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434",
      checks: "\u0417\u0430 \u0432\u0435\u0441\u044C \u043F\u0435\u0440\u0438\u043E\u0434 \u0435\u0441\u0442\u044C \u0440\u0430\u0441\u0445\u043E\u0434, \u043D\u043E \u043D\u0435\u0442 \u043B\u0438\u0434\u043E\u0432.",
      action: "\u0421\u0440\u043E\u0447\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0446\u0435\u043B\u0438 \u0438 \u0442\u0440\u0435\u043A\u0438\u043D\u0433."
    },
    {
      id: "data_quality_high_account_cpl",
      zone: "data_quality",
      severity: "medium",
      title: "CPL \u0432\u044B\u0448\u0435 \u0441\u0440\u0435\u0434\u043D\u0435\u0433\u043E \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C",
      checks: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 CPL \u043F\u043E \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0443 \u0432\u044B\u0448\u0435 \u0442\u0438\u043F\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C.",
      action: "\u0421\u043D\u0438\u0437\u0438\u0442\u044C CPL \u0447\u0435\u0440\u0435\u0437 \u0441\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0443 \u0438 \u0441\u0442\u0430\u0432\u043A\u0438."
    },
    {
      id: "data_quality_channel_imbalance",
      zone: "data_quality",
      severity: "low",
      title: "\u0414\u0438\u0441\u0431\u0430\u043B\u0430\u043D\u0441 \u0444\u043E\u0440\u043C \u0438 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u043E\u0432",
      checks: "\u0421\u0438\u043B\u044C\u043D\u044B\u0439 \u043F\u0435\u0440\u0435\u043A\u043E\u0441 \u043C\u0435\u0436\u0434\u0443 \u0437\u0430\u044F\u0432\u043A\u0430\u043C\u0438 \u0441 \u0444\u043E\u0440\u043C\u044B \u0438 \u0438\u0437 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u043E\u0432.",
      action: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043A\u0440\u0435\u0430\u0442\u0438\u0432\u044B \u0438 \u043F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u044B\u0435."
    },
    {
      id: "ml_monthly_anomaly",
      zone: "dynamics",
      severity: "medium",
      title: "\u0410\u043D\u043E\u043C\u0430\u043B\u0438\u044F \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C",
      checks: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043D\u0435\u043E\u0431\u044B\u0447\u043D\u044B\u0439 \u043C\u0435\u0441\u044F\u0446 \u043F\u043E \u0440\u0430\u0441\u0445\u043E\u0434\u0443 \u0438\u043B\u0438 CPL.",
      action: "\u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u0432\u0441\u043F\u043B\u0435\u0441\u043A\u0438 \u0432 \u043E\u0442\u0447\u0451\u0442\u0435."
    },
    {
      id: "ml_campaign_underperformers",
      zone: "campaigns",
      severity: "medium",
      title: "\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u0438-\u0430\u0443\u0442\u0441\u0430\u0439\u0434\u0435\u0440\u044B",
      checks: "\u0415\u0441\u0442\u044C \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438 \u0437\u0430\u043C\u0435\u0442\u043D\u043E \u0441\u043B\u0430\u0431\u0435\u0435 \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0445 \u043F\u043E \u044D\u0444\u0444\u0435\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u0438.",
      action: "\u041F\u0435\u0440\u0435\u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0431\u044E\u0434\u0436\u0435\u0442."
    },
    {
      id: "ml_cpl_high_cv",
      zone: "dynamics",
      severity: "medium",
      title: "\u0412\u044B\u0441\u043E\u043A\u0430\u044F \u0432\u043E\u043B\u0430\u0442\u0438\u043B\u044C\u043D\u043E\u0441\u0442\u044C CPL",
      checks: "CPL \u043D\u0435\u0441\u0442\u0430\u0431\u0438\u043B\u0435\u043D \u043D\u0430 \u0434\u043B\u0438\u043D\u043D\u043E\u0439 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 (\u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430).",
      action: "\u0421\u0442\u0430\u0431\u0438\u043B\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0430\u0432\u043A\u0438 \u0438 \u0431\u044E\u0434\u0436\u0435\u0442\u044B."
    }
  ];
  var SEVERITY_LABEL = {
    critical: "\u041A\u0440\u0438\u0442\u0438\u0447\u043D\u043E",
    high: "\u0412\u044B\u0441\u043E\u043A\u0438\u0439",
    medium: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439",
    low: "\u041D\u0438\u0437\u043A\u0438\u0439"
  };
  var UI_MAP = [
    { place: "\u0414\u0430\u043D\u043D\u044B\u0435 \u2192 \u0414\u0438\u0440\u0435\u043A\u0442", what: "\u041E\u0446\u0435\u043D\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430, \u0433\u0440\u0430\u0444\u0438\u043A\u0438, \u0440\u0438\u0441\u043A\u0438 Excel, \u044D\u0442\u043E\u0442 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A" },
    { place: "\u0412\u044B\u0432\u043E\u0434\u044B", what: "AI-\u0432\u044B\u0432\u043E\u0434\u044B \u043F\u043E \u0440\u0438\u0441\u043A\u0430\u043C \u2014 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0438 \u0431\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439" },
    { place: "\u041E\u0442\u0447\u0451\u0442", what: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 AI-\u0432\u044B\u0432\u043E\u0434\u044B \u0438 narrative \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430" },
    { place: "AI-\u0447\u0430\u0442", what: "\u041F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0435 \u043E\u0446\u0435\u043D\u043A\u0438 \u2014 \u043D\u0435 \u043F\u043E\u0434\u043C\u0435\u043D\u044F\u0435\u0442 \u0446\u0438\u0444\u0440\u044B Excel" }
  ];
  function rulesByZone() {
    const buckets = {};
    ZONES.forEach((z) => {
      buckets[z.id] = [];
    });
    RULES.forEach((r) => {
      if (buckets[r.zone]) buckets[r.zone].push(r);
    });
    return buckets;
  }
  function renderRuleRow(rule, triggeredSet) {
    const fired = triggeredSet.has(rule.id);
    const sev = SEVERITY_LABEL[rule.severity] || rule.severity;
    return `
        <li class="direct-health-rule-row ${fired ? "direct-health-rule-row--fired" : ""}">
            <span class="direct-health-rule-sev direct-health-rule-sev--${rule.severity}">${sev}</span>
            <div class="direct-health-rule-body">
                <strong>${escapeHtml(rule.title)}</strong>
                ${fired ? '<span class="direct-health-rule-fired">\u0441\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u043E</span>' : ""}
                <p class="muted">${escapeHtml(rule.checks)}</p>
                <p class="direct-health-rule-action">${escapeHtml(rule.action)}</p>
            </div>
        </li>`;
  }
  function renderDirectHealthInfoPanel(health = null) {
    const triggered = new Set(health?.rules_triggered_ids || []);
    const buckets = rulesByZone();
    const zonesHtml = ZONES.map((z) => {
      const rules = buckets[z.id] || [];
      if (!rules.length) return "";
      return `
            <details class="direct-health-rules-zone">
                <summary>${escapeHtml(z.label)} <span class="muted">(${rules.length})</span></summary>
                <p class="muted direct-health-zone-hint">${escapeHtml(z.hint)}</p>
                <ul class="direct-health-rules-list">${rules.map((r) => renderRuleRow(r, triggered)).join("")}</ul>
            </details>`;
    }).join("");
    const firedCount = triggered.size;
    const firedNote = health ? `<p class="direct-health-fired-summary">${firedCount ? `\u0421\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u043E <strong>${firedCount}</strong> \u0438\u0437 ${RULES.length} \u043F\u0440\u043E\u0432\u0435\u0440\u043E\u043A.` : `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043D\u0435 \u0441\u0440\u0430\u0431\u043E\u0442\u0430\u043B\u0438 \u2014 \u0445\u043E\u0440\u043E\u0448\u0438\u0439 \u0437\u043D\u0430\u043A \u0438\u043B\u0438 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445.`}</p>` : "";
    return `
        <details class="direct-health-info-card card">
            <summary class="direct-health-info-summary">\u041A\u0430\u043A \u0443\u0441\u0442\u0440\u043E\u0435\u043D\u0430 ${DIRECT_COPY.healthScoreShort}</summary>
            <div class="direct-health-info-body">
                <section class="direct-health-info-section">
                    <h5>\u041D\u0430 \u0447\u0451\u043C \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u043E</h5>
                    <ul class="direct-health-info-list muted">
                        <li><strong>\u041C\u0430\u0441\u0442\u0435\u0440 \u043E\u0442\u0447\u0451\u0442</strong> (.xlsx) \u0441 \u043A\u043E\u043B\u043E\u043D\u043A\u043E\u0439 \xAB\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\xBB \u2014 ${DIRECT_COPY.excelSourceShort}</li>
                        <li><strong>\u041F\u0435\u0440\u0438\u043E\u0434\u044B KPI</strong> \u2014 ${DIRECT_COPY.leadsFormula}</li>
                        <li><strong>\u041D\u0435 AI:</strong> \u0431\u0430\u043B\u043B \u0438 \u0441\u0438\u0433\u043D\u0430\u043B\u044B \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u0444\u043E\u0440\u043C\u0443\u043B\u0430\u043C; AI \u0442\u043E\u043B\u044C\u043A\u043E \u043E\u0431\u044A\u044F\u0441\u043D\u044F\u0435\u0442 \u0438 \u0434\u043E\u043F\u043E\u043B\u043D\u044F\u0435\u0442 \u0432\u044B\u0432\u043E\u0434\u044B \u043F\u043E \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u043C</li>
                    </ul>
                </section>
                <section class="direct-health-info-section">
                    <h5>\u0413\u0434\u0435 \u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C</h5>
                    <dl class="direct-health-ui-map">
                        ${UI_MAP.map((row) => `
                            <dt>${escapeHtml(row.place)}</dt>
                            <dd class="muted">${escapeHtml(row.what)}</dd>`).join("")}
                    </dl>
                </section>
                <section class="direct-health-info-section">
                    <h5>${DIRECT_HEALTH_INFO.checksTitle}</h5>
                    <p class="muted">\u0414\u043E ${RULES.length} \u043F\u0440\u043E\u0432\u0435\u0440\u043E\u043A \u043F\u043E \u0437\u043E\u043D\u0430\u043C. \u0421\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u043B\u043D\u044B\u0439; \u0432 \u043E\u0446\u0435\u043D\u043A\u0443 \u0432\u0445\u043E\u0434\u044F\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435, \u0434\u043B\u044F \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445.</p>
                    ${firedNote}
                    <div class="direct-health-rules-zones">${zonesHtml}</div>
                </section>
            </div>
        </details>`;
  }

  // src/audit-detail/finding-report-text.js
  var PDF_BLOCK_MARKERS = [
    /текст\s+для\s+pdf\s*:?\s*/i,
    /готовый\s+текст\s+для\s+pdf\s*:?\s*/i,
    /для\s+отчёта\s+клиенту\s*:?\s*/i,
    /для\s+pdf\s*:?\s*/i
  ];
  var SECTION_STOP = /\n\s*(?:что\s+проверить|источники|уверенность|почему\s+такой|provider=)/i;
  var INTERNAL_LINE_RE = [
    /^вывод\s*#\s*\d+/i,
    /^основания\s+для\s+вывода/i,
    /^высокая\s+уверенность/i,
    /^средняя\s+уверенность/i,
    /^низкая\s+уверенность/i,
    /^\[finding_\d+\]/i,
    /^\[mat_\d+\]/i
  ];
  function hasInternalReportLeak(text) {
    const t = String(text || "");
    return /вывод\s*#\s*\d+|\[mat_\d+\]|\[finding_\d+\]/i.test(t);
  }
  function extractPdfBlockFromChat(text) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    for (const re of PDF_BLOCK_MARKERS) {
      const idx = raw.search(re);
      if (idx < 0) continue;
      const head = raw.match(re);
      if (!head) continue;
      let chunk = raw.slice(idx + head[0].length).trim();
      const stop = chunk.search(SECTION_STOP);
      if (stop > 0) chunk = chunk.slice(0, stop).trim();
      if (chunk.length > 10) return chunk;
    }
    return "";
  }
  function sanitizeClientReportText(text) {
    let t = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!t) return "";
    const lines = t.split("\n").filter((line) => {
      const l = line.trim();
      if (!l) return false;
      return !INTERNAL_LINE_RE.some((re) => re.test(l));
    });
    t = lines.join("\n");
    t = t.replace(/\[mat_\d+\]/gi, "").replace(/\[finding_\d+\]/gi, "").replace(/вывод\s*#\s*\d+\s*подтверждён[^\n]*/gi, "").replace(/вывод\s*#\s*\d+[^\n]*/gi, "").replace(/основания\s+для\s+вывода\s*:?\s*/gi, "").replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    return t;
  }
  function sliceSection(body, startRe, stopRes) {
    const m = body.match(startRe);
    if (!m || m.index == null) return "";
    const from = m.index + m[0].length;
    let rest = body.slice(from);
    for (const stop of stopRes) {
      const si = rest.search(stop);
      if (si >= 0) rest = rest.slice(0, si);
    }
    return sanitizeClientReportText(rest.trim());
  }
  function parseChatDraftForFinding(raw) {
    const original = String(raw || "").trim();
    const pdfBlock = extractPdfBlockFromChat(original);
    const source = pdfBlock || original;
    const sanitized = sanitizeClientReportText(source);
    const stripped = sanitized.length < source.length * 0.85 || hasInternalReportLeak(original);
    const result = {
      problem: null,
      recommendation: null,
      expected_impact: null,
      stripped
    };
    if (!sanitized) return result;
    const stopRes = [
      /(?:^|\n)\s*(?:что\s+сделать|рекомендац|ожидаемый\s+эффект|эффект)\s*:?\s*/i,
      /(?:^|\n)\s*\d+[\.\)]\s+/
    ];
    const problem = sliceSection(
      sanitized,
      /(?:^|\n)\s*(?:что\s+не\s+так|проблема|факт)\s*:?\s*/i,
      stopRes
    );
    const recommendation = sliceSection(
      sanitized,
      /(?:^|\n)\s*(?:что\s+сделать|рекомендац|действия)\s*:?\s*/i,
      [/^(?:ожидаемый\s+эффект|эффект)\s*:?\s*/im]
    );
    const effect = sliceSection(
      sanitized,
      /(?:^|\n)\s*(?:ожидаемый\s+эффект|эффект)\s*:?\s*/i,
      []
    );
    if (problem) result.problem = problem.slice(0, 2e3);
    if (recommendation) result.recommendation = recommendation.slice(0, 6e3);
    if (effect) result.expected_impact = effect.slice(0, 1500);
    if (!result.recommendation) {
      const numbered = sanitized.match(/(?:^|\n)\s*\d+[\.\)]\s+[^\n]+/g);
      if (numbered?.length) {
        result.recommendation = numbered.map((l) => l.trim()).join("\n").slice(0, 6e3);
        const firstIdx = sanitized.indexOf(numbered[0]);
        const before = sanitized.slice(0, firstIdx).trim();
        if (!result.problem && before.length >= 15 && before.length <= 600) {
          result.problem = before.slice(0, 2e3);
        }
      } else if (!result.problem) {
        result.recommendation = sanitized.length > 6e3 ? `${sanitized.slice(0, 5997)}\u2026` : sanitized;
      } else {
        result.recommendation = sanitized.slice(0, 6e3);
      }
    }
    return result;
  }
  function isDirectHealthRow(f) {
    if (!f) return false;
    if (f.finding_source === "direct_health") return true;
    if (f.original_ai_output?.source === "direct_health") return true;
    return (f.evidence || []).some((e) => e?.source === "direct_health");
  }
  function normalizeProblemKey(text) {
    return String(text || "").toLowerCase().replace(/\d+([.,]\d+)?/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  }
  function wordOverlapScore(a, b) {
    const wordsA = new Set(a.split(" ").filter((w) => w.length > 3));
    const wordsB = new Set(b.split(" ").filter((w) => w.length > 3));
    if (!wordsA.size || !wordsB.size) return 0;
    let inter = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) inter += 1;
    }
    const union = wordsA.size + wordsB.size - inter;
    return union > 0 ? inter / union : 0;
  }
  function findSimilarConfirmedFindings(finding, allFindings = []) {
    const key = normalizeProblemKey(finding?.problem);
    if (key.length < 18) return [];
    return (allFindings || []).filter((f) => {
      if (!f || f.id === finding.id) return false;
      if (isDirectHealthRow(f)) return false;
      const st = f.status || "";
      if (!["human_confirmed", "human_edited"].includes(st)) return false;
      const other = normalizeProblemKey(f.problem);
      if (other.length < 18) return false;
      if (key.includes(other.slice(0, 50)) || other.includes(key.slice(0, 50))) return true;
      return wordOverlapScore(key, other) >= 0.55;
    });
  }
  function buildPdfObservationPreviewHtml({ areaLabel, problem, recommendation, expectedImpact }) {
    const area = escapeHtml(areaLabel || "\u0412\u044B\u0432\u043E\u0434");
    const p = escapeHtml(String(problem || "").trim() || "\u2014");
    const rec = String(recommendation || "").trim();
    const effect = String(expectedImpact || "").trim();
    let html = `<p class="finding-pdf-preview-head"><strong>${area}</strong></p><p>${p}</p>`;
    if (rec) html += `<p class="muted finding-pdf-preview-rec">${escapeHtml(rec)}</p>`;
    if (effect) html += `<p class="muted finding-pdf-preview-effect">${escapeHtml(effect)}</p>`;
    const leak = hasInternalReportLeak(`${problem || ""}
${rec}`);
    if (leak) {
      html += '<p class="finding-pdf-preview-warn">\u26A0 \u0423\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0435 \u043F\u043E\u043C\u0435\u0442\u043A\u0438 (#N, [mat_]) \u2014 \u0432 PDF \u0438\u0445 \u0431\u044B\u0442\u044C \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u043E.</p>';
    }
    return html;
  }

  // src/audit-detail/findings.js
  function getAuditData2() {
    return runtimeBridge.getAuditData?.() || null;
  }
  function getCurrentAuditId2() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
  }
  function hasGuidedCompletedAnalysis2(data) {
    const ws = data?.workflow_state || {};
    if (ws.analysis_running) return false;
    return ws.state === "ANALYSIS_DONE" || ws.state === "REPORT_READY" || data?.status === "completed";
  }
  function isDirectHealthFinding2(f) {
    if (!f) return false;
    if (f.finding_source === "direct_health") return true;
    if (f.original_ai_output?.source === "direct_health") return true;
    if ((f.evidence || []).some((e) => e?.source === "direct_health")) return true;
    const based = String(f.based_on || "").toLowerCase();
    if (/автопроверка excel|мастер отчёт|direct_analytics|оценка кабинета/.test(based)) return true;
    return false;
  }
  function getDirectHealthRuleTitle(f) {
    const title = String(f?.title || "").trim();
    if (title && title !== "\u0420\u0438\u0441\u043A \u0414\u0438\u0440\u0435\u043A\u0442\u0430") return title;
    const rule = f?.original_ai_output?.rule;
    if (rule?.title) return String(rule.title).trim();
    const template = f?.original_ai_output?.template;
    if (template?.title) return String(template.title).trim();
    return DIRECT_HEALTH_INFO.checksTitle;
  }
  function hasDirectAnalyticsSlice(data) {
    return Boolean((data?.direct_analytics?.monthly || []).length);
  }
  function hasDirectHealthScore(data) {
    return Boolean(data?.direct_analytics?.health);
  }
  function countAiFindings(findings) {
    return (findings || []).filter((f) => f.status !== "human_rejected").filter((f) => !isDirectHealthFinding2(f)).length;
  }
  function buildAiFindingByDirectRef(findings) {
    const map = /* @__PURE__ */ new Map();
    for (const f of findings || []) {
      if (!isAiInterpretationFinding2(f)) continue;
      const key = directRiskRefKey2(getDirectRiskRef2(f));
      if (key && !map.has(key)) map.set(key, f);
    }
    return map;
  }
  function openAiFindingFromDirectRisk(refKey) {
    if (!refKey) return;
    const data = getAuditData2();
    const aiFinding = buildAiFindingByDirectRef(data?.findings).get(refKey);
    runtimeBridge.switchTab?.("results");
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (aiFinding?.id) {
          const el = document.getElementById(`finding-${aiFinding.id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
          el?.classList.add("direct-slice-highlight");
          window.setTimeout(() => el?.classList.remove("direct-slice-highlight"), 2200);
          return;
        }
        openFindingsStubEnrichment();
      }, 120);
    });
  }
  function renderDirectRisksOnDirectPage(data, options = {}) {
    const findings = data?.findings || [];
    const simplified = options.simplified !== false && !hasGuidedCompletedAnalysis2(data);
    const aiByRef = simplified ? /* @__PURE__ */ new Map() : buildAiFindingByDirectRef(findings);
    const directs = findings.filter(isDirectHealthFinding2).filter((f) => f.status !== "human_rejected");
    const syncBtn = `<button type="button" class="btn btn-sm btn-outline-primary" onclick="syncDirectHealthFindings()">${DIRECT_COPY.syncRisksOnDirectPage}</button>`;
    if (!directs.length) {
      return `
        <div id="direct-slice-risks" class="direct-risks-panel direct-risks-panel--empty">
            <h5 class="direct-risks-panel-title">${DIRECT_COPY.risksLabel}</h5>
            <p class="muted direct-risks-panel-empty">\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB${DIRECT_COPY.syncRisksOnDirectPage}\xBB, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0430\u0432\u0442\u043E\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0438\u0437 Excel.</p>
            ${syncBtn}
        </div>`;
    }
    const rows = directs.map((d) => {
      const title = getDirectHealthRuleTitle(d);
      const problem = String(d.problem || "").trim();
      const refKey = directRiskRefKey2(getDirectRiskRef2(d));
      const refAttr = refKey ? ` data-direct-risk="${escapeHtml(refKey)}"` : "";
      const aiFinding = refKey ? aiByRef.get(refKey) : null;
      const aiLink = simplified || !refKey ? "" : aiFinding ? `<button type="button" class="btn btn-link btn-sm direct-risk-ai-link" onclick="openAiFindingFromDirectRisk('${jsAttr(refKey)}')">${escapeHtml(DIRECT_COPY.aiFindingLinkBtn)}</button>` : `<button type="button" class="btn btn-link btn-sm direct-risk-ai-link muted" onclick="setFindingsMarketerFilter('no_ai'); switchTab('results')">${escapeHtml(DIRECT_COPY.filterNoAiEnrichment)}</button>`;
      return `<li class="direct-risk-row"${refAttr}>
            <div class="direct-risk-row-head">
                <strong class="direct-risk-row-title">${escapeHtml(title)}</strong>
                ${aiLink}
            </div>
            ${problem ? `<p class="muted direct-risk-row-problem">${escapeHtml(problem.slice(0, 120))}</p>` : ""}
        </li>`;
    }).join("");
    const body = `
            <ul class="direct-risks-list">${rows}</ul>
            <div class="direct-risks-panel-actions">${syncBtn}</div>`;
    if (simplified) {
      return `
        <details id="direct-slice-risks" class="direct-risks-panel direct-risks-panel--collapsed">
            <summary class="direct-risks-panel-summary">\u0410\u0432\u0442\u043E\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0438\u0437 Excel (${directs.length}) \u2014 \u0434\u043E AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430</summary>
            ${body}
        </details>`;
    }
    return `
        <div id="direct-slice-risks" class="direct-risks-panel">
            <div class="direct-risks-panel-head">
                <h5 class="direct-risks-panel-title">${DIRECT_COPY.risksLabel}</h5>
                <span class="muted direct-risks-panel-count">${directs.length}</span>
            </div>
            ${body}
        </div>`;
  }
  function scrollToDirectRisks() {
    runtimeBridge.switchTab?.("data");
    runtimeBridge.switchDataSubtab?.("direct");
    document.getElementById("direct-slice-risks")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function openDirectExcelSource(findingId) {
    const finding = getFindingById(findingId);
    if (!finding) return;
    const ref = getDirectRiskRef2(finding);
    runtimeBridge.switchTab?.("data");
    runtimeBridge.switchDataSubtab?.("direct");
    const scroll = () => {
      if (ref) {
        const key = directRiskRefKey2(ref);
        const row = document.querySelector(`[data-direct-risk="${key}"]`);
        if (row) {
          document.getElementById("direct-slice-risks")?.scrollIntoView({ behavior: "smooth", block: "start" });
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          row.classList.add("direct-slice-highlight");
          window.setTimeout(() => row.classList.remove("direct-slice-highlight"), 2200);
          return;
        }
      }
      scrollToDirectRisks();
    };
    window.requestAnimationFrame(() => window.setTimeout(scroll, 120));
  }
  function getDirectRiskRef2(f) {
    if (!f) return null;
    const fromField = f.direct_risk_ref;
    if (fromField?.kind && fromField.id != null) {
      return { kind: String(fromField.kind), id: String(fromField.id) };
    }
    const fromOrig = f.original_ai_output?.direct_risk_ref;
    if (fromOrig?.kind && fromOrig.id != null) {
      return { kind: String(fromOrig.kind), id: String(fromOrig.id) };
    }
    const ev = (f.evidence || []).find((e) => e?.source === "direct_health");
    if (ev?.kind === "template" && ev.template_id) {
      return { kind: "template", id: String(ev.template_id) };
    }
    if (ev?.kind === "rule" && ev.rule_id != null) {
      return { kind: "rule", id: String(ev.rule_id) };
    }
    return null;
  }
  function directRiskRefKey2(ref) {
    if (!ref?.kind || ref.id == null) return "";
    return `${ref.kind}:${ref.id}`;
  }
  function isAiInterpretationFinding2(f) {
    return Boolean(f) && !isDirectHealthFinding2(f) && Boolean(getDirectRiskRef2(f));
  }
  function getLinkedDirectRiskTitle(f, findings) {
    const ref = getDirectRiskRef2(f);
    if (!ref) return "";
    const direct = (findings || []).find((d) => {
      if (!isDirectHealthFinding2(d)) return false;
      return directRiskRefKey2(getDirectRiskRef2(d)) === directRiskRefKey2(ref);
    });
    if (direct) return getDirectHealthRuleTitle(direct);
    return String(f?.title || "").trim() || "\u2014";
  }
  function findingInReviewQueue(f, data) {
    if (!f) return false;
    if (isDirectHealthFinding2(f)) return false;
    const status = f.status || "ai_generated";
    if (status === "human_rejected") return false;
    if (["human_confirmed", "human_edited"].includes(status)) return true;
    if (hasGuidedCompletedAnalysis2(data)) return true;
    return Boolean(f.needs_review);
  }
  function isFindingPendingReview(f, data = getAuditData2()) {
    if (!f || f.status === "human_rejected") return false;
    if (["human_confirmed", "human_edited"].includes(f.status)) return false;
    return findingInReviewQueue(f, data);
  }
  function getFindingReviewProgress(data) {
    const findings = data?.findings || [];
    const inQueue = findings.filter((f) => findingInReviewQueue(f, data));
    const reviewed = inQueue.filter(
      (f) => ["human_confirmed", "human_edited", "human_rejected"].includes(f.status)
    ).length;
    return {
      reviewed,
      total: inQueue.length,
      pending: Math.max(0, inQueue.length - reviewed)
    };
  }
  function formatReviewProgressLine2(progress) {
    if (!progress || progress.total <= 0) return "";
    return `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0432\u044B\u0432\u043E\u0434\u043E\u0432: ${progress.reviewed} \u0438\u0437 ${progress.total}`;
  }
  function formatReviewRemainingLine2(progress) {
    if (!progress || progress.pending <= 0) return "";
    return `\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C: ${progress.pending}`;
  }
  function getPostAnalysisDataImprovements2(data) {
    return (data?.data_issues || []).filter(
      (i) => !i.resolved && i.visible_after_analysis && i.issue_type === "missing_data"
    );
  }
  function isAnalysisStale(data) {
    return Boolean(data?.analysis_freshness?.analysis_stale);
  }
  function buildFindingReviewBannerModel(data) {
    const progress = getFindingReviewProgress(data);
    const improvements = getPostAnalysisDataImprovements2(data);
    const pending = progress.pending;
    let title;
    let hint;
    let badge;
    if (pending > 0) {
      title = pending === 1 ? "\u041E\u0441\u0442\u0430\u043B\u0441\u044F 1 AI-\u0432\u044B\u0432\u043E\u0434 \u0431\u0435\u0437 \u0440\u0435\u0448\u0435\u043D\u0438\u044F" : `\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C AI-\u0432\u044B\u0432\u043E\u0434\u043E\u0432: ${pending}`;
      hint = `${formatReviewProgressLine2(progress)}. \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u2192 \u043E\u0442\u0447\u0451\u0442 \u0438 \u0431\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439.`;
      badge = `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \xB7 ${progress.reviewed}/${progress.total}`;
    } else if (improvements.length > 0) {
      title = "\u0420\u0435\u0448\u0435\u043D\u0438\u044F \u043F\u043E \u0432\u044B\u0432\u043E\u0434\u0430\u043C \u043F\u0440\u0438\u043D\u044F\u0442\u044B";
      hint = progress.total > 0 ? `${formatReviewProgressLine2(progress)}. \u0414\u0430\u043D\u043D\u044B\u0435 \u043C\u043E\u0436\u043D\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C (\u043D\u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u0443\u0435\u0442 \u043E\u0442\u0447\u0451\u0442) \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A.` : "\u0414\u0430\u043D\u043D\u044B\u0435 \u043C\u043E\u0436\u043D\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C (\u043D\u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u0443\u0435\u0442 \u043E\u0442\u0447\u0451\u0442) \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A.";
      badge = progress.total > 0 ? `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \xB7 ${progress.total}/${progress.total}` : "\u0413\u043E\u0442\u043E\u0432\u043E";
    } else {
      title = "\u0420\u0435\u0448\u0435\u043D\u0438\u044F \u043F\u043E \u0432\u044B\u0432\u043E\u0434\u0430\u043C \u043F\u0440\u0438\u043D\u044F\u0442\u044B";
      hint = "\u041C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430.";
      badge = progress.total > 0 ? `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \xB7 ${progress.total}/${progress.total}` : "\u0413\u043E\u0442\u043E\u0432\u043E";
    }
    return { progress, improvements, pending, title, hint, badge };
  }
  function pluralizeFindingsReview2(n) {
    const abs = Math.abs(Number(n) || 0);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 14) return `${abs} \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438`;
    if (mod10 === 1) return `${abs} \u0432\u044B\u0432\u043E\u0434 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438`;
    if (mod10 >= 2 && mod10 <= 4) return `${abs} \u0432\u044B\u0432\u043E\u0434\u0430 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438`;
    return `${abs} \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438`;
  }
  var FINDING_AREA_LABELS = {
    crm: "CRM \u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0438",
    semantics: "\u0421\u0435\u043C\u0430\u043D\u0442\u0438\u043A\u0430 (\u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430)",
    landing: "\u041F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u044B\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B",
    analytics: "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430",
    budget: "\u0411\u044E\u0434\u0436\u0435\u0442 \u0438 \u0441\u0442\u0430\u0432\u043A\u0438",
    structure: "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0439",
    creatives: "\u041A\u0440\u0435\u0430\u0442\u0438\u0432\u044B"
  };
  function areaDisplayLabel(area) {
    const key = String(area || "").toLowerCase();
    return FINDING_AREA_LABELS[key] || (area ? String(area) : "");
  }
  function isFindingLowEvidence(f) {
    const ev = String(f?.evidence_level || "weak").toLowerCase();
    return ev === "weak" || ev === "none";
  }
  function classifyMarketerActionStatus(f) {
    const status = f?.status || "ai_generated";
    if (status === "human_rejected") {
      return { code: "rejected", label: "\u041E\u0442\u043A\u043B\u043E\u043D\u0451\u043D", css: "finding-queue-rejected" };
    }
    if (["human_confirmed", "human_edited"].includes(status)) {
      return { code: "report", label: "\u0412 \u043E\u0442\u0447\u0451\u0442\u0435", css: "finding-queue-report" };
    }
    if (isFindingDataGapCard(f)) {
      return { code: "needs_data", label: "\u041D\u0443\u0436\u043D\u044B \u0434\u0430\u043D\u043D\u044B\u0435", css: "finding-queue-needs-data" };
    }
    const sev = String(f?.severity || "medium").toLowerCase();
    const lowEv = isFindingLowEvidence(f);
    if (sev === "high" && lowEv) {
      return { code: "urgent", label: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u044D\u0442\u043E\u0442", css: "finding-queue-urgent" };
    }
    if ((sev === "high" || sev === "medium") && !lowEv) {
      return { code: "act_now", label: "\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443", css: "finding-queue-act" };
    }
    return { code: "check_later", label: "\u041D\u0435 \u0441\u0440\u043E\u0447\u043D\u043E", css: "finding-queue-later" };
  }
  function isLowSignalFindingHeadline(problem, f) {
    const p = String(problem || "").trim().toLowerCase();
    if (!p || p === "\u2014") return true;
    if (/^исходный\s+риск/.test(p)) return true;
    if (/риск\s+на\s+директ/.test(p) && p.length < 90) return true;
    if (isAiInterpretationFinding2(f) && p.length < 48) return true;
    return false;
  }
  function buildFindingCardHeadline(f, findings) {
    const problem = String(f?.problem || "").trim();
    if (!isLowSignalFindingHeadline(problem, f)) return problem || "\u2014";
    const rec = String(f.recommendation || "").trim();
    if (rec.length > 24) {
      return rec.length > 220 ? `${rec.slice(0, 217)}\u2026` : rec;
    }
    const risk = getLinkedDirectRiskTitle(f, findings);
    return risk && risk !== "\u2014" ? risk : problem || "\u2014";
  }
  function findingHeadlineMatchesRec(headline, rec) {
    const h = String(headline || "").trim().toLowerCase();
    const r = String(rec || "").trim().toLowerCase();
    if (!h || !r || h === "\u2014" || r === "\u2014") return false;
    if (h === r) return true;
    const slice = Math.min(72, h.length, r.length);
    return h.slice(0, slice) === r.slice(0, slice);
  }
  function buildFindingVerdictLines(f) {
    const headline = buildFindingCardHeadline(f, getAuditData2()?.findings);
    const lowEv = isFindingLowEvidence(f);
    const ev = String(f?.evidence_level || "weak").toLowerCase();
    let sub = evidenceLevelLabel(ev);
    if (lowEv) sub = "\u0413\u0438\u043F\u043E\u0442\u0435\u0437\u0430 \u2014 \u043C\u0430\u043B\u043E \u0434\u0430\u043D\u043D\u044B\u0445 \u0432 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u0445";
    else if (ev === "strong") sub = "\u0415\u0441\u0442\u044C \u043E\u043F\u043E\u0440\u0430 \u043D\u0430 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0430\u0443\u0434\u0438\u0442\u0430";
    return { headline, sub };
  }
  function severityLabel(value) {
    return { high: "\u0432\u044B\u0441\u043E\u043A\u0438\u0439", medium: "\u0441\u0440\u0435\u0434\u043D\u0438\u0439", low: "\u043D\u0438\u0437\u043A\u0438\u0439" }[String(value || "").toLowerCase()] || value || "\u2014";
  }
  function isTrivialFindingNote(text) {
    const t = String(text || "").trim().toLowerCase();
    return !t || t === "\u043D\u0435\u0442" || t === "\u2014" || t === "n/a" || t.length < 3;
  }
  function renderMarketerMissingBlock(f) {
    if (f.status === "human_rejected") return "";
    const text = getFindingReviewReasonText(f);
    if (!text || isTrivialFindingNote(text)) return "";
    return `<p class="finding-inline-gap"><strong>\u041D\u0443\u0436\u043D\u044B \u0434\u0430\u043D\u043D\u044B\u0435:</strong> ${escapeHtml(text)}</p>`;
  }
  function renderFindingRejectReasonLine(f) {
    if ((f.status || "") !== "human_rejected") return "";
    const reason = String(f.review_reason || "").trim();
    if (!reason || isTrivialFindingNote(reason)) return "";
    return `<p class="finding-reject-reason muted"><strong>\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F:</strong> ${escapeHtml(reason)}</p>`;
  }
  var FINDING_DRAFT_COMMENT = "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0438\u0437 AI-\u0447\u0430\u0442\u0430 \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u043B\u044F \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C.";
  function shouldShowFindingHumanComment(f) {
    const c = String(f.human_comment || "").trim();
    if (!c || isTrivialFindingNote(c)) return false;
    if (c === FINDING_DRAFT_COMMENT) return false;
    return true;
  }
  function isCompactFindingCard(f) {
    if (findingsMarketerFilter !== "pending") return true;
    if ((f.status || "") === "human_rejected") return true;
    if (["human_confirmed", "human_edited"].includes(f.status || "")) return true;
    if (isStubEnrichmentFinding(f)) return true;
    const problem = String(f.problem || "").trim();
    const rec = String(f.recommendation || "").trim();
    return problem.length < 220 && rec.length < 320;
  }
  function shouldShowFindingQueueBadge(f, actionStatus) {
    if (findingsMarketerFilter === "report" && actionStatus.code === "report") return false;
    if (findingsMarketerFilter === "rejected" && actionStatus.code === "rejected") return false;
    return true;
  }
  function shouldShowInterpRiskLink(f, headline) {
    if (!isAiInterpretationFinding2(f)) return false;
    const riskTitle = String(getLinkedDirectRiskTitle(f, getAuditData2()?.findings) || "").trim();
    if (!riskTitle || riskTitle === "\u2014") return false;
    const head = String(headline || "").toLowerCase();
    const risk = riskTitle.toLowerCase().replace(/\s+/g, " ");
    if (risk.length < 12) return false;
    return !head.includes(risk.slice(0, Math.min(36, risk.length)));
  }
  function renderMarketerExpertDetails(f) {
    const pending = isFindingPendingReview(f);
    const action = classifyMarketerActionStatus(f);
    const rows = [
      ["\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0434\u0430\u043D\u043D\u044B\u0445", DIRECT_COPY.findingSource],
      ["\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442", severityLabel(f.severity)],
      ["\u0414\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430", evidenceLevelLabel(f.evidence_level)],
      ["\u0422\u0438\u043F", findingTypeDisplayLabel(f)],
      ["\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F", areaDisplayLabel(f.area) || f.area || "\u2014"],
      ["\u0411\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439", renderFindingKbPreviewLine(f)]
    ];
    if (!pending) {
      rows.unshift(["\u0421\u0442\u0430\u0442\u0443\u0441", findingStatusLabel(f)]);
    }
    const body = rows.map(([dt, dd]) => `
        <div class="finding-meta-row-item"><dt>${escapeHtml(dt)}</dt><dd>${escapeHtml(dd)}</dd></div>`).join("");
    return `
        <details class="finding-expert-details">
            <summary>\u0414\u0435\u0442\u0430\u043B\u0438 \u0432\u044B\u0432\u043E\u0434\u0430</summary>
            <dl class="finding-meta-panel finding-meta-panel--expert">${body}</dl>
            <p class="muted finding-expert-queue-note">\u041E\u0447\u0435\u0440\u0435\u0434\u044C: ${escapeHtml(action.label)}</p>
        </details>`;
  }
  function findingKindLabel(kind) {
    return {
      confirmed: "\u0424\u0430\u043A\u0442 (AI)",
      hypothesis: "\u0413\u0438\u043F\u043E\u0442\u0435\u0437\u0430",
      needs_data: "\u041D\u0443\u0436\u043D\u044B \u0434\u0430\u043D\u043D\u044B\u0435",
      risk_pattern: "\u041F\u0430\u0442\u0442\u0435\u0440\u043D \u0440\u0438\u0441\u043A\u0430"
    }[kind] || kind || "\u0413\u0438\u043F\u043E\u0442\u0435\u0437\u0430";
  }
  var findingEditPreviewBound = false;
  function setFindingEditMode(mode) {
    const overlay = document.getElementById("findingEditModal");
    const expandBtn = document.getElementById("findingEditExpertExpand");
    const collapseBtn = document.getElementById("findingEditExpertToggle");
    if (!overlay) return;
    const isQuick = mode === "quick";
    overlay.classList.toggle("finding-edit-mode-quick", isQuick);
    overlay.classList.toggle("finding-edit-mode-expert", !isQuick);
    if (expandBtn) expandBtn.hidden = !isQuick;
    if (collapseBtn) collapseBtn.hidden = isQuick;
  }
  function bindFindingEditPreviewListeners() {
    if (findingEditPreviewBound) return;
    findingEditPreviewBound = true;
    const ids = ["findingEditProblem", "findingEditRecommendation", "findingEditImpact", "findingEditAreaSelect"];
    ids.forEach((id) => {
      document.getElementById(id)?.addEventListener("input", updateFindingEditPdfPreview);
      document.getElementById(id)?.addEventListener("change", updateFindingEditPdfPreview);
    });
    document.getElementById("findingEditExpertExpand")?.addEventListener("click", () => setFindingEditMode("expert"));
    document.getElementById("findingEditExpertToggle")?.addEventListener("click", () => setFindingEditMode("quick"));
  }
  function updateFindingEditPdfPreview() {
    const box = document.getElementById("findingEditPdfPreview");
    const body = document.getElementById("findingEditPdfPreviewBody");
    if (!box || !body) return;
    const areaKey = document.getElementById("findingEditAreaSelect")?.value || document.getElementById("findingEditArea")?.value || "other";
    body.innerHTML = buildPdfObservationPreviewHtml({
      areaLabel: areaDisplayLabel(areaKey),
      problem: document.getElementById("findingEditProblem")?.value,
      recommendation: document.getElementById("findingEditRecommendation")?.value,
      expectedImpact: document.getElementById("findingEditImpact")?.value
    });
    box.hidden = false;
  }
  function configureFindingEditModal(f, options = {}) {
    const mode = options.mode === "expert" ? "expert" : "quick";
    const fromChat = Boolean(options.fromChat);
    bindFindingEditPreviewListeners();
    setFindingEditMode(mode);
    const titleEl = document.getElementById("findingEditModalTitle");
    const introEl = document.getElementById("findingEditModalIntro");
    if (titleEl) {
      titleEl.textContent = mode === "expert" ? "\u041F\u0440\u0430\u0432\u043A\u0430 \u0432\u044B\u0432\u043E\u0434\u0430" : "\u041F\u0435\u0440\u0435\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u043E\u0439 \u0432 \u043E\u0442\u0447\u0451\u0442";
    }
    if (introEl) {
      introEl.textContent = fromChat ? "\u0422\u0435\u043A\u0441\u0442 \u0438\u0437 \u0447\u0430\u0442\u0430 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D \u0434\u043B\u044F PDF: \u0443\u0431\u0440\u0430\u043D\u044B \u2116 \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0438 [mat_N]. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0442\u0440\u0438 \u043F\u043E\u043B\u044F \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435." : mode === "quick" ? "\u041A\u0440\u0430\u0442\u043A\u043E: \u0444\u0430\u043A\u0442, \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0438 \u044D\u0444\u0444\u0435\u043A\u0442 \u2014 \u0442\u0430\u043A \u0443\u0432\u0438\u0434\u0438\u0442 \u043A\u043B\u0438\u0435\u043D\u0442 \u0432 \u0431\u043B\u043E\u043A\u0435 \xAB\u0421\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u044F\xBB." : "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u044B\u0432\u043E\u0434: \u0447\u0442\u043E \u043D\u0435 \u0442\u0430\u043A, \u0447\u0442\u043E \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u043C \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0438 \u043A\u0430\u043A\u043E\u0439 \u044D\u0444\u0444\u0435\u043A\u0442 \u043E\u0436\u0438\u0434\u0430\u0435\u043C.";
    }
    const areaReadonly = document.getElementById("findingEditAreaReadonly");
    const areaSelect = document.getElementById("findingEditAreaSelect");
    const areaHidden = document.getElementById("findingEditArea");
    const areaKey = String(f?.area || "other").toLowerCase();
    if (areaHidden) areaHidden.value = areaKey;
    if (areaSelect) areaSelect.value = FINDING_AREA_LABELS[areaKey] ? areaKey : "other";
    if (areaReadonly) {
      areaReadonly.hidden = true;
      areaReadonly.textContent = "";
    }
    const problemLabel = document.getElementById("findingEditProblemLabel");
    const recLabel = document.getElementById("findingEditRecommendationLabel");
    const impactLabel = document.getElementById("findingEditImpactLabel");
    const kbLabel = document.getElementById("findingEditKbLabel");
    if (problemLabel) problemLabel.textContent = "\u0427\u0442\u043E \u043D\u0435 \u0442\u0430\u043A";
    if (recLabel) recLabel.textContent = "\u0427\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C";
    if (impactLabel) impactLabel.textContent = "\u041E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u044D\u0444\u0444\u0435\u043A\u0442";
    if (kbLabel) kbLabel.textContent = "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u043E\u0442 \u0432\u044B\u0432\u043E\u0434 \u0432 \u0431\u0443\u0434\u0443\u0449\u0438\u0445 \u0430\u0443\u0434\u0438\u0442\u0430\u0445";
  }
  function findingTypeDisplayLabel(f) {
    if (!f) return "\u0413\u0438\u043F\u043E\u0442\u0435\u0437\u0430";
    if (f.finding_kind === "risk_pattern") return "\u041F\u0430\u0442\u0442\u0435\u0440\u043D \u0440\u0438\u0441\u043A\u0430";
    if (isFindingDataGapCard(f)) return "\u041F\u0430\u0442\u0442\u0435\u0440\u043D \u0440\u0438\u0441\u043A\u0430";
    return findingKindLabel(f.finding_kind);
  }
  var FINDING_DATA_GAP_AREAS = /* @__PURE__ */ new Set(["crm", "semantics", "landing", "analytics", "budget", "structure", "creatives"]);
  function canConfirmFindingRiskPattern(f) {
    if (!f || isDirectHealthFinding2(f)) return false;
    const kind = String(f.finding_kind || "").toLowerCase();
    if (kind === "risk_pattern" || kind === "needs_data") return true;
    if (!["needs_data", "risk_pattern", "hypothesis", "confirmed"].includes(kind)) return false;
    if (["human_confirmed", "human_edited", "human_rejected"].includes(f.status || "")) return false;
    if (isDataLimitationFinding(f)) return true;
    if (String(f.missing_data || "").trim()) return true;
    if (String(f.review_reason || "").trim()) return true;
    const area = String(f.area || "").toLowerCase();
    if (FINDING_DATA_GAP_AREAS.has(area) && (f.needs_review || isFindingPendingReview(f))) return true;
    const hay = `${f.problem || ""} ${f.recommendation || ""} ${f.missing_data || ""}`.toLowerCase();
    return /нужн|не хватает|отсутств|нет выгрузк|для подтверждения|недостаточно данных/i.test(hay);
  }
  function isFindingDataGapCard(f) {
    if (!f || isDirectHealthFinding2(f) || f.finding_kind === "risk_pattern") return false;
    if (["human_confirmed", "human_edited", "human_rejected"].includes(f.status || "")) return false;
    if (isDataLimitationFinding(f)) return true;
    if (String(f.missing_data || "").trim()) return true;
    const area = String(f.area || "").toLowerCase();
    const ctx = resolveFindingDataAction(f);
    if (!ctx) return false;
    if (FINDING_DATA_GAP_AREAS.has(area) && isFindingPendingReview(f)) return true;
    if (String(f.review_reason || "").trim()) return true;
    const hay = `${f.problem || ""} ${f.recommendation || ""} ${f.missing_data || ""}`.toLowerCase();
    if (/нужн|не хватает|отсутств|нет выгрузк|для подтверждения|недостаточно данных/i.test(hay)) return true;
    return false;
  }
  function getFindingReviewReasonText(f) {
    if (isDirectHealthFinding2(f)) return "";
    const explicit = String(f.review_reason || "").trim();
    if (explicit) return explicit;
    const missing = String(f.missing_data || "").trim();
    if (missing) return missing;
    const area = String(f.area || "").toLowerCase();
    const defaults = {
      crm: "\u041D\u0435\u0442 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0438 CRM \u0441\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u043C\u0438 \u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0430\u043C\u0438 \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u0430.",
      semantics: "\u0414\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043D\u0443\u0436\u043D\u0430 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0445 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u0438\u0437 \u0440\u0435\u043A\u043B\u0430\u043C\u043D\u043E\u0433\u043E \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430.",
      landing: "\u041D\u0443\u0436\u043D\u044B \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u043F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u044B\u043C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430\u043C \u0438 \u0438\u0445 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044E \u0440\u0435\u043A\u043B\u0430\u043C\u043D\u043E\u043C\u0443 \u0438\u043D\u0442\u0435\u043D\u0442\u0443.",
      analytics: "\u041D\u0443\u0436\u043D\u044B \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u0430.",
      budget: "\u041D\u0443\u0436\u043D\u044B \u0443\u0442\u043E\u0447\u043D\u0451\u043D\u043D\u044B\u0435 \u043C\u0435\u0442\u0440\u0438\u043A\u0438 \u0438 \u043F\u0435\u0440\u0438\u043E\u0434 \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u0430.",
      structure: "\u041D\u0443\u0436\u043D\u044B \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0435 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0439 \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u0430.",
      creatives: "\u041D\u0443\u0436\u043D\u044B \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043F\u043E \u043A\u0440\u0435\u0430\u0442\u0438\u0432\u0430\u043C \u0438\u043B\u0438 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0439."
    };
    if (defaults[area] && isFindingDataGapCard(f)) return defaults[area];
    return "";
  }
  function renderFindingKbPreviewLine(f) {
    const status = f?.status || "ai_generated";
    if (["human_confirmed", "human_edited"].includes(status)) {
      if (f.finding_kind === "risk_pattern" && f.kb_eligible) {
        return "\u041F\u0430\u0442\u0442\u0435\u0440\u043D \u0440\u0438\u0441\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u0432 \u0431\u0430\u0437\u0435 \u0437\u043D\u0430\u043D\u0438\u0439 \u0434\u043B\u044F \u0434\u0440\u0443\u0433\u0438\u0445 \u0430\u0443\u0434\u0438\u0442\u043E\u0432.";
      }
      if (countsAsGlobalKbFinding(f)) {
        return "\u0423\u043D\u0438\u0432\u0435\u0440\u0441\u0430\u043B\u044C\u043D\u044B\u0439 \u0432\u044B\u0432\u043E\u0434 \u0432 \u0431\u0430\u0437\u0435 \u0437\u043D\u0430\u043D\u0438\u0439; \u0443\u0447\u0442\u0451\u043D \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430.";
      }
      if (isDataLimitationFinding(f)) {
        return "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u044D\u0442\u043E\u043C \u0430\u0443\u0434\u0438\u0442\u0435 (\u0448\u0430\u0431\u043B\u043E\u043D \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F).";
      }
      return "\u0423\u0447\u0442\u0451\u043D \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430.";
    }
    if (isFindingDataGapCard(f)) {
      return "\u041F\u043E\u0441\u043B\u0435 \xAB\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0438 \u043E\u0431\u0443\u0447\u0438\u0442\u044C\xBB \u2014 \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 \u0438 \u0432 \u0431\u0430\u0437\u0435 \u0437\u043D\u0430\u043D\u0438\u0439.";
    }
    if (f?.kb_eligible) {
      return "\u0411\u0443\u0434\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0432 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439 \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F.";
    }
    return "\u041F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u043E\u0442\u0447\u0451\u0442; \u0432 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439 \u2014 \u0435\u0441\u043B\u0438 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u043F\u0440\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0438.";
  }
  function describeFindingOutcomeMessage(saved, action = "confirm") {
    const inReport = ["human_confirmed", "human_edited"].includes(saved?.status);
    const inKb = Boolean(saved?.kb_eligible) && (saved?.finding_kind === "risk_pattern" || countsAsGlobalKbFinding(saved));
    if (action === "reject") {
      return "\u0412\u044B\u0432\u043E\u0434 \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D: \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u043E\u0442\u0447\u0451\u0442 \u0438 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439; \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0435.";
    }
    if (action === "risk_pattern") {
      return inKb ? "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E: \u043F\u0430\u0442\u0442\u0435\u0440\u043D \u0440\u0438\u0441\u043A\u0430 \u0432 \u0431\u0430\u0437\u0435 \u0437\u043D\u0430\u043D\u0438\u0439 \u0438 \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430." : "\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 (\u0431\u0430\u0437\u0430 \u0437\u043D\u0430\u043D\u0438\u0439 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0438\u043B\u0438 \u0432\u044B\u0432\u043E\u0434 \u043D\u0435 \u043F\u0440\u043E\u0448\u0451\u043B \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443).";
    }
    if (action === "edit") {
      return inKb ? "\u0418\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430 \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430 \u0432 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439." : "\u0418\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430 \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430.";
    }
    if (inReport && inKb) {
      return "\u0412\u044B\u0432\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D: \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D \u0432 \u043E\u0442\u0447\u0451\u0442 \u0438 \u0432 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439 \u0434\u043B\u044F \u0434\u0440\u0443\u0433\u0438\u0445 \u0430\u0443\u0434\u0438\u0442\u043E\u0432.";
    }
    if (inReport) {
      return "\u0412\u044B\u0432\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430.";
    }
    return "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E.";
  }
  var EVIDENCE_LEVEL_LABELS = {
    strong: "\u0421\u0438\u043B\u044C\u043D\u044B\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430",
    medium: "\u0421\u0440\u0435\u0434\u043D\u0438\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430",
    weak: "\u0421\u043B\u0430\u0431\u044B\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430",
    none: "\u041D\u0435\u0442 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432"
  };
  function evidenceLevelLabel(level) {
    const key = String(level || "weak").toLowerCase();
    return EVIDENCE_LEVEL_LABELS[key] || key;
  }
  var findingsMarketerFilter = "pending";
  var findingsMarketerFilterAuditId = null;
  function defaultFindingsMarketerFilter(findings, data) {
    const pending = getFindingReviewProgress(data).pending;
    if (pending > 0) return "pending";
    return countMarketerFindingsFilter(findings, "report", data) > 0 ? "report" : "pending";
  }
  function resetFindingsMarketerFilterForAudit(findings, auditId, data) {
    if (!auditId || findingsMarketerFilterAuditId === auditId) return;
    findingsMarketerFilterAuditId = auditId;
    findingsMarketerFilter = defaultFindingsMarketerFilter(findings, data);
  }
  function syncFindingsMarketerFilter(findings, data) {
    const progress = getFindingReviewProgress(data);
    const pending = progress.pending;
    const inReport = countMarketerFindingsFilter(findings, "report", data);
    if (findingsMarketerFilter === "all") {
      findingsMarketerFilter = defaultFindingsMarketerFilter(findings, data);
    }
    if (pending > 0 && findingsMarketerFilter === "pending" && countMarketerFindingsFilter(findings, "pending", data) === 0) {
      findingsMarketerFilter = inReport > 0 ? "report" : "pending";
    }
    if (pending === 0 && findingsMarketerFilter === "pending") {
      findingsMarketerFilter = inReport > 0 ? "report" : "pending";
    }
    if (findingsMarketerFilter === "report" && inReport === 0 && pending > 0) {
      findingsMarketerFilter = "pending";
    }
    if (findingsMarketerFilter === "recs" && pending > 0) {
      findingsMarketerFilter = "pending";
    }
  }
  function getFindingsFilterEmptyHint(mode, progress, inReport) {
    if (mode === "pending") {
      return progress.pending > 0 ? "\u0412 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \xAB\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443\xBB \u0441\u0435\u0439\u0447\u0430\u0441 \u043F\u0443\u0441\u0442\u043E \u2014 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u0444\u0438\u043B\u044C\u0442\u0440." : inReport > 0 ? `\u0412\u0441\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B. \u0412 \u043E\u0442\u0447\u0451\u0442\u0435 \u2014 ${inReport}. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0443 \xAB\u0412 \u043E\u0442\u0447\u0451\u0442\u0435\xBB \u043D\u0438\u0436\u0435.` : "\u0412\u0441\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B.";
    }
    if (mode === "report") {
      return inReport > 0 ? "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 \u043D\u0435 \u043F\u043E\u043F\u0430\u043B\u0438 \u0432 \u0441\u043F\u0438\u0441\u043E\u043A \u2014 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 (Ctrl+F5)." : "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0445 \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u2014 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \xAB\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443\xBB.";
    }
    if (mode === "no_ai") {
      return "\u0412\u0441\u0435 \u0440\u0438\u0441\u043A\u0438 Excel \u043E\u0431\u043E\u0433\u0430\u0449\u0435\u043D\u044B AI \u2014 \u0444\u0438\u043B\u044C\u0442\u0440 \u043F\u0443\u0441\u0442.";
    }
    if (mode === "rejected") {
      return "\u041E\u0442\u043A\u043B\u043E\u043D\u0451\u043D\u043D\u044B\u0445 \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u043D\u0435\u0442.";
    }
    if (mode === "recs") {
      return "";
    }
    return "\u0412 \u044D\u0442\u043E\u0439 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u043F\u0443\u0441\u0442\u043E \u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439 \u0444\u0438\u043B\u044C\u0442\u0440.";
  }
  function buildFindingsFilterCtas(findings, data, progress) {
    const inReport = countMarketerFindingsFilter(findings, "report", data);
    const parts = [];
    if (inReport > 0 && findingsMarketerFilter !== "report") {
      parts.push(
        `<button type="button" class="btn btn-primary btn-sm" onclick="setFindingsMarketerFilter('report')">\u0412 \u043E\u0442\u0447\u0451\u0442\u0435 (${inReport})</button>`
      );
    }
    if (progress.pending > 0 && findingsMarketerFilter !== "pending") {
      parts.push(
        `<button type="button" class="btn btn-outline btn-sm" onclick="setFindingsMarketerFilter('pending')">\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 (${progress.pending})</button>`
      );
    }
    const rejectedN = countMarketerFindingsFilter(findings, "rejected", data);
    if (rejectedN > 0 && findingsMarketerFilter !== "rejected") {
      parts.push(
        `<button type="button" class="btn btn-outline btn-sm" onclick="setFindingsMarketerFilter('rejected')">\u041E\u0442\u043A\u043B\u043E\u043D\u0451\u043D\u043D\u044B\u0435 (${rejectedN})</button>`
      );
    }
    return parts.join(" ");
  }
  function matchesMarketerFindingsFilter(f, mode) {
    if (mode === "recs") return false;
    if (isDirectHealthFinding2(f)) return false;
    if (mode === "no_ai") {
      return isStubEnrichmentFinding(f) || isAiInterpretationFinding2(f) && !getDirectRiskRef2(f);
    }
    const status = f?.status || "ai_generated";
    if (mode === "rejected") {
      return status === "human_rejected";
    }
    if (mode === "all") {
      return status !== "human_rejected";
    }
    if (mode === "report") {
      return ["human_confirmed", "human_edited"].includes(status);
    }
    if (mode === "pending") {
      return !["human_confirmed", "human_edited", "human_rejected"].includes(status);
    }
    if (mode === "urgent") {
      if (["human_confirmed", "human_edited", "human_rejected"].includes(status)) return false;
      return classifyMarketerActionStatus(f).code === "urgent";
    }
    return true;
  }
  function countMarketerFindingsFilter(findings, mode, data) {
    if (mode === "no_ai") {
      const audit = data || getAuditData2();
      const stubCount = (findings || []).filter((f) => f.status !== "human_rejected" && matchesMarketerFindingsFilter(f, mode)).length;
      return stubCount + getCatalogRefsWithoutAi(audit).length;
    }
    if (mode === "rejected") {
      return (findings || []).filter((f) => matchesMarketerFindingsFilter(f, "rejected")).length;
    }
    return (findings || []).filter((f) => matchesMarketerFindingsFilter(f, mode)).filter((f) => f.status !== "human_rejected").length;
  }
  function syncFindingsAuxPanelsVisibility() {
    const showRecs = findingsMarketerFilter === "recs";
    const panel = document.getElementById("findingsRecSummaryPanel");
    const offer = document.getElementById("offerContainer");
    if (panel) {
      panel.style.display = showRecs ? "" : "none";
      if (showRecs) panel.open = true;
    }
    if (offer) offer.style.display = showRecs ? "" : "none";
  }
  function setFindingsMarketerFilter(mode) {
    findingsMarketerFilter = mode;
    renderFindings(getAuditData2()?.findings || [], getAuditData2()?.data_coverage);
    syncFindingsAuxPanelsVisibility();
  }
  function marketerFilterModeForFinding(f) {
    if (!f) return "report";
    const status = f?.status || "ai_generated";
    if (status === "human_rejected") return "rejected";
    if (["human_confirmed", "human_edited"].includes(status)) return "report";
    return "pending";
  }
  function scrollToAndHighlightFinding(findingId, attempt = 0) {
    const id = Number(findingId);
    if (!Number.isFinite(id) || id <= 0) return;
    const el = document.getElementById(`finding-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("direct-slice-highlight");
      window.setTimeout(() => el.classList.remove("direct-slice-highlight"), 2800);
      return;
    }
    if (attempt < 10) {
      window.setTimeout(() => scrollToAndHighlightFinding(id, attempt + 1), 60 + attempt * 50);
    }
  }
  function goToFindingsInReport(findingId = null) {
    const id = Number(findingId);
    const f = Number.isFinite(id) && id > 0 ? getFindingById(id) : null;
    setFindingsMarketerFilter(f ? marketerFilterModeForFinding(f) : "report");
    runtimeBridge.switchTab?.("results");
    if (f?.id) {
      window.requestAnimationFrame(() => {
        scrollToAndHighlightFinding(f.id);
      });
    }
  }
  function shouldShowRecommendationsJump(data, findings) {
    if (!hasGuidedCompletedAnalysis2(data)) return false;
    const progress = getFindingReviewProgress(data || { findings });
    if (progress.pending > 0) return false;
    const optRecs = (findings || []).filter(
      (f) => !isDirectHealthFinding2(f) && f.finding_kind !== "needs_data" && f.recommendation && f.status !== "human_rejected"
    );
    return optRecs.length > 0 || Boolean(data?.commercial_offer);
  }
  function renderRecommendationsJumpBtn(findings, data) {
    if (!shouldShowRecommendationsJump(data, findings)) return "";
    return renderFindingsMarketerFilterBtn("recs", DIRECT_COPY.recommendationsJumpBtn, 0, { muted: true, hideCount: true });
  }
  function renderMissingEnrichmentCards(data) {
    const missing = getCatalogRefsWithoutAi(data);
    if (!missing.length) return "";
    return missing.map((entry) => {
      const title = (entry.title || "").trim() || "\u0420\u0438\u0441\u043A Excel";
      const refKey = directRiskRefKey2(entry.direct_risk_ref);
      return `<div class="finding-item finding-item--missing-enrichment finding-needs-review"${refKey ? ` data-direct-risk="${escapeHtml(refKey)}"` : ""}>
            <p class="finding-verdict-headline">${escapeHtml(title)}</p>
            <p class="muted">\u041D\u0435\u0442 AI-\u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u0440\u0438\u0441\u043A\u0443 \u2014 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0437\u0430\u0433\u043B\u0443\u0448\u043A\u0443 \u043F\u043E\u0441\u043B\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>
            <div class="finding-actions finding-actions-footer">
                <button type="button" class="btn btn-outline btn-sm" onclick="switchTab('data'); switchDataSubtab('direct'); scrollToDirectRisks()">\u041A \u0440\u0438\u0441\u043A\u0443 Excel</button>
                <button type="button" class="btn btn-primary btn-sm" onclick="runAnalysis()">\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437</button>
            </div>
        </div>`;
    }).join("");
  }
  function renderFindingsMarketerFilterBtn(mode, label, count, { muted = false, hideCount = false } = {}) {
    const activeCls = findingsMarketerFilter === mode ? " is-active" : "";
    const mutedCls = muted ? " findings-marketer-filter-btn--muted" : "";
    const countHtml = hideCount ? "" : ` <span class="findings-filter-count">${count}</span>`;
    return `<button type="button" class="findings-marketer-filter-btn${mutedCls}${activeCls}" role="tab" aria-selected="${findingsMarketerFilter === mode ? "true" : "false"}" onclick="setFindingsMarketerFilter('${mode}')">${escapeHtml(label)}${countHtml}</button>`;
  }
  function renderFindingsMarketerFilterBar(findings, data) {
    const audit = data || getAuditData2();
    const active = (findings || []).filter((f) => f.status !== "human_rejected" && !isDirectHealthFinding2(f));
    if (!active.length && !hasGuidedCompletedAnalysis2(audit)) return "";
    const rejectedN = countMarketerFindingsFilter(findings, "rejected", audit);
    const noAiN = countMarketerFindingsFilter(findings, "no_ai", audit);
    const parts = [
      renderFindingsMarketerFilterBtn("pending", "\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443", countMarketerFindingsFilter(findings, "pending", audit)),
      renderFindingsMarketerFilterBtn("report", "\u0412 \u043E\u0442\u0447\u0451\u0442\u0435", countMarketerFindingsFilter(findings, "report", audit))
    ];
    if (rejectedN > 0) {
      parts.push(renderFindingsMarketerFilterBtn("rejected", "\u041E\u0442\u043A\u043B\u043E\u043D\u0451\u043D\u043D\u044B\u0435", rejectedN, { muted: true }));
    }
    if (noAiN > 0) {
      parts.push(renderFindingsMarketerFilterBtn("no_ai", DIRECT_COPY.filterNoAiEnrichment, noAiN, { muted: true }));
    }
    const recJump = renderRecommendationsJumpBtn(findings, audit);
    return `<div class="findings-marketer-filter" role="tablist">${parts.join("")}${recJump}</div>`;
  }
  function parseEvidenceMaterialRef(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;
    if (/^\d+$/.test(text)) return Number(text);
    const m = text.match(/^mat_(\d+)$/i);
    return m ? Number(m[1]) : null;
  }
  function resolveEvidenceMaterialId(e) {
    let mid = parseEvidenceMaterialRef(e?.material_id);
    if (mid && runtimeBridge.getMaterialById?.(mid)) return mid;
    const type = String(e?.material_type || "").trim();
    if (type && type !== "document") {
      const mat = (getAuditData2()?.materials || []).find(
        (m) => m.type === type && !m.excluded_from_analysis
      );
      if (mat?.id) return mat.id;
    }
    if (type === "document" || !type) {
      const doc = (getAuditData2()?.materials || []).find(
        (m) => ["document", "docx", "pdf", "text"].includes(m.type) && !m.excluded_from_analysis
      );
      if (doc?.id) return doc.id;
    }
    return null;
  }
  function looksLikeDocumentDump(quote) {
    const low = String(quote || "").toLowerCase();
    if (!low) return false;
    if (low.includes("\u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435") && (low.includes("\u043F\u0435\u0440\u0438\u043E\u0434 \u0430\u043D\u0430\u043B\u0438\u0437\u0430") || low.includes("\u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043A\u043B\u0438\u0435\u043D\u0442\u0435"))) {
      return true;
    }
    if (low.length < 120) return false;
    const markers = ["\u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435", "\u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043A\u043B\u0438\u0435\u043D\u0442\u0435", "\u043A\u043B\u0438\u0435\u043D\u0442:", "\u043D\u0438\u0448\u0430:", "\u043F\u0435\u0440\u0438\u043E\u0434 \u0430\u043D\u0430\u043B\u0438\u0437\u0430:", "\u0446\u0435\u043B\u044C \u0430\u0443\u0434\u0438\u0442\u0430:"];
    let hits = 0;
    markers.forEach((m) => {
      if (low.includes(m)) hits += 1;
    });
    return hits >= 2 || low.length > 280;
  }
  function formatEvidenceQuotePreview(quote, problem) {
    const text = String(quote || "").replace(/\s+/g, " ").trim();
    const max = 220;
    if (!text) return "";
    if (text.length <= max) return text;
    const keys = String(problem || "").toLowerCase().match(/[a-zа-яё0-9]{4,}/gi) || [];
    for (const key of keys.slice(0, 10)) {
      const pos = text.toLowerCase().indexOf(key.toLowerCase());
      if (pos === -1) continue;
      const start = Math.max(0, pos - 60);
      let snippet = text.slice(start, start + max).trim();
      if (start > 0) snippet = `\u2026${snippet}`;
      if (start + max < text.length) snippet = `${snippet}\u2026`;
      return snippet;
    }
    const cut = text.slice(0, max);
    return `${cut.replace(/\s+\S*$/, "").trim()}\u2026`;
  }
  function isEvidenceQuoteDisplayable(e, finding) {
    const type = String(e?.material_type || "");
    if (["quality_guard", "system"].includes(type)) return false;
    const quote = String(e?.quote_or_description || "").trim();
    if (!quote || looksLikeDocumentDump(quote)) return false;
    return quote.length <= 280;
  }
  function openFindingEvidenceMaterial(materialId) {
    const mid = Number(materialId);
    if (!Number.isFinite(mid) || mid <= 0) {
      showAlert("\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430.", "warning");
      return;
    }
    runtimeBridge.switchTab?.("data");
    setTimeout(() => {
      if (runtimeBridge.getMaterialById?.(mid)) {
        runtimeBridge.editMaterial?.(mid);
        return;
      }
      showAlert("\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0443\u0434\u0430\u043B\u0451\u043D). \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB.", "warning");
    }, 100);
  }
  function getMaterialDisplayLabel(m) {
    if (!m) return "\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B";
    if (m.type === "manual_metrics") {
      const title = (m.title || "").trim();
      return title || "\u041C\u0435\u0442\u0440\u0438\u043A\u0438";
    }
    const typeLabels = {
      text_note: "\u0417\u0430\u043C\u0435\u0442\u043A\u0430",
      document: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442",
      screenshot: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442",
      manual_metrics: "\u041C\u0435\u0442\u0440\u0438\u043A\u0438",
      audio_transcript: "\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430"
    };
    const typeLabel = typeLabels[m.type] || m.type_label || m.type || "\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B";
    return m.title ? `${typeLabel} \u2014 ${m.title}` : typeLabel;
  }
  function findMaterialsForFindingSource(finding) {
    const area = String(finding?.area || "").toLowerCase();
    const mats = (getAuditData2()?.materials || []).filter((m) => m && !m.excluded_from_analysis);
    const areaPatterns = {
      crm: /crm|лид|заявк|продаж|utm|статус|amo|битрикс|качеств/i,
      semantics: /запрос|семантик|wordstat|минус/i,
      landing: /посадоч|лендинг|страниц/i,
      analytics: /метрик|цел|utm|конверс/i,
      budget: /бюджет|расход|клик|cpa|cpl|romi/i,
      structure: /кампани|групп|структур/i,
      creatives: /креатив|объявлен|баннер/i
    };
    const pattern = areaPatterns[area];
    const scored = mats.map((m) => {
      let score = 0;
      const blob = `${m.title || ""} ${m.extracted_text || ""} ${m.raw_content || ""}`.toLowerCase();
      if (area === "crm" && m.type === "manual_metrics") score += 4;
      if (["crm", "analytics", "budget"].includes(area) && m.type === "manual_metrics") score += 2;
      if (pattern && pattern.test(blob)) score += 3;
      if (["document", "text_note", "screenshot"].includes(m.type)) score += 1;
      if (m.type === area) score += 5;
      return { m, score };
    }).filter((row) => row.score > 0).sort((a, b) => b.score - a.score);
    return scored.map((row) => row.m);
  }
  function collectFindingSourceMaterials(finding, userEvidence) {
    const byId = /* @__PURE__ */ new Map();
    (userEvidence || []).forEach((e) => {
      const mid = resolveEvidenceMaterialId(e);
      if (mid) {
        const mat = runtimeBridge.getMaterialById?.(mid);
        if (mat) byId.set(mid, mat);
      }
    });
    findMaterialsForFindingSource(finding).forEach((m) => {
      if (m?.id) byId.set(m.id, m);
    });
    return [...byId.values()];
  }
  function renderFindingSourceButtons(materials) {
    return materials.slice(0, 4).map((m) => `
        <button type="button" class="btn btn-outline btn-sm finding-evidence-open" onclick="openFindingEvidenceMaterial(${m.id})">
            \u041E\u0442\u043A\u0440\u044B\u0442\u044C: ${escapeHtml(getMaterialDisplayLabel(m))}
        </button>`).join("");
  }
  function renderFindingEvidenceBlock(userEvidence, finding) {
    const items = (userEvidence || []).filter(
      (e) => !["quality_guard", "system"].includes(String(e?.material_type || ""))
    );
    const sourceMaterials = collectFindingSourceMaterials(finding, items);
    const parts = items.map((e) => {
      const mid = resolveEvidenceMaterialId(e);
      const mat = mid ? runtimeBridge.getMaterialById?.(mid) : null;
      const label = mat?.title || e.material_type || "\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B";
      const quote = String(e.quote_or_description || "").trim();
      const openBtn = mid ? `<button type="button" class="btn btn-outline btn-sm finding-evidence-open" onclick="openFindingEvidenceMaterial(${mid})">\u041E\u0442\u043A\u0440\u044B\u0442\u044C: ${escapeHtml(label)}</button>` : "";
      if (looksLikeDocumentDump(quote)) {
        return `
                <div class="evidence-item evidence-item--file-only">
                    <p class="muted finding-evidence-file-only">
                        AI \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u043B \u043D\u0430\u0447\u0430\u043B\u043E \u0444\u0430\u0439\u043B\u0430, \u0430 \u043D\u0435 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u0432\u044B\u0432\u043E\u0434\u0443. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0438 \u0441\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.
                    </p>
                    ${openBtn}
                </div>`;
      }
      if (!isEvidenceQuoteDisplayable(e, finding)) {
        return openBtn ? `<div class="evidence-item">${openBtn}</div>` : "";
      }
      const preview = formatEvidenceQuotePreview(quote, finding?.problem);
      return `
            <div class="evidence-item">
                <p>"${escapeHtml(preview)}"</p>
                ${openBtn}
            </div>`;
    }).filter(Boolean);
    const hasQuote = items.some((e) => isEvidenceQuoteDisplayable(e, finding));
    const materialButtons = sourceMaterials.length ? renderFindingSourceButtons(sourceMaterials) : "";
    if (!parts.length && !materialButtons) {
      return `
            <p class="muted finding-evidence-weak">
                \u041D\u0435\u0442 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u2014 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB \u0438\u043B\u0438 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u0435 \u0432\u044B\u0432\u043E\u0434.
            </p>`;
    }
    if (!parts.length && materialButtons) {
      return `
            <details class="finding-evidence-details">
                <summary>\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A</summary>
                <div class="evidence">
                    <p class="muted finding-evidence-file-only">\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0430\u0443\u0434\u0438\u0442\u0430, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u043E\u0441\u043D\u043E\u0432\u0430\u043D \u0432\u044B\u0432\u043E\u0434:</p>
                    ${materialButtons}
                </div>
            </details>`;
    }
    const body = [
      ...parts,
      materialButtons ? `<div class="evidence-item evidence-item--materials">${materialButtons}</div>` : ""
    ].filter(Boolean).join("");
    return `
        <details class="finding-evidence-details">
            <summary title="${hasQuote ? "\u0426\u0438\u0442\u0430\u0442\u0430 \u0438 \u0444\u0430\u0439\u043B\u044B" : "\u0424\u0430\u0439\u043B\u044B \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB"}">\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A</summary>
            <div class="evidence">${body}</div>
        </details>`;
  }
  function resolveFindingDataAction(f) {
    if (!f) return null;
    const area = String(f.area || "").toLowerCase();
    const hay = [
      f.review_reason,
      f.missing_data,
      f.problem,
      f.recommendation,
      area
    ].filter(Boolean).join(" ").toLowerCase();
    if (area === "crm" || /crm|статус|продаж|воронк/i.test(hay)) {
      return { id: "crm", label: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C CRM" };
    }
    if (area === "semantics" || /поисков|запрос|семантик|wordstat|минус-слов/i.test(hay)) {
      return { id: "search_queries", label: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441\u044B" };
    }
    if (/скриншот|кампани/i.test(hay)) {
      return { id: "campaign_screenshots", label: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u043A\u0440\u0438\u043D\u044B" };
    }
    if (area === "landing" || /посадоч|лендинг/i.test(hay)) {
      return { id: "landing", label: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u044B\u0435" };
    }
    if (area === "budget" || area === "analytics" || /метрик|бюджет|период|клик|заявк|выруч|romi|cpa|cpl/i.test(hay)) {
      return { id: "metrics", label: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C KPI", action: "metrics" };
    }
    return null;
  }
  function renderFindingContextAction(f, primary = false) {
    const ctx = resolveFindingDataAction(f);
    if (!ctx) return "";
    const btnClass = primary ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm";
    if (ctx.action === "metrics") {
      return `<button type="button" class="${btnClass}" onclick="switchTab('data'); switchDataSubtab('direct')">${escapeHtml(ctx.label || "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u0414\u0438\u0440\u0435\u043A\u0442\xBB")}</button>`;
    }
    return `<button type="button" class="${btnClass}" onclick="openDataItemAction('${jsAttr(ctx.id)}')">${escapeHtml(ctx.label)}</button>`;
  }
  function findingStatusLabel(findingOrStatus) {
    const finding = findingOrStatus && typeof findingOrStatus === "object" ? findingOrStatus : null;
    const status = finding ? finding.status : findingOrStatus;
    const labels = {
      ai_generated: "AI-\u0432\u044B\u0432\u043E\u0434",
      human_confirmed: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E",
      human_rejected: "\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E",
      human_edited: "\u0418\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E"
    };
    return labels[status] || status || "AI-\u0432\u044B\u0432\u043E\u0434";
  }
  function getFindingById(id) {
    return (getAuditData2()?.findings || []).find((f) => String(f.id) === String(id));
  }
  function auditHasDataLimitations(data) {
    const findings = data?.findings || [];
    if (findings.some((f) => isDataLimitationFinding(f))) return true;
    return Boolean((data?.data_coverage?.missing_items || []).length);
  }
  function isDataLimitationFinding(f) {
    if (!f) return false;
    if (f.finding_kind === "risk_pattern") return false;
    if (f.finding_kind === "needs_data") return true;
    if (f.kb_eligibility_reason === "needs_data_limitation") return true;
    return /недостаточно.*данн/i.test(String(f.problem || ""));
  }
  function countsAsGlobalKbFinding(f) {
    if (isDirectHealthFinding2(f)) return false;
    if (!f?.kb_eligible) return false;
    if (f.finding_kind === "risk_pattern") return true;
    return !isDataLimitationFinding(f);
  }
  async function loadKbStatusCard() {
    const card = document.getElementById("kbStatusCard");
    if (!card) return;
    if (runtimeBridge.getCurrentScreenState?.() === "RESULTS_NEED_REVIEW") {
      card.style.display = "none";
      card.innerHTML = "";
      return;
    }
    const findings = (getAuditData2()?.findings || []).filter((f) => !isDirectHealthFinding2(f));
    const pendingReview = getFindingReviewProgress({ findings }).pending;
    const confirmedInAudit = findings.filter((f) => ["human_confirmed", "human_edited"].includes(f.status)).length;
    const rejectedInAudit = findings.filter((f) => f.status === "human_rejected").length;
    const kbInAudit = findings.filter((f) => countsAsGlobalKbFinding(f)).length;
    if (hasGuidedCompletedAnalysis2(getAuditData2())) {
      card.style.display = "none";
      card.innerHTML = "";
      return;
    }
    if (pendingReview > 0 && confirmedInAudit === 0) {
      card.style.display = "block";
      card.innerHTML = `
            <strong>\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B</strong>
            <p class="muted kb-status-hint">\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043D\u0438\u0436\u0435 \u2014 \u043F\u043E\u0441\u043B\u0435 \u044D\u0442\u043E\u0433\u043E \u043E\u043D\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C.</p>`;
      return;
    }
    if (confirmedInAudit === 0 && pendingReview === 0 && rejectedInAudit === 0) {
      card.style.display = "none";
      card.innerHTML = "";
      return;
    }
    let kbGlobalNote = "";
    try {
      const status = await apiRequest("/api/knowledge-base/status");
      if (status.available) {
        kbGlobalNote = `<li class="muted">\u0412\u0441\u0435\u0433\u043E \u0432 \u0431\u0430\u0437\u0435 \u0437\u043D\u0430\u043D\u0438\u0439 (\u0432\u0441\u0435 \u0430\u0443\u0434\u0438\u0442\u044B): <strong>${status.confirmed_finding_count || 0}</strong></li>`;
      }
    } catch (_err) {
    }
    card.style.display = "block";
    card.innerHTML = `
        <strong>\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B</strong>
        <p class="muted kb-status-hint">\u0421\u0442\u0430\u0442\u0443\u0441 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0432 \u044D\u0442\u043E\u043C \u0430\u0443\u0434\u0438\u0442\u0435.</p>
        <ul class="kb-stats-list muted">
            <li>\u0412 \u043E\u0442\u0447\u0451\u0442\u0435 \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430: <strong>${confirmedInAudit}</strong></li>
            <li>\u041E\u0436\u0438\u0434\u0430\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438: <strong>${pendingReview}</strong></li>
            <li>\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E: <strong>${rejectedInAudit}</strong></li>
            ${kbInAudit ? `<li>AI-\u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0432 \u0431\u0430\u0437\u0435 \u0437\u043D\u0430\u043D\u0438\u0439: <strong>${kbInAudit}</strong></li>` : ""}
            ${kbGlobalNote && kbInAudit ? kbGlobalNote : ""}
        </ul>`;
  }
  function renderFindingFooterLink(label, onclick, { extraClass = "" } = {}) {
    return `<button type="button" class="finding-action-link btn-sm ${extraClass}" onclick="${onclick}">${escapeHtml(label)}</button>`;
  }
  function renderFindingFooterBar({ main = "", links = [] } = {}) {
    const linkItems = (links || []).filter(Boolean);
    const linksHtml = linkItems.length ? `<div class="finding-actions-links">${linkItems.join('<span class="finding-actions-dot" aria-hidden="true">\xB7</span>')}</div>` : "";
    const sep = main && linksHtml ? '<span class="finding-actions-sep" aria-hidden="true"></span>' : "";
    if (!main && !linksHtml) return "";
    return `<div class="finding-actions finding-actions--compact">
        <div class="finding-actions-bar">${main}${sep}${linksHtml}</div>
    </div>`;
  }
  function renderFindingFooterActions(f) {
    if (isDirectHealthFinding2(f)) return "";
    const status = f.status || "ai_generated";
    const isHumanConfirmed = ["human_confirmed", "human_edited"].includes(status);
    const showConfirm = !(f.evidence || []).every((e) => (e.material_type || "").includes("system"));
    const dataGap = isFindingDataGapCard(f);
    const contextBtn = renderFindingContextAction(f, true);
    const id = f.id;
    const linkEdit = renderFindingFooterLink("\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C", `openFindingEdit(${id})`);
    const linkReject = renderFindingFooterLink("\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C", `rejectFinding(${id})`, { extraClass: "finding-action-link--muted" });
    const linkChat = canWrite() && status !== "human_rejected" ? renderFindingFooterLink("\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0432 \u0447\u0430\u0442\u0435", `askFromFinding(${id})`) : "";
    if (status === "human_rejected") {
      return renderFindingFooterBar({
        main: `<button type="button" class="btn btn-outline btn-sm" onclick="restoreFindingToReview(${id})">\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0432 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443</button>`
      });
    }
    if (isHumanConfirmed) {
      return renderFindingFooterBar({
        main: `<button type="button" class="btn btn-outline btn-sm" onclick="unconfirmFinding(${id})">\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043E\u0442\u0447\u0451\u0442\u0430</button>`,
        links: [linkEdit, linkReject, linkChat]
      });
    }
    const canPattern = canConfirmFindingRiskPattern(f);
    const btnReport = showConfirm ? `<button type="button" class="btn btn-success btn-sm" onclick="confirmFinding(${id})" title="\u041F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u043E\u0442\u0447\u0451\u0442 \u0438 \u0432 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439">\u0412 \u043E\u0442\u0447\u0451\u0442</button>` : "";
    const btnReportPattern = canPattern ? `<button type="button" class="btn btn-outline btn-sm" onclick="confirmFindingRiskPattern(${id})" title="\u0422\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 (CRM, \u0437\u0430\u043F\u0440\u043E\u0441\u044B\u2026) \u2014 \u043F\u0430\u0442\u0442\u0435\u0440\u043D \u0434\u043B\u044F \u0434\u0440\u0443\u0433\u0438\u0445 \u0430\u0443\u0434\u0438\u0442\u043E\u0432">\u0412 \u043E\u0442\u0447\u0451\u0442 (\u0448\u0430\u0431\u043B\u043E\u043D)</button>` : "";
    if (dataGap) {
      const dataBtn = contextBtn || `<button type="button" class="btn btn-primary btn-sm" onclick="goToAddAuditData()">\u041A \u0434\u0430\u043D\u043D\u044B\u043C</button>`;
      const mainParts = [dataBtn];
      if (showConfirm) mainParts.push(btnReport);
      if (btnReportPattern) mainParts.push(btnReportPattern);
      if (!showConfirm && !btnReportPattern) {
        mainParts.push(
          `<span class="finding-footer-hint muted">\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \xAB\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C\xBB \u0438\u043B\u0438 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435</span>`
        );
      }
      return renderFindingFooterBar({
        main: mainParts.join(""),
        links: [linkEdit, linkReject, linkChat]
      });
    }
    const main = [btnReport, contextBtn].filter(Boolean).join("");
    return renderFindingFooterBar({
      main,
      links: [linkEdit, linkReject, linkChat]
    });
  }
  function getAvailableFindingIllustrationScreenshots(data) {
    const appendixUsed = new Set(getReportAppendixItems(data).map((item) => item.material_id));
    return (data?.materials || []).filter(
      (m) => m?.type === "screenshot" && m.file_url && !m.excluded_from_report && !appendixUsed.has(m.id)
    );
  }
  function buildFindingCaptionPromptMessage(ocrHint) {
    const lines = [
      "\u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0434 \u0441\u043A\u0440\u0438\u043D\u043E\u043C \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u044D\u0442\u043E\u0433\u043E \u0432\u044B\u0432\u043E\u0434\u0430 \u0432 PDF.",
      "\u041E\u043F\u0438\u0448\u0438\u0442\u0435: \u0447\u0442\u043E \u043D\u0430 \u0433\u0440\u0430\u0444\u0438\u043A\u0435 \u0438 \u043A\u0430\u043A\u043E\u0439 \u0432\u044B\u0432\u043E\u0434 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430.",
      "",
      "\u041F\u0440\u0438\u043C\u0435\u0440: \xAB\u0420\u0438\u0441. 1. \u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 CPL, \u043C\u0430\u0439 2026 \u2014 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 \u043F\u043E\u0441\u043B\u0435 \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u0438 \u043C\u0438\u043D\u0443\u0441-\u0441\u043B\u043E\u0432.\xBB"
    ];
    if (ocrHint && isUsableOcrHint(ocrHint)) {
      lines.push("", "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0441 OCR (\u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0446\u0438\u0444\u0440\u044B):", ocrHint.slice(0, 220));
    }
    return lines.join("\n");
  }
  function renderFindingIllustrationBlock(f) {
    if (isDirectHealthFinding2(f)) return "";
    if (!canWrite() || (f.status || "") === "human_rejected") return "";
    const status = f.status || "ai_generated";
    const isConfirmed = ["human_confirmed", "human_edited"].includes(status);
    const hasImage = Boolean(f.illustration_file_url);
    const captionReady = Boolean(f.illustration_caption_ready);
    const preview = hasImage ? `<div class="finding-illustration-preview">
                <img src="${escapeHtml(f.illustration_file_url)}" alt="${escapeHtml(f.illustration_title || "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u043A \u0432\u044B\u0432\u043E\u0434\u0443")}">
           </div>` : "";
    const captionField = hasImage ? `<label class="finding-missing-label">\u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u0434 \u0440\u0438\u0441\u0443\u043D\u043A\u043E\u043C \u0432 PDF</label>
           <textarea class="form-control finding-illustration-caption-input" rows="2" data-finding-id="${f.id}" placeholder="\u0420\u0438\u0441. \u2026 \u2014 \u043F\u0435\u0440\u0438\u043E\u0434, \u043C\u0435\u0442\u0440\u0438\u043A\u0430, \u0432\u044B\u0432\u043E\u0434 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430">${escapeHtml(f.illustration_caption || "")}</textarea>
           ${!captionReady ? '<p class="finding-illustration-warn">\u26A0 \u041C\u0438\u043D. 10 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432 \u2014 \u0431\u0435\u0437 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 \u0441\u043A\u0440\u0438\u043D \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 PDF</p>' : ""}` : "";
    const attachLabel = hasImage ? "\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C" : "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0441\u043A\u0440\u0438\u043D";
    const removeBtn = hasImage ? `<button type="button" class="btn btn-link btn-sm" onclick="clearFindingIllustration(${f.id})">\u0423\u0431\u0440\u0430\u0442\u044C</button>` : "";
    const hint = isConfirmed ? "" : '<p class="muted finding-illustration-hint">\u0412 PDF \u2014 \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u0430.</p>';
    const inner = `${hint}${preview}${captionField}
            <div class="finding-illustration-actions">
                <button type="button" class="btn btn-outline btn-sm" onclick="openFindingIllustrationPicker(${f.id})">${attachLabel}</button>
                ${removeBtn}
            </div>`;
    if (!hasImage && !captionField) {
      return `<details class="finding-extra finding-illustration-collapsed">
            <summary>\u0421\u043A\u0440\u0438\u043D \u0434\u043B\u044F PDF (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)</summary>
            <div class="finding-illustration-block">${inner}</div>
        </details>`;
    }
    return `<details class="finding-extra finding-illustration-collapsed"${hasImage ? " open" : ""}>
        <summary>${hasImage ? "\u0421\u043A\u0440\u0438\u043D \u0434\u043B\u044F PDF" : "\u0421\u043A\u0440\u0438\u043D \u0434\u043B\u044F PDF (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)"}</summary>
        <div class="finding-illustration-block">${inner}</div>
    </details>`;
  }
  function bindFindingIllustrationCaptionInputs(root) {
    (root || document).querySelectorAll(".finding-illustration-caption-input").forEach((el) => {
      if (el.dataset.bound === "1") return;
      el.dataset.bound = "1";
      el.addEventListener("blur", () => {
        saveFindingIllustrationCaption(Number(el.dataset.findingId), el.value, { silent: true });
      });
    });
  }
  async function openFindingIllustrationPicker(findingId, materialId = null) {
    if (!requireWriteAccess("\u0418\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043A \u0432\u044B\u0432\u043E\u0434\u0443")) return;
    if (!getCurrentAuditId2() || !getAuditData2()) return;
    let targetId = materialId != null ? Number(materialId) : null;
    if (targetId == null) {
      const available = getAvailableFindingIllustrationScreenshots(getAuditData2());
      if (!available.length) {
        showAlert("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043D\u0430 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB \u0438\u043B\u0438 \u043E\u0441\u0432\u043E\u0431\u043E\u0434\u0438\u0442\u0435 \u0441\u043A\u0440\u0438\u043D \u0438\u0437 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F PDF.", "warning");
        return;
      }
      if (available.length === 1) {
        targetId = available[0].id;
      } else {
        const lines = available.map((m, i) => `${i + 1}. ${m.title || "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442"}`).join("\n");
        const pick = await showPromptDialog2({
          title: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u043A \u0432\u044B\u0432\u043E\u0434\u0443",
          message: `\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 (1\u2013${available.length}):
${lines}`,
          placeholder: "1",
          required: true
        });
        if (!pick) return;
        const idx = parseInt(String(pick).trim(), 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= available.length) {
          showAlert("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440", "warning");
          return;
        }
        targetId = available[idx].id;
      }
    }
    const material = (getAuditData2().materials || []).find((m) => m.id === targetId);
    const ocr = material ? findOcrMaterial(material) : null;
    const ocrHint = (ocr?.extracted_text || ocr?.raw_content || "").trim();
    const caption = await showPromptDialog2({
      title: "\u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u0434 \u0440\u0438\u0441\u0443\u043D\u043A\u043E\u043C \u0432 PDF",
      message: buildFindingCaptionPromptMessage(ocrHint),
      placeholder: "\u0420\u0438\u0441. 1. \u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 CPL, \u043C\u0430\u0439 2026 \u2014 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 \u043F\u043E\u0441\u043B\u0435 \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u0438.",
      required: false
    });
    if (caption === false) return;
    try {
      const body = { material_id: targetId };
      if (caption && caption.trim()) body.caption = caption.trim();
      await apiRequest(`/api/audits/${getCurrentAuditId2()}/findings/${findingId}/illustration`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      await refreshAuditAfterFindingAction(
        caption && caption.trim().length >= 10 ? "\u0421\u043A\u0440\u0438\u043D \u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0435\u043D\u044B \u043A \u0432\u044B\u0432\u043E\u0434\u0443." : "\u0421\u043A\u0440\u0438\u043D \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D. \u0414\u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u044C (\u043C\u0438\u043D. 10 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432) \u2014 \u0438\u043D\u0430\u0447\u0435 \u0432 PDF \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0451\u0442."
      );
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  async function clearFindingIllustration(findingId) {
    if (!requireWriteAccess("\u0418\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043A \u0432\u044B\u0432\u043E\u0434\u0443")) return;
    try {
      await apiRequest(`/api/audits/${getCurrentAuditId2()}/findings/${findingId}/illustration`, {
        method: "PATCH",
        body: JSON.stringify({ material_id: null })
      });
      await refreshAuditAfterFindingAction("\u0418\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0443\u0431\u0440\u0430\u043D\u0430.");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  function renderFindingCard(f) {
    if (isDirectHealthFinding2(f)) return "";
    const status = f.status || "ai_generated";
    const isRejected = status === "human_rejected";
    const isHumanConfirmed = ["human_confirmed", "human_edited"].includes(status);
    const pending = isFindingPendingReview(f);
    const compact = isCompactFindingCard(f);
    const userEvidence = (f.evidence || []).filter((e) => !(e.material_type || "").includes("system") && !(e.material_type || "").includes("quality_guard"));
    const actionStatus = classifyMarketerActionStatus(f);
    const verdict = buildFindingVerdictLines(f);
    const areaChip = areaDisplayLabel(f.area) ? `<span class="finding-area-chip">${escapeHtml(areaDisplayLabel(f.area))}</span>` : "";
    const subLine = !compact && verdict.sub ? `<p class="finding-verdict-sub muted">${escapeHtml(verdict.sub)}</p>` : "";
    const leakWarn = (isHumanConfirmed || pending) && hasInternalReportLeak(`${f.problem || ""}
${f.recommendation || ""}`) ? '<p class="finding-pdf-leak-warn">\u26A0 \u0412 \u0442\u0435\u043A\u0441\u0442\u0435 \u0435\u0441\u0442\u044C \u0441\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0435 \u043F\u043E\u043C\u0435\u0442\u043A\u0438 (#N, [mat_]) \u2014 \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0443\u0442 \u0432 \u043D\u043E\u0440\u043C\u0430\u043B\u044C\u043D\u044B\u0439 PDF. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C\xBB.</p>' : "";
    const similar = isHumanConfirmed ? findSimilarConfirmedFindings(f, getAuditData2()?.findings || []) : [];
    const similarIds = similar.map((x) => x.id).filter((id) => Number.isFinite(Number(id)));
    const dupeWarn = similarIds.length ? `<p class="finding-dupe-warn muted">\u041F\u043E\u0445\u043E\u0436\u0438\u0439 \u0432\u044B\u0432\u043E\u0434 \u0443\u0436\u0435 \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 (\u2116${similarIds.join(", ")}) \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u043D\u0435 \u0434\u0443\u0431\u043B\u044C \u043B\u0438 \u044D\u0442\u043E.</p>` : "";
    const isInterp = isAiInterpretationFinding2(f);
    const isStub = isStubEnrichmentFinding(f) || isInterp && (f.original_ai_output?.enrichment_status === "stub" || f.enrichment_status === "stub" || /AI не детализировал/i.test(String(f.review_reason || "")));
    const stubNote = isStub && compact ? '<p class="finding-stub-note muted">\u041D\u0435\u0442 \u043F\u043E\u043B\u043D\u043E\u0433\u043E AI-\u043E\u0431\u043E\u0433\u0430\u0449\u0435\u043D\u0438\u044F \u2014 \xAB\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C\xBB \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A \u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>' : "";
    const headline = verdict.headline;
    const recText = String(f.recommendation || "").trim() || "\u2014";
    const showRecLine = recText !== "\u2014" && !findingHeadlineMatchesRec(headline, recText);
    const recommendationBlock = compact ? showRecLine ? `<p class="finding-rec-line"><span class="finding-rec-label">\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435</span> ${escapeHtml(recText)}</p>${stubNote}` : `${stubNote}` : `<div class="finding-recommendation-block finding-recommendation-block--primary">
            <p class="finding-rec-action"><strong>\u0427\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C</strong> ${escapeHtml(recText)}</p>
            ${f.expected_impact ? `<p class="finding-rec-effect muted">${escapeHtml(f.expected_impact)}</p>` : ""}
            ${leakWarn}
            ${dupeWarn}
        </div>`;
    const queueBadge = shouldShowFindingQueueBadge(f, actionStatus) ? `<span class="finding-queue-badge ${actionStatus.css}">${escapeHtml(actionStatus.label)}</span>` : "";
    const interpHeader = shouldShowInterpRiskLink(f, verdict.headline) ? `<p class="finding-ai-interp-label muted">
            <button type="button" class="btn btn-link btn-sm finding-direct-risk-link" onclick="openDirectExcelSource(${f.id})">${escapeHtml(DIRECT_COPY.directRiskLinkBtn)}</button>
           </p>` : "";
    const compactExtras = compact ? [leakWarn, dupeWarn, f.expected_impact ? `<p class="finding-rec-effect muted">${escapeHtml(f.expected_impact)}</p>` : ""].filter(Boolean).join("") : "";
    let secondaryBlocks = "";
    if (compact) {
      const moreInner = [
        compactExtras,
        isRejected ? "" : renderFindingEvidenceBlock(userEvidence, f),
        isRejected ? "" : renderFindingIllustrationBlock(f),
        renderMarketerExpertDetails(f)
      ].filter(Boolean).join("");
      if (moreInner) {
        secondaryBlocks = `<details class="finding-extra finding-more-details"><summary>\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435</summary>${moreInner}</details>`;
      }
    } else {
      secondaryBlocks = [
        isRejected ? "" : renderFindingEvidenceBlock(userEvidence, f),
        isRejected ? "" : renderFindingIllustrationBlock(f),
        renderMarketerExpertDetails(f)
      ].join("");
    }
    const itemCls = [
      "finding-item",
      "finding-item--marketer",
      f.severity,
      actionStatus.css,
      compact ? "finding-item--compact finding-item--row" : "",
      isRejected ? "finding-rejected" : "",
      pending ? "finding-needs-review" : "",
      isHumanConfirmed ? "finding-confirmed" : "",
      isInterp ? "finding-item--ai-interp" : "",
      isStub ? "finding-item--enrichment-stub" : ""
    ].filter(Boolean).join(" ");
    const footer = renderFindingFooterActions(f);
    if (compact) {
      const excelLink = shouldShowInterpRiskLink(f, headline) ? `<button type="button" class="btn btn-link btn-sm finding-row-excel-link" onclick="openDirectExcelSource(${f.id})">Excel</button>` : "";
      return `
        <article class="${itemCls}" id="finding-${f.id}" ${pending ? `data-pending-id="finding-pending-${f.id}"` : ""}>
            <div class="finding-row-grid">
                <div class="finding-row-main">
                    <div class="finding-row-meta">
                        ${queueBadge}
                        ${areaChip}
                        <span class="finding-row-id">\u2116${f.id}</span>
                        ${excelLink}
                    </div>
                    <p class="finding-row-title">${escapeHtml(headline)}</p>
                    ${renderFindingRejectReasonLine(f)}
                    ${renderMarketerMissingBlock(f)}
                    ${recommendationBlock}
                </div>
                <div class="finding-row-aside">${footer}</div>
            </div>
            ${secondaryBlocks ? `<div class="finding-row-more">${secondaryBlocks}</div>` : ""}
            ${shouldShowFindingHumanComment(f) ? `<div class="finding-marketer-comment"><span class="finding-missing-label">\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439</span><p>${escapeHtml(f.human_comment)}</p></div>` : ""}
        </article>`;
    }
    return `
        <div class="${itemCls}" id="finding-${f.id}" ${pending ? `data-pending-id="finding-pending-${f.id}"` : ""}>
            <div class="finding-marketer-head">
                ${queueBadge}
                ${areaChip}
            </div>
            ${interpHeader}
            <p class="finding-verdict-headline">${escapeHtml(headline)}</p>
            ${subLine}
            ${renderFindingRejectReasonLine(f)}
            ${renderMarketerMissingBlock(f)}
            ${recommendationBlock}
            ${secondaryBlocks}
            ${shouldShowFindingHumanComment(f) ? `<div class="finding-marketer-comment"><span class="finding-missing-label">\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\u0430</span><p>${escapeHtml(f.human_comment)}</p></div>` : ""}
            ${!compact && f.edited_at ? `<div class="finding-meta-row"><span>\u0418\u0437\u043C\u0435\u043D\u0438\u043B: ${escapeHtml(f.edited_by || "marketer")}</span><span>${formatDate(f.edited_at)}</span></div>` : ""}
            ${footer}
        </div>`;
  }
  function renderFindings(findings, coverage) {
    const container = document.getElementById("findingsList");
    if (!container) return;
    if (getAuditData2()?.workflow_state?.analysis_failed) {
      container.innerHTML = `
            <div class="empty-state-card">
                <h3>AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D</h3>
                <p class="muted">\u0412\u044B\u0432\u043E\u0434\u044B \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u0433\u043E AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>
            </div>`;
      return;
    }
    const auditData2 = getAuditData2();
    if (isPreliminaryAudit()) {
      const canSyncDirect = hasDirectHealthScore(auditData2) && hasDirectAnalyticsSlice(auditData2);
      const aiCount = countAiFindings(findings);
      if (aiCount === 0 && !canSyncDirect) {
        container.innerHTML = `
                <div class="empty-state-card">
                    <h3>\u0412\u044B\u0432\u043E\u0434\u044B \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445</h3>
                    <p class="muted">${escapeHtml(auditData2?.workflow_ui?.next_action_hint || "\u0411\u0435\u0437 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u043D\u0435 \u0444\u043E\u0440\u043C\u0438\u0440\u0443\u0435\u0442 AI-\u0432\u044B\u0432\u043E\u0434\u044B \u0441 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u043E\u043C \u0438 \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C\u044E.")}</p>
                    <div class="preliminary-limits">
                        <p><strong>\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0430:</strong> ${escapeHtml(coverage?.data_collection_recommendation || "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u0430\u0443\u0434\u0438\u0442\u0430.")}</p>
                    </div>
                </div>`;
        return;
      }
      if (aiCount === 0) {
        container.innerHTML = `
                <div class="empty-state-card">
                    <h3>\u041D\u0435\u0442 AI-\u0432\u044B\u0432\u043E\u0434\u043E\u0432</h3>
                    <p class="muted">\u0420\u0438\u0441\u043A\u0438 Excel \u2014 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB${DIRECT_COPY.productTab}\xBB.</p>
                </div>`;
        return;
      }
    }
    if (findings.length === 0) {
      if (hasGuidedCompletedAnalysis2(getAuditData2())) {
        const summary = getAuditData2()?.audit_summary || {};
        const stale = isAnalysisStale(getAuditData2());
        container.innerHTML = `
                <div class="empty-state-card">
                    <h3>AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D</h3>
                    <p class="muted">\u041E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B. \u041A\u0440\u0430\u0442\u043A\u0438\u0439 \u0438\u0442\u043E\u0433 \u0438\u0437 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430:</p>
                    <p><strong>\u041F\u0440\u043E\u0431\u043B\u0435\u043C\u0430:</strong> ${escapeHtml(summary.client_problem || "\u2014")}</p>
                    <p><strong>\u0420\u0438\u0441\u043A:</strong> ${escapeHtml(summary.main_risk || "\u2014")}</p>
                    <p><strong>\u0412\u044B\u0432\u043E\u0434:</strong> ${escapeHtml(summary.short_conclusion || "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0443 \xAB\u041E\u0442\u0447\u0451\u0442\xBB \u0434\u043B\u044F \u0434\u0435\u0442\u0430\u043B\u0435\u0439.")}</p>
                    ${stale ? '<p class="muted">\u0414\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437 (\u043A\u043D\u043E\u043F\u043A\u0430 \u0432 \u0448\u0430\u043F\u043A\u0435 \u0438\u043B\u0438 \xAB\u0415\u0449\u0451\xBB).</p>' : ""}
                    <div class="findings-empty-actions">
                        <button type="button" class="btn btn-primary btn-sm" onclick="openReportPanel()">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0447\u0451\u0442</button>
                    </div>
                </div>`;
        return;
      }
      if (hasDirectHealthScore(auditData2) && hasDirectAnalyticsSlice(auditData2)) {
        container.innerHTML = `
                <div class="empty-state-card">
                    <h3>\u041D\u0435\u0442 AI-\u0432\u044B\u0432\u043E\u0434\u043E\u0432</h3>
                    <p class="muted">\u0420\u0438\u0441\u043A\u0438 Excel \u2014 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB${DIRECT_COPY.productTab}\xBB.</p>
                </div>`;
        return;
      }
      container.innerHTML = '<p class="muted findings-empty-muted">\u041D\u0435\u0442 \u0432\u044B\u0432\u043E\u0434\u043E\u0432.</p>';
      return;
    }
    resetFindingsMarketerFilterForAudit(findings, getCurrentAuditId2(), getAuditData2());
    syncFindingsMarketerFilter(findings, getAuditData2());
    const progress = getFindingReviewProgress(getAuditData2());
    const filterBar = renderFindingsMarketerFilterBar(findings, getAuditData2());
    if (findingsMarketerFilter === "recs") {
      container.innerHTML = `${filterBar}<p class="muted findings-recs-lead">\u0421\u0432\u043E\u0434\u043A\u0430 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u0438 \u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u0438\u0439 \u043F\u043B\u0430\u043D \u2014 \u043D\u0438\u0436\u0435 (\u0431\u0435\u0437 \u0434\u0443\u0431\u043B\u0435\u0439 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A).</p>`;
      syncFindingsAuxPanelsVisibility();
      return;
    }
    const active = findings.filter((f) => matchesMarketerFindingsFilter(f, findingsMarketerFilter));
    const missingEnrichmentHtml = findingsMarketerFilter === "no_ai" ? renderMissingEnrichmentCards(getAuditData2()) : "";
    if (active.length === 0 && !missingEnrichmentHtml && countAiFindings(findings) === 0) {
      container.innerHTML = `${filterBar}<div class="empty-state-card findings-filter-empty-card">
            <h3>\u041D\u0435\u0442 AI-\u0432\u044B\u0432\u043E\u0434\u043E\u0432</h3>
            <p class="muted">\u0420\u0438\u0441\u043A\u0438 Excel \u2014 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB${DIRECT_COPY.productTab}\xBB.</p>
        </div>`;
      syncFindingsAuxPanelsVisibility();
      return;
    }
    if (active.length === 0 && !missingEnrichmentHtml) {
      const auditData3 = getAuditData2();
      const inReport = countMarketerFindingsFilter(findings, "report", auditData3);
      const hint = getFindingsFilterEmptyHint(findingsMarketerFilter, progress, inReport);
      const ctas = buildFindingsFilterCtas(findings, auditData3, progress);
      let body = `<div class="findings-filter-empty-card">
            <p class="muted findings-filter-empty">${escapeHtml(hint)}</p>
            <div class="findings-filter-empty-actions">${ctas}</div>
        </div>`;
      if (progress.pending === 0 && hasGuidedCompletedAnalysis2(auditData3)) {
        const improvements = getPostAnalysisDataImprovements2(auditData3);
        const labels = improvements.slice(0, 5).map((i) => escapeHtml(i.label || i.id)).filter(Boolean);
        const improveBlock = improvements.length ? `<div class="empty-state-card findings-all-done-card">
                    <h3>\u0412\u0441\u0435 AI-\u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B</h3>
                    <p class="muted">\u0414\u043B\u044F \u043F\u043E\u0432\u044B\u0448\u0435\u043D\u0438\u044F \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u0438 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435:</p>
                    <ul class="empty-checklist">${labels.map((l) => `<li>${l}</li>`).join("")}</ul>
                    <button type="button" class="btn btn-outline btn-sm" onclick="goToDataImprovements()">\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0434\u0430\u043D\u043D\u044B\u043C</button>
                   </div>` : `<div class="empty-state-card findings-all-done-card">
                    <h3>\u0412\u0441\u0435 AI-\u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B</h3>
                    <p class="muted">${inReport > 0 ? `${inReport} \u0432 \u043E\u0442\u0447\u0451\u0442\u0435 \u2014 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440 \xAB\u0412 \u043E\u0442\u0447\u0451\u0442\u0435\xBB \u043D\u0438\u0436\u0435.` : "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A \u043D\u0435\u0442."}</p>
                   </div>`;
        body = improveBlock + body;
      }
      container.innerHTML = `${filterBar}<div class="findings-view findings-view--${findingsMarketerFilter}">${missingEnrichmentHtml}${body}</div>`;
      syncFindingsAuxPanelsVisibility();
      return;
    }
    const activeHtml = active.map((f) => renderFindingCard(f)).join("");
    const viewCls = `findings-view findings-view--${findingsMarketerFilter}`;
    container.innerHTML = `${filterBar}<div class="${viewCls}">${missingEnrichmentHtml}${activeHtml}</div>`;
    bindFindingIllustrationCaptionInputs(container);
    syncFindingsAuxPanelsVisibility();
  }
  async function refreshAuditAfterFindingAction(message) {
    const refreshed = await apiRequest(`/api/audits/${getCurrentAuditId2()}`);
    runtimeBridge.setAuditData?.(refreshed);
    syncFindingsMarketerFilter(refreshed.findings || [], refreshed);
    runtimeBridge.renderAuditDetail?.(refreshed);
    showAlert(message, "success");
  }
  async function unconfirmFinding(id) {
    if (!requireWriteAccess("\u041E\u0442\u043C\u0435\u043D\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u0430")) return;
    const accepted = await showConfirmDialog({
      title: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435",
      message: "\u0412\u044B\u0432\u043E\u0434 \u0441\u043D\u043E\u0432\u0430 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u0441\u0442\u0430\u0442\u0443\u0441 \xAB\u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435\xBB. \u0417\u0430\u043F\u0438\u0441\u044C \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u0430 \u0438\u0437 \u0431\u0430\u0437\u044B \u0437\u043D\u0430\u043D\u0438\u0439 \u0434\u043B\u044F \u0434\u0440\u0443\u0433\u0438\u0445 \u0430\u0443\u0434\u0438\u0442\u043E\u0432.",
      confirmText: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435",
      cancelText: "\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043A\u0430\u043A \u0435\u0441\u0442\u044C",
      confirmType: "primary"
    });
    if (!accepted) return;
    try {
      await apiRequest(findingFeedbackUrl(id, "unconfirm"), {
        method: "POST",
        body: JSON.stringify({})
      });
      findingsMarketerFilter = "pending";
      const msg = "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E. \u0412\u044B\u0432\u043E\u0434 \u0441\u043D\u043E\u0432\u0430 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \xAB\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443\xBB.";
      await refreshAuditAfterFindingAction(msg);
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  function findingEvidenceCheckUrl(findingId) {
    const auditId = getCurrentAuditId2();
    if (auditId) {
      return `/api/audits/${auditId}/findings/${findingId}/evidence-check`;
    }
    return `/api/findings/${findingId}/evidence-check`;
  }
  async function postFindingConfirm(id, body) {
    return apiRequest(findingFeedbackUrl(id, "confirm"), {
      method: "POST",
      body: JSON.stringify(body)
    });
  }
  async function confirmFinding(id) {
    if (!requireWriteAccess("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0432\u044B\u0432\u043E\u0434\u0430")) return;
    const finding = getFindingById(id);
    if (isDirectHealthFinding2(finding)) {
      showAlert("\u041D\u0430 \xAB\u0412\u044B\u0432\u043E\u0434\u0430\u0445\xBB \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E AI-\u0432\u044B\u0432\u043E\u0434\u044B.", "info");
      return;
    }
    let evidenceHint = "";
    try {
      const check = await apiRequest(findingEvidenceCheckUrl(id));
      if (!check.ok && (check.warnings || []).length) {
        evidenceHint = "\n\n\u26A0\uFE0F " + check.warnings.join(" ");
      }
    } catch (_e) {
    }
    const comment = await showPromptDialog2({
      title: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0438 \u043E\u0431\u0443\u0447\u0438\u0442\u044C",
      message: `\u0412\u044B\u0432\u043E\u0434 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u043E\u0442\u0447\u0451\u0442 \u0438 \u0432 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439. \u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D.${evidenceHint}`,
      placeholder: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043A \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044E (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)",
      confirmText: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C"
    });
    if (comment === false) return;
    const payload = { comment: comment || "" };
    try {
      const saved = await postFindingConfirm(id, payload);
      await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(saved, "confirm"));
    } catch (error) {
      if (error.code === "WEAK_EVIDENCE") {
        const proceed = await showConfirmDialog({
          title: "\u0421\u043B\u0430\u0431\u044B\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430",
          message: `${error.message}

\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0432\u044B\u0432\u043E\u0434 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439 \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E?`,
          confirmText: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E",
          cancelText: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435",
          confirmType: "primary"
        });
        if (!proceed) return;
        try {
          const saved = await postFindingConfirm(id, {
            ...payload,
            acknowledge_weak_evidence: true
          });
          await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(saved, "confirm"));
          return;
        } catch (retryErr) {
          showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F: " + retryErr.message, "danger");
          return;
        }
      }
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F: " + error.message, "danger");
    }
  }
  async function confirmFindingRiskPattern(id) {
    if (!requireWriteAccess("\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F")) return;
    const finding = getFindingById(id);
    if (!canConfirmFindingRiskPattern(finding)) {
      showAlert(
        "\xAB\u0412 \u043E\u0442\u0447\u0451\u0442 (\u0448\u0430\u0431\u043B\u043E\u043D)\xBB \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439 \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C (\u043D\u0435\u0442 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0438 CRM, \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u0438 \u0442.\u043F.). \u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0432\u044B\u0432\u043E\u0434\u0430 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0437\u0435\u043B\u0451\u043D\u0443\u044E \u043A\u043D\u043E\u043F\u043A\u0443 \xAB\u0412 \u043E\u0442\u0447\u0451\u0442\xBB \u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435.",
        "warning"
      );
      return;
    }
    const comment = await showPromptDialog2({
      title: "\u0412 \u043E\u0442\u0447\u0451\u0442 (\u0448\u0430\u0431\u043B\u043E\u043D \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F)",
      message: "\u0417\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C, \u0447\u0442\u043E \u0434\u0430\u043D\u043D\u044B\u0445 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442. \u041F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u043E\u0442\u0447\u0451\u0442 \u0438 \u0432 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439 \u043A\u0430\u043A \u043F\u0430\u0442\u0442\u0435\u0440\u043D \u0440\u0438\u0441\u043A\u0430 \u2014 \u043D\u0435 \u043A\u0430\u043A \u043F\u043E\u043B\u043D\u043E\u0446\u0435\u043D\u043D\u044B\u0439 \u0432\u044B\u0432\u043E\u0434 \u0441 \u0446\u0438\u0444\u0440\u0430\u043C\u0438.",
      placeholder: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)",
      confirmText: "\u0412 \u043E\u0442\u0447\u0451\u0442 (\u0448\u0430\u0431\u043B\u043E\u043D)"
    });
    if (comment === false) return;
    try {
      const saved = await apiRequest(findingFeedbackUrl(id, "confirm-risk-pattern"), {
        method: "POST",
        body: JSON.stringify({ comment: comment || "" })
      });
      await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(saved, "risk_pattern"));
    } catch (error) {
      const msg = error.code === "NOT_RISK_PATTERN" || /шаблон/i.test(error.message || "") ? error.message || "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0437\u0435\u043B\u0451\u043D\u0443\u044E \xAB\u0412 \u043E\u0442\u0447\u0451\u0442\xBB \u0434\u043B\u044F \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0432\u044B\u0432\u043E\u0434\u0430." : `\u041E\u0448\u0438\u0431\u043A\u0430: ${error.message}`;
      showAlert(msg, "warning");
    }
  }
  async function restoreFindingToReview(id) {
    if (!requireWriteAccess("\u0412\u043E\u0437\u0432\u0440\u0430\u0442 \u0432\u044B\u0432\u043E\u0434\u0430 \u0432 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443")) return;
    const f = getFindingById(id);
    if (!f || isDirectHealthFinding2(f)) return;
    if (f.status === "human_rejected") {
      try {
        await apiRequest(findingFeedbackUrl(id, "unconfirm"), {
          method: "POST",
          body: JSON.stringify({ comment: "" })
        });
        findingsMarketerFilter = "pending";
        await refreshAuditAfterFindingAction("\u0412\u044B\u0432\u043E\u0434 \u0441\u043D\u043E\u0432\u0430 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \xAB\u041D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443\xBB.");
      } catch (error) {
        showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
      }
      return;
    }
    if (["human_confirmed", "human_edited"].includes(f.status || "")) {
      await unconfirmFinding(id);
    }
  }
  async function rejectFinding(id) {
    if (!requireWriteAccess("\u041E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u0435 \u0432\u044B\u0432\u043E\u0434\u0430")) return;
    const finding = getFindingById(id);
    if (isDirectHealthFinding2(finding)) {
      showAlert("\u0420\u0438\u0441\u043A\u0438 Excel \u043D\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F \u043D\u0430 \xAB\u0412\u044B\u0432\u043E\u0434\u0430\u0445\xBB.", "info");
      return;
    }
    const reason = await showPromptDialog2({
      title: "\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C \u0438 \u043D\u0435 \u043E\u0431\u0443\u0447\u0430\u0442\u044C",
      message: "\u0412\u044B\u0432\u043E\u0434 \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \u043E\u0442\u0447\u0451\u0442 \u0438 \u0431\u0430\u0437\u0443 \u0437\u043D\u0430\u043D\u0438\u0439 \u0438 \u043D\u0435 \u0431\u0443\u0434\u0435\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043F\u0440\u0438 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0435.",
      placeholder: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F",
      confirmText: "\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C",
      required: true
    });
    if (reason === false || !reason) return;
    try {
      await apiRequest(findingFeedbackUrl(id, "reject"), {
        method: "POST",
        body: JSON.stringify({ reason, comment: reason })
      });
      findingsMarketerFilter = "rejected";
      await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(finding, "reject"));
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u0438\u044F: " + error.message, "danger");
    }
  }
  function openFindingEdit(id, draft = null, options = null) {
    if (!requireWriteAccess("\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0432\u044B\u0432\u043E\u0434\u0430")) return;
    const f = getFindingById(id);
    if (!f) return;
    const modalOpts = {
      mode: options?.mode === "quick" ? "quick" : "expert",
      fromChat: Boolean(options?.fromChat)
    };
    configureFindingEditModal(f, modalOpts);
    document.getElementById("findingEditId").value = f.id;
    document.getElementById("findingEditSeverity").value = f.severity || "medium";
    document.getElementById("findingEditConfidence").value = f.confidence ?? 0.5;
    document.getElementById("findingEditProblem").value = f.problem || "";
    document.getElementById("findingEditRecommendation").value = f.recommendation || "";
    document.getElementById("findingEditImpact").value = f.expected_impact || "";
    document.getElementById("findingEditNeedsReview").checked = Boolean(f.needs_review);
    document.getElementById("findingEditApprovedForKb").checked = Boolean(f.approved_for_kb);
    document.getElementById("findingEditComment").value = f.human_comment || f.review_reason || "";
    if (draft && typeof draft === "object") {
      if (draft.problem != null) {
        document.getElementById("findingEditProblem").value = String(draft.problem);
      }
      if (draft.recommendation != null) {
        document.getElementById("findingEditRecommendation").value = String(draft.recommendation);
      }
      if (draft.expected_impact != null) {
        document.getElementById("findingEditImpact").value = String(draft.expected_impact);
      }
      if (draft.human_comment != null) {
        document.getElementById("findingEditComment").value = String(draft.human_comment);
      }
    }
    updateFindingEditPdfPreview();
    runtimeBridge.openModal?.("findingEditModal");
    const focusId = draft?.focus === "problem" ? "findingEditProblem" : draft?.focus === "recommendation" ? "findingEditRecommendation" : null;
    if (focusId) {
      setTimeout(() => document.getElementById(focusId)?.focus(), 80);
    }
  }
  function openFindingEditWithChatDraft(findingId, chatAnswer) {
    const text = String(chatAnswer || "").trim();
    if (!text) {
      showAlert("\u041D\u0435\u0442 \u0442\u0435\u043A\u0441\u0442\u0430 \u043E\u0442\u0432\u0435\u0442\u0430 \u0434\u043B\u044F \u0432\u0441\u0442\u0430\u0432\u043A\u0438", "warning");
      return;
    }
    const parsed = parseChatDraftForFinding(text);
    const draft = {
      human_comment: "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0438\u0437 AI-\u0447\u0430\u0442\u0430 \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u043B\u044F \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C.",
      focus: parsed.recommendation ? "recommendation" : "problem"
    };
    if (parsed.problem) draft.problem = parsed.problem;
    if (parsed.recommendation) draft.recommendation = parsed.recommendation;
    if (parsed.expected_impact) draft.expected_impact = parsed.expected_impact;
    if (!parsed.recommendation && !parsed.problem) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0434\u043B\u044F PDF \u0438\u0437 \u043E\u0442\u0432\u0435\u0442\u0430 \u2014 \u0434\u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", "warning");
    }
    openFindingEdit(findingId, draft, { mode: "quick", fromChat: true });
  }
  async function saveFindingEdit() {
    if (!requireWriteAccess("\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u0430\u0432\u043E\u043A")) return;
    const id = document.getElementById("findingEditId").value;
    const areaSelect = document.getElementById("findingEditAreaSelect");
    const area = areaSelect?.value || document.getElementById("findingEditArea")?.value || "other";
    const problem = document.getElementById("findingEditProblem").value;
    const recommendation = document.getElementById("findingEditRecommendation").value;
    if (hasInternalReportLeak(`${problem}
${recommendation}`)) {
      const proceed = await showConfirmDialog({
        title: "\u0421\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0435 \u043F\u043E\u043C\u0435\u0442\u043A\u0438 \u0432 \u0442\u0435\u043A\u0441\u0442\u0435",
        message: "\u0412 \u043F\u043E\u043B\u044F\u0445 \u043E\u0441\u0442\u0430\u043B\u0438\u0441\u044C \u2116 \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0438\u043B\u0438 [mat_N]. \u0412 PDF \u043A\u043B\u0438\u0435\u043D\u0442 \u0438\u0445 \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0432\u0438\u0434\u0435\u0442\u044C. \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E?",
        confirmText: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
        cancelText: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043A \u043F\u0440\u0430\u0432\u043A\u0435",
        confirmType: "warning"
      });
      if (!proceed) return;
    }
    const payload = {
      area,
      severity: document.getElementById("findingEditSeverity").value,
      confidence: Number(document.getElementById("findingEditConfidence").value || 0.5),
      problem,
      recommendation,
      expected_impact: document.getElementById("findingEditImpact").value,
      needs_review: document.getElementById("findingEditNeedsReview").checked,
      approved_for_kb: document.getElementById("findingEditApprovedForKb").checked,
      review_reason: document.getElementById("findingEditNeedsReview").checked ? document.getElementById("findingEditComment").value : null,
      human_comment: document.getElementById("findingEditComment").value
    };
    try {
      const auditId = getCurrentAuditId2();
      const editUrl = auditId ? `/api/audits/${auditId}/findings/${id}` : `/api/findings/${id}`;
      const saved = await apiRequest(editUrl, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      runtimeBridge.closeModal?.("findingEditModal");
      await refreshAuditAfterFindingAction(describeFindingOutcomeMessage(saved, "edit"));
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u043F\u0440\u0430\u0432\u043A\u0438: " + error.message, "danger");
    }
  }

  // src/shared/ai-usage.js
  function formatTokenCount(value) {
    if (value == null || Number.isNaN(Number(value))) return "\u2014";
    return Number(value).toLocaleString("ru-RU");
  }
  function formatRubAmount(value) {
    if (value == null || value === "") return "\u2014";
    const num = Number(value);
    if (Number.isNaN(num)) return "\u2014";
    return `${num.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \u20BD`;
  }
  function formatUsdAmount(value) {
    if (value == null || value === "") return "\u2014";
    const num = Number(value);
    if (Number.isNaN(num)) return "\u2014";
    return `$${num.toFixed(4)}`;
  }
  function buildAiUsageTooltip(meta) {
    const label = meta.model_label || meta.model || "AI";
    const host = meta.transport_host || "api.proxyapi.ru";
    const lines = [
      `\u041C\u043E\u0434\u0435\u043B\u044C: ${label}`,
      `\u041A\u0430\u043D\u0430\u043B: ProxyAPI (${host})`,
      `\u0412\u0445\u043E\u0434: ${formatTokenCount(meta.prompt_tokens)} \u0442\u043E\u043A\u0435\u043D\u043E\u0432`,
      `\u0412\u044B\u0445\u043E\u0434: ${formatTokenCount(meta.completion_tokens)} \u0442\u043E\u043A\u0435\u043D\u043E\u0432`,
      `\u0418\u0442\u043E\u0433\u043E: ${formatTokenCount(meta.total_tokens)} \u0442\u043E\u043A\u0435\u043D\u043E\u0432 \xB7 ${formatRubAmount(meta.cost_rub)} \xB7 ${formatUsdAmount(meta.cost_usd)}`
    ];
    const rubIn = meta.tariff_input_rub_per_1m || meta.tariff_input_rub_per_1k;
    const rubOut = meta.tariff_output_rub_per_1m || meta.tariff_output_rub_per_1k;
    const usdIn = meta.tariff_input_usd_per_1m || meta.tariff_input_usd_per_1k;
    const usdOut = meta.tariff_output_usd_per_1m || meta.tariff_output_usd_per_1k;
    if (rubIn || usdIn) {
      lines.push(`\u0422\u0430\u0440\u0438\u0444 (\u043E\u0446\u0435\u043D\u043A\u0430): ${rubIn || "\u2014"} \u20BD / 1M \u0432\u0445\u043E\u0434 \xB7 ${rubOut || "\u2014"} \u20BD / 1M \u0432\u044B\u0445\u043E\u0434`);
      lines.push(`              ($${usdIn || "\u2014"} / 1M \u0432\u0445\u043E\u0434 \xB7 $${usdOut || "\u2014"} / 1M \u0432\u044B\u0445\u043E\u0434)`);
    }
    if (meta.pricing_updated_at) lines.push(`\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u0446\u0435\u043D: ${meta.pricing_updated_at}`);
    if (meta.fallback_used) lines.push(`\u0424\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438: fallback (${meta.fallback_model_label || "\u0434\u0430"})`);
    lines.push("\u0421\u0447\u0451\u0442 ProxyAPI: \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440; \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u2014 \u0432 \u041B\u041A proxyapi.ru");
    return escapeHtml(lines.join("\n")).replace(/\n/g, "<br>");
  }
  function buildAiUsageCaption(meta) {
    if (!meta) return "";
    const label = meta.model_label || meta.model || "AI";
    if (meta.transport === "local" || meta.provider === "local" || label === "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C") {
      return `<span class="ai-usage-caption">\u{1F916} \u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C</span>`;
    }
    const tokens = formatTokenCount(meta.total_tokens);
    const rub = formatRubAmount(meta.cost_rub);
    const usd = formatUsdAmount(meta.cost_usd);
    const tooltipId = `ai_usage_${meta.message_id || Math.random().toString(36).slice(2, 8)}`;
    const tooltip = buildAiUsageTooltip(meta);
    return `
        <span class="ai-usage-caption" tabindex="0" aria-describedby="${tooltipId}">\u{1F916} ${escapeHtml(label)} \xB7 ${tokens} \u0442\u043E\u043A\u0435\u043D\u043E\u0432 \xB7 ${escapeHtml(rub)} \xB7 ${escapeHtml(usd)}</span>
        <div id="${tooltipId}" class="ai-usage-tooltip" role="tooltip">${tooltip}</div>
    `;
  }

  // src/audit-detail/chat-message-render.js
  var SECTION_HEADERS = [
    { key: "pdf", test: (l) => /^текст\s+для\s+pdf/i.test(l), label: "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0434\u043B\u044F PDF" },
    { key: "grounds", test: (l) => /^основания(\s+для\s+вывода)?/i.test(l), label: "\u041E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u044F" },
    { key: "recs", test: (l) => /^рекомендац/i.test(l), label: "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438" },
    { key: "recs_client", test: (l) => /^рекомендац/i.test(l) && /клиент/i.test(l), label: "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043A\u043B\u0438\u0435\u043D\u0442\u0443" },
    { key: "effect", test: (l) => /^ожидаемый\s+эффект/i.test(l), label: "\u041E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u044D\u0444\u0444\u0435\u043A\u0442" },
    { key: "brief", test: (l) => /^краткий\s+вывод/i.test(l), label: "\u041A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434" }
  ];
  function stripHeaderLine(line) {
    const m = String(line || "").trim();
    const idx = m.indexOf(":");
    if (idx > 0 && idx < 48) {
      const tail = m.slice(idx + 1).trim();
      return tail || "";
    }
    return "";
  }
  function parseChatAssistantSections(raw) {
    const text = String(raw || "").replace(/\r\n/g, "\n").trim();
    if (!text) return [];
    const lines = text.split("\n");
    const sections = [];
    let current = { key: "lead", label: "\u041E\u0442\u0432\u0435\u0442", lines: [] };
    for (const line of lines) {
      const trimmed = line.trim();
      const header = SECTION_HEADERS.find((h) => h.test(trimmed));
      if (header) {
        if (current.lines.some((l) => String(l).trim())) {
          sections.push(current);
        }
        const tail = stripHeaderLine(trimmed);
        current = { key: header.key, label: header.label, lines: tail ? [tail] : [] };
        continue;
      }
      current.lines.push(line);
    }
    if (current.lines.some((l) => String(l).trim())) {
      sections.push(current);
    }
    return sections.map((s) => ({ ...s, body: s.lines.join("\n").trim() })).filter((s) => s.body.length > 0);
  }
  function formatChatBodyHtml(text, { audienceMode = "internal", linkifyMaterials = true } = {}) {
    const isClient = audienceMode === "client";
    let body = isClient ? sanitizeClientReportText(text) : String(text || "").trim();
    if (!body) return "";
    let html = escapeHtml(body);
    if (!isClient && linkifyMaterials) {
      html = html.replace(
        /\[mat_(\d+)\]/gi,
        (_, id) => `<button type="button" class="btn btn-link btn-sm chat-mat-link" onclick="openFindingEvidenceMaterial(${Number(id)})">\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u2116${id}</button>`
      );
      html = html.replace(
        /\[finding_(\d+)\]/gi,
        (_, id) => `<button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${Number(id)})">\u0432\u044B\u0432\u043E\u0434 \u2116${id}</button>`
      );
    }
    return html.replace(/\n/g, "<br>");
  }
  function pickPrimarySection(sections) {
    const order = ["recs_client", "recs", "brief", "lead", "effect"];
    for (const key of order) {
      const hit = sections.find((s) => s.key === key);
      if (hit) return hit;
    }
    return sections.find((s) => !["pdf", "grounds"].includes(s.key)) || sections[0];
  }
  function renderChatAssistantBody(content, options = {}) {
    const { audienceMode = "internal" } = options;
    const isClient = audienceMode === "client";
    const sections = parseChatAssistantSections(content);
    if (!sections.length) {
      const fallback = isClient ? sanitizeClientReportText(content) : content;
      return `<div class="chat-answer-primary">${formatChatBodyHtml(fallback, options)}</div>`;
    }
    const primary = pickPrimarySection(sections);
    const parts = [];
    if (primary) {
      parts.push(`<div class="chat-answer-primary">${formatChatBodyHtml(primary.body, options)}</div>`);
    }
    const effectSec = sections.find((s) => s.key === "effect" && s !== primary);
    if (effectSec) {
      parts.push(`<p class="chat-answer-effect muted"><strong>\u042D\u0444\u0444\u0435\u043A\u0442:</strong> ${formatChatBodyHtml(effectSec.body, options)}</p>`);
    }
    if (!isClient) {
      const grounds = sections.find((s) => s.key === "grounds");
      if (grounds) {
        parts.push(`<details class="chat-answer-extra"><summary>${escapeHtml(grounds.label)}</summary><div class="chat-answer-extra-body">${formatChatBodyHtml(grounds.body, options)}</div></details>`);
      }
    }
    const pdfBody = sections.find((s) => s.key === "pdf")?.body || extractPdfBlockFromChat(content);
    if (pdfBody && !isClient) {
      parts.push(`<details class="chat-answer-extra chat-answer-pdf"><summary>${escapeHtml("\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0434\u043B\u044F PDF")}</summary><div class="chat-answer-extra-body">${formatChatBodyHtml(pdfBody, { ...options, linkifyMaterials: false })}</div></details>`);
    }
    const usedKeys = new Set([primary?.key, effectSec?.key, "grounds", "pdf"].filter(Boolean));
    sections.filter((s) => !usedKeys.has(s.key)).forEach((s) => {
      parts.push(`<details class="chat-answer-extra"><summary>${escapeHtml(s.label)}</summary><div class="chat-answer-extra-body">${formatChatBodyHtml(s.body, options)}</div></details>`);
    });
    return parts.join("");
  }

  // src/audit-detail/chat.js
  var pendingChatAnchor = null;
  var CHAT_ASK_TIMEOUT_MS = 12e4;
  var chatSuggestionCache = [];
  var CHAT_PREFS_KEY = "ppc_chat_gen_prefs";
  var CHAT_STYLE_TEMPERATURE = {
    brief: 0.25,
    balanced: 0.42,
    deep: 0.58
  };
  function loadChatGenPrefs() {
    try {
      const raw = localStorage.getItem(CHAT_PREFS_KEY);
      if (!raw) return { style: "balanced", temperature: CHAT_STYLE_TEMPERATURE.balanced, customTemp: false };
      const p = JSON.parse(raw);
      const style = ["brief", "balanced", "deep"].includes(p?.style) ? p.style : "balanced";
      const temp = Number(p?.temperature);
      return {
        style,
        temperature: Number.isFinite(temp) ? temp : CHAT_STYLE_TEMPERATURE[style],
        customTemp: Boolean(p?.customTemp)
      };
    } catch (_e) {
      return { style: "balanced", temperature: CHAT_STYLE_TEMPERATURE.balanced, customTemp: false };
    }
  }
  function saveChatGenPrefs(prefs) {
    try {
      localStorage.setItem(CHAT_PREFS_KEY, JSON.stringify(prefs));
    } catch (_e) {
    }
  }
  function getChatResponseStyle() {
    const el = document.querySelector('input[name="chatResponseStyle"]:checked');
    const v = (el?.value || "balanced").trim();
    return ["brief", "balanced", "deep"].includes(v) ? v : "balanced";
  }
  function getChatTemperature() {
    const range = document.getElementById("chatTemperatureRange");
    const v = Number(range?.value);
    if (!Number.isFinite(v)) return CHAT_STYLE_TEMPERATURE[getChatResponseStyle()];
    return Math.max(0, Math.min(1, v));
  }
  function chatStyleLabel(style) {
    const map = { brief: "\u041A\u0440\u0430\u0442\u043A\u043E", balanced: "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442", deep: "\u0420\u0430\u0437\u0432\u0451\u0440\u043D\u0443\u0442\u043E" };
    return map[style] || style;
  }
  function syncChatTemperatureUi({ fromStyle = false } = {}) {
    const style = getChatResponseStyle();
    const range = document.getElementById("chatTemperatureRange");
    const valueEl = document.getElementById("chatTemperatureValue");
    if (!range) return;
    const prefs = loadChatGenPrefs();
    if (fromStyle && !prefs.customTemp) {
      range.value = String(CHAT_STYLE_TEMPERATURE[style]);
    }
    if (valueEl) valueEl.textContent = Number(range.value).toFixed(2);
  }
  function bindChatGenControls() {
    const root = document.getElementById("tab-chat");
    if (!root || root.dataset.chatGenBound === "1") return;
    root.dataset.chatGenBound = "1";
    const prefs = loadChatGenPrefs();
    const styleInput = document.querySelector(`input[name="chatResponseStyle"][value="${prefs.style}"]`);
    if (styleInput) styleInput.checked = true;
    const range = document.getElementById("chatTemperatureRange");
    if (range) range.value = String(prefs.temperature);
    syncChatTemperatureUi();
    root.querySelectorAll('input[name="chatResponseStyle"]').forEach((el) => {
      el.addEventListener("change", () => {
        syncChatTemperatureUi({ fromStyle: true });
        saveChatGenPrefs({
          style: getChatResponseStyle(),
          temperature: getChatTemperature(),
          customTemp: false
        });
      });
    });
    range?.addEventListener("input", () => {
      syncChatTemperatureUi();
      saveChatGenPrefs({
        style: getChatResponseStyle(),
        temperature: getChatTemperature(),
        customTemp: true
      });
    });
  }
  function getCurrentAuditId3() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
  }
  function getAuditData3() {
    return runtimeBridge.getAuditData?.() || null;
  }
  function getChatAudienceMode() {
    const el = document.querySelector('input[name="chatAudienceMode"]:checked');
    return el?.value === "client" ? "client" : "internal";
  }
  function resolveWorkflowStateCode(data) {
    const ws = data?.workflow_state;
    if (ws && typeof ws === "object") {
      return String(ws.state || data?.workflow_ui?.screen_state || "UNKNOWN").toUpperCase();
    }
    if (typeof ws === "string") {
      return ws.toUpperCase();
    }
    return String(data?.workflow_ui?.screen_state || "UNKNOWN").toUpperCase();
  }
  function getSuggestedChatQuestions(auditData2) {
    const data = auditData2 || getAuditData3();
    if (!data) {
      return [{ label: "\u0427\u0442\u043E \u0432 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u0445?", question: "\u041A\u0440\u0430\u0442\u043A\u043E: \u043A\u0430\u043A\u0438\u0435 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0444\u0430\u043A\u0442\u044B \u0435\u0441\u0442\u044C \u0432 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u0445?" }];
    }
    const state = resolveWorkflowStateCode(data);
    const chips = [];
    if (state === "BLOCKED_REQUIRED" || !data.data_coverage?.minimum_met) {
      chips.push({
        label: "\u0427\u0435\u0433\u043E \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430?",
        question: "\u0427\u0442\u043E \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0434 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430?"
      });
    }
    if (state === "READY_TO_RUN" || state === "FAILED") {
      chips.push({
        label: "\u0427\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0434 \u0430\u043D\u0430\u043B\u0438\u0437\u043E\u043C?",
        question: "\u041A\u0430\u043A\u0438\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0435\u0449\u0451 \u0441\u0442\u043E\u0438\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0434 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u043E\u043C?"
      });
    }
    const progress = getFindingReviewProgress(data);
    if (state === "RESULTS_NEED_REVIEW" || progress.pending > 0) {
      chips.push({
        label: "\u0421 \u0447\u0435\u0433\u043E \u043D\u0430\u0447\u0430\u0442\u044C \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443?",
        question: "\u041A\u0430\u043A\u0438\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432 \u043F\u0435\u0440\u0432\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C \u0438 \u043F\u043E\u0447\u0435\u043C\u0443?"
      });
    }
    if (["RESULTS_READY", "PRELIMINARY_REPORT"].includes(state)) {
      chips.push({
        label: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0440\u0438\u0441\u043A \u043E\u0434\u043D\u043E\u0439 \u0444\u0440\u0430\u0437\u043E\u0439",
        question: "\u0421\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u0443\u0439 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 \u0440\u0438\u0441\u043A \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430 \u043E\u0434\u043D\u0438\u043C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435\u043C \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u0434\u0430\u043D\u043D\u044B\u043C."
      });
    }
    const monthly = data.direct_analytics?.monthly || [];
    if (monthly.length >= 2) {
      chips.push({
        label: "\u0427\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C \u043C\u0435\u0436\u0434\u0443 \u043C\u0435\u0441\u044F\u0446\u0430\u043C\u0438?",
        question: "\u0427\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C \u043C\u0435\u0436\u0434\u0443 \u043F\u0435\u0440\u0432\u044B\u043C \u0438 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u043C \u043C\u0435\u0441\u044F\u0446\u0435\u043C \u0432 Excel \u0414\u0438\u0440\u0435\u043A\u0442\u0430 (\u0437\u0430\u044F\u0432\u043A\u0438, CPL, \u0440\u0430\u0441\u0445\u043E\u0434)?",
        anchor: { type: "comparison" }
      });
    }
    const health = data.direct_analytics?.health;
    if (health && (health.health_score != null || health.grade)) {
      chips.push({
        label: DIRECT_COPY.chatChipLabel,
        question: DIRECT_COPY.healthExplainQuestion,
        anchor: { type: "health" }
      });
    }
    if (runtimeBridge.isAnalysisStale?.(data)) {
      chips.push({
        label: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0443\u0441\u0442\u0430\u0440\u0435\u043B\u0438?",
        question: "\u0427\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0438 \u0447\u0442\u043E \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C?"
      });
    }
    if (!chips.length) {
      chips.push({
        label: "\u0427\u0442\u043E \u0432 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u0445?",
        question: "\u041A\u0440\u0430\u0442\u043A\u043E: \u043A\u0430\u043A\u0438\u0435 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0444\u0430\u043A\u0442\u044B \u0435\u0441\u0442\u044C \u0432 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u0445?"
      });
    }
    return chips.slice(0, 5);
  }
  function renderChatSuggestions() {
    const container = document.getElementById("chatSuggestedQuestions");
    if (!container) return;
    chatSuggestionCache = getSuggestedChatQuestions();
    container.innerHTML = chatSuggestionCache.map((c, i) => `
        <button type="button" class="chat-chip" onclick="applyChatSuggestion(${i})">${escapeHtml(c.label)}</button>
    `).join("");
  }
  function applyChatSuggestion(index) {
    const chip = chatSuggestionCache[Number(index)];
    const question = chip?.question || "";
    pendingChatAnchor = chip?.anchor || null;
    const input = document.getElementById("chatQuestionInput");
    if (input) {
      input.value = question;
      input.focus();
    }
  }
  function renderTrustLayers(m) {
    const tl = m.trust_layers;
    if (!tl || m.role !== "assistant") return "";
    const badges = [];
    if (tl.from_audit_sources > 0) {
      badges.push('<span class="badge badge-success chat-trust-badge">\u0418\u0437 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0430\u0443\u0434\u0438\u0442\u0430</span>');
    }
    badges.push('<span class="badge badge-draft chat-trust-badge">\u0418\u043D\u0442\u0435\u0440\u043F\u0440\u0435\u0442\u0430\u0446\u0438\u044F AI</span>');
    if (tl.has_kb_examples) {
      badges.push('<span class="badge badge-draft chat-trust-badge">\u041F\u0430\u0442\u0442\u0435\u0440\u043D\u044B \u0438\u0437 \u0431\u0430\u0437\u044B \u0437\u043D\u0430\u043D\u0438\u0439</span>');
    }
    const warn = tl.has_unsourced_numbers ? '<p class="chat-trust-warn">\u26A0\uFE0F \u0412 \u043E\u0442\u0432\u0435\u0442\u0435 \u0435\u0441\u0442\u044C \u0446\u0438\u0444\u0440\u044B \u0431\u0435\u0437 \u0441\u0441\u044B\u043B\u043E\u043A \u043D\u0430 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0435\u0440\u0435\u0434 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u043C.</p>' : "";
    return `<div class="chat-trust-row">${badges.join("")}</div>${warn}`;
  }
  function renderKbExamplesBlock(kbExamples, msgId) {
    if (!kbExamples?.length) return "";
    const items = kbExamples.map((ex) => `
        <li><strong>${escapeHtml(ex.area || "\u0437\u043E\u043D\u0430")}</strong>${ex.niche ? ` \xB7 ${escapeHtml(ex.niche)}` : ""}
            <span class="muted">${ex.distance != null ? ` \xB7 d=${ex.distance.toFixed(3)}` : ""}</span>
            <div class="muted">${escapeHtml(ex.snippet || "")}</div></li>
    `).join("");
    return `
        <details class="chat-kb-block" id="chat_kb_${msgId}">
            <summary class="muted">\u041F\u043E\u0445\u043E\u0436\u0438\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u0438\u0437 \u0431\u0430\u0437\u044B \u0437\u043D\u0430\u043D\u0438\u0439 (${kbExamples.length})</summary>
            <ul class="chat-kb-list">${items}</ul>
        </details>`;
  }
  function renderNichePatternsBlock(patterns, msgId) {
    if (!patterns?.length) return "";
    const items = patterns.map((p) => `
        <li><strong>${escapeHtml(p.label || p.area || "")}</strong>
            <span class="muted"> \xB7 ${p.audit_count || 0} \u0430\u0443\u0434\u0438\u0442(\u043E\u0432)</span>
            <ul>${(p.sample_formulations || []).map((s) => `<li class="muted">${escapeHtml(s)}</li>`).join("")}</ul>
        </li>
    `).join("");
    return `
        <details class="chat-kb-block" id="chat_patterns_${msgId}">
            <summary class="muted">\u041F\u0430\u0442\u0442\u0435\u0440\u043D\u044B \u0430\u0433\u0435\u043D\u0442\u0441\u0442\u0432\u0430 \u043F\u043E \u043D\u0438\u0448\u0435 (${patterns.length})</summary>
            <ul class="chat-kb-list">${items}</ul>
        </details>`;
  }
  function renderChatCostDetails(m) {
    if (m.role !== "assistant") return "";
    if (m.transport === "local" || m.provider === "local" || !m.total_tokens) {
      return buildAiUsageCaption({ ...m, message_id: m.id });
    }
    const rub = formatRubAmount(m.cost_rub);
    const tokens = formatTokenCount(m.total_tokens);
    const label = escapeHtml(m.model_label || m.model || "AI");
    return `
        <p>~${rub} \xB7 ${tokens} \u0442\u043E\u043A\u0435\u043D\u043E\u0432 \xB7 ${label}</p>
        ${buildAiUsageCaption({ ...m, message_id: m.id })}
    `;
  }
  function findingIdFromAnchor(anchor) {
    if (!anchor || String(anchor.type || "").toLowerCase() !== "finding") return null;
    const id = Number(anchor.finding_id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  function renderChatFindingContext(findingId, anchorLabel) {
    const f = (getAuditData3()?.findings || []).find((x) => x.id === findingId);
    const label = anchorLabel || (f ? areaDisplayLabel(f.area) : "");
    const problem = String(f?.problem || "").trim();
    const short = problem.length > 140 ? `${problem.slice(0, 137)}\u2026` : problem;
    return `
        <div class="chat-finding-ctx">
            <span class="chat-finding-ctx-label">\u0412\u043E\u043F\u0440\u043E\u0441 \u043F\u043E \u0432\u044B\u0432\u043E\u0434\u0443 \u2116${findingId}${label ? ` \xB7 ${escapeHtml(label)}` : ""}</span>
            ${short ? `<p class="chat-finding-ctx-problem muted">${escapeHtml(short)}</p>` : ""}
            <button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${findingId})">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443</button>
        </div>`;
  }
  function renderChatInsertIntoFindingAction(m, findingId) {
    if (!canWrite() || !findingId || m.role !== "assistant") return "";
    return `
        <div class="chat-insert-actions">
            <button type="button" class="btn btn-primary btn-sm"
                data-msg-id="${m.id}"
                data-finding-id="${findingId}"
                onclick="applyChatAnswerToFindingFromBtn(this)">
                \u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0432 \u043F\u0440\u0430\u0432\u043A\u0443 \u0432\u044B\u0432\u043E\u0434\u0430
            </button>
            <button type="button" class="btn btn-outline btn-sm"
                onclick="goToFindingsInReport(${findingId})">\u041A \u0432\u044B\u0432\u043E\u0434\u0443 \u2116${findingId}</button>
        </div>`;
  }
  function applyChatAnswerToFindingFromBtn(btn) {
    if (!canWrite()) return;
    const findingId = Number(btn?.dataset?.findingId);
    const msgId = Number(btn?.dataset?.msgId);
    const row = document.querySelector(`.chat-bubble[data-msg-id="${msgId}"] .chat-answer-primary`);
    const text = row?.innerText?.trim() || chatInsertDraftByMsgId.get(msgId) || "";
    if (!findingId) {
      showAlert("\u0412\u044B\u0432\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", "warning");
      return;
    }
    if (!text) {
      showAlert("\u041D\u0435\u0442 \u0442\u0435\u043A\u0441\u0442\u0430 \u043E\u0442\u0432\u0435\u0442\u0430 \u0434\u043B\u044F \u0432\u0441\u0442\u0430\u0432\u043A\u0438", "warning");
      return;
    }
    runtimeBridge.switchTab?.("results");
    openFindingEditWithChatDraft(findingId, text);
    showAlert("\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0442\u0440\u0438 \u043F\u043E\u043B\u044F \u0432 \u043C\u043E\u0434\u0430\u043B\u043A\u0435 \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u2014 \u0441\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0435 \u043F\u043E\u043C\u0435\u0442\u043A\u0438 \u0443\u0436\u0435 \u0443\u0431\u0440\u0430\u043D\u044B.", "success");
  }
  var chatInsertDraftByMsgId = /* @__PURE__ */ new Map();
  function renderAssistantDisclaimer(m) {
    const kbN = (m.kb_examples || []).length;
    const mode = m.audience_mode === "client" ? "\u0420\u0435\u0436\u0438\u043C \xAB\u043A\u0430\u043A \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430\xBB" : "\u0423\u0447\u0442\u0435\u043D\u044B \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430";
    const kb = kbN > 0 && m.audience_mode !== "client" ? ` \u0438 ${kbN} \u043F\u0440\u0438\u043C\u0435\u0440(\u043E\u0432) \u0438\u0437 \u0431\u0430\u0437\u044B \u0437\u043D\u0430\u043D\u0438\u0439` : "";
    return `<p class="chat-disclaimer muted">${mode}${kb}.</p>`;
  }
  function renderChatWhyDetails(m) {
    const style = m.chat_response_style ? chatStyleLabel(m.chat_response_style) : "\u2014";
    const temp = m.chat_temperature != null ? Number(m.chat_temperature).toFixed(2) : "\u2014";
    return `
        provider=${escapeHtml(m.provider || "local")} \xB7 model=${escapeHtml(m.model || "heuristic")}
        \xB7 duration=${m.duration_ms ?? "\u2014"}ms \xB7 fallback=${m.fallback_used ? "yes" : "no"}
        \xB7 context=${escapeHtml(m.context_version || "n/a")} \xB7 mode=${escapeHtml(m.audience_mode || "internal")}
        \xB7 \u0441\u0442\u0438\u043B\u044C=${escapeHtml(style)} \xB7 temperature=${temp}
        ${renderChatCostDetails(m)}
    `;
  }
  function bindChatInputClearsPendingAnchor() {
    const input = document.getElementById("chatQuestionInput");
    if (!input || input.dataset.chatAnchorBound === "1") return;
    input.dataset.chatAnchorBound = "1";
    input.addEventListener("input", () => {
      pendingChatAnchor = null;
    });
  }
  function removeChatPending() {
    document.getElementById("chatPendingBlock")?.remove();
  }
  function showChatPending(question) {
    const container = document.getElementById("chatMessages");
    if (!container) return;
    const hint = container.querySelector(".chat-empty-hint");
    if (hint) hint.remove();
    removeChatPending();
    const block = document.createElement("div");
    block.id = "chatPendingBlock";
    block.innerHTML = `
        <div class="chat-bubble chat-user">
            <div class="chat-role">\u0412\u044B</div>
            <div class="chat-text">${escapeHtml(question).replace(/\n/g, "<br>")}</div>
        </div>
        <div class="chat-bubble chat-assistant chat-bubble--pending">
            <div class="chat-role">AI</div>
            <div class="chat-text muted">\u0424\u043E\u0440\u043C\u0438\u0440\u0443\u0435\u043C \u043E\u0442\u0432\u0435\u0442\u2026</div>
        </div>`;
    container.appendChild(block);
    container.scrollTop = container.scrollHeight;
  }
  async function renderChatHistory() {
    const container = document.getElementById("chatMessages");
    const auditId = getCurrentAuditId3();
    if (!container || !auditId) return;
    bindChatInputClearsPendingAnchor();
    bindChatGenControls();
    renderChatSuggestions();
    try {
      const messages = await apiRequest(`/api/audits/${auditId}/chat`);
      if (!messages.length) {
        container.innerHTML = '<p class="muted chat-empty-hint">\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u043F\u0440\u043E \u043C\u0435\u0442\u0440\u0438\u043A\u0438, \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438\u043B\u0438 \u0432\u044B\u0432\u043E\u0434. \u041E\u0442\u0432\u0435\u0442 \u0431\u0443\u0434\u0435\u0442 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D: \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u2014 \u0441\u0432\u0435\u0440\u0445\u0443, \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A PDF \u2014 \u0432 \xAB\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435\xBB.</p>';
        return;
      }
      chatInsertDraftByMsgId.clear();
      container.innerHTML = messages.map((m) => {
        const replyAnchor = m.role === "assistant" ? m.reply_context_anchor : null;
        const findingId = findingIdFromAnchor(replyAnchor);
        if (m.role === "assistant" && m.content) {
          chatInsertDraftByMsgId.set(m.id, String(m.content));
        }
        const audience = m.audience_mode === "client" ? "client" : "internal";
        let bodyHtml = m.role === "assistant" ? renderChatAssistantBody(m.content, { audienceMode: audience }) : escapeHtml(m.content).replace(/\n/g, "<br>");
        if (m.role === "assistant" && !String(bodyHtml || "").replace(/<[^>]+>/g, "").trim()) {
          bodyHtml = '<p class="muted">\u041E\u0442\u0432\u0435\u0442 \u043D\u0435 \u043E\u0442\u043E\u0431\u0440\u0430\u0437\u0438\u043B\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 (Ctrl+F5) \u0438 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441 \u0441\u043D\u043E\u0432\u0430.</p>';
        }
        const findingCtx = findingId && m.role === "assistant" ? renderChatFindingContext(findingId, m.context_anchor_label) : "";
        const clientCls = audience === "client" ? " chat-bubble--client-mode" : "";
        return `
            <div class="chat-bubble chat-${m.role}${clientCls}" data-msg-id="${m.id}">
                <div class="chat-role">${m.role === "user" ? "\u0412\u044B" : "AI"}</div>
                ${m.role === "user" && m.context_anchor_label ? `<div class="chat-anchor-badge muted">\u0412\u043E\u043F\u0440\u043E\u0441 \u043F\u043E: ${escapeHtml(m.context_anchor_label)}</div>` : ""}
                ${findingCtx}
                <div class="chat-text">${bodyHtml}</div>
                ${m.sources && m.sources.length ? `<div class="chat-sources muted">${m.sources.map((s) => escapeHtml(s.title || s.ref)).join(" \xB7 ")}</div>` : ""}
                ${renderChatInsertIntoFindingAction(m, findingId)}
                ${m.role === "assistant" ? renderAssistantDisclaimer(m) : ""}
                ${m.role === "assistant" && audience === "internal" ? renderTrustLayers(m) : ""}
                ${m.role === "assistant" && audience === "internal" ? renderKbExamplesBlock(m.kb_examples, m.id) : ""}
                ${m.role === "assistant" && audience === "internal" ? renderNichePatternsBlock(m.niche_patterns, m.id) : ""}
                ${m.role === "assistant" && m.confidence_level ? `
                    <div class="chat-meta-row">
                        <span class="badge badge-draft">\u0423\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: ${escapeHtml(m.confidence_level)}</span>
                        <button type="button" class="btn btn-outline btn-sm" onclick="toggleChatWhy('chat_why_${m.id}')">\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435 \u043E \u043E\u0442\u0432\u0435\u0442\u0435</button>
                    </div>
                    <div id="chat_why_${m.id}" class="chat-why muted is-hidden">${renderChatWhyDetails(m)}</div>
                ` : ""}
            </div>
        `;
      }).join("");
      container.scrollTop = container.scrollHeight;
    } catch (_e) {
      container.innerHTML = '<p class="muted">\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432.</p>';
    }
  }
  function toggleChatWhy(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("is-hidden");
  }
  async function sendAuditQuestion() {
    const input = document.getElementById("chatQuestionInput");
    const btn = document.getElementById("chatSendBtn");
    const verifiedOnly = document.getElementById("chatVerifiedOnlyCheckbox")?.checked === true;
    const question = (input?.value || "").trim();
    const auditId = getCurrentAuditId3();
    if (!question) {
      showAlert("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441", "warning");
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.dataset.chatBusy = "1";
      if (!btn.dataset.chatLabel) btn.dataset.chatLabel = btn.textContent || "";
      btn.textContent = "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430\u2026";
    }
    showChatPending(question);
    const audienceMode = getChatAudienceMode();
    const responseStyle = getChatResponseStyle();
    const body = {
      question,
      include_unverified: audienceMode === "client" ? false : !verifiedOnly,
      model_id: runtimeBridge.getSelectedModelId?.("chat"),
      audience_mode: audienceMode,
      response_style: responseStyle,
      temperature: getChatTemperature()
    };
    saveChatGenPrefs({
      style: responseStyle,
      temperature: getChatTemperature(),
      customTemp: loadChatGenPrefs().customTemp
    });
    if (pendingChatAnchor) {
      body.context_anchor = pendingChatAnchor;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_ASK_TIMEOUT_MS);
    try {
      const resp = await apiRequest(`/api/audits/${auditId}/chat/ask`, {
        method: "POST",
        body: JSON.stringify(body),
        signal: controller.signal
      });
      pendingChatAnchor = null;
      if (input) input.value = "";
      if (resp.needs_review_note) showAlert(resp.needs_review_note, "warning");
      if (resp.confidence_level === "low") {
        showAlert("\u041D\u0438\u0437\u043A\u0430\u044F \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0441\u0442\u044C: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0446\u0438\u0444\u0440\u044B \u043F\u043E \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u043C.", "warning");
      }
      removeChatPending();
      await renderChatHistory();
    } catch (error) {
      removeChatPending();
      const msg = error?.name === "AbortError" ? "\u041E\u0442\u0432\u0435\u0442 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u0438\u0439 (\u0442\u0430\u0439\u043C\u0430\u0443\u0442 2 \u043C\u0438\u043D). \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \xAB\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\xBB \u0432\u043C\u0435\u0441\u0442\u043E \xAB\u0420\u0430\u0437\u0432\u0451\u0440\u043D\u0443\u0442\u043E\xBB \u0438\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435." : error.message;
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + msg, "danger");
      await renderChatHistory().catch(() => {
      });
    } finally {
      clearTimeout(timeoutId);
      if (btn) {
        btn.disabled = false;
        delete btn.dataset.chatBusy;
        if (btn.dataset.chatLabel) {
          btn.textContent = btn.dataset.chatLabel;
          delete btn.dataset.chatLabel;
        }
      }
    }
  }
  async function askInChat({ question, context_anchor, autoSend = true }) {
    runtimeBridge.switchTab?.("chat");
    const input = document.getElementById("chatQuestionInput");
    if (input) input.value = question || "";
    pendingChatAnchor = context_anchor || null;
    renderChatSuggestions();
    if (autoSend && question) {
      await sendAuditQuestion();
    } else if (input) {
      input.focus();
    }
  }
  function askFromFinding(findingId) {
    if (!canWrite()) return;
    const data = getAuditData3();
    const f = (data?.findings || []).find((x) => x.id === findingId);
    if (!f) {
      showAlert("\u0412\u044B\u0432\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", "warning");
      return;
    }
    const kind = f.finding_kind || "hypothesis";
    const question = kind === "hypothesis" ? "\u041F\u043E\u0447\u0435\u043C\u0443 \u044D\u0442\u043E\u0442 \u0432\u044B\u0432\u043E\u0434 \u043F\u043E\u043C\u0435\u0447\u0435\u043D \u043A\u0430\u043A \u0433\u0438\u043F\u043E\u0442\u0435\u0437\u0430 \u0438 \u0447\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C?" : "\u041F\u043E\u044F\u0441\u043D\u0438 \u044D\u0442\u043E\u0442 \u0432\u044B\u0432\u043E\u0434: \u043D\u0430 \u0447\u0442\u043E \u043E\u043D \u043E\u043F\u0438\u0440\u0430\u0435\u0442\u0441\u044F \u0438 \u043A\u0430\u043A\u0438\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u0434\u0430\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u0443?";
    askInChat({
      question,
      context_anchor: { type: "finding", finding_id: findingId },
      autoSend: true
    });
  }

  // src/audit-detail/analysis-ws.js
  var analysisSocket = null;
  function showAnalysisProgress(payload) {
    const card = document.getElementById("analysisProgress");
    const progressStrip = document.getElementById("auditProgressStrip");
    if (!card) return;
    const isFailed = payload.status === "failed";
    const percent = isFailed ? 0 : Math.max(0, Math.min(100, Number(payload.percent || 0)));
    card.style.display = "block";
    card.classList.remove("audit-running-failed");
    if (progressStrip) progressStrip.style.display = "none";
    const bar = document.getElementById("analysisProgressBar");
    const msg = document.getElementById("analysisProgressMessage");
    const pctEl = document.getElementById("analysisProgressPercent");
    if (bar) bar.style.width = `${percent}%`;
    if (msg) {
      let text = payload.message || "\u0412\u044B\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F\u2026";
      const usage = payload.result?.ai_usage;
      if (usage && usage.model_label && payload.percent >= 100 && payload.status !== "failed") {
        text += ` \xB7 ${usage.model_label} \xB7 ${formatTokenCount(usage.total_tokens)} \u0442\u043E\u043A\u0435\u043D\u043E\u0432 \xB7 ${formatRubAmount(usage.cost_rub)} \xB7 ${formatUsdAmount(usage.cost_usd)}`;
      }
      msg.textContent = text;
    }
    if (pctEl) pctEl.textContent = `${percent}%`;
  }
  function hideAnalysisProgress() {
    const card = document.getElementById("analysisProgress");
    if (card) {
      card.style.display = "none";
      card.classList.remove("audit-running-failed");
    }
  }
  function connectAnalysisProgress(auditId) {
    if (!auditId) return;
    if (analysisSocket) {
      analysisSocket.close();
      analysisSocket = null;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    analysisSocket = new WebSocket(`${protocol}//${window.location.host}/ws/audits/${auditId}/status`);
    analysisSocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        showAnalysisProgress(payload);
        if (payload.percent >= 100 && payload.status !== "in_progress" && payload.status !== "idle") {
          const analysisOk = payload.status !== "failed" && !payload.draft;
          queuePostAnalysisUiJump(analysisOk);
          setTimeout(() => runtimeBridge.loadAuditDetail?.(), 500);
          const auditData2 = runtimeBridge.getAuditData?.();
          if (payload.status === "failed") {
            showAlert(payload.message || "\u0410\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u043E\u0448\u0438\u0431\u043A\u043E\u0439", "danger");
          } else if (payload.draft || auditData2?.data_coverage?.is_preliminary) {
            showAlert("\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0430\u0443\u0434\u0438\u0442\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u2014 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0434\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0446\u0435\u043D\u043D\u043E\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430", "warning");
          }
          setTimeout(() => {
            if (analysisSocket) analysisSocket.close();
          }, 1200);
        }
      } catch (e) {
        console.warn("WS parse error", e);
      }
    };
    analysisSocket.onerror = () => {
      console.warn("WebSocket \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C polling");
      pollAnalysisProgress(auditId);
    };
  }
  async function pollAnalysisProgress(auditId) {
    try {
      const payload = await apiRequest(`/api/audits/${auditId}/progress`);
      showAnalysisProgress(payload);
      if (payload.percent < 100 || payload.status === "in_progress") {
        setTimeout(() => pollAnalysisProgress(auditId), 1200);
      } else {
        if (payload.status !== "failed") {
          queuePostAnalysisUiJump(true);
        }
        runtimeBridge.loadAuditDetail?.();
      }
    } catch (e) {
      console.warn("Progress polling error", e);
    }
  }
  function closeAnalysisSocket() {
    if (analysisSocket) {
      analysisSocket.close();
      analysisSocket = null;
    }
  }

  // src/core/tabs.js
  function switchTab(tabName) {
    const tabBtnMap = {
      data: "tabDataBtn",
      results: "tabResultsBtn",
      report: "tabReportBtn",
      chat: "tabChatBtn"
    };
    document.querySelectorAll(".tab-btn").forEach((btn2) => btn2.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content2) => content2.classList.remove("active"));
    const btn = document.getElementById(tabBtnMap[tabName]) || document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    if (btn && !btn.disabled) btn.classList.add("active");
    const content = document.getElementById(`tab-${tabName}`);
    if (content) content.classList.add("active");
    if (tabName === "results") {
      runtimeBridge.loadKbStatusCard?.();
    }
    if (tabName === "chat") {
      runtimeBridge.renderChatHistory?.();
    }
    if (tabName === "report") {
      runtimeBridge.loadComparison?.();
      setTimeout(async () => {
        try {
          await mermaid.run({ querySelector: ".mermaid" });
        } catch (err) {
          console.error(err);
        }
      }, 200);
    }
    if (tabName === "schemes" || tabName === "report" && document.querySelector("#schemesContainer .mermaid")) {
      setTimeout(async () => {
        try {
          await mermaid.run({ querySelector: ".mermaid" });
        } catch (err) {
          console.error("Mermaid re-render error:", err);
        }
      }, 200);
    }
  }

  // src/core/dnd.js
  function setupDropZones() {
    document.querySelectorAll(".drop-zone").forEach((zone) => {
      const targetId = zone.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      zone.addEventListener("click", () => input.click());
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        zone.classList.add("dragover");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("dragover");
        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        input.files = dt.files;
        zone.querySelector(".drop-zone-title").textContent = `\u0412\u044B\u0431\u0440\u0430\u043D \u0444\u0430\u0439\u043B: ${e.dataTransfer.files[0].name}`;
        input.dispatchEvent(new Event("change"));
      });
      input.addEventListener("change", () => {
        if (input.files && input.files[0]) {
          const title = zone.querySelector(".drop-zone-title");
          if (title) title.textContent = `\u0412\u044B\u0431\u0440\u0430\u043D \u0444\u0430\u0439\u043B: ${input.files[0].name}`;
        }
      });
    });
  }

  // src/audit-detail/direct-dynamics-chart.js
  var DIRECT_DYNAMICS_METRICS = [
    { key: "leads", label: "\u0417\u0430\u044F\u0432\u043A\u0438", format: "number" },
    { key: "cpl", label: "CPL", format: "money" },
    { key: "budget", label: "\u0411\u044E\u0434\u0436\u0435\u0442", format: "money" },
    { key: "clicks", label: "\u041A\u043B\u0438\u043A\u0438", format: "number" }
  ];
  function readThemeVar(name, fallback) {
    if (typeof document === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }
  function getLineChartTheme() {
    return {
      line: readThemeVar("--chart-line", "#2f5aa8"),
      grid: readThemeVar("--chart-grid", "rgba(23, 43, 77, 0.18)"),
      axis: readThemeVar("--chart-axis", "#94a3b8"),
      surface: readThemeVar("--surface", "#ffffff")
    };
  }
  var dynamicsPeriodsCache = [];
  function monthlyRowsToPeriods(monthly) {
    return (monthly || []).map((row) => ({
      period: row?.month || "",
      leads: row?.leads,
      budget: row?.cost,
      clicks: row?.clicks,
      cpl: row?.cpl
    }));
  }
  function compactPeriodLabel(value) {
    const text = String(value || "").trim();
    const m = text.match(/^([а-яА-ЯёЁ]+)\s+(\d{4})$/);
    if (!m) return text;
    return `${m[1].slice(0, 3).toLowerCase()} ${m[2].slice(2)}`;
  }
  function formatMetricValue(value, format) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "\u2014";
    if (format === "money") {
      return `${num.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} \u20BD`;
    }
    return num.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  }
  function buildSmoothLinePath(points) {
    if (!points.length) return "";
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
  function renderDynamicsSvgChart(host, periods, metricKey = "leads") {
    if (!host) return;
    const metric = DIRECT_DYNAMICS_METRICS.find((item) => item.key === metricKey) || DIRECT_DYNAMICS_METRICS[0];
    const rows = (periods || []).map((row) => ({
      rawLabel: row?.period || "",
      label: compactPeriodLabel(row?.period),
      value: Number(row?.[metric.key])
    })).filter((row) => row.label && Number.isFinite(row.value));
    if (rows.length < 2) {
      host.innerHTML = '<p class="muted comparison-empty-state">\u041D\u0443\u0436\u043D\u043E \u043C\u0438\u043D\u0438\u043C\u0443\u043C 2 \u043C\u0435\u0441\u044F\u0446\u0430 \u0432 Excel \u0434\u043B\u044F \u0433\u0440\u0430\u0444\u0438\u043A\u0430.</p>';
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
    const yScale = (value) => pad.top + plotH - (value - yMin) / (yMax - yMin) * plotH;
    const xScale = (index) => pad.left + index / (rows.length - 1) * plotW;
    const points = rows.map((row, index) => ({
      x: xScale(index),
      y: yScale(row.value),
      ...row
    }));
    const formatValue = (value) => formatMetricValue(value, metric.format);
    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const value = yMin + (yMax - yMin) * index / 4;
      return { value, y: yScale(value) };
    });
    const chartTheme = getLineChartTheme();
    const gridLines = yTicks.map((tick) => `
        <line x1="${pad.left}" y1="${tick.y}" x2="${width - pad.right}" y2="${tick.y}"
            stroke="${chartTheme.grid}" stroke-dasharray="3 3" />`).join("");
    const yLabels = yTicks.map((tick) => `
        <text x="${pad.left - 10}" y="${tick.y + 4}" text-anchor="end"
            fill="${chartTheme.axis}" font-size="11" font-family="var(--font-sans), system-ui, sans-serif">
            ${escapeHtml(formatValue(tick.value))}
        </text>`).join("");
    const xLabelStep = rows.length > 7 ? 2 : 1;
    const xLabels = points.map((point, index) => {
      if (index % xLabelStep !== 0 && index !== points.length - 1) return "";
      return `
        <text x="${point.x}" y="${height - 14}" text-anchor="middle"
            fill="${chartTheme.axis}" font-size="11" font-family="var(--font-sans), system-ui, sans-serif">
            ${escapeHtml(point.label)}
        </text>`;
    }).join("");
    const minPoint = points.reduce((acc, point) => point.value < acc.value ? point : acc, points[0]);
    const maxPoint = points.reduce((acc, point) => point.value > acc.value ? point : acc, points[0]);
    const keyIndexes = /* @__PURE__ */ new Set([0, points.length - 1, points.indexOf(minPoint), points.indexOf(maxPoint)]);
    const markerDots = points.map((point) => `
        <circle cx="${point.x}" cy="${point.y}" r="3.5" fill="${chartTheme.line}" stroke="${chartTheme.surface}" stroke-width="1.25" />
    `).join("");
    const keyValueLabels = points.map((point, index) => {
      if (!keyIndexes.has(index)) return "";
      const valueText = formatValue(point.value);
      const y = Math.max(14, point.y - 10);
      const isFirst = index === 0;
      const isLast = index === points.length - 1;
      const x = isFirst ? point.x + 16 : isLast ? point.x - 16 : point.x;
      const anchor = isFirst ? "start" : isLast ? "end" : "middle";
      return `
        <text x="${x}" y="${y}" text-anchor="${anchor}"
            class="comparison-svg-value-label"
            font-size="10.5" font-family="var(--font-sans), system-ui, sans-serif">
            ${escapeHtml(valueText)}
        </text>`;
    }).join("");
    const hoverDots = points.map((point) => `
        <circle cx="${point.x}" cy="${point.y}" r="10" fill="transparent" class="comparison-svg-hit">
            <title>${escapeHtml(point.rawLabel)}: ${escapeHtml(formatValue(point.value))}</title>
        </circle>`).join("");
    host.innerHTML = `
        <svg class="comparison-line-svg" viewBox="0 0 ${width} ${height}"
            width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
            role="img" aria-label="\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 ${escapeHtml(metric.label)} \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C">
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
  function pctDelta(current, previous) {
    const c = Number(current);
    const p = Number(previous);
    if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
    return Math.round((c - p) / p * 1e3) / 10;
  }
  var DELTA_WORDS = {
    leads: { up: "\u0411\u043E\u043B\u044C\u0448\u0435 \u0437\u0430\u044F\u0432\u043E\u043A", down: "\u041C\u0435\u043D\u044C\u0448\u0435 \u0437\u0430\u044F\u0432\u043E\u043A", flat: "\u0417\u0430\u044F\u0432\u043A\u0438 \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439" },
    cost: { up: "\u0422\u0440\u0430\u0442 \u0431\u043E\u043B\u044C\u0448\u0435", down: "\u0422\u0440\u0430\u0442 \u043C\u0435\u043D\u044C\u0448\u0435", flat: "\u0420\u0430\u0441\u0445\u043E\u0434 \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439" },
    cpl: { up: "\u041B\u0438\u0434 \u0434\u043E\u0440\u043E\u0436\u0435", down: "\u041B\u0438\u0434 \u0434\u0435\u0448\u0435\u0432\u043B\u0435", flat: "CPL \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439" }
  };
  function changeTone(pct, kind) {
    if (pct == null || pct === 0) return "neutral";
    const up = pct > 0;
    if (kind === "leads") return up ? "good" : "bad";
    if (kind === "cost") return up ? "warn" : "good";
    return up ? "bad" : "good";
  }
  function deltaLabel(pct, kind) {
    if (pct == null) return "\u2014";
    const up = pct > 0;
    const down = pct < 0;
    const words = DELTA_WORDS[kind] || DELTA_WORDS.leads;
    if (up) return words.up;
    if (down) return words.down;
    return words.flat;
  }
  function renderDeltaTag(pct, kind) {
    if (pct == null) return '<span class="delta-tag delta-tag--neutral">\u2014</span>';
    const tone = changeTone(pct, kind);
    const abs = Math.abs(pct).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
    const label = deltaLabel(pct, kind);
    return `<span class="delta-tag delta-tag--${tone}">${escapeHtml(label)} \xB7 ${abs}%</span>`;
  }
  function buildKpiGrowthSublines(monthly) {
    const rows = monthly || [];
    if (rows.length < 2) {
      return { cost: "", leads: "", cpl: "", periodNote: "" };
    }
    const first = rows[0];
    const last = rows[rows.length - 1];
    return {
      cost: renderDeltaTag(pctDelta(last.cost, first.cost), "cost"),
      leads: renderDeltaTag(pctDelta(last.leads, first.leads), "leads"),
      cpl: renderDeltaTag(pctDelta(last.cpl, first.cpl), "cpl"),
      periodNote: `<span class="direct-kpi-range muted">${escapeHtml(first.month || "\u2014")} \u2192 ${escapeHtml(last.month || "\u2014")}</span>`
    };
  }
  function momSummaryText(costPct, leadsPct, cplPct) {
    const parts = [];
    if (costPct != null) {
      parts.push(`${deltaLabel(costPct, "cost").toLowerCase()} ${Math.abs(costPct).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`);
    }
    if (leadsPct != null) {
      parts.push(`${deltaLabel(leadsPct, "leads").toLowerCase()} ${Math.abs(leadsPct).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`);
    }
    if (cplPct != null) {
      parts.push(`${deltaLabel(cplPct, "cpl").toLowerCase()} ${Math.abs(cplPct).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`);
    }
    return parts.join(" \xB7 ") || "\u2014";
  }
  function renderMonthDetailsTable(monthly) {
    const rows = monthly || [];
    if (!rows.length) return "";
    const body = rows.map((row, idx) => {
      const prev = idx > 0 ? rows[idx - 1] : null;
      const mom = prev ? momSummaryText(
        pctDelta(row.cost, prev.cost),
        pctDelta(row.leads, prev.leads),
        pctDelta(row.cpl, prev.cpl)
      ) : "\u2014";
      return `<tr>
            <td>${escapeHtml(row.month || "\u2014")}</td>
            <td>${formatMetricValue(row.cost, "money")}</td>
            <td>${formatNumber2(row.leads)}</td>
            <td>${row.cpl != null ? formatMetricValue(row.cpl, "money") : "\u2014"}</td>
            <td class="direct-mom-summary">${escapeHtml(mom)}</td>
        </tr>`;
    }).join("");
    return `
        <details class="direct-mom-details">
            <summary>\u0426\u0438\u0444\u0440\u044B \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C (\u0442\u0430\u0431\u043B\u0438\u0446\u0430)</summary>
            <table class="table table-compact table-compact-direct">
                <thead><tr>
                    <th>\u041C\u0435\u0441\u044F\u0446</th><th>\u0420\u0430\u0441\u0445\u043E\u0434</th><th>\u0417\u0430\u044F\u0432\u043A\u0438</th><th>CPL</th>
                    <th>\u041A \u043F\u0440\u043E\u0448\u043B\u043E\u043C\u0443 \u043C\u0435\u0441\u044F\u0446\u0443</th>
                </tr></thead>
                <tbody>${body}</tbody>
            </table>
        </details>`;
  }
  function formatNumber2(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "\u2014";
    return num.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  }
  function wireDynamicsMetricTabs(root, periods, chartHostId) {
    const tabs = root.querySelectorAll(".comparison-metric-tab.period-btn");
    const host = root.querySelector(`[data-dynamics-chart-host="${chartHostId}"]`);
    if (!tabs.length || !host) return;
    const cacheKey = chartHostId;
    tabs.forEach((btn) => {
      if (btn.dataset.wired === cacheKey) return;
      btn.dataset.wired = cacheKey;
      btn.addEventListener("click", () => {
        const metricKey = btn.dataset.metric || "leads";
        tabs.forEach((el) => {
          const isActive = el === btn;
          el.classList.toggle("active", isActive);
          el.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        renderDynamicsSvgChart(host, periods, metricKey);
      });
    });
  }
  function mountDirectDynamicsBlock(hostEl, monthly, options = {}) {
    if (!hostEl) return;
    const chartHostId = options.chartHostId || "direct_dynamics_chart_host";
    const periods = monthlyRowsToPeriods(monthly);
    if (periods.length < 2) {
      hostEl.innerHTML = "";
      hostEl.style.display = "none";
      return;
    }
    hostEl.style.display = "";
    hostEl.innerHTML = `
        <div class="card comparison-chart-card direct-dynamics-card">
            <h2 class="comparison-chart-title">\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C</h2>
            <div class="period-picker comparison-period-picker" role="tablist" aria-label="\u041C\u0435\u0442\u0440\u0438\u043A\u0430 \u0433\u0440\u0430\u0444\u0438\u043A\u0430">
                <span class="period-picker-label">\u041C\u0435\u0442\u0440\u0438\u043A\u0430</span>
                ${DIRECT_DYNAMICS_METRICS.map((item, idx) => `
                    <button type="button" class="period-btn comparison-metric-tab${idx === 0 ? " active" : ""}"
                        data-metric="${item.key}" role="tab" aria-selected="${idx === 0 ? "true" : "false"}">
                        ${escapeHtml(item.label)}
                    </button>`).join("")}
            </div>
            <div class="chart-wrap" data-dynamics-chart-host="${escapeHtml(chartHostId)}" role="presentation"></div>
            ${renderMonthDetailsTable(monthly)}
        </div>`;
    setTimeout(() => {
      const chartHost = hostEl.querySelector(`[data-dynamics-chart-host="${chartHostId}"]`);
      renderDynamicsSvgChart(chartHost, periods, "leads");
      wireDynamicsMetricTabs(hostEl, periods, chartHostId);
    }, 50);
  }
  var COMPARISON_METRIC_OPTIONS = DIRECT_DYNAMICS_METRICS;
  function renderComparisonSvgChart(host, periods, metricKey) {
    return renderDynamicsSvgChart(host, periods, metricKey);
  }
  function wireComparisonMetricTabs(container, data) {
    const periods = Array.isArray(data?.periods) ? data.periods : [];
    dynamicsPeriodsCache = periods;
    const tabs = container.querySelectorAll(".comparison-metric-tab.period-btn");
    const host = container.querySelector("#comparison_chart_host");
    if (!tabs.length || !host) return;
    tabs.forEach((btn) => {
      if (btn.dataset.wired === "1") return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => {
        const metricKey = btn.dataset.metric || "leads";
        tabs.forEach((el) => {
          const isActive = el === btn;
          el.classList.toggle("active", isActive);
          el.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        renderDynamicsSvgChart(host, dynamicsPeriodsCache, metricKey);
      });
    });
  }

  // src/audit-detail/direct-health-zones.js
  var DIRECT_HEALTH_ZONE_MAX = {
    semantics: 35,
    campaigns: 25,
    dynamics: 20,
    coverage: 40,
    quality: 15
  };
  function renderDirectHealthZoneRows(zoneBreakdown) {
    return (zoneBreakdown || []).map((z) => {
      const zoneKey = String(z.zone || "").toLowerCase();
      const maxScore = Number(z.cap ?? z.max_score ?? DIRECT_HEALTH_ZONE_MAX[zoneKey] ?? 0);
      const penalty = Number(z.penalty || 0);
      const left = Math.max(0, maxScore - penalty);
      const fill = maxScore > 0 ? Math.max(0, Math.min(100, left / maxScore * 100)) : 0;
      return `
        <div class="direct-health-zone-row">
            <div class="direct-health-zone-row-top">
                <span class="direct-health-zone-name">${escapeHtml(z.label || z.zone || "\u0417\u043E\u043D\u0430")}</span>
                <span class="direct-health-zone-score">\u2212${formatNumber(penalty)} / ${formatNumber(maxScore)}</span>
            </div>
            <div class="direct-health-zone-progress" aria-hidden="true">
                <div class="direct-health-zone-progress-fill" style="--zone-fill:${fill}%"></div>
            </div>
        </div>`;
    }).join("");
  }

  // src/audit-detail/report.js
  var REPORT_CLIENT_VIEW_KEY = "ppc_report_client_view";
  var SEND_CHECKLIST_ITEMS = [
    { id: "kpi_period", label: "\u041F\u0435\u0440\u0438\u043E\u0434 Excel \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0434\u043E\u0433\u043E\u0432\u043E\u0440\u0451\u043D\u043D\u043E\u0441\u0442\u044C\u044E \u0441 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u043C" },
    { id: "direct_ai_overlap", label: "Direct vs AI: \u043D\u0435\u0442 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u043E\u0432 period/leads/CPL/budget \u0432 pre-PDF" },
    { id: "goal_ok", label: "\u0426\u0435\u043B\u044C \u0430\u0443\u0434\u0438\u0442\u0430 \u043E\u0441\u043C\u044B\u0441\u043B\u0435\u043D\u043D\u0430 (\u043D\u0435 \u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u043C\u0443\u0441\u043E\u0440)" },
    { id: "findings_queue", label: "\u0412\u0441\u0435 AI-\u0432\u044B\u0432\u043E\u0434\u044B: confirm \u0438\u043B\u0438 reject (\u0438\u043B\u0438 \u043E\u0441\u043E\u0437\u043D\u0430\u043D\u043D\u044B\u0439 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A)" },
    { id: "analysis_fresh", label: "\u041D\u0435\u0442 \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0435\u0433\u043E AI \u0431\u0435\u0437 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0430 (\u0438\u043B\u0438 \u043A\u043B\u0438\u0435\u043D\u0442 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0451\u043D)" },
    { id: "offer_ok", label: "\u041A\u041F: \u044D\u0442\u0430\u043F\u044B \u0438 \u0441\u0440\u043E\u043A \u0430\u0434\u0435\u043A\u0432\u0430\u0442\u043D\u044B \u043D\u0438\u0448\u0435" },
    { id: "preview_match", label: "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 PDF \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 preview \u043D\u0430 \u044D\u043A\u0440\u0430\u043D\u0435" }
  ];
  function sendChecklistStorageKey(auditId) {
    return `ppc_send_checklist_${auditId}`;
  }
  function loadSendChecklistState(auditId) {
    try {
      const raw = sessionStorage.getItem(sendChecklistStorageKey(auditId));
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }
  function saveSendChecklistItem(auditId, itemId, checked) {
    const state = loadSendChecklistState(auditId);
    state[itemId] = Boolean(checked);
    try {
      sessionStorage.setItem(sendChecklistStorageKey(auditId), JSON.stringify(state));
    } catch (_e) {
    }
    renderReportSendChecklist(auditId);
  }
  function renderReportSendChecklist(auditId) {
    const body = document.getElementById("reportSendChecklistBody");
    if (!body || !auditId) return;
    const state = loadSendChecklistState(auditId);
    const rows = SEND_CHECKLIST_ITEMS.map((item) => {
      const checked = Boolean(state[item.id]);
      return `<label class="report-send-checklist-row">
            <input type="checkbox" ${checked ? "checked" : ""} onchange="saveSendChecklistItem(${auditId}, '${item.id}', this.checked)">
            <span>${escapeHtml(item.label)}</span>
        </label>`;
    }).join("");
    body.innerHTML = `<div class="report-send-checklist">${rows}</div>`;
  }
  function setReportClientView(enabled) {
    document.body.classList.toggle("report-client-view-mode", Boolean(enabled));
    try {
      localStorage.setItem(REPORT_CLIENT_VIEW_KEY, enabled ? "1" : "0");
    } catch (_e) {
    }
  }
  function initReportClientViewToggle() {
    const el = document.getElementById("reportClientViewToggle");
    if (!el) return;
    let on = false;
    try {
      on = localStorage.getItem(REPORT_CLIENT_VIEW_KEY) === "1";
    } catch (_e) {
    }
    el.checked = on;
    document.body.classList.toggle("report-client-view-mode", on);
  }
  function getCurrentAuditId4() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
  }
  async function loadComparison() {
    const container = document.getElementById("comparisonContainer");
    const auditId = getCurrentAuditId4();
    if (!container || !auditId) return;
    container.innerHTML = '<p class="muted comparison-loading-state">\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F...</p>';
    try {
      const data = await apiRequest(`/api/audits/${auditId}/comparison`);
      renderComparison(data);
      renderHealthKpiStrip(runtimeBridge.getAuditData?.() || null, data);
    } catch (error) {
      container.innerHTML = `<div class="alert alert-danger">\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F: ${escapeHtml(error.message)}</div>`;
    }
  }
  function renderDelta(delta, lowerIsBetter = false) {
    if (!delta || delta.absolute === null || delta.absolute === void 0) return '<span class="delta-neutral">\u2014</span>';
    const value = Number(delta.percent);
    const cls = value === 0 || Number.isNaN(value) ? "delta-neutral" : value > 0 !== lowerIsBetter ? "delta-positive" : "delta-negative";
    const sign = value > 0 ? "+" : "";
    return `<span class="${cls}">${sign}${value}%</span>`;
  }
  function comparisonMetricHasData(before, after, key) {
    const pick = (row) => row?.[key];
    const vals = [pick(before), pick(after)];
    return vals.some((v) => v !== null && v !== void 0 && v !== "" && !Number.isNaN(Number(v)));
  }
  function buildComparisonCards(before, after, deltas) {
    const cards = [
      {
        label: "\u041F\u0435\u0440\u0438\u043E\u0434",
        html: `${escapeHtml(before.period)} \u2192 ${escapeHtml(after.period)}`,
        show: true
      },
      {
        label: "\u0417\u0430\u044F\u0432\u043A\u0438",
        html: `${formatNumber(before.leads)} \u2192 ${formatNumber(after.leads)} ${renderDelta(deltas.leads)}`,
        show: comparisonMetricHasData(before, after, "leads")
      },
      {
        label: "\u041F\u0440\u043E\u0434\u0430\u0436\u0438",
        html: `${formatNumber(before.sales)} \u2192 ${formatNumber(after.sales)} ${renderDelta(deltas.sales)}`,
        show: comparisonMetricHasData(before, after, "sales")
      },
      {
        label: "CPL",
        html: `${formatMoney(before.cpl)} \u2192 ${formatMoney(after.cpl)} ${renderDelta(deltas.cpl, true)}`,
        show: comparisonMetricHasData(before, after, "cpl")
      },
      {
        label: "CPA",
        html: `${formatMoney(before.cpa)} \u2192 ${formatMoney(after.cpa)} ${renderDelta(deltas.cpa, true)}`,
        show: comparisonMetricHasData(before, after, "cpa")
      },
      {
        label: "ROMI",
        html: `${before.romi ?? "\u2014"}% \u2192 ${after.romi ?? "\u2014"}% ${renderDelta(deltas.romi)}`,
        show: comparisonMetricHasData(before, after, "romi")
      }
    ];
    return cards.filter((c) => c.show);
  }
  function renderHealthScoreHowHtml(health) {
    const bd = health?.score_breakdown || {};
    const base = bd.base ?? 100;
    const pr = bd.penalty_rules ?? 0;
    const pc = bd.penalty_coverage ?? 0;
    const pm = bd.penalty_ml ?? 0;
    const bonus = bd.bonus_improvement ?? 0;
    const score = health?.health_score ?? 0;
    const issues = (health?.top_issues || health?.performance_issues || []).slice(0, 4);
    const issueList = issues.length ? `<ul class="health-score-issues">${issues.map(
      (i) => `<li><strong>\u2212${escapeHtml(String(i.penalty || "?"))}</strong> ${escapeHtml(i.title || i.id || "")}</li>`
    ).join("")}</ul>` : '<p class="muted">\u041D\u0435\u0442 \u0441\u0440\u0430\u0431\u043E\u0442\u0430\u0432\u0448\u0438\u0445 \u043F\u0440\u0430\u0432\u0438\u043B \u2014 \u043E\u0446\u0435\u043D\u043A\u0430 \u0431\u043B\u0438\u0437\u043A\u0430 \u043A \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C\u0443.</p>';
    return `
        <details class="health-score-how">
            <summary>\u041A\u0430\u043A \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u043E\u0446\u0435\u043D\u043A\u0430</summary>
            <p class="muted health-score-formula">
                ${base} \u2212 ${pr} (Excel) \u2212 ${pc} (\u0434\u0430\u043D\u043D\u044B\u0435) \u2212 ${pm} (\u0430\u043D\u043E\u043C\u0430\u043B\u0438\u0438) + ${bonus} (\u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0430 KPI) = <strong>${formatNumber(score)}</strong>
            </p>
            <p class="muted">\u041E\u0446\u0435\u043D\u043A\u0430 <strong>\u043D\u0435</strong> \u0431\u0435\u0440\u0451\u0442\u0441\u044F \u0438\u0437 \u0442\u0430\u0431\u043B\u0438\u0446\u044B \xAB\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u043C\u0435\u0442\u0440\u0438\u043A\u0438\xBB \u0438 \u043D\u0435 \u0440\u0430\u0432\u043D\u0430 \u0447\u0438\u0441\u043B\u0443 \u0437\u0430\u044F\u0432\u043E\u043A \u043D\u0430 \u0433\u0440\u0430\u0444\u0438\u043A\u0435. \u041F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043F\u0440\u0438 \u043A\u0430\u0436\u0434\u043E\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0435 Excel.</p>
            ${issueList}
            <button type="button" class="btn btn-link btn-sm" onclick="switchTab('data'); switchDataSubtab('direct')">\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435 \u043D\u0430 \xAB\u0414\u0430\u043D\u043D\u044B\u0435 \u2192 \u0414\u0438\u0440\u0435\u043A\u0442\xBB</button>
        </details>`;
  }
  function renderHealthKpiStrip(auditData2, comparison) {
    const el = document.getElementById("healthKpiStrip");
    if (!el) return;
    const health = auditData2?.direct_analytics?.health;
    if (!health) {
      el.innerHTML = "";
      return;
    }
    const breakdown = health.score_breakdown || {};
    const bonus = breakdown.bonus_improvement || 0;
    const scoreLine = `${DIRECT_COPY.healthScoreLabel}: ${formatNumber(health.health_score || 0)} (${escapeHtml(health.grade || "\u2014")})`;
    const howHtml = renderHealthScoreHowHtml(health);
    const activePeriod = auditData2?.metrics_summary?.period;
    if (comparison?.available) {
      const d = comparison.deltas || {};
      const b = comparison.before || {};
      const a = comparison.after || {};
      const leadsPct = d.leads?.percent;
      const cplPct = d.cpl?.percent;
      const kpiParts = [];
      if (leadsPct != null) kpiParts.push(`\u0437\u0430\u044F\u0432\u043A\u0438 ${leadsPct > 0 ? "+" : ""}${leadsPct}%`);
      if (cplPct != null) kpiParts.push(`CPL ${cplPct > 0 ? "+" : ""}${cplPct}%`);
      if (bonus > 0) kpiParts.push(`\u0431\u043E\u043D\u0443\u0441 +${bonus}`);
      const kpiLine = kpiParts.length ? `${escapeHtml(b.period)} \u2192 ${escapeHtml(a.period)}: ${kpiParts.join(", ")}` : `${escapeHtml(b.period)} \u2192 ${escapeHtml(a.period)}`;
      el.innerHTML = `
            <div class="card health-kpi-strip-card health-kpi-strip-card--compact">
                <div class="health-kpi-strip-lines">
                    <p class="health-kpi-strip-line"><strong>${scoreLine}</strong></p>
                    <p class="health-kpi-strip-line health-kpi-strip-line--kpi"><span class="muted">KPI \u0431\u044B\u043B\u043E/\u0441\u0442\u0430\u043B\u043E:</span> ${kpiLine}</p>
                    ${activePeriod ? `<p class="health-kpi-strip-line health-kpi-strip-line--kpi"><span class="muted">\u0412 \u0442\u0430\u0431\u043B\u0438\u0446\u0435 \u043E\u0442\u0447\u0451\u0442\u0430:</span> <strong>${escapeHtml(activePeriod)}</strong></p>` : ""}
                </div>
                ${howHtml}
            </div>`;
      return;
    }
    el.innerHTML = `
        <div class="card health-kpi-strip-card health-kpi-strip-card--compact">
            <div class="health-kpi-strip-lines">
                <p class="health-kpi-strip-line"><strong>${scoreLine}</strong></p>
                ${activePeriod ? `<p class="health-kpi-strip-line health-kpi-strip-line--kpi"><span class="muted">\u0412 \u0442\u0430\u0431\u043B\u0438\u0446\u0435 \u043E\u0442\u0447\u0451\u0442\u0430:</span> <strong>${escapeHtml(activePeriod)}</strong></p>` : ""}
                <p class="muted health-kpi-strip-note">\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 2+ \u043F\u0435\u0440\u0438\u043E\u0434\u0430 KPI \u0434\u043B\u044F \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044F \xAB\u0431\u044B\u043B\u043E/\u0441\u0442\u0430\u043B\u043E\xBB.</p>
            </div>
            ${howHtml}
        </div>`;
  }
  function renderDirectHealthReport(_auditData) {
    const container = document.getElementById("directHealthReportContainer");
    if (!container) return;
    container.style.display = "none";
    container.innerHTML = "";
  }
  function renderComparison(data) {
    const container = document.getElementById("comparisonContainer");
    if (!data.available) {
      container.innerHTML = `<div class="card needs-review-block"><p>${escapeHtml(data.message || "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u043C\u0438\u043D\u0438\u043C\u0443\u043C \u0434\u0432\u0443\u0445 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0445 \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u0432.")}</p></div>`;
      return;
    }
    const before = data.before || {};
    const after = data.after || {};
    const d = data.deltas || {};
    const cards = buildComparisonCards(before, after, d);
    const gridClass = cards.length <= 4 ? "comparison-grid comparison-grid--compact" : "comparison-grid";
    const cardsHtml = cards.map(
      (c) => `<div class="comparison-card"><strong>${escapeHtml(c.label)}</strong>${c.html}</div>`
    ).join("");
    container.innerHTML = `
        <div class="${gridClass}">
            ${cardsHtml}
        </div>
        <div class="card comparison-chart-card">
            <h2 class="comparison-chart-title">\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 \u043F\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430\u043C</h2>
            <div class="period-picker comparison-period-picker" role="tablist" aria-label="\u041C\u0435\u0442\u0440\u0438\u043A\u0430 \u0433\u0440\u0430\u0444\u0438\u043A\u0430">
                <span class="period-picker-label">\u041C\u0435\u0442\u0440\u0438\u043A\u0430</span>
                ${COMPARISON_METRIC_OPTIONS.map((item, idx) => `
                    <button type="button" class="period-btn comparison-metric-tab${idx === 0 ? " active" : ""}"
                        data-metric="${item.key}" role="tab" aria-selected="${idx === 0 ? "true" : "false"}">
                        ${escapeHtml(item.label)}
                    </button>`).join("")}
            </div>
            <div class="chart-wrap" id="comparison_chart_host" role="presentation"></div>
        </div>
    `;
    setTimeout(() => {
      const host = document.getElementById("comparison_chart_host");
      const periods = Array.isArray(data?.periods) ? data.periods : [];
      if (!host || periods.length < 2) return;
      renderComparisonSvgChart(host, periods, "leads");
      wireComparisonMetricTabs(container, data);
    }, 80);
  }
  function previewAuditReport() {
    const auditId = getCurrentAuditId4();
    if (!auditId) return;
    const ts = Date.now();
    window.open(`/api/audits/${auditId}/export/html?t=${ts}`, "_blank");
  }
  function exportAuditReport() {
    const auditId = getCurrentAuditId4();
    if (!auditId) return;
    const ts = Date.now();
    window.open(`/api/audits/${auditId}/export/pdf?t=${ts}`, "_blank");
  }
  async function runPrePdfCheck() {
    const auditId = getCurrentAuditId4();
    const box = document.getElementById("prePdfCheckResult");
    if (!auditId || !box) return;
    box.innerHTML = '<p class="muted">\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430\u2026</p>';
    try {
      const data = await apiRequest(`/api/audits/${auditId}/report/pre-pdf-check`);
      const directIds = /* @__PURE__ */ new Set(["direct_ai_consistency", "direct_ai_no_overlap", "direct_ai_enrichment"]);
      const directItems = (data.items || []).filter((item) => directIds.has(item.id));
      const directFailed = directItems.some((item) => !item.ok && item.severity !== "warning");
      const enrichmentFailed = (data.items || []).some(
        (item) => item.id === "direct_ai_enrichment" && !item.ok
      );
      const checklistHtml = directFailed ? `<div class="pre-pdf-consistency-checklist">
                <p class="muted">${escapeHtml(DIRECT_COPY.prePdf10SecIntro)}</p>
                <ul>${DIRECT_COPY.prePdf10SecItems.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
            </div>` : "";
      const actionsHtml = directFailed ? `<div class="pre-pdf-actions-row">
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="goFixDirectAiConsistency()">
                    \u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044E
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="openAiSummaryForConsistency()">
                    \u041E\u0442\u043A\u0440\u044B\u0442\u044C AI-summary
                </button>
                <button type="button" class="btn btn-sm btn-outline" onclick="rerunAuditAnalysis()">
                    \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437
                </button>
              </div>` : "";
      const enrichmentActions = enrichmentFailed ? `<div class="pre-pdf-actions-row">
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="switchTab('data'); switchDataSubtab('direct')">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \xAB\u0414\u0438\u0440\u0435\u043A\u0442\xBB</button>
                <button type="button" class="btn btn-sm btn-outline" onclick="rerunAuditAnalysis()">\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437</button>
                <button type="button" class="btn btn-sm btn-outline" onclick="setFindingsMarketerFilter('no_ai'); switchTab('results')">\u0411\u0435\u0437 AI-\u043E\u0431\u043E\u0433\u0430\u0449\u0435\u043D\u0438\u044F</button>
              </div>` : "";
      let directBlockInserted = false;
      const items = (data.items || []).map((item) => {
        const isDirect = directIds.has(item.id);
        const isWarning = item.severity === "warning";
        const statusCls = item.ok ? "pre-pdf-ok" : isWarning ? "pre-pdf-warn" : "pre-pdf-fail";
        const badge = isDirect && !item.ok && !isWarning ? `<span class="badge badge-medium pre-pdf-consistency-badge">${DIRECT_COPY.prePdfConflictBadge}</span>` : "";
        let extra = "";
        if (item.id === "direct_ai_enrichment" && !item.ok) {
          extra = enrichmentActions;
        } else if (isDirect && !directBlockInserted && (directFailed || item.id === "direct_ai_no_overlap")) {
          if (item.id === "direct_ai_no_overlap") {
            extra = checklistHtml + actionsHtml;
            directBlockInserted = true;
          }
        }
        return `
                <li class="pre-pdf-item ${statusCls}">
                    <span>${item.ok ? "\u2713" : "\u25CB"}</span>
                    <strong>${escapeHtml(item.label)}</strong>${badge}
                    <p class="muted">${escapeHtml(item.detail || "")}</p>
                    ${extra}
                </li>
            `;
      }).join("");
      const cls = data.ready ? "alert-success" : "alert-warning";
      box.innerHTML = `
            <div class="alert ${cls} pre-pdf-summary-alert">${escapeHtml(data.summary || "")}</div>
            <ul class="pre-pdf-checklist">${items}</ul>`;
      if (!data.ready) {
        showAlert(data.summary || "PDF \u043F\u043E\u043A\u0430 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432 \u043A \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0435", "warning");
      } else {
        showAlert(data.summary || "\u041C\u043E\u0436\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C PDF", "success");
      }
    } catch (error) {
      box.innerHTML = `<p class="muted">\u041E\u0448\u0438\u0431\u043A\u0430: ${escapeHtml(error.message)}</p>`;
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438: " + error.message, "danger");
    }
  }
  function goFixDirectAiConsistency() {
    runtimeBridge.switchTab?.("data");
    runtimeBridge.switchDataSubtab?.("direct");
    const direct = document.getElementById("directAnalyticsPanel");
    if (direct) {
      direct.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    showAlert(
      DIRECT_COPY.prePdfConsistencyHint,
      "warning"
    );
  }
  function openAiSummaryForConsistency() {
    runtimeBridge.switchTab?.("report");
    const card = document.getElementById("reportAiSummaryCard");
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      card.classList.add("focus-target");
      setTimeout(() => card.classList.remove("focus-target"), 1400);
    }
    showAlert("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442 \u0438 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0438 AI-summary \u043F\u0435\u0440\u0435\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u043E\u0439 PDF.", "warning");
  }
  function exportSlidesPptx() {
    const auditId = getCurrentAuditId4();
    window.open(`/api/audits/${auditId}/export/slides/pptx`, "_blank");
  }
  async function exportGoogleSlides() {
    const auditId = getCurrentAuditId4();
    try {
      showLoader();
      const result = await apiRequest(`/api/audits/${auditId}/export/google-slides`, { method: "POST" });
      const url = result.presentation && result.presentation.webViewLink;
      if (url) {
        showAlert("Google Slides \u0441\u043E\u0437\u0434\u0430\u043D. \u041E\u0442\u043A\u0440\u044B\u0432\u0430\u044E \u043F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u044E.", "success");
        window.open(url, "_blank");
      } else {
        showAlert("Google Slides \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D, \u043D\u043E \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430.", "warning");
      }
    } catch (error) {
      showAlert("Google Slides \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D: " + error.message + ". \u0421\u043A\u0430\u0447\u0430\u0439\u0442\u0435 PPTX \u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 Google Slides \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", "warning");
    } finally {
      hideLoader();
    }
  }
  async function syncDirectHealthFindings(options = {}) {
    const {
      silent = false,
      scrollToRisks = true,
      promptAnalysis = false
    } = options;
    const auditId = getCurrentAuditId4();
    if (!auditId) return null;
    try {
      if (!silent) showLoader();
      const data = await apiRequest(`/api/audits/${auditId}/health/sync-findings`, { method: "POST", body: {} });
      if (!silent) {
        showAlert(DIRECT_COPY.syncRisksSuccess(data.created || 0), "success");
      }
      await runtimeBridge.loadAuditDetail?.();
      if (scrollToRisks) scrollToDirectRisks();
      if (promptAnalysis) {
        const audit = runtimeBridge.getAuditData?.();
        const ws = audit?.workflow_state || {};
        const analysisDone = ws.state === "ANALYSIS_DONE" || ws.state === "REPORT_READY";
        if (!analysisDone && !ws.analysis_running) {
          const run = await showConfirmDialog({
            title: "AI-\u0430\u043D\u0430\u043B\u0438\u0437",
            message: DIRECT_COPY.promptRunAnalysisAfterExcel,
            confirmText: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C",
            cancelText: "\u041F\u043E\u0437\u0436\u0435"
          });
          if (run) runtimeBridge.runAuditAnalysis?.();
        }
      }
      return data;
    } catch (error) {
      if (!silent) {
        showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0440\u0438\u0441\u043A\u0438: " + error.message, "danger");
      }
      return null;
    } finally {
      if (!silent) hideLoader();
    }
  }
  async function maybeAutoSyncDirectHealthAfterExcelUpload() {
    const audit = runtimeBridge.getAuditData?.();
    if (!audit?.direct_analytics?.health) return;
    const data = await syncDirectHealthFindings({
      silent: true,
      scrollToRisks: false,
      promptAnalysis: true
    });
    if (data != null) {
      showAlert(DIRECT_COPY.risksSyncedFromExcel, "success");
    }
  }

  // src/shared/period-label.js
  var MONTH_GENITIVE = {
    1: "\u044F\u043D\u0432\u0430\u0440\u044F",
    2: "\u0444\u0435\u0432\u0440\u0430\u043B\u044F",
    3: "\u043C\u0430\u0440\u0442\u0430",
    4: "\u0430\u043F\u0440\u0435\u043B\u044F",
    5: "\u043C\u0430\u044F",
    6: "\u0438\u044E\u043D\u044F",
    7: "\u0438\u044E\u043B\u044F",
    8: "\u0430\u0432\u0433\u0443\u0441\u0442\u0430",
    9: "\u0441\u0435\u043D\u0442\u044F\u0431\u0440\u044F",
    10: "\u043E\u043A\u0442\u044F\u0431\u0440\u044F",
    11: "\u043D\u043E\u044F\u0431\u0440\u044F",
    12: "\u0434\u0435\u043A\u0430\u0431\u0440\u044F"
  };
  var MONTH_PREFIXES = [
    ["\u044F\u043D\u0432\u0430\u0440", 1],
    ["\u0444\u0435\u0432\u0440\u0430\u043B", 2],
    ["\u043C\u0430\u0440\u0442", 3],
    ["\u0430\u043F\u0440\u0435\u043B", 4],
    ["\u043C\u0430\u0439", 5],
    ["\u043C\u0430\u044F", 5],
    ["\u0438\u044E\u043D", 6],
    ["\u0438\u044E\u043B", 7],
    ["\u0430\u0432\u0433\u0443\u0441\u0442", 8],
    ["\u0441\u0435\u043D\u0442\u044F\u0431\u0440", 9],
    ["\u043E\u043A\u0442\u044F\u0431\u0440", 10],
    ["\u043D\u043E\u044F\u0431\u0440", 11],
    ["\u0434\u0435\u043A\u0430\u0431\u0440", 12]
  ];
  function parseMonthYear(text) {
    const raw = String(text || "").trim().toLowerCase().replace(/ё/g, "\u0435");
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
  function periodLabelPrepositionS(raw) {
    const parsed = parseMonthYear(raw);
    if (!parsed) return String(raw || "").trim() || "";
    const label = MONTH_GENITIVE[parsed.month];
    return label ? `${label} ${parsed.year}` : String(raw || "").trim();
  }

  // src/audit-detail/report-helpers.js
  function reportPriorityLabel(value) {
    const key = String(value || "medium").toLowerCase();
    const labels = {
      high: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F \u0432 \u043F\u0435\u0440\u0432\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C",
      medium: "\u0412\u0430\u0436\u043D\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0434\u043E \u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F",
      low: "\u041C\u043E\u0436\u043D\u043E \u043E\u0442\u043B\u043E\u0436\u0438\u0442\u044C \u2014 \u043D\u0430\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435"
    };
    return labels[key] || labels.medium;
  }

  // src/audit-detail/report-offer-plan.js
  function getAuditData4() {
    return runtimeBridge.getAuditData?.() || null;
  }
  function getCurrentAuditId5() {
    return runtimeBridge.getCurrentAuditId?.() || null;
  }
  function hasReportOutputEditable() {
    const data = getAuditData4();
    return Boolean(
      data?.audit_summary || data?.commercial_offer || data?.analysis_freshness?.last_analysis_at || hasGuidedCompletedAnalysis(data)
    );
  }
  function renderOfferPreviewBlock(offer, auditPlan) {
    const forecastHtml = renderForecastScenariosHtml(auditPlan, offer);
    return `
        <div class="offer-block offer-block--preview">
            <h3>${escapeHtml(humanizeDisplayText(offer.proposal_title))}</h3>
            <p class="offer-services-note muted">\u041F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u043C\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B (\u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u0438\u0439 \u043F\u043B\u0430\u043D), \u043D\u0435 \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u0443\u0434\u0438\u0442\u0430.</p>
            <p class="offer-services-label"><strong>\u042D\u0442\u0430\u043F\u044B \u0440\u0430\u0431\u043E\u0442:</strong></p>
            <ul class="services-list">
                ${(offer.recommended_services || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
            </ul>
            <p><strong>\u041E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u044D\u0444\u0444\u0435\u043A\u0442:</strong> ${escapeHtml(offer.sales_argument || "")}</p>
            <p><strong>\u0420\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0439 \u0441\u0440\u043E\u043A:</strong> ${offer.estimated_work_days != null ? `${offer.estimated_work_days} \u0434\u043D\u0435\u0439` : "\u2014"}</p>
            <p><strong>\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433:</strong> ${escapeHtml(offer.next_step || "")}</p>
            ${forecastHtml}
        </div>`;
  }
  function renderOfferEditForm(offer, editable) {
    if (!editable) {
      return '<p class="muted">\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u041A\u041F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043F\u043E\u0441\u043B\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u0433\u043E AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>';
    }
    const services = (offer?.recommended_services || []).join("\n");
    return `
        <div class="report-output-edit-form" id="reportOfferEditForm">
            <div class="form-group">
                <label for="editOfferTitle">\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u041A\u041F</label>
                <input type="text" id="editOfferTitle" class="form-control" value="${escapeHtml(offer?.proposal_title || "")}">
            </div>
            <div class="form-group">
                <label for="editOfferServices">\u042D\u0442\u0430\u043F\u044B \u0440\u0430\u0431\u043E\u0442 (\u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u043D\u0430 \u0441\u0442\u0440\u043E\u043A\u0443)</label>
                <textarea id="editOfferServices" class="form-control" rows="5">${escapeHtml(services)}</textarea>
            </div>
            <div class="form-group">
                <label for="editOfferSalesArgument">\u041E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0439 \u044D\u0444\u0444\u0435\u043A\u0442</label>
                <textarea id="editOfferSalesArgument" class="form-control" rows="2">${escapeHtml(offer?.sales_argument || "")}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="editOfferDays">\u0421\u0440\u043E\u043A (\u0434\u043D\u0435\u0439)</label>
                    <input type="number" id="editOfferDays" class="form-control" min="1" max="365" value="${offer?.estimated_work_days ?? ""}">
                </div>
            </div>
            <div class="form-group">
                <label for="editOfferNextStep">\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433</label>
                <input type="text" id="editOfferNextStep" class="form-control" value="${escapeHtml(offer?.next_step || "")}">
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="saveReportCommercialOffer()">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u041A\u041F</button>
        </div>`;
  }
  function renderCommercialOffer(offer, containerId = "offerContainer", coverage, options = {}) {
    const { hideWhenPendingReview = true } = options;
    const container = document.getElementById(containerId);
    const offerCard = document.getElementById("reportOfferCard");
    const onReportTab = containerId === "reportOfferContainer";
    if (!container) return;
    if (hideWhenPendingReview && getCurrentScreenState() === "RESULTS_NEED_REVIEW") {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }
    container.style.display = "";
    if (offerCard && onReportTab) {
      offerCard.style.display = coverage?.is_preliminary ? "none" : "block";
    }
    if (coverage?.is_preliminary) {
      container.innerHTML = '<p class="ui-empty-muted">\u041F\u043B\u0430\u043D \u0440\u0430\u0431\u043E\u0442 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0434\u0430\u043D\u043D\u044B\u0445 \u0438 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>';
      return;
    }
    if (!offer && !hasReportOutputEditable()) {
      container.innerHTML = '<p class="ui-empty-muted">\u041F\u043B\u0430\u043D \u0440\u0430\u0431\u043E\u0442 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>';
      return;
    }
    const auditData2 = getAuditData4();
    const editable = hasReportOutputEditable();
    const preview = offer ? renderOfferPreviewBlock(offer, auditData2?.audit_plan) : "";
    const editBlock = onReportTab ? `<details class="report-output-edit-details">
            <summary>\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435</summary>
            ${renderOfferEditForm(offer || {}, editable)}
           </details>` : "";
    container.innerHTML = `${preview || '<p class="muted">\u041A\u041F \u0435\u0449\u0451 \u043D\u0435 \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u2014 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437.</p>'}${editBlock}`;
  }
  function toggleReportSummaryEdit(forceOpen) {
    const details = document.getElementById("reportSummaryEditDetails");
    if (!details) {
      showAlert("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u2014 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0444\u043E\u0440\u043C\u0430 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F.", "warning");
      return;
    }
    if (forceOpen === true) {
      details.open = true;
    } else if (forceOpen === false) {
      details.open = false;
    } else {
      details.open = !details.open;
    }
    if (details.open) {
      details.scrollIntoView({ behavior: "smooth", block: "nearest" });
      document.getElementById("editSummaryProblem")?.focus();
    }
  }
  function renderReportSummaryEditor(summary, coverage) {
    const host = document.getElementById("reportSummaryEditHost");
    if (!host) return;
    if (coverage?.is_preliminary) {
      host.innerHTML = '<p class="muted report-edit-hint">\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430 (\u043D\u0435 \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440).</p>';
      return;
    }
    const editable = hasReportOutputEditable();
    const s = summary || {};
    const priority = String(s.priority || "medium").toLowerCase();
    host.innerHTML = `
        <details id="reportSummaryEditDetails" class="report-output-edit-details"${editable ? " open" : ""}>
            <summary>\u0424\u043E\u0440\u043C\u0430 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F</summary>
            ${editable ? `
            <div class="report-output-edit-form" id="reportSummaryEditForm">
                <div class="form-group">
                    <label for="editSummaryProblem">\u0421\u0443\u0442\u044C</label>
                    <textarea id="editSummaryProblem" class="form-control" rows="2">${escapeHtml(s.client_problem || "")}</textarea>
                </div>
                <div class="form-group">
                    <label for="editSummaryRisk">\u0415\u0441\u043B\u0438 \u043D\u0435 \u0438\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C</label>
                    <textarea id="editSummaryRisk" class="form-control" rows="2">${escapeHtml(s.main_risk || "")}</textarea>
                </div>
                <div class="form-group">
                    <label for="editSummaryPriority">\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442</label>
                    <select id="editSummaryPriority" class="form-control">
                        <option value="high" ${priority === "high" ? "selected" : ""}>${escapeHtml(reportPriorityLabel("high"))}</option>
                        <option value="medium" ${priority === "medium" ? "selected" : ""}>${escapeHtml(reportPriorityLabel("medium"))}</option>
                        <option value="low" ${priority === "low" ? "selected" : ""}>${escapeHtml(reportPriorityLabel("low"))}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editSummaryConclusion">\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433</label>
                    <textarea id="editSummaryConclusion" class="form-control" rows="2">${escapeHtml(s.short_conclusion || "")}</textarea>
                </div>
                <button type="button" class="btn btn-primary btn-sm" onclick="saveReportAuditSummary()">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434</button>
            </div>` : '<p class="muted">\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437.</p>'}
        </details>`;
  }
  function collectOfferPatchPayload() {
    const servicesRaw = document.getElementById("editOfferServices")?.value || "";
    const daysRaw = document.getElementById("editOfferDays")?.value;
    const days = daysRaw === "" || daysRaw == null ? null : Number(daysRaw);
    return {
      proposal_title: document.getElementById("editOfferTitle")?.value?.trim() || "",
      recommended_services: servicesRaw.split("\n").map((s) => s.trim()).filter(Boolean),
      sales_argument: document.getElementById("editOfferSalesArgument")?.value?.trim() || "",
      estimated_work_days: Number.isFinite(days) ? days : null,
      next_step: document.getElementById("editOfferNextStep")?.value?.trim() || ""
    };
  }
  async function saveReportCommercialOffer() {
    if (!requireWriteAccess("\u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u041A\u041F")) return;
    const currentAuditId2 = getCurrentAuditId5();
    if (!currentAuditId2) return;
    const payload = { commercial_offer: collectOfferPatchPayload() };
    try {
      const updated = await apiRequest(`/api/audits/${currentAuditId2}/report-output`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      const auditData2 = getAuditData4();
      if (auditData2 && updated?.commercial_offer) {
        auditData2.commercial_offer = updated.commercial_offer;
        renderCommercialOffer(
          auditData2.commercial_offer,
          "reportOfferContainer",
          auditData2.data_coverage,
          { hideWhenPendingReview: false }
        );
        renderCommercialOffer(
          auditData2.commercial_offer,
          "offerContainer",
          auditData2.data_coverage,
          { hideWhenPendingReview: true }
        );
      }
      showAlert("\u041A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  function applyAuditSummaryToUi(summary) {
    const auditData2 = getAuditData4();
    if (!auditData2 || !summary) return;
    auditData2.audit_summary = summary;
    if (typeof runtimeBridge.renderAuditSummaryBlock === "function") {
      runtimeBridge.renderAuditSummaryBlock(
        summary,
        auditData2.metrics_summary,
        auditData2.data_coverage
      );
    }
  }
  async function refreshReportCommercialOfferFromAudit() {
    if (!requireWriteAccess("\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F")) return;
    const currentAuditId2 = getCurrentAuditId5();
    if (!currentAuditId2) return;
    const btn = document.querySelector("#reportOfferCard .card-header-actions button");
    if (btn) btn.disabled = true;
    try {
      const updated = await apiRequest(`/api/audits/${currentAuditId2}/report-output/refresh-offer`, {
        method: "POST"
      });
      const auditData2 = getAuditData4();
      if (auditData2 && updated?.commercial_offer) {
        auditData2.commercial_offer = updated.commercial_offer;
        renderCommercialOffer(
          auditData2.commercial_offer,
          "reportOfferContainer",
          auditData2.data_coverage,
          { hideWhenPendingReview: false }
        );
        renderCommercialOffer(
          auditData2.commercial_offer,
          "offerContainer",
          auditData2.data_coverage,
          { hideWhenPendingReview: true }
        );
        const details = document.querySelector("#reportOfferContainer .report-output-edit-details");
        if (details) details.open = true;
        if (updated?.audit_plan) {
          auditData2.audit_plan = updated.audit_plan;
        }
        renderAuditPlanCard(auditData2);
      }
      if (updated?.offer_changed === false) {
        showAlert("\u041A\u041F \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C \u2014 \u0441\u043E\u0432\u043F\u0430\u043B\u043E \u0441 \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u043C.", "warning");
      } else {
        showAlert("\u041A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u0438\u0437 \u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u0443\u0434\u0438\u0442\u0430.", "success");
      }
      if (typeof runtimeBridge.loadAuditDetail === "function") {
        await runtimeBridge.loadAuditDetail();
      }
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  async function refreshReportSummaryFromAudit() {
    if (!requireWriteAccess("\u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u0440\u0430\u0442\u043A\u043E\u0433\u043E \u0432\u044B\u0432\u043E\u0434\u0430")) return;
    const currentAuditId2 = getCurrentAuditId5();
    if (!currentAuditId2) return;
    const btn = document.querySelector("#reportAiSummaryCard .card-header-actions button");
    if (btn) btn.disabled = true;
    try {
      const updated = await apiRequest(`/api/audits/${currentAuditId2}/report-output/refresh-summary`, {
        method: "POST"
      });
      if (updated?.audit_summary) {
        applyAuditSummaryToUi(updated.audit_summary);
        const toggle = document.getElementById("reportSummaryEditDetails");
        if (toggle) toggle.open = true;
      }
      if (updated?.summary_changed === false) {
        showAlert("\u0422\u0435\u043A\u0441\u0442 \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u2014 \u0434\u0430\u043D\u043D\u044B\u0435 \u0441\u043E\u0432\u043F\u0430\u043B\u0438 \u0441 \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u043C.", "warning");
      } else {
        showAlert("\u041A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D \u0438\u0437 \u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u0443\u0434\u0438\u0442\u0430.", "success");
      }
      if (typeof runtimeBridge.loadAuditDetail === "function") {
        await runtimeBridge.loadAuditDetail();
      }
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + (error.message || "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C"), "danger");
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  async function saveReportAuditSummary() {
    if (!requireWriteAccess("\u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043A\u0440\u0430\u0442\u043A\u043E\u0433\u043E \u0432\u044B\u0432\u043E\u0434\u0430")) return;
    const currentAuditId2 = getCurrentAuditId5();
    if (!currentAuditId2) return;
    const payload = {
      audit_summary: {
        client_problem: document.getElementById("editSummaryProblem")?.value?.trim() || "",
        main_risk: document.getElementById("editSummaryRisk")?.value?.trim() || "",
        priority: document.getElementById("editSummaryPriority")?.value || "medium",
        short_conclusion: document.getElementById("editSummaryConclusion")?.value?.trim() || ""
      }
    };
    try {
      const updated = await apiRequest(`/api/audits/${currentAuditId2}/report-output`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      const auditData2 = getAuditData4();
      if (auditData2 && updated?.audit_summary) {
        auditData2.audit_summary = updated.audit_summary;
        await runtimeBridge.loadAuditDetail?.();
      }
      showAlert("\u041A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  function planBaselinePeriod(plan) {
    const p = plan || {};
    return String(
      p.baseline?.reference_period || p.baseline?.metrics?.period || p.forecast?.reference_period || ""
    ).trim();
  }
  function planForecastStartPeriod(plan) {
    const p = plan || {};
    return String(p.forecast?.forecast_start_period || "").trim();
  }
  function renderForecastScenariosHtml(auditPlan, offer) {
    const plan = auditPlan || {};
    const forecast = plan.forecast || {};
    const fromOffer = offer?.forecast_scenarios || {};
    const horizon = forecast.horizon_months || fromOffer.horizon_months || 3;
    const baselinePeriod = planBaselinePeriod(plan);
    const forecastStart = planForecastStartPeriod(plan);
    const refLabel = forecastStart ? ` \u0441 ${escapeHtml(periodLabelPrepositionS(forecastStart))}` : "";
    const baselineHint = baselinePeriod && forecastStart ? `<span class="muted"> (\u0431\u0430\u0437\u0430: ${escapeHtml(baselinePeriod)})</span>` : "";
    const disclaimer = (forecast.analytics_disclaimer || fromOffer.analytics_disclaimer || "").trim();
    const blocks = [];
    for (const [title, key] of [
      ["\u041A\u043E\u043D\u0441\u0435\u0440\u0432\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439", "conservative"],
      ["\u0426\u0435\u043B\u0435\u0432\u043E\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439", "target"]
    ]) {
      const block = { ...fromOffer[key] || {}, ...forecast[key] || {} };
      const headline = (block.headline || "").trim();
      const assumption = (block.assumption || "").trim();
      if (headline || assumption) {
        blocks.push(
          `<div class="offer-forecast-scenario"><h4>${escapeHtml(title)}</h4><p><strong>${escapeHtml(headline)}</strong></p><p class="muted">${escapeHtml(assumption)}</p></div>`
        );
      }
    }
    if (!blocks.length) return "";
    const disc = disclaimer ? `<p class="muted offer-forecast-disclaimer">${escapeHtml(disclaimer)}</p>` : "";
    return `<div class="offer-forecast-block"><p class="offer-services-label"><strong>\u041F\u0440\u043E\u0433\u043D\u043E\u0437${escapeHtml(refLabel)} (${horizon} \u043C\u0435\u0441.)</strong>${baselineHint}</p>${disc}${blocks.join("")}</div>`;
  }
  function renderAnalyticsReadiness(_coverage) {
    const panel = document.getElementById("analyticsReadinessPanel");
    if (!panel) return;
    panel.innerHTML = "";
    panel.style.display = "none";
  }
  function planForecastEmpty(forecast, targets) {
    const f = forecast || {};
    const hasScenario = ["conservative", "target"].some((key) => {
      const block = f[key] || {};
      return Boolean((block.headline || "").trim() || (block.assumption || "").trim());
    });
    const tm = targets?.metrics || {};
    return !hasScenario && !tm.revenue && !tm.gross_profit && !tm.drr;
  }
  function offerHasForecastScenarios(offer) {
    const s = offer?.forecast_scenarios;
    if (!s || typeof s !== "object") return false;
    return ["conservative", "target"].some((key) => {
      const block = s[key] || {};
      return Boolean((block.headline || "").trim() || (block.assumption || "").trim());
    });
  }
  function applyForecastFromCommercialOffer() {
    const data = getAuditData4();
    const scenarios = data?.commercial_offer?.forecast_scenarios;
    if (!offerHasForecastScenarios(data?.commercial_offer)) {
      showAlert("\u0412 \u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u043C \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u043D\u0435\u0442 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0435\u0432 \u043F\u0440\u043E\u0433\u043D\u043E\u0437\u0430 \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0438\u043B\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", "warning");
      return;
    }
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v ?? "";
    };
    setVal("planTargetHorizon", scenarios.horizon_months ?? 3);
    setVal("planForecastDisclaimer", scenarios.analytics_disclaimer || "");
    setVal("planForecastConservativeHeadline", scenarios.conservative?.headline || "");
    setVal("planForecastConservativeAssumption", scenarios.conservative?.assumption || "");
    setVal("planForecastTargetHeadline", scenarios.target?.headline || "");
    setVal("planForecastTargetAssumption", scenarios.target?.assumption || "");
    showAlert("\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A AI \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0438 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0433\u043D\u043E\u0437 \u0438 \u0446\u0435\u043B\u0438\xBB.", "success");
  }
  function renderAuditPlanCard(data) {
    const card = document.getElementById("reportAuditPlanCard");
    const container = document.getElementById("reportAuditPlanContainer");
    if (!card || !container) return;
    card.style.display = "block";
    const plan = data?.audit_plan || {};
    const baseline = plan.baseline || {};
    const targets = plan.targets || {};
    const forecast = plan.forecast || {};
    const tm = targets.metrics || {};
    const preliminary = Boolean(data?.data_coverage?.is_preliminary);
    const currentBaseline = planBaselinePeriod(plan);
    const forecastStart = planForecastStartPeriod(plan);
    const snapshotPeriod = String(baseline.reference_period || baseline.metrics?.period || "").trim();
    const baselineLabel = currentBaseline || snapshotPeriod || (baseline.captured_at ? baseline.captured_at : "");
    const baselineStale = snapshotPeriod && currentBaseline && snapshotPeriod.toLowerCase() !== currentBaseline.toLowerCase();
    const baselineLine = baselineLabel ? ` (${escapeHtml(baselineLabel)})` : "";
    const staleNote = baselineStale ? `<p class="muted ui-note-bottom">\u0412 \u0441\u043D\u0438\u043C\u043A\u0435 \xAB${escapeHtml(snapshotPeriod)}\xBB, \u0432 \u043E\u0446\u0435\u043D\u043A\u0435 \xAB${escapeHtml(currentBaseline)}\xBB \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u0443\u0439\u0442\u0435 \u0431\u0430\u0437\u043E\u0432\u0443\u044E \u043B\u0438\u043D\u0438\u044E.</p>` : "";
    const forecastStartLabel = forecastStart ? periodLabelPrepositionS(forecastStart) : "";
    const periodNote = currentBaseline ? `<p class="muted">\u0411\u0430\u0437\u043E\u0432\u0430\u044F \u043B\u0438\u043D\u0438\u044F (\u0444\u0430\u043A\u0442 \u043E\u0446\u0435\u043D\u043A\u0438): <strong>${escapeHtml(currentBaseline)}</strong>${forecastStartLabel ? ` \xB7 \u043F\u0440\u043E\u0433\u043D\u043E\u0437 \u0432\u043F\u0435\u0440\u0451\u0434 \u0441 <strong>${escapeHtml(forecastStartLabel)}</strong>` : ""}</p>` : "";
    const aiDraft = forecast.source === "ai_draft" && !forecast.marketer_saved;
    const aiDraftNote = aiDraft ? '<p class="ui-note-bottom"><span class="badge badge-draft">\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A AI</span> \u0421\u0446\u0435\u043D\u0430\u0440\u0438\u0438 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u044B \u043F\u043E\u0441\u043B\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C\xBB.</p>' : planForecastEmpty(forecast, targets) && offerHasForecastScenarios(data?.commercial_offer) ? '<p class="muted ui-note-bottom">\u041F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u043E\u0434\u0442\u044F\u043D\u0443\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A AI\xBB \u0438\u043B\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.</p>' : "";
    const pullForecastBtn = offerHasForecastScenarios(data?.commercial_offer) ? `<button type="button" class="btn btn-outline btn-sm report-offer-actions" onclick="applyForecastFromCommercialOffer()">${planForecastEmpty(forecast, targets) ? "\u041F\u043E\u0434\u0442\u044F\u043D\u0443\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A AI" : "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0438\u0437 AI"}</button>` : "";
    container.innerHTML = `
        <p class="muted">\u0411\u0430\u0437\u043E\u0432\u0430\u044F \u043B\u0438\u043D\u0438\u044F \u2014 \u043C\u0435\u0441\u044F\u0446 \u043E\u0446\u0435\u043D\u043A\u0438 (\u0432 PDF). \u041F\u0440\u043E\u0433\u043D\u043E\u0437 \u2014 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u043C\u0435\u0441\u044F\u0446\u044B \u0432\u043F\u0435\u0440\u0451\u0434; AI \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u0442 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A, \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433 \u043F\u0440\u0430\u0432\u0438\u0442 \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442.</p>
        ${periodNote}
        ${aiDraftNote}
        ${staleNote}
        <p><strong>\u0411\u0430\u0437\u043E\u0432\u0430\u044F \u043B\u0438\u043D\u0438\u044F${baselineLine}:</strong> ${baseline.metrics && Object.keys(baseline.metrics).length ? "\u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u0430" : "\u043D\u0435 \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u0430"}</p>
        <button type="button" class="btn btn-outline btn-sm report-offer-actions" onclick="captureAuditBaseline()">\u0417\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u0437 \u0442\u0435\u043A\u0443\u0449\u0438\u0445 \u043C\u0435\u0442\u0440\u0438\u043A</button>
        ${pullForecastBtn}
        <div class="form-row form-row--spaced">
            <div class="form-group">
                <label>\u0426\u0435\u043B\u044C: \u0432\u044B\u0440\u0443\u0447\u043A\u0430 (\u20BD)</label>
                <input type="number" id="planTargetRevenue" class="form-control" value="${tm.revenue ?? ""}" min="0" step="0.01">
            </div>
            <div class="form-group">
                <label>\u0426\u0435\u043B\u044C: \u0432\u0430\u043B\u043E\u0432\u0430\u044F \u043F\u0440\u0438\u0431\u044B\u043B\u044C (\u20BD)</label>
                <input type="number" id="planTargetGrossProfit" class="form-control" value="${tm.gross_profit ?? ""}" min="0" step="0.01">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>\u0426\u0435\u043B\u044C: \u0414\u0420\u0420 (%)</label>
                <input type="number" id="planTargetDrr" class="form-control" value="${tm.drr ?? ""}" min="0" step="0.1">
            </div>
            <div class="form-group">
                <label>\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442 (\u043C\u0435\u0441.)</label>
                <input type="number" id="planTargetHorizon" class="form-control" value="${targets.horizon_months ?? 3}" min="1" max="24" step="1">
            </div>
        </div>
        <div class="form-group">
            <label>\u041A\u043E\u043D\u0441\u0435\u0440\u0432\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u2014 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A</label>
            <input type="text" id="planForecastConservativeHeadline" class="form-control" value="${escapeHtml(forecast.conservative?.headline || "")}">
        </div>
        <div class="form-group">
            <label>\u041A\u043E\u043D\u0441\u0435\u0440\u0432\u0430\u0442\u0438\u0432\u043D\u044B\u0439 \u2014 \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u0435</label>
            <textarea id="planForecastConservativeAssumption" class="form-control" rows="2">${escapeHtml(forecast.conservative?.assumption || "")}</textarea>
        </div>
        <div class="form-group">
            <label>\u0426\u0435\u043B\u0435\u0432\u043E\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439 \u2014 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A</label>
            <input type="text" id="planForecastTargetHeadline" class="form-control" value="${escapeHtml(forecast.target?.headline || "")}">
        </div>
        <div class="form-group">
            <label>\u0426\u0435\u043B\u0435\u0432\u043E\u0439 \u2014 \u0434\u043E\u043F\u0443\u0449\u0435\u043D\u0438\u0435</label>
            <textarea id="planForecastTargetAssumption" class="form-control" rows="2">${escapeHtml(forecast.target?.assumption || "")}</textarea>
        </div>
        <div class="form-group">
            <label>\u041E\u0433\u043E\u0432\u043E\u0440\u043A\u0430 \u043F\u0440\u043E \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0443 (\u0432 PDF)</label>
            <textarea id="planForecastDisclaimer" class="form-control" rows="2">${escapeHtml(forecast.analytics_disclaimer || "")}</textarea>
        </div>
        <button type="button" class="btn btn-primary btn-sm" onclick="saveAuditPlan()">\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u0440\u043E\u0433\u043D\u043E\u0437 \u0438 \u0446\u0435\u043B\u0438</button>
    `;
    if (preliminary) {
      container.insertAdjacentHTML(
        "afterbegin",
        '<p class="muted ui-note-bottom">\u0421\u0435\u0439\u0447\u0430\u0441 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0444\u0438\u043A\u0441\u0430\u0446\u0438\u044F \u0431\u0430\u0437\u043E\u0432\u043E\u0439 \u043B\u0438\u043D\u0438\u0438. \u0426\u0435\u043B\u0438 \u0438 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0438 \u043C\u043E\u0436\u043D\u043E \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043F\u043E\u0437\u0436\u0435, \u043F\u043E\u0441\u043B\u0435 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u0438\u044F \u0441 \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u043C.</p>'
      );
    }
  }
  async function captureAuditBaseline() {
    const currentAuditId2 = getCurrentAuditId5();
    if (!currentAuditId2) return;
    try {
      const updated = await apiRequest(`/api/audits/${currentAuditId2}/audit-plan`, {
        method: "PATCH",
        body: JSON.stringify({ capture_baseline: true })
      });
      const auditData2 = getAuditData4();
      if (auditData2) auditData2.audit_plan = updated;
      renderAuditPlanCard(auditData2);
      showAlert("\u0411\u0430\u0437\u043E\u0432\u0430\u044F \u043B\u0438\u043D\u0438\u044F \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u0430", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  async function saveAuditPlan() {
    const currentAuditId2 = getCurrentAuditId5();
    if (!currentAuditId2) return;
    const numOrNull = (id) => {
      const raw = document.getElementById(id)?.value;
      if (raw === "" || raw == null) return null;
      return Number(raw);
    };
    const payload = {
      targets: {
        horizon_months: parseInt(document.getElementById("planTargetHorizon")?.value || "3", 10) || 3,
        metrics: {
          revenue: numOrNull("planTargetRevenue"),
          gross_profit: numOrNull("planTargetGrossProfit"),
          drr: numOrNull("planTargetDrr")
        }
      },
      forecast: {
        horizon_months: parseInt(document.getElementById("planTargetHorizon")?.value || "3", 10) || 3,
        reference_period: planBaselinePeriod(getAuditData4()?.audit_plan) || null,
        forecast_start_period: planForecastStartPeriod(getAuditData4()?.audit_plan) || null,
        analytics_disclaimer: document.getElementById("planForecastDisclaimer")?.value?.trim() || "",
        conservative: {
          headline: document.getElementById("planForecastConservativeHeadline")?.value?.trim() || "",
          assumption: document.getElementById("planForecastConservativeAssumption")?.value?.trim() || ""
        },
        target: {
          headline: document.getElementById("planForecastTargetHeadline")?.value?.trim() || "",
          assumption: document.getElementById("planForecastTargetAssumption")?.value?.trim() || ""
        }
      }
    };
    try {
      const updated = await apiRequest(`/api/audits/${currentAuditId2}/audit-plan`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      const auditData2 = getAuditData4();
      if (auditData2) {
        auditData2.audit_plan = updated;
        renderAuditPlanCard(auditData2);
        renderCommercialOffer(
          auditData2.commercial_offer,
          "reportOfferContainer",
          auditData2.data_coverage,
          { hideWhenPendingReview: false }
        );
      }
      showAlert("\u041F\u0440\u043E\u0433\u043D\u043E\u0437 \u0438 \u0446\u0435\u043B\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }

  // src/audit-detail/client-snapshot-draft.js
  function getCurrentAuditId6() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
  }
  function formatDraftPreview(preview) {
    const lines = (preview?.preview_lines || []).map((line) => escapeHtml(line));
    const notes = (preview?.review_notes || []).map((n) => escapeHtml(n));
    const cost = preview?.cost_rub != null ? `<p class="muted">\u041E\u0446\u0435\u043D\u043A\u0430: ~${escapeHtml(String(preview.cost_rub))} \u20BD</p>` : "";
    const meta = preview?.model_label ? `<p class="muted">\u041C\u043E\u0434\u0435\u043B\u044C: ${escapeHtml(preview.model_label)} \xB7 ${escapeHtml(preview.method || "")}</p>` : "";
    return `${meta}${cost}<ul class="snapshot-draft-preview">${lines.map((l) => `<li>${l}</li>`).join("")}</ul>${notes.length ? `<p class="muted">${notes.join(" ")}</p>` : ""}`;
  }
  async function generateClientSnapshotDraft() {
    if (!requireWriteAccess("AI-\u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A client snapshot")) return;
    const auditId = getCurrentAuditId6();
    if (!auditId) return;
    if (!runtimeBridge.getPrivacySettings?.()) await runtimeBridge.loadPrivacySettings?.();
    try {
      const preview = await apiRequest(`/api/audits/${auditId}/client-snapshot/ai/preview`);
      if (!preview?.can_generate) {
        showAlert(preview?.apply_blocked_reason || "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 client snapshot.", "warning");
        return;
      }
      if (!preview.can_apply) {
        showAlert(
          (preview.apply_blocked_reason || "\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A.") + "\n\n" + (preview.preview_lines || []).join("\n"),
          "warning"
        );
        return;
      }
      const summary = preview.draft?.audit_summary || {};
      const priority = reportPriorityLabel(summary.priority);
      const ok = await showConfirmDialog({
        title: "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C AI-\u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0432 \u043E\u0442\u0447\u0451\u0442?",
        message: `\u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 \xAB\u041A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434\xBB \u0438 PDF (\u043F\u043E\u0441\u043B\u0435 \u0432\u0430\u0448\u0435\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438):

\u0421\u0443\u0442\u044C: ${summary.client_problem || "\u2014"}
\u0420\u0438\u0441\u043A: ${summary.main_risk || "\u2014"}
\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442: ${priority}
\u0428\u0430\u0433: ${summary.short_conclusion || "\u2014"}
` + (preview.draft?.zone_priority_phrase ? `
\u0417\u043E\u043D\u044B: ${preview.draft.zone_priority_phrase}
` : "") + (preview.draft?.limitations_text ? `
\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F (\u0434\u043B\u044F \u0441\u043F\u0440\u0430\u0432\u043A\u0438, \u0432 PDF \u0438\u0437 \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u044F \u0434\u0430\u043D\u043D\u044B\u0445): ${preview.draft.limitations_text}
` : "") + `
${formatDraftPreview(preview)}`,
        confirmText: "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C \u0432 \u043E\u0442\u0447\u0451\u0442",
        confirmType: "primary"
      });
      if (!ok) return;
      await apiRequest(`/api/audits/${auditId}/client-snapshot/ai/apply`, {
        method: "POST",
        body: JSON.stringify({ draft: preview.draft })
      });
      showAlert("\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A client snapshot \u043F\u0440\u0438\u043C\u0435\u043D\u0451\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0443 \xAB\u041E\u0442\u0447\u0451\u0442\xBB \u0438 \u043F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 PDF.", "success");
      await runtimeBridge.loadAuditDetail?.();
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A: " + (error.message || "\u041E\u0448\u0438\u0431\u043A\u0430"), "warning");
    }
  }

  // src/media/audio.js
  var mediaRecorder = null;
  var audioChunks = [];
  var recordingTimer = null;
  var recordingSeconds = 0;
  var recordingStream = null;
  var MAX_RECORDING_SECONDS = 15 * 60;
  async function startRecording() {
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(recordingStream, { mimeType: "audio/webm" });
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        if (!audioChunks.length) return;
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById("audioFileInput").files = dt.files;
        const preview = document.getElementById("audioPreview");
        preview.innerHTML = `<audio controls src="${url}"></audio>`;
        preview.style.display = "block";
        if (recordingStream) recordingStream.getTracks().forEach((track) => track.stop());
        recordingStream = null;
      };
      mediaRecorder.start();
      document.getElementById("btnStartRecord").disabled = true;
      document.getElementById("btnStopSaveRecord").disabled = false;
      document.getElementById("btnCancelRecord").disabled = false;
      document.getElementById("recordingIndicator").style.display = "flex";
      recordingSeconds = 0;
      updateRecordingTime();
      recordingTimer = setInterval(() => {
        recordingSeconds++;
        updateRecordingTime();
        if (recordingSeconds >= MAX_RECORDING_SECONDS) {
          showAlert("\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0437\u0430\u043F\u0438\u0441\u0438 15 \u043C\u0438\u043D\u0443\u0442. \u0417\u0430\u043F\u0438\u0441\u044C \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430.", "warning");
          stopRecording(true);
        }
      }, 1e3);
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0443: " + error.message, "danger");
    }
  }
  function stopRecording(save = true) {
    if (save && mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    } else if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      audioChunks = [];
    }
    resetRecordingUi();
  }
  function cancelRecording() {
    audioChunks = [];
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.onstop = () => {
        if (recordingStream) recordingStream.getTracks().forEach((track) => track.stop());
        recordingStream = null;
      };
      mediaRecorder.stop();
    }
    document.getElementById("audioFileInput").value = "";
    const preview = document.getElementById("audioPreview");
    if (preview) {
      preview.innerHTML = "";
      preview.style.display = "none";
    }
    resetRecordingUi();
  }
  function resetRecordingUi() {
    document.getElementById("btnStartRecord").disabled = false;
    document.getElementById("btnStopSaveRecord").disabled = true;
    document.getElementById("btnCancelRecord").disabled = true;
    document.getElementById("recordingIndicator").style.display = "none";
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
  }
  function updateRecordingTime() {
    const mins = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    document.getElementById("recordingTime").textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  function getMediaRecorder() {
    return mediaRecorder;
  }

  // src/audit-detail/materials.js
  var METRIC_FIELD_LABELS = {
    period: "\u041F\u0435\u0440\u0438\u043E\u0434",
    budget: "\u0411\u044E\u0434\u0436\u0435\u0442 (\u20BD)",
    clicks: "\u041A\u043B\u0438\u043A\u0438",
    leads: "\u041B\u0438\u0434\u044B (\u0432\u0441\u0435\u0433\u043E)",
    leads_forms: "\u0417\u0430\u044F\u0432\u043A\u0438 (\u0444\u043E\u0440\u043C\u0430)",
    leads_messenger: "\u041C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u044B",
    sales: "\u041F\u0440\u043E\u0434\u0430\u0436\u0438",
    revenue: "\u0412\u044B\u0440\u0443\u0447\u043A\u0430 (\u20BD)"
  };
  var editingMaterialId = null;
  var documentIssueContext = null;
  function getCurrentAuditId7() {
    return runtimeBridge.getCurrentAuditId?.() || runtimeBridge.getAuditIdFromUrl?.() || null;
  }
  function getAuditData5() {
    return runtimeBridge.getAuditData?.() || null;
  }
  function setDocumentUploadStatus(text) {
    const el = document.getElementById("documentUploadStatus");
    if (!el) return;
    if (!text) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = text;
  }
  function titleFromUploadFileName(file) {
    if (!file?.name) return "";
    const raw = String(file.name).replace(/\\/g, "/").split("/").pop() || "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }
  function autofillMaterialTitleFromFile(fileInput, titleInput) {
    if (!fileInput || !titleInput || editingMaterialId) return;
    const file = fileInput.files?.[0];
    const name = titleFromUploadFileName(file);
    if (name) titleInput.value = name;
  }
  function initMaterialFileTitleAutofill() {
    if (window._materialFileTitleAutofillBound) return;
    window._materialFileTitleAutofillBound = true;
    const docFile = document.getElementById("documentFileInput");
    const docTitle = document.getElementById("documentTitle");
    docFile?.addEventListener("change", () => autofillMaterialTitleFromFile(docFile, docTitle));
    const shotFile = document.getElementById("screenshotFileInput");
    const shotTitle = document.getElementById("screenshotTitle");
    shotFile?.addEventListener("change", () => autofillMaterialTitleFromFile(shotFile, shotTitle));
  }
  function openNewMaterial(modalId) {
    editingMaterialId = null;
    if (modalId !== "documentModal") {
      documentIssueContext = null;
    }
    resetMaterialForm(modalId);
    openModal(modalId);
  }
  function applyDocumentModalGuidance(itemId) {
    const hintEl = document.getElementById("documentModalHint");
    const titleEl = document.getElementById("documentTitle");
    if (!hintEl || !titleEl) return;
    const guidance = {
      search_queries: {
        hint: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0443 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0445 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u0438\u0437 \u0440\u0435\u043A\u043B\u0430\u043C\u043D\u043E\u0433\u043E \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 (xlsx/csv/pdf).",
        title: "\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u044B"
      },
      metrika: {
        hint: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E \u0446\u0435\u043B\u044F\u043C \u041C\u0435\u0442\u0440\u0438\u043A\u0438: \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438, \u0446\u0435\u043B\u0438, UTM-\u043E\u0442\u0447\u0451\u0442\u044B \u0438\u043B\u0438 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u043E\u0442\u0447\u0451\u0442\u0430.",
        title: "\u0426\u0435\u043B\u0438 \u041C\u0435\u0442\u0440\u0438\u043A\u0438"
      },
      crm: {
        hint: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 CRM-\u043E\u0442\u0447\u0451\u0442 \u043F\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u043C \u043B\u0438\u0434\u043E\u0432/\u0441\u0434\u0435\u043B\u043E\u043A \u0438\u043B\u0438 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0443 \u0432\u043E\u0440\u043E\u043D\u043A\u0438.",
        title: "CRM-\u0441\u0442\u0430\u0442\u0443\u0441\u044B \u043B\u0438\u0434\u043E\u0432"
      },
      metrika_crm: {
        hint: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043F\u043E \u041C\u0435\u0442\u0440\u0438\u043A\u0435 \u0438 CRM: \u0446\u0435\u043B\u0438, UTM \u0438 \u0441\u0442\u0430\u0442\u0443\u0441\u044B \u043B\u0438\u0434\u043E\u0432.",
        title: "\u041C\u0435\u0442\u0440\u0438\u043A\u0430 \u0438 CRM"
      },
      landing: {
        hint: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0438/\u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B/\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u044B\u0445 \u0441\u0442\u0440\u0430\u043D\u0438\u0446, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0432\u0435\u0434\u0443\u0442 \u0438\u0437 \u0440\u0435\u043A\u043B\u0430\u043C\u044B.",
        title: "\u041F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u044B\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B"
      },
      lead_quality: {
        hint: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0438 \u043F\u043E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0443 \u043B\u0438\u0434\u043E\u0432: \u0446\u0435\u043B\u0435\u0432\u044B\u0435/\u043D\u0435\u0446\u0435\u043B\u0435\u0432\u044B\u0435, \u043F\u0440\u0438\u0447\u0438\u043D\u044B \u0431\u0440\u0430\u043A\u0430, \u043F\u0440\u0438\u043C\u0435\u0440\u044B.",
        title: "\u041A\u0430\u0447\u0435\u0441\u0442\u0432\u043E \u043B\u0438\u0434\u043E\u0432"
      }
    };
    const selected = guidance[itemId] || {
      hint: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0438\u043B\u0438 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0443, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u0437\u0430\u043A\u0440\u043E\u0435\u0442 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0443\u043D\u043A\u0442 \u0447\u0435\u043A\u043B\u0438\u0441\u0442\u0430.",
      title: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442"
    };
    hintEl.textContent = selected.hint;
    if (!titleEl.value || titleEl.value === "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442") {
      titleEl.value = selected.title;
    }
  }
  function setModalSubmitLabel(modalId, isEdit) {
    const map = {
      textNoteModal: "textNoteSubmitBtn",
      audioModal: "audioSubmitBtn",
      screenshotModal: "screenshotSubmitBtn",
      metricsModal: "metricsSubmitBtn"
    };
    const btn = document.getElementById(map[modalId]);
    if (btn) btn.textContent = isEdit ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" : "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C";
    const titleMap = {
      audioModal: "audioModalTitle",
      metricsModal: null
    };
    const titleEl = titleMap[modalId] ? document.getElementById(titleMap[modalId]) : null;
    if (titleEl) titleEl.textContent = isEdit ? "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u0443\u0434\u0438\u043E" : "\u0410\u0443\u0434\u0438\u043E\u0437\u0430\u043C\u0435\u0442\u043A\u0430";
  }
  function resetMaterialForm(modalId) {
    setModalSubmitLabel(modalId, false);
    if (modalId === "textNoteModal") {
      document.getElementById("textNoteTitle").value = "";
      document.getElementById("textNoteContent").value = "";
    } else if (modalId === "metricsModal") {
      clearMetricPeriodPickers2();
      ["metricBudgetInput", "metricClicksInput", "metricLeadsInput", "metricLeadsFormsInput", "metricLeadsMessengerInput", "metricSalesInput", "metricRevenueInput", "metricGrossProfitInput", "metricMarginInput"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      const err = document.getElementById("metricsFormError");
      if (err) {
        err.style.display = "none";
        err.textContent = "";
      }
    } else if (modalId === "audioModal") {
      document.getElementById("audioTitle").value = "";
      document.getElementById("audioTranscript").value = "";
      document.getElementById("audioFileInput").value = "";
      const confirmed = document.getElementById("audioTranscriptConfirmed");
      if (confirmed) confirmed.checked = false;
      const src = document.getElementById("audioTranscriptSource");
      if (src) src.value = "manual";
      const preview = document.getElementById("audioPreview");
      if (preview) {
        preview.innerHTML = "";
        preview.style.display = "none";
      }
      const existing = document.getElementById("audioExistingBlock");
      if (existing) existing.style.display = "none";
      const capture = document.getElementById("audioCaptureBlock");
      if (capture) capture.style.display = "block";
      cancelRecording();
    } else if (modalId === "screenshotModal") {
      document.getElementById("screenshotTitle").value = "";
      document.getElementById("screenshotOcrText").value = "";
      document.getElementById("screenshotFileInput").value = "";
      const fileGroup = document.getElementById("screenshotFileGroup");
      if (fileGroup) fileGroup.style.display = "block";
    }
  }
  function getMaterialById(id) {
    return (getAuditData5()?.materials || []).find((m) => String(m.id) === String(id));
  }
  function findTranscriptMaterial(material) {
    if (material.type === "audio_transcript") return material;
    const title = material.title || "";
    return (getAuditData5()?.materials || []).find(
      (m) => m.type === "audio_transcript" && m.title === `\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430: ${title}`
    );
  }
  function findOcrMaterial2(material) {
    if (material.type === "screenshot_ocr") return material;
    const title = material.title || "";
    return (getAuditData5()?.materials || []).find(
      (m) => m.type === "screenshot_ocr" && m.title === `OCR/\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: ${title}`
    );
  }
  function parseTranscriptMeta(material) {
    let text = material.extracted_text || "";
    let source = "manual";
    let confirmed = false;
    try {
      const raw = JSON.parse(material.raw_content || "{}");
      text = raw.text || text;
      source = raw.source || source;
      confirmed = Boolean(raw.confirmed);
    } catch (e) {
    }
    return { text, source, confirmed };
  }
  function fillMetricsForm(materialOrRaw) {
    let raw = "";
    if (materialOrRaw && typeof materialOrRaw === "object") {
      raw = materialOrRaw.raw_content || materialOrRaw.extracted_text || "";
    } else {
      raw = materialOrRaw || "";
    }
    let data = {};
    try {
      data = JSON.parse(raw || "{}");
    } catch (e) {
      data = {};
    }
    if (!Object.keys(data).length && getAuditData5()?.metrics_summary) {
      runtimeBridge.fillMetricsFromSummary?.(getAuditData5().metrics_summary);
      return;
    }
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value == null ? "" : String(value);
    };
    set("metricBudgetInput", data.budget);
    set("metricClicksInput", data.clicks);
    set("metricLeadsInput", data.leads);
    set("metricLeadsFormsInput", data.leads_forms);
    set("metricLeadsMessengerInput", data.leads_messenger);
    set("metricSalesInput", data.sales);
    set("metricRevenueInput", data.revenue);
    set("metricGrossProfitInput", data.gross_profit);
    set("metricMarginInput", data.margin_percent);
    applyMetricPeriodFromStored(data.period || "");
    const err = document.getElementById("metricsFormError");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
  }
  function openDocumentMaterialById(id) {
    openDocumentMaterial(getMaterialById(id));
  }
  function parseDocumentSlice(material) {
    if (material?.document_slice && typeof material.document_slice === "object") {
      return material.document_slice;
    }
    const raw = material?.raw_content;
    if (!raw) return null;
    try {
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      return data?.document_slice && typeof data.document_slice === "object" ? data.document_slice : null;
    } catch {
      return null;
    }
  }
  var documentPreviewMaterialId = null;
  function renderDocumentSliceSummary(slice, materialId) {
    const el = document.getElementById("documentSliceSummary");
    const importBtn = document.getElementById("documentImportPeriodsBtn");
    documentPreviewMaterialId = materialId || null;
    if (!el) return;
    if (!slice || slice.format !== "yandex_direct_xlsx") {
      el.style.display = "none";
      el.innerHTML = "";
      if (importBtn) importBtn.style.display = "none";
      return;
    }
    const totals = slice.totals || {};
    const monthly = Array.isArray(slice.monthly) ? slice.monthly : [];
    const campaigns = Array.isArray(slice.campaigns) ? slice.campaigns : [];
    const period = slice.period ? `<div><strong>\u041F\u0435\u0440\u0438\u043E\u0434:</strong> ${escapeHtml(slice.period)}</div>` : "";
    const client = slice.client_label ? `<div><strong>\u041A\u043B\u0438\u0435\u043D\u0442:</strong> ${escapeHtml(slice.client_label)}</div>` : "";
    const monthlyRows = monthly.slice(0, 6).map((row) => `<tr><td>${escapeHtml(row.month || "\u2014")}</td><td>${escapeHtml(String(row.leads ?? "\u2014"))}</td><td>${escapeHtml(row.cpl != null ? String(row.cpl) : "\u2014")}</td></tr>`).join("");
    const monthlyTable = monthly.length ? `<table class="table table-compact direct-slice-monthly-table"><thead><tr><th>\u041C\u0435\u0441\u044F\u0446</th><th>\u041B\u0438\u0434\u044B</th><th>CPL</th></tr></thead><tbody>${monthlyRows}</tbody></table>` : "";
    const topCamps = [...campaigns].sort((a, b) => (b.leads || 0) - (a.leads || 0)).slice(0, 5).map((c) => `<li>${escapeHtml((c.campaign_name || "").slice(0, 40))} \u2014 ${escapeHtml(String(c.leads ?? 0))} \u043B\u0438\u0434\u043E\u0432, CPL ${escapeHtml(c.cpl != null ? String(c.cpl) : "\u2014")}</li>`).join("");
    el.innerHTML = `
        <div class="alert alert-info direct-slice-preview">
            <strong>${DIRECT_COPY.sliceTitle}</strong> (${escapeHtml(slice.report_type || "\u043E\u0442\u0447\u0451\u0442")}).
            ${client}${period}
            <div class="direct-slice-preview-totals">
                <strong>\u0418\u0442\u043E\u0433\u043E:</strong> \u0440\u0430\u0441\u0445\u043E\u0434 ${escapeHtml(String(totals.cost ?? "\u2014"))} \u20BD,
                \u043B\u0438\u0434\u044B ${escapeHtml(String(totals.leads ?? totals.conversions ?? "\u2014"))}
                (\u0444\u043E\u0440\u043C\u0430 ${escapeHtml(String(totals.forms ?? "\u2014"))}, \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440 ${escapeHtml(String(totals.messengers ?? "\u2014"))}),
                CPL ${escapeHtml(totals.cpl != null ? String(totals.cpl) : "\u2014")}
            </div>
            ${monthlyTable}
            ${topCamps ? `<ul class="direct-slice-campaign-list">${topCamps}</ul>` : ""}
        </div>`;
    el.style.display = "block";
    if (importBtn) {
      importBtn.style.display = monthly.length >= 1 && materialId ? "inline-block" : "none";
    }
  }
  async function importDirectPeriodsFromPreview() {
    if (!documentPreviewMaterialId || !getCurrentAuditId7()) return;
    if (!requireWriteAccess("\u0418\u043C\u043F\u043E\u0440\u0442 \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u0432 KPI")) return;
    try {
      showLoader();
      const result = await apiRequest(
        `/api/audits/${getCurrentAuditId7()}/materials/${documentPreviewMaterialId}/import-direct-periods`,
        { method: "POST" }
      );
      hideLoader();
      showAlert(
        `\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u043E\u0432 KPI: ${result?.created_count ?? 0}. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0443 \u0432 \u0431\u043B\u043E\u043A\u0435 \xAB${DIRECT_COPY.sliceTitle}\xBB.`,
        "success"
      );
      closeModal("documentPreviewModal");
      await refreshAuditAndAdvanceGuidedFlow(null);
    } catch (error) {
      hideLoader();
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0435\u0440\u0438\u043E\u0434\u044B: " + (error.message || "\u043E\u0448\u0438\u0431\u043A\u0430"), "warning");
    }
  }
  function openDocumentMaterial(m) {
    if (!m) return;
    const preview = (m.extracted_text || "").trim();
    if (m.file_url) {
      const name = m.title || "document";
      openProtectedFileUrl(m.file_url, { downloadName: name });
    }
    if (preview) {
      renderDocumentSliceSummary(parseDocumentSlice(m), m.id);
      const box = document.getElementById("documentPreviewText");
      if (box) {
        box.textContent = preview.length > 12e3 ? `${preview.slice(0, 12e3)}\u2026` : preview;
      }
      openModal("documentPreviewModal");
    } else if (!m.file_url) {
      showAlert("\u0424\u0430\u0439\u043B \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0437\u0430\u043D\u043E\u0432\u043E.", "warning");
    } else if (m.status === "processing_error") {
      showAlert("\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u043D\u0435 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \xAB\u0422\u0435\u043A\u0441\u0442\xBB \u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", "warning");
    }
  }
  async function editDocumentText(materialId) {
    const m = getMaterialById(materialId);
    if (!m) return;
    const content = await showPromptDialog({
      title: "\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430",
      message: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0431\u0443\u0434\u0443\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B \u0432 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0430\u0443\u0434\u0438\u0442\u0430.",
      initialValue: m.extracted_text || "",
      placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442...",
      confirmText: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"
    });
    if (content === false) return;
    try {
      await saveMaterialPatch(m.id, { title: m.title, content });
      await runtimeBridge.loadAuditDetail?.();
      showAlert("\u0422\u0435\u043A\u0441\u0442 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D", "success");
    } catch (err) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + err.message, "danger");
    }
  }
  async function editMaterial(id) {
    const m = getMaterialById(id);
    if (!m) {
      showAlert("\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", "warning");
      return;
    }
    editingMaterialId = m.id;
    if (m.type === "text_note") {
      document.getElementById("textNoteTitle").value = m.title || "";
      document.getElementById("textNoteContent").value = m.extracted_text || m.raw_content || "";
      setModalSubmitLabel("textNoteModal", true);
      openModal("textNoteModal");
      return;
    }
    if (m.type === "manual_metrics") {
      fillMetricsForm(m);
      const setActiveRow = document.getElementById("metricSetActiveRow");
      if (setActiveRow) setActiveRow.style.display = "none";
      setModalSubmitLabel("metricsModal", true);
      openModal("metricsModal");
      runtimeBridge.focusMetricsModalField?.();
      return;
    }
    if (m.type === "audio" || m.type === "audio_transcript") {
      const transcriptMat = m.type === "audio_transcript" ? m : findTranscriptMaterial(m);
      const audioMat = m.type === "audio" ? m : getAuditData5().materials.find((x) => x.type === "audio" && findTranscriptMaterial(x)?.id === m.id) || null;
      editingMaterialId = m.type === "audio_transcript" ? m.id : m.id;
      document.getElementById("audioTitle").value = audioMat ? audioMat.title : (m.title || "").replace(/^Расшифровка:\s*/, "");
      const meta = transcriptMat ? parseTranscriptMeta(transcriptMat) : { text: "", source: "manual", confirmed: false };
      document.getElementById("audioTranscript").value = meta.text;
      document.getElementById("audioTranscriptSource").value = meta.source;
      document.getElementById("audioTranscriptConfirmed").checked = meta.confirmed;
      const capture = document.getElementById("audioCaptureBlock");
      const existing = document.getElementById("audioExistingBlock");
      const player = document.getElementById("audioExistingPlayer");
      if (audioMat && audioMat.file_url) {
        if (capture) capture.style.display = "none";
        if (existing) existing.style.display = "block";
        if (player) player.innerHTML = `<audio class="audio-player-inline" controls src="${audioMat.file_url}"></audio>`;
      } else {
        if (capture) capture.style.display = "block";
        if (existing) existing.style.display = "none";
      }
      setModalSubmitLabel("audioModal", true);
      openModal("audioModal");
      return;
    }
    if (m.type === "screenshot" || m.type === "screenshot_ocr") {
      const shot = m.type === "screenshot" ? m : getAuditData5().materials.find((x) => x.type === "screenshot" && findOcrMaterial2(x)?.id === m.id) || m;
      const ocr = findOcrMaterial2(shot) || (m.type === "screenshot_ocr" ? m : null);
      document.getElementById("screenshotTitle").value = (shot.title || "").replace(/^OCR\/описание:\s*/, "");
      document.getElementById("screenshotOcrText").value = ocr ? ocr.extracted_text || ocr.raw_content || "" : "";
      const kindSel = document.getElementById("screenshotSetupKind");
      if (kindSel) {
        let kind = "other";
        try {
          const meta = JSON.parse(shot.raw_content || "{}");
          if (meta.direct_setup_kind) kind = meta.direct_setup_kind;
        } catch (_e) {
        }
        kindSel.value = kind;
      }
      const fileGroup = document.getElementById("screenshotFileGroup");
      if (fileGroup) fileGroup.style.display = editingMaterialId && shot.file_url ? "none" : "block";
      setModalSubmitLabel("screenshotModal", true);
      openModal("screenshotModal");
      return;
    }
    if (m.type === "document") {
      openDocumentMaterial(m);
      editingMaterialId = null;
      return;
    }
    showAlert("\u042D\u0442\u043E\u0442 \u0442\u0438\u043F \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430 \u043F\u043E\u043A\u0430 \u043D\u0435\u043B\u044C\u0437\u044F \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", "warning");
    editingMaterialId = null;
  }
  async function saveMaterialPatch(materialId, payload) {
    return apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/${materialId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  }
  async function materialReviewAction(materialId, action, options = {}) {
    if (!requireWriteAccess("\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430")) return;
    const { silent = false } = options;
    try {
      if (action === "verify" && !silent) {
        showAlert("AI \u0443\u0447\u0442\u0451\u0442 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C \u043A\u0430\u043A \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0439, \u043D\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442 \u043E\u0442\u043C\u0435\u0442\u043A\u0443 \u043E\u0431 \u0430\u043D\u043E\u043C\u0430\u043B\u0438\u0438, \u0435\u0441\u043B\u0438 \u043E\u043D\u0430 \u0435\u0441\u0442\u044C.", "warning");
      }
      await apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/${materialId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason: action === "exclude_analysis" ? "\u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\u043E\u043C" : "" })
      });
      await runtimeBridge.loadAuditDetail?.();
      if (!silent) showAlert("\u0421\u0442\u0430\u0442\u0443\u0441 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  async function setMaterialAiInclusion(materialId, include) {
    if (!requireWriteAccess("\u0412\u044B\u0431\u043E\u0440 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0434\u043B\u044F AI")) return;
    const materials = runtimeBridge.getAuditData?.()?.materials || [];
    const mat = materials.find((m) => Number(m.id) === Number(materialId));
    const action = include ? "include" : "exclude_analysis";
    await materialReviewAction(materialId, action, { silent: true });
    if (mat?.type === "screenshot") {
      const ocr = findScreenshotOcrSibling(materials, mat);
      if (ocr) await materialReviewAction(ocr.id, action, { silent: true });
    }
    await runtimeBridge.loadAuditDetail?.();
  }
  async function saveMaterialAiHint(materialId, hint) {
    if (!requireWriteAccess("\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0434\u043B\u044F AI")) return;
    try {
      await saveMaterialPatch(materialId, { marketer_ai_hint: (hint || "").trim() });
      await runtimeBridge.loadAuditDetail?.();
      showAlert(DIRECT_COPY.materialAiHintSaved, "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  async function rerunScreenshotOcr(materialId) {
    if (!requireWriteAccess("OCR \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u0430")) return;
    try {
      showLoader();
      await apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/${materialId}/ocr`, { method: "POST" });
      hideLoader();
      await runtimeBridge.loadAuditDetail?.();
      showAlert(DIRECT_COPY.screenshotRerunOcrOk, "success");
      const drawer = document.getElementById("materialDrawer");
      if (drawer?.classList.contains("is-open") && typeof window.openMaterialDrawer === "function") {
        window.openMaterialDrawer(materialId);
      }
    } catch (error) {
      hideLoader();
      showAlert(error.message || DIRECT_COPY.screenshotRerunOcrFail, "danger");
    }
  }
  async function reocrAllScreenshots() {
    if (!requireWriteAccess("OCR \u0432\u0441\u0435\u0445 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432")) return;
    try {
      showLoader();
      const result = await apiRequest(
        `/api/audits/${getCurrentAuditId7()}/materials/reocr-screenshots`,
        { method: "POST" }
      );
      hideLoader();
      await runtimeBridge.loadAuditDetail?.();
      const ok = Number(result?.success || 0);
      const total = Number(result?.processed || 0);
      const failed = Number(result?.failed_count || 0);
      const msg = failed ? DIRECT_COPY.screenshotReocrAllPartial(ok, failed) : DIRECT_COPY.screenshotReocrAllOk(ok, total);
      showAlert(msg, failed ? "warning" : "success");
    } catch (error) {
      hideLoader();
      showAlert(error.message || DIRECT_COPY.screenshotRerunOcrFail, "danger");
    }
  }
  async function submitTextNote() {
    const previousStep = getGuidedStepSnapshot();
    const content = document.getElementById("textNoteContent").value;
    const title = document.getElementById("textNoteTitle").value;
    if (!content.trim()) {
      showAlert("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0437\u0430\u043C\u0435\u0442\u043A\u0438", "warning");
      return;
    }
    try {
      if (editingMaterialId) {
        await saveMaterialPatch(editingMaterialId, { title, content });
        showAlert("\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430", "success");
      } else {
        await apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/text`, {
          method: "POST",
          body: JSON.stringify({ title, content })
        });
        showAlert("\u0417\u0430\u043C\u0435\u0442\u043A\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430", "success");
      }
      closeModal("textNoteModal");
      resetMaterialForm("textNoteModal");
      await refreshAuditAndAdvanceGuidedFlow(previousStep);
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  async function submitAudioMaterial() {
    const previousStep = getGuidedStepSnapshot();
    const fileInput = document.getElementById("audioFileInput");
    const title = document.getElementById("audioTitle").value || "\u0410\u0443\u0434\u0438\u043E\u0437\u0430\u043C\u0435\u0442\u043A\u0430";
    const transcript = document.getElementById("audioTranscript").value.trim();
    const source = document.getElementById("audioTranscriptSource")?.value || "manual";
    const confirmed = document.getElementById("audioTranscriptConfirmed")?.checked || false;
    const file = fileInput.files[0];
    if (editingMaterialId) {
      if (!transcript) {
        showAlert("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u043B\u0438 \u0438\u0441\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0443", "warning");
        return;
      }
      const m = getMaterialById(editingMaterialId);
      const payload = {
        manual_transcript: transcript,
        transcript_source: source,
        transcript_confirmed: confirmed
      };
      if (m && m.type === "audio") payload.title = title;
      try {
        await saveMaterialPatch(editingMaterialId, payload);
        closeModal("audioModal");
        resetMaterialForm("audioModal");
        await refreshAuditAndAdvanceGuidedFlow(previousStep);
        showAlert("\u0410\u0443\u0434\u0438\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E", "success");
      } catch (error) {
        showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
      }
      return;
    }
    if (!file && !transcript) {
      showAlert("\u0417\u0430\u043F\u0438\u0448\u0438\u0442\u0435/\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0430\u0443\u0434\u0438\u043E \u0438\u043B\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0443", "warning");
      return;
    }
    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("title", title);
    formData.append("manual_transcript", transcript);
    formData.append("transcript_source", source);
    formData.append("transcript_confirmed", confirmed ? "true" : "false");
    try {
      showLoader();
      await apiFetch(`/api/audits/${getCurrentAuditId7()}/materials/audio`, { method: "POST", body: formData });
      hideLoader();
      closeModal("audioModal");
      resetMaterialForm("audioModal");
      await refreshAuditAndAdvanceGuidedFlow(previousStep);
      showAlert("\u0410\u0443\u0434\u0438\u043E \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  async function submitScreenshot() {
    const previousStep = getGuidedStepSnapshot();
    const fileInput = document.getElementById("screenshotFileInput");
    const title = document.getElementById("screenshotTitle").value || "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442";
    const ocrText = document.getElementById("screenshotOcrText").value.trim();
    const file = fileInput.files[0];
    if (editingMaterialId) {
      try {
        const setupKind2 = document.getElementById("screenshotSetupKind")?.value || "other";
        await saveMaterialPatch(editingMaterialId, { title, content: ocrText, direct_setup_kind: setupKind2 });
        closeModal("screenshotModal");
        resetMaterialForm("screenshotModal");
        await refreshAuditAndAdvanceGuidedFlow(previousStep);
        showAlert("\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D", "success");
      } catch (error) {
        showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
      }
      return;
    }
    if (!file) {
      showAlert("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u0430", "warning");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("manual_ocr_text", ocrText);
    const setupKind = document.getElementById("screenshotSetupKind")?.value || "other";
    formData.append("direct_setup_kind", setupKind);
    try {
      showLoader();
      await apiFetch(`/api/audits/${getCurrentAuditId7()}/materials/screenshot`, { method: "POST", body: formData });
      hideLoader();
      closeModal("screenshotModal");
      resetMaterialForm("screenshotModal");
      await refreshAuditAndAdvanceGuidedFlow(previousStep);
      showAlert("\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  var METRIC_MONTH_PREFIXES = [
    ["\u044F\u043D\u0432\u0430\u0440", 1],
    ["\u0444\u0435\u0432\u0440\u0430\u043B", 2],
    ["\u043C\u0430\u0440\u0442", 3],
    ["\u0430\u043F\u0440\u0435\u043B", 4],
    ["\u043C\u0430\u0439", 5],
    ["\u043C\u0430\u044F", 5],
    ["\u0438\u044E\u043D", 6],
    ["\u0438\u044E\u043B", 7],
    ["\u0430\u0432\u0433\u0443\u0441\u0442", 8],
    ["\u0441\u0435\u043D\u0442\u044F\u0431\u0440", 9],
    ["\u043E\u043A\u0442\u044F\u0431\u0440", 10],
    ["\u043D\u043E\u044F\u0431\u0440", 11],
    ["\u0434\u0435\u043A\u0430\u0431\u0440", 12]
  ];
  function parseMetricIsoDate(value) {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    return `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
  }
  function metricMonthBounds(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start: metricToIsoDate(start), end: metricToIsoDate(end) };
  }
  function metricToIsoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function metricIsoToDisplay(iso) {
    const [y, m, d] = String(iso || "").split("-");
    if (!y || !m || !d) return "";
    return `${d}.${m}.${y}`;
  }
  function formatMetricPeriodCanonical(startIso, endIso) {
    if (!startIso || !endIso) return "";
    return `${metricIsoToDisplay(startIso)} \u2014 ${metricIsoToDisplay(endIso)}`;
  }
  function parseStoredPeriodToRange(raw) {
    const text = String(raw || "").trim();
    if (!text) return null;
    const rangeMatch = text.match(
      /^(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})\s*[-–—]\s*(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})$/
    );
    if (rangeMatch) {
      const start = parseMetricIsoDate(rangeMatch[1]);
      const end = parseMetricIsoDate(rangeMatch[2]);
      if (start && end) return { start, end };
    }
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(text) || /^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const day = parseMetricIsoDate(text);
      if (day) return { start: day, end: day };
    }
    const numericMonth = text.match(/^(\d{1,2})[./](\d{4})$/);
    if (numericMonth) {
      const month = Number(numericMonth[1]);
      const year = Number(numericMonth[2]);
      if (month >= 1 && month <= 12) return metricMonthBounds(year, month);
    }
    const isoMonth = text.match(/^(\d{4})-(\d{2})$/);
    if (isoMonth) {
      const year = Number(isoMonth[1]);
      const month = Number(isoMonth[2]);
      if (month >= 1 && month <= 12) return metricMonthBounds(year, month);
    }
    const lowered = text.toLowerCase().replace(/ё/g, "\u0435");
    for (const [prefix, month] of METRIC_MONTH_PREFIXES) {
      if (!lowered.startsWith(prefix)) continue;
      let rest = lowered.slice(prefix.length).replace(/^[ья]\.?\s*/, "").trim();
      const yearMatch = rest.match(/^(\d{4})$/);
      if (yearMatch) return metricMonthBounds(Number(yearMatch[1]), month);
    }
    return null;
  }
  var metricPeriodLastChanged = null;
  function getMetricPeriodRangeState(startIso, endIso, lastChanged = metricPeriodLastChanged) {
    if (!startIso || !endIso || endIso >= startIso) {
      return {
        valid: true,
        startIso,
        endIso,
        message: null,
        level: null,
        corrected: false
      };
    }
    if (lastChanged === "end") {
      return {
        valid: false,
        startIso,
        endIso,
        message: "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0440\u0430\u043D\u044C\u0448\u0435 \u0434\u0430\u0442\u044B \u043D\u0430\u0447\u0430\u043B\u0430",
        level: "error",
        corrected: false
      };
    }
    const correctedEnd = startIso;
    return {
      valid: true,
      startIso,
      endIso: correctedEnd,
      message: `\u0414\u0430\u0442\u0430 \xAB\u041F\u043E\xBB \u0441\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0430: ${metricIsoToDisplay(correctedEnd)}`,
      level: "warning",
      corrected: true
    };
  }
  function setMetricPeriodPreviewMessage(text, level = null) {
    const preview = document.getElementById("metricPeriodPreview");
    if (!preview) return;
    preview.textContent = text || "";
    preview.classList.remove("is-error", "is-warning");
    if (level === "error") preview.classList.add("is-error");
    if (level === "warning") preview.classList.add("is-warning");
  }
  function setMetricPeriodDateInputs(startIso, endIso) {
    const pairs = [
      ["metricPeriodStartInput", "metricPeriodStartDisplay", startIso],
      ["metricPeriodEndInput", "metricPeriodEndDisplay", endIso]
    ];
    pairs.forEach(([nativeId, displayId, iso]) => {
      const native = document.getElementById(nativeId);
      const display = document.getElementById(displayId);
      const value = iso || "";
      if (native) native.value = value;
      if (display) display.value = value ? metricIsoToDisplay(value) : "";
    });
  }
  function getMetricPeriodIsoValues() {
    return {
      start: document.getElementById("metricPeriodStartInput")?.value || "",
      end: document.getElementById("metricPeriodEndInput")?.value || ""
    };
  }
  function highlightMetricPeriodPreset(preset) {
    document.querySelectorAll(".metric-period-preset-btn[data-preset]").forEach((btn) => {
      btn.classList.toggle("active", preset && btn.dataset.preset === preset);
    });
  }
  function detectMetricPeriodPreset(startIso, endIso) {
    if (!startIso || !endIso) return null;
    const now = /* @__PURE__ */ new Date();
    for (const preset of ["current_month", "prev_month"]) {
      let year = now.getFullYear();
      let month = now.getMonth() + 1;
      if (preset === "prev_month") {
        if (month === 1) {
          month = 12;
          year -= 1;
        } else {
          month -= 1;
        }
      }
      const bounds = metricMonthBounds(year, month);
      if (bounds.start === startIso && bounds.end === endIso) return preset;
    }
    return null;
  }
  function clearMetricPeriodPickers2() {
    setMetricPeriodDateInputs("", "");
    metricPeriodLastChanged = null;
    highlightMetricPeriodPreset(null);
    const hidden = document.getElementById("metricPeriodInput");
    setMetricPeriodPreviewMessage("");
    if (hidden) hidden.value = "";
  }
  function syncMetricPeriodFromPickers() {
    const hidden = document.getElementById("metricPeriodInput");
    const { start, end } = getMetricPeriodIsoValues();
    let startIso = start;
    let endIso = end;
    if (startIso) {
      const displayStart = document.getElementById("metricPeriodStartDisplay");
      if (displayStart) displayStart.value = metricIsoToDisplay(startIso);
    }
    if (endIso) {
      const displayEnd = document.getElementById("metricPeriodEndDisplay");
      if (displayEnd) displayEnd.value = metricIsoToDisplay(endIso);
    }
    const state = getMetricPeriodRangeState(startIso, endIso);
    if (state.corrected) {
      endIso = state.endIso;
      const endNative = document.getElementById("metricPeriodEndInput");
      const endDisplay = document.getElementById("metricPeriodEndDisplay");
      if (endNative) endNative.value = endIso;
      if (endDisplay) endDisplay.value = metricIsoToDisplay(endIso);
    }
    if (!state.valid) {
      if (hidden) hidden.value = "";
      setMetricPeriodPreviewMessage(state.message, "error");
      highlightMetricPeriodPreset(null);
      return "";
    }
    if (startIso && endIso) {
      const canonical = formatMetricPeriodCanonical(startIso, endIso);
      if (hidden) hidden.value = canonical;
      if (state.message) {
        setMetricPeriodPreviewMessage(state.message, state.level);
      } else {
        setMetricPeriodPreviewMessage(`\u0411\u0443\u0434\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: ${canonical}`, null);
      }
      highlightMetricPeriodPreset(detectMetricPeriodPreset(startIso, endIso));
      return canonical;
    }
    if (hidden) hidden.value = "";
    setMetricPeriodPreviewMessage(
      startIso || endIso ? "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u0435 \u0434\u0430\u0442\u044B \u043F\u0435\u0440\u0438\u043E\u0434\u0430 \u0432 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435" : "",
      startIso || endIso ? "error" : null
    );
    highlightMetricPeriodPreset(null);
    return "";
  }
  function applyMetricPeriodFromStored(periodStr) {
    if (!periodStr) {
      clearMetricPeriodPickers2();
      return;
    }
    const range = parseStoredPeriodToRange(periodStr);
    if (range) {
      setMetricPeriodDateInputs(range.start, range.end);
    } else {
      clearMetricPeriodPickers2();
    }
    syncMetricPeriodFromPickers();
  }
  function setMetricPeriodPreset(preset) {
    const now = /* @__PURE__ */ new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if (preset === "prev_month") {
      if (month === 1) {
        month = 12;
        year -= 1;
      } else {
        month -= 1;
      }
    }
    const bounds = metricMonthBounds(year, month);
    metricPeriodLastChanged = null;
    setMetricPeriodDateInputs(bounds.start, bounds.end);
    highlightMetricPeriodPreset(preset);
    syncMetricPeriodFromPickers();
  }
  function openMetricPeriodPicker(inputEl) {
    if (!inputEl) return;
    if (typeof inputEl.showPicker === "function") {
      try {
        inputEl.showPicker();
      } catch (_) {
      }
    }
  }
  function initMetricPeriodPickers() {
    const pairs = [
      ["metricPeriodStartInput", "metricPeriodStartDisplay"],
      ["metricPeriodEndInput", "metricPeriodEndDisplay"]
    ];
    pairs.forEach(([nativeId, displayId]) => {
      const native = document.getElementById(nativeId);
      const display = document.getElementById(displayId);
      if (!native || !display) return;
      const field = nativeId === "metricPeriodStartInput" ? "start" : "end";
      const blockTyping = (event) => {
        if (event.key === "Tab") return;
        event.preventDefault();
      };
      const openPicker = () => openMetricPeriodPicker(native);
      const onDateChanged = () => {
        metricPeriodLastChanged = field;
        syncMetricPeriodFromPickers();
      };
      native.addEventListener("keydown", blockTyping);
      native.addEventListener("paste", (event) => event.preventDefault());
      native.addEventListener("change", onDateChanged);
      native.addEventListener("click", openPicker);
      native.addEventListener("input", onDateChanged);
      display.addEventListener("keydown", (event) => {
        if (event.key === "Tab") return;
        event.preventDefault();
        if (event.key === "Enter" || event.key === " ") openPicker();
      });
      display.addEventListener("paste", (event) => event.preventDefault());
      display.addEventListener("click", openPicker);
      display.addEventListener("focus", openPicker);
    });
  }
  function parsePeriodEndDate(raw) {
    const range = parseStoredPeriodToRange(raw);
    if (!range?.end) return null;
    return /* @__PURE__ */ new Date(`${range.end}T00:00:00`);
  }
  function isPeriodTooOld(raw, days = 120) {
    const end = parsePeriodEndDate(raw);
    if (!end || Number.isNaN(end.getTime())) return false;
    const diffMs = Date.now() - end.getTime();
    return diffMs > days * 24 * 60 * 60 * 1e3;
  }
  function validateMetricsForm() {
    const errorBox = document.getElementById("metricsFormError");
    const messages = [];
    const budgetRaw = document.getElementById("metricBudgetInput").value;
    const revenueRaw = document.getElementById("metricRevenueInput").value;
    const intFields = [
      ["metricClicksInput", "\u041A\u043B\u0438\u043A\u0438"],
      ["metricLeadsInput", "\u0417\u0430\u044F\u0432\u043A\u0438"],
      ["metricSalesInput", "\u041F\u0440\u043E\u0434\u0430\u0436\u0438"]
    ];
    if (budgetRaw !== "" && Number(budgetRaw) < 0) messages.push("\u0411\u044E\u0434\u0436\u0435\u0442 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C");
    if (revenueRaw !== "" && Number(revenueRaw) < 0) messages.push("\u0412\u044B\u0440\u0443\u0447\u043A\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0439");
    for (const [id, label] of intFields) {
      const raw = document.getElementById(id).value;
      if (raw === "") continue;
      const num = Number(raw);
      if (!Number.isInteger(num) || num < 0) messages.push(`${label} \u0434\u043E\u043B\u0436\u043D\u044B \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C \u2265 0`);
    }
    const clicks = document.getElementById("metricClicksInput").value !== "" ? Number(document.getElementById("metricClicksInput").value) : null;
    const leads = document.getElementById("metricLeadsInput").value !== "" ? Number(document.getElementById("metricLeadsInput").value) : null;
    const sales = document.getElementById("metricSalesInput").value !== "" ? Number(document.getElementById("metricSalesInput").value) : null;
    if (clicks != null && leads != null && leads > clicks) messages.push("\u0417\u0430\u044F\u0432\u043E\u043A \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u043A\u043B\u0438\u043A\u043E\u0432");
    if (leads != null && sales != null && sales > leads) messages.push("\u041F\u0440\u043E\u0434\u0430\u0436 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u0437\u0430\u044F\u0432\u043E\u043A");
    const { start: periodStart, end: periodEnd } = getMetricPeriodIsoValues();
    const periodRange = getMetricPeriodRangeState(periodStart, periodEnd, metricPeriodLastChanged);
    if (periodStart && !periodEnd || !periodStart && periodEnd) {
      messages.push("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0430\u0442\u0443 \u043D\u0430\u0447\u0430\u043B\u0430 \u0438 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u043F\u0435\u0440\u0438\u043E\u0434\u0430 \u0432 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435");
    }
    if (periodStart && periodEnd && !periodRange.valid) {
      messages.push(periodRange.message || "\u0414\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0440\u0430\u043D\u044C\u0448\u0435 \u0434\u0430\u0442\u044B \u043D\u0430\u0447\u0430\u043B\u0430");
    }
    const hasAny = [budgetRaw, revenueRaw, ...intFields.map(([id]) => document.getElementById(id).value), periodStart, periodEnd].some((v) => String(v || "").trim() !== "");
    if (!hasAny) messages.push("\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u043F\u043E\u043B\u0435");
    if (errorBox) {
      if (messages.length) {
        errorBox.style.display = "block";
        errorBox.textContent = messages.join(". ");
      } else {
        errorBox.style.display = "none";
        errorBox.textContent = "";
      }
    }
    return messages.length === 0;
  }
  async function submitMetrics() {
    const previousStep = getGuidedStepSnapshot();
    if (!validateMetricsForm()) return;
    syncMetricPeriodFromPickers();
    const period = document.getElementById("metricPeriodInput")?.value.trim() || "";
    if (!period) {
      showAlert("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434: \u0434\u0430\u0442\u0430 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0440\u0430\u043D\u044C\u0448\u0435 \u0434\u0430\u0442\u044B \u043D\u0430\u0447\u0430\u043B\u0430", "warning");
      return;
    }
    const budgetVal = document.getElementById("metricBudgetInput").value;
    const clicksVal = document.getElementById("metricClicksInput").value;
    const leadsVal = document.getElementById("metricLeadsInput").value;
    const leadsFormsVal = document.getElementById("metricLeadsFormsInput")?.value ?? "";
    const leadsMessengerVal = document.getElementById("metricLeadsMessengerInput")?.value ?? "";
    const salesVal = document.getElementById("metricSalesInput").value;
    const revenueVal = document.getElementById("metricRevenueInput").value;
    const grossProfitVal = document.getElementById("metricGrossProfitInput")?.value ?? "";
    const marginVal = document.getElementById("metricMarginInput")?.value ?? "";
    const data = {};
    if (period) data.period = period;
    if (budgetVal !== "") data.budget = Number(budgetVal);
    if (clicksVal !== "") data.clicks = parseInt(clicksVal, 10);
    if (leadsFormsVal !== "") data.leads_forms = parseInt(leadsFormsVal, 10);
    if (leadsMessengerVal !== "") data.leads_messenger = parseInt(leadsMessengerVal, 10);
    if (leadsVal !== "") data.leads = parseInt(leadsVal, 10);
    else if (data.leads_forms != null || data.leads_messenger != null) {
      data.leads = (data.leads_forms || 0) + (data.leads_messenger || 0);
    }
    if (salesVal !== "") data.sales = parseInt(salesVal, 10);
    if (revenueVal !== "") data.revenue = Number(revenueVal);
    if (grossProfitVal !== "") data.gross_profit = Number(grossProfitVal);
    if (marginVal !== "") data.margin_percent = Number(marginVal);
    if (period && isPeriodTooOld(period, 120)) {
      showAlert("\u041F\u0435\u0440\u0438\u043E\u0434 \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u043C (\u0441\u0442\u0430\u0440\u0448\u0435 4 \u043C\u0435\u0441\u044F\u0446\u0435\u0432). \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u0435\u0440\u0435\u0434 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u043C \u0430\u043D\u0430\u043B\u0438\u0437\u0430.", "warning");
    }
    try {
      if (editingMaterialId) {
        const mat = getMaterialById(editingMaterialId);
        const oldRaw = mat?.raw_content ? JSON.parse(mat.raw_content) : {};
        const oldPeriod = String(oldRaw.period || "").trim();
        const newPeriod = String(data.period || "").trim();
        if (oldPeriod && newPeriod && oldPeriod !== newPeriod) {
          const ok = await showConfirmDialog({
            title: "\u0421\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u043F\u0435\u0440\u0438\u043E\u0434",
            message: "\u041F\u0435\u0440\u0438\u043E\u0434 \u0438\u0437\u043C\u0435\u043D\u0451\u043D. \u041D\u0435\u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044F \u043D\u0435 \u0431\u0443\u0434\u0443\u0442 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u044B \u0438\u0437 \u0441\u0442\u0430\u0440\u043E\u0433\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C?",
            confirmText: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"
          });
          if (!ok) return;
        }
        await saveMaterialPatch(editingMaterialId, data);
        showAlert("\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B", "success");
      } else {
        const setActive = document.getElementById("metricSetActiveInput")?.checked !== false;
        await apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/metrics`, {
          method: "POST",
          body: JSON.stringify({ ...data, set_active: setActive })
        });
        showAlert("\u041F\u0435\u0440\u0438\u043E\u0434 \u043C\u0435\u0442\u0440\u0438\u043A \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D", "success");
      }
      closeModal("metricsModal");
      resetMaterialForm("metricsModal");
      await refreshAuditAndAdvanceGuidedFlow(previousStep);
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  function formatMetricsExtractPreview(preview) {
    const lines = preview?.preview_lines;
    if (Array.isArray(lines) && lines.length) return lines.join("\n");
    const payload = preview?.payload || {};
    const keys = ["period", "budget", "clicks", "leads", "sales", "revenue"];
    return keys.filter((k) => payload[k] !== void 0 && payload[k] !== null && payload[k] !== "").map((k) => `${METRIC_FIELD_LABELS[k] || k}: ${payload[k]}`).join("\n");
  }
  async function extractMetricsFromNotesWithConfirm(noteId = null) {
    if (!requireWriteAccess("\u041F\u0435\u0440\u0435\u043D\u043E\u0441 \u043C\u0435\u0442\u0440\u0438\u043A \u0438\u0437 \u0437\u0430\u043C\u0435\u0442\u043E\u043A")) return;
    if (!getCurrentAuditId7()) return;
    try {
      const qs = noteId != null ? `?note_id=${encodeURIComponent(noteId)}` : "";
      const preview = await apiRequest(
        `/api/audits/${getCurrentAuditId7()}/materials/extract-metrics/preview${qs}`
      );
      if (!preview?.can_extract) {
        showAlert(
          "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0439\u0442\u0438 KPI \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0430\u0445 \u0438\u043B\u0438 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0445. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0438\u043E\u0434, \u0431\u044E\u0434\u0436\u0435\u0442, \u043A\u043B\u0438\u043A\u0438 \u0438 \u0437\u0430\u044F\u0432\u043A\u0438 \u0432 \u0442\u0435\u043A\u0441\u0442 \u0438\u043B\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0443 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.",
          "warning"
        );
        return;
      }
      const body = formatMetricsExtractPreview(preview);
      const ok = await showConfirmDialog({
        title: noteId != null ? "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 KPI \u0438\u0437 \u044D\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0438?" : "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 KPI \u0438\u0437 \u0437\u0430\u043C\u0435\u0442\u043E\u043A?",
        message: `\u0411\u0443\u0434\u0443\u0442 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B \u0432 \u043F\u0435\u0440\u0438\u043E\u0434 KPI:

${body}

\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0446\u0438\u0444\u0440\u044B \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C.`,
        confirmText: "\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438",
        confirmType: "primary"
      });
      if (!ok) return;
      const postQs = noteId != null ? `?note_id=${encodeURIComponent(noteId)}` : "";
      await apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/extract-metrics${postQs}`, {
        method: "POST"
      });
      showAlert("\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0435\u043D\u044B \u0432 \u043F\u0435\u0440\u0438\u043E\u0434 KPI", "success");
      await refreshAuditAndAdvanceGuidedFlow(null);
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 \u043C\u0435\u0442\u0440\u0438\u043A\u0438: " + (error.message || "\u041E\u0448\u0438\u0431\u043A\u0430"), "warning");
    }
  }
  async function extractMetricsFromNoteWithConfirm(noteId) {
    return extractMetricsFromNotesWithConfirm(noteId);
  }
  function formatAiExtractPreviewExtras(preview) {
    const lines = [];
    if (preview?.method && preview.method !== "ai") {
      lines.push(`\u0420\u0435\u0436\u0438\u043C: ${preview.method === "heuristic_fallback" ? "\u044D\u0432\u0440\u0438\u0441\u0442\u0438\u043A\u0430 (AI \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D)" : preview.method}`);
    }
    if (preview?.model_label) {
      lines.push(`\u041C\u043E\u0434\u0435\u043B\u044C: ${preview.model_label}`);
    }
    if (preview?.cost_rub != null || preview?.cost_usd != null) {
      lines.push(`\u041E\u0446\u0435\u043D\u043A\u0430 \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u0438: ${formatRubAmount(preview.cost_rub)} \xB7 ${formatUsdAmount(preview.cost_usd)}`);
    }
    if (preview?.ai_notes) {
      lines.push(`\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 AI: ${preview.ai_notes}`);
    }
    if (preview?.sources?.length) {
      const src = preview.sources.map((s) => s.title || s.type).join(", ");
      lines.push(`\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438: ${src}`);
    }
    if (preview?.review_reasons?.length) {
      lines.push(`\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C: ${preview.review_reasons.join("; ")}`);
    }
    return lines.length ? `

${lines.join("\n")}` : "";
  }
  async function extractMetricsWithAiConfirm(noteId = null, materialId = null) {
    if (!requireWriteAccess("\u0418\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u0435 KPI \u0447\u0435\u0440\u0435\u0437 AI")) return;
    if (!getCurrentAuditId7()) return;
    if (!runtimeBridge.getPrivacySettings?.()) await runtimeBridge.loadPrivacySettings?.();
    if (!runtimeBridge.getPrivacySettings?.()?.ai?.external_ai_enabled) {
      showAlert("\u0412\u043D\u0435\u0448\u043D\u0438\u0439 AI \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \xAB\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 KPI \u0438\u0437 \u0437\u0430\u043C\u0435\u0442\u043E\u043A\xBB \u0438\u043B\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043C\u0435\u0442\u0440\u0438\u043A\u0438 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.", "warning");
      return;
    }
    try {
      const params = new URLSearchParams();
      if (noteId != null && noteId !== "null") params.set("note_id", String(noteId));
      if (materialId != null && materialId !== "null") params.set("material_id", String(materialId));
      const qs = params.toString() ? `?${params.toString()}` : "";
      const preview = await apiRequest(
        `/api/audits/${getCurrentAuditId7()}/materials/extract-metrics/ai/preview${qs}`
      );
      if (!preview?.can_extract) {
        showAlert(
          "AI \u043D\u0435 \u043D\u0430\u0448\u0451\u043B KPI \u0432 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u0445. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0438\u043E\u0434, \u0431\u044E\u0434\u0436\u0435\u0442, \u043A\u043B\u0438\u043A\u0438 \u0438 \u0437\u0430\u044F\u0432\u043A\u0438 \u0432 \u0442\u0435\u043A\u0441\u0442 \u0438\u043B\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0444\u043E\u0440\u043C\u0443 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.",
          "warning"
        );
        return;
      }
      const body = formatMetricsExtractPreview(preview) + formatAiExtractPreviewExtras(preview);
      const title = materialId != null && materialId !== "null" ? "\u0418\u0437\u0432\u043B\u0435\u0447\u044C KPI \u0447\u0435\u0440\u0435\u0437 AI \u0438\u0437 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430?" : noteId != null && noteId !== "null" ? "\u0418\u0437\u0432\u043B\u0435\u0447\u044C KPI \u0447\u0435\u0440\u0435\u0437 AI \u0438\u0437 \u044D\u0442\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0438?" : "\u0418\u0437\u0432\u043B\u0435\u0447\u044C KPI \u0447\u0435\u0440\u0435\u0437 AI?";
      const ok = await showConfirmDialog({
        title,
        message: `\u0411\u0443\u0434\u0443\u0442 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u044B \u0432 \u043F\u0435\u0440\u0438\u043E\u0434 KPI (\u0441 \u043F\u043E\u043C\u0435\u0442\u043A\u043E\u0439 \xAB\u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438\xBB):

${body}

\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0446\u0438\u0444\u0440\u044B \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C.`,
        confirmText: "\u0418\u0437\u0432\u043B\u0435\u0447\u044C \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
        confirmType: "primary"
      });
      if (!ok) return;
      await apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/extract-metrics/ai${qs}`, {
        method: "POST"
      });
      showAlert("KPI \u0438\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u044B \u0447\u0435\u0440\u0435\u0437 AI \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B \u0432 \u043F\u0435\u0440\u0438\u043E\u0434 KPI. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0446\u0438\u0444\u0440\u044B.", "success");
      await refreshAuditAndAdvanceGuidedFlow(null);
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C KPI \u0447\u0435\u0440\u0435\u0437 AI: " + (error.message || "\u041E\u0448\u0438\u0431\u043A\u0430"), "warning");
    }
  }
  async function cleanupStaleMaterials() {
    if (!requireWriteAccess("\u041E\u0447\u0438\u0441\u0442\u043A\u0430 \u0441\u0442\u0430\u0440\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432")) return;
    if (!getCurrentAuditId7()) return;
    const ok = await showConfirmDialog({
      title: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0441\u0442\u0430\u0440\u044B\u0435 \u0434\u0443\u0431\u043B\u0438",
      message: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0442\u0430\u0440\u044B\u0435 \u0434\u0443\u0431\u043B\u0438 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u0438 \u043C\u0435\u0442\u0440\u0438\u043A? \u041E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0435.",
      confirmText: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C"
    });
    if (!ok) return;
    try {
      const result = await apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/cleanup-stale`, {
        method: "POST"
      });
      const deleted = Number(result?.deleted_count || 0);
      if (deleted > 0) {
        showAlert(`\u0423\u0434\u0430\u043B\u0435\u043D\u043E \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432: ${deleted}`, "success");
      } else {
        showAlert("\u0421\u0442\u0430\u0440\u044B\u0445 \u0434\u0443\u0431\u043B\u0435\u0439 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E", "info");
      }
      runtimeBridge.loadAuditDetail?.();
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0434\u0443\u0431\u043B\u0438: " + (error.message || "\u041E\u0448\u0438\u0431\u043A\u0430"), "warning");
    }
  }
  async function addDocument() {
    if (!requireWriteAccess("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430")) return;
    const auditId = getCurrentAuditId7();
    if (!auditId) {
      showAlert("\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0430\u0443\u0434\u0438\u0442\u0430 \u0435\u0449\u0451 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F \u2014 \u043F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 2\u20133 \u0441\u0435\u043A\u0443\u043D\u0434\u044B \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C\xBB \u0441\u043D\u043E\u0432\u0430.", "warning");
      return;
    }
    const previousStep = getGuidedStepSnapshot();
    const fileInput = document.getElementById("documentFileInput");
    const title = document.getElementById("documentTitle").value || "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442";
    const file = fileInput?.files?.[0];
    if (!file) {
      showAlert("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430", "warning");
      return;
    }
    const maxMb = Number(window.__MAX_UPLOAD_MB) || 50;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      showAlert(
        `\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 (${(file.size / (1024 * 1024)).toFixed(1)} \u041C\u0411). \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C ${maxMb} \u041C\u0411. \u0421\u043E\u0436\u043C\u0438\u0442\u0435 PDF, \u0440\u0430\u0437\u0431\u0435\u0439\u0442\u0435 \u043D\u0430 \u0447\u0430\u0441\u0442\u0438 \u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043D\u0443\u0436\u043D\u044B\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442 \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0443.`,
        "warning"
      );
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    const uploadBtn = document.querySelector("#documentModal .btn-primary");
    if (uploadBtn) uploadBtn.disabled = true;
    try {
      showLoader();
      const bigFile = file.size > 5 * 1024 * 1024;
      setDocumentUploadStatus(
        bigFile ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438 \u0440\u0430\u0437\u0431\u043E\u0440 \u0444\u0430\u0439\u043B\u0430\u2026 \u0411\u043E\u043B\u044C\u0448\u0438\u0435 PDF/xlsx \u043C\u043E\u0433\u0443\u0442 \u0437\u0430\u043D\u044F\u0442\u044C 1\u20132 \u043C\u0438\u043D\u0443\u0442\u044B, \u043D\u0435 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0439\u0442\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0443." : "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438 \u0440\u0430\u0437\u0431\u043E\u0440 \u0444\u0430\u0439\u043B\u0430\u2026"
      );
      const controller = new AbortController();
      const timeoutMs = Math.max(12e4, Math.min(6e5, 6e4 + file.size / 1024));
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const result = await apiFetch(`/api/audits/${auditId}/materials/document`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timer);
      closeModal("documentModal");
      fileInput.value = "";
      document.getElementById("documentTitle").value = "";
      documentIssueContext = null;
      await refreshAuditAndAdvanceGuidedFlow(previousStep);
      const slice = parseDocumentSlice(result);
      const months = slice?.monthly?.length || 0;
      const sliceNote = slice?.format === "yandex_direct_xlsx" ? months >= 2 ? ` \u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D \u043E\u0442\u0447\u0451\u0442 \u0414\u0438\u0440\u0435\u043A\u0442\u0430: ${months} \u043C\u0435\u0441\u044F\u0446\u0435\u0432 \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u044B \u0432 KPI (\u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0446\u0438\u0444\u0440\u044B).` : " \u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D \u043E\u0442\u0447\u0451\u0442 \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0440\u0435\u0437 \u0438 KPI." : "";
      const reviewNote = result?.needs_review && result?.review_reason ? ` \u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438: ${result.review_reason}` : "";
      showAlert(`\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D.${sliceNote}${reviewNote}`, result?.needs_review ? "warning" : "success");
      if (slice?.format === "yandex_direct_xlsx") {
        await maybeAutoSyncDirectHealthAfterExcelUpload();
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        showAlert(
          "\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D\u043E \u0432\u0440\u0435\u043C\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F. \u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0442\u044F\u0436\u0451\u043B\u044B\u0439 \u0434\u043B\u044F \u0440\u0430\u0437\u0431\u043E\u0440\u0430 \u2014 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043C\u0435\u043D\u044C\u0448\u0438\u0439 \u0444\u0430\u0439\u043B \u0438\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0443.",
          "danger"
        );
      } else {
        const msg = String(error?.message || "\u041E\u0448\u0438\u0431\u043A\u0430");
        const hint = msg.includes("\u0431\u043E\u043B\u044C\u0448\u043E\u0439") || msg.includes("413") ? " \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0444\u0430\u0439\u043B \u043C\u0435\u043D\u044C\u0448\u0435 \u0438\u043B\u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0441 \u0432\u044B\u0434\u0435\u0440\u0436\u043A\u043E\u0439." : msg.includes("\u0442\u0430\u0439\u043C\u0430\u0443\u0442") || msg.includes("\u0432\u0440\u0435\u043C\u044F") ? " \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 csv/xlsx \u0432\u043C\u0435\u0441\u0442\u043E pdf \u0438\u043B\u0438 \u0441\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u0435 \u0444\u0430\u0439\u043B." : "";
        showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442: " + msg + hint, "danger");
      }
      console.error("[document_upload]", error);
    } finally {
      if (uploadBtn) uploadBtn.disabled = false;
      setDocumentUploadStatus("");
      hideLoader();
    }
  }
  async function deleteMaterial(materialId) {
    if (!requireWriteAccess("\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430")) return;
    const ok = await showConfirmDialog({
      title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B",
      message: "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0451\u043D \u0438\u0437 \u044D\u0442\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430.",
      confirmText: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"
    });
    if (!ok) return;
    try {
      await apiRequest(`/api/audits/${getCurrentAuditId7()}/materials/${materialId}`, { method: "DELETE" });
      runtimeBridge.loadAuditDetail?.();
      showAlert("\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B \u0443\u0434\u0430\u043B\u0451\u043D", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  function setEditingMaterialId(id) {
    editingMaterialId = id;
  }
  function clearEditingMaterialId() {
    editingMaterialId = null;
  }
  function getDocumentIssueContext() {
    return documentIssueContext;
  }
  function setDocumentIssueContext(v) {
    documentIssueContext = v;
  }

  // src/audit-detail/report-illustrations.js
  function getAuditData6() {
    return runtimeBridge.getAuditData?.() || null;
  }
  function setAuditData(data) {
    runtimeBridge.setAuditData?.(data);
  }
  function getCurrentAuditId8() {
    return runtimeBridge.getCurrentAuditId?.() || null;
  }
  function buildReportSendStatusHint(data) {
    const progress = getFindingReviewProgress(data);
    const stale = Boolean(runtimeBridge.isAnalysisStale?.(data));
    if (isPreliminaryAudit()) {
      const missing = (data?.data_coverage?.missing_items || []).slice(0, 5).map((i) => i.label).filter(Boolean);
      const text = missing.length ? missing.join(", ") : "\u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432";
      return {
        isDraft: true,
        hint: `\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430 (\u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442: ${text}). \u041D\u0438\u0436\u0435 \u2014 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043F\u043E \u0443\u0436\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u043C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430\u043C.`,
        showResultsCta: false
      };
    }
    if (progress.pending > 0) {
      const n = progress.pending;
      return {
        isDraft: true,
        hint: `\u041F\u0435\u0440\u0435\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u043E\u0439 PDF: ${pluralizeFindingsReview2(n)} \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0412\u044B\u0432\u043E\u0434\u044B\xBB (\u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E ${progress.reviewed} \u0438\u0437 ${progress.total}).`,
        showResultsCta: true
      };
    }
    if (stale) {
      return {
        isDraft: true,
        hint: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C \u043F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0430\u043D\u0430\u043B\u0438\u0437 \u0438\u043B\u0438 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0434\u0438\u0442\u0435 \u043A\u043B\u0438\u0435\u043D\u0442\u0430 \u043F\u0435\u0440\u0435\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u043E\u0439 PDF.",
        showResultsCta: false
      };
    }
    return {
      isDraft: false,
      hint: "\u0411\u043B\u043E\u043A\u0438 \u043D\u0438\u0436\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442 \u0441 PDF \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430. \u041F\u0440\u0430\u0432\u043A\u0438 \u043A\u043B\u0438\u0435\u043D\u0442\u0430 \u0438 CRM \u2014 \u0432 \u043A\u043E\u043D\u0446\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0438.",
      showResultsCta: false
    };
  }
  function renderReportSendStatus(data) {
    const box = document.getElementById("reportSendStatus");
    if (!box) return;
    if (!hasGuidedCompletedAnalysis(data) && !isPreliminaryAudit()) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    const status = buildReportSendStatusHint(data);
    const badge = status.isDraft ? '<span class="report-send-badge report-send-badge--draft">\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A</span>' : '<span class="report-send-badge report-send-badge--ready">\u041C\u043E\u0436\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u0443</span>';
    const resultsBtn = status.showResultsCta ? `<button type="button" class="btn btn-primary btn-sm" onclick="switchTab('results')">\u041A \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u0432\u044B\u0432\u043E\u0434\u043E\u0432</button>` : "";
    box.style.display = "block";
    box.innerHTML = `
        <div class="report-send-status-inner">
            ${badge}
            <p class="report-send-hint">${escapeHtml(status.hint)}</p>
            <div class="report-send-actions">${resultsBtn}
                <button type="button" class="btn btn-outline btn-sm" onclick="previewAuditReport()">\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 PDF</button>
            </div>
        </div>`;
  }
  function getFindingLinkedMaterialIds(data) {
    return new Set(
      (data?.findings || []).map((finding) => finding.illustration_material_id).filter(Boolean)
    );
  }
  function getReportAppendixItems2(data) {
    return data?.report_appendix?.items || [];
  }
  function getAvailableAppendixScreenshots(data) {
    const used = new Set(getReportAppendixItems2(data).map((item) => item.material_id));
    const linked = getFindingLinkedMaterialIds(data);
    return (data?.materials || []).filter(
      (m) => m?.type === "screenshot" && m.file_url && !m.excluded_from_report && !used.has(m.id) && !linked.has(m.id)
    );
  }
  function getReportIllustrationsSummary(data) {
    return data?.report_illustrations || {
      confirmed_findings: 0,
      findings_with_illustration: 0,
      findings_missing_caption: 0,
      appendix_count: 0
    };
  }
  function isDirectHealthFindingRow(f) {
    if (!f) return false;
    if (f.finding_source === "direct_health") return true;
    if (f.original_ai_output?.source === "direct_health") return true;
    if ((f.evidence || []).some((e) => e?.source === "direct_health")) return true;
    return /автопроверка excel|мастер отчёт|direct_analytics|оценка кабинета/i.test(String(f.based_on || ""));
  }
  function getConfirmedFindingsForReport(data) {
    const order = { high: 0, medium: 1, low: 2 };
    return (data?.findings || []).filter((f) => ["human_confirmed", "human_edited"].includes(f.status || "")).filter((f) => !isDirectHealthFindingRow(f)).sort((a, b) => {
      const sa = order[String(a.severity || "medium").toLowerCase()] ?? 1;
      const sb = order[String(b.severity || "medium").toLowerCase()] ?? 1;
      return sa - sb || (a.id || 0) - (b.id || 0);
    });
  }
  function renderReportConfirmedPreview(data) {
    const card = document.getElementById("reportConfirmedPreviewCard");
    const body = document.getElementById("reportConfirmedPreviewBody");
    if (!card || !body) return;
    const showAi = data?.workflow_state?.show_ai_report_sections && !data?.workflow_state?.analysis_failed && hasGuidedCompletedAnalysis(data);
    if (!showAi) {
      card.style.display = "none";
      body.innerHTML = "";
      return;
    }
    card.style.display = "";
    const confirmed = getConfirmedFindingsForReport(data);
    const progress = getFindingReviewProgress(data);
    if (!confirmed.length) {
      const pending = progress.pending || 0;
      body.innerHTML = `
            <div class="report-confirmed-empty">
                <p class="muted">${pending > 0 ? `\u0412 PDF \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E: ${pluralizeFindingsReview2(pending)} \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0412\u044B\u0432\u043E\u0434\u044B\xBB.` : "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0412\u044B\u0432\u043E\u0434\u044B\xBB \u2014 \u043E\u043D\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u0438 \u0432 PDF."}</p>
                <button type="button" class="btn btn-primary btn-sm" onclick="switchTab('results')">${pending > 0 ? "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u044B" : "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u044B"}</button>
            </div>`;
      return;
    }
    const dupePairs = [];
    const items = confirmed.map((f) => {
      const area = areaDisplayLabel(f.area) || "\u0412\u044B\u0432\u043E\u0434";
      const rec = String(f.recommendation || "").trim();
      const hasScreen = Boolean(f.illustration_material_id);
      const screenOk = hasScreen && Boolean(f.illustration_caption_ready);
      let screenNote = "";
      if (hasScreen && !screenOk) {
        screenNote = '<span class="report-confirmed-screen report-confirmed-screen--warn">\u0441\u043A\u0440\u0438\u043D \u0431\u0435\u0437 \u043F\u043E\u0434\u043F\u0438\u0441\u0438 \u2014 \u043D\u0435 \u0432 PDF</span>';
      } else if (screenOk) {
        screenNote = '<span class="report-confirmed-screen report-confirmed-screen--ok">\u0441\u043E \u0441\u043A\u0440\u0438\u043D\u043E\u043C</span>';
      }
      const similar = findSimilarConfirmedFindings(f, confirmed).filter((o) => o.id > f.id);
      if (similar.length) {
        dupePairs.push({ id: f.id, otherIds: similar.map((o) => o.id) });
      }
      const dupeTag = similar.length ? '<span class="report-confirmed-dupe-tag">\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u044B\u0439 \u0434\u0443\u0431\u043B\u044C</span>' : "";
      return `<li class="report-confirmed-item">
            <p class="report-confirmed-item-head"><strong>${escapeHtml(area)}</strong>${dupeTag ? ` ${dupeTag}` : ""}${screenNote ? ` ${screenNote}` : ""}</p>
            <p>${escapeHtml(f.problem || "\u2014")}</p>
            ${rec ? `<p class="muted report-confirmed-rec">${escapeHtml(rec)}</p>` : ""}
        </li>`;
    }).join("");
    const pendingNote = progress.pending > 0 ? `<p class="muted report-confirmed-pending">\u0415\u0449\u0451 ${progress.pending} \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0435 \u2014 \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0443\u0442 \u0432 PDF, \u043F\u043E\u043A\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435.</p>` : "";
    const dupeNote = dupePairs.length ? `<div class="report-confirmed-dupe-warn">
            <p>\u26A0 \u041F\u043E\u0445\u043E\u0436\u0438\u0435 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0438 \u0432 \u0440\u0430\u0437\u043D\u044B\u0445 \u0437\u043E\u043D\u0430\u0445 \u2014 \u0432 PDF \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043E\u0434\u0438\u043D \u043F\u0443\u043D\u043A\u0442 \u0438\u043B\u0438 \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442\u044B.</p>
            <ul class="report-confirmed-dupe-actions">
                ${dupePairs.map((p) => `
                    <li>\u0412\u044B\u0432\u043E\u0434\u044B #${p.id} \u0438 #${p.otherIds.join(", #")}:
                        <button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${p.id})">#${p.id}</button>
                        ${p.otherIds.map((oid) => `<button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${oid})">#${oid}</button>`).join(" ")}
                    </li>`).join("")}
            </ul>
            <p class="muted">\u041D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435: <strong>\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043E\u0442\u0447\u0451\u0442\u0430</strong> \u0443 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u0434\u0443\u0431\u043B\u044F \u0438\u043B\u0438 <strong>\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C</strong> \u0442\u0435\u043A\u0441\u0442.</p>
           </div>` : "";
    body.innerHTML = `${dupeNote}<ol class="report-confirmed-list">${items}</ol>${pendingNote}`;
  }
  function renderReportIllustrationsGuide(data) {
    const card = document.getElementById("reportIllustrationsGuideCard");
    const status = document.getElementById("reportIllustrationsStatus");
    const preview = document.getElementById("reportFindingIllustrationsPreview");
    if (!card) return;
    if (!canWrite()) {
      card.style.display = "none";
      return;
    }
    card.style.display = "";
    const summary = getReportIllustrationsSummary(data);
    const appendixCount = data?.report_appendix?.count ?? summary.appendix_count ?? 0;
    if (status) {
      const parts = [
        `${summary.confirmed_findings || 0} \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434.`,
        `${summary.findings_with_illustration || 0} \u0441\u043E \u0441\u043A\u0440\u0438\u043D\u043E\u043C`
      ];
      if (summary.findings_missing_caption > 0) {
        parts.push(`${summary.findings_missing_caption} \u0431\u0435\u0437 \u043F\u043E\u0434\u043F\u0438\u0441\u0438`);
      }
      if (appendixCount > 0) {
        parts.push(`${appendixCount} \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438`);
      }
      status.textContent = parts.join(" \xB7 ");
    }
    if (!preview) return;
    const illustrated = (data?.findings || []).filter(
      (finding) => finding.illustration_material_id && ["human_confirmed", "human_edited"].includes(finding.status || "")
    );
    if (!illustrated.length) {
      preview.innerHTML = '<p class="muted report-illustrations-empty">\u041D\u0435\u0442 \u0441\u043A\u0440\u0438\u043D\u043E\u0432 \u0443 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0445 \u0432\u044B\u0432\u043E\u0434\u043E\u0432. \u041D\u0430 \xAB\u0412\u044B\u0432\u043E\u0434\u044B\xBB \u2014 \xAB\u0421\u043A\u0440\u0438\u043D \u0434\u043B\u044F PDF\xBB.</p>';
      return;
    }
    preview.innerHTML = `
        <p class="report-illustrations-preview-title"><strong>\u0412 PDF \u043F\u043E\u0434 \u0432\u044B\u0432\u043E\u0434\u0430\u043C\u0438:</strong></p>
        ${illustrated.map((finding) => {
      const ready = Boolean(finding.illustration_caption_ready);
      const warn = !ready ? '<p class="report-illustration-warn">\u26A0 \u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043E\u0434\u043F\u0438\u0441\u044C (\u043C\u0438\u043D. 10 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432) \u2014 \u0431\u0435\u0437 \u043D\u0435\u0451 \u0441\u043A\u0440\u0438\u043D \u043D\u0435 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u0432 PDF</p>' : "";
      return `<div class="report-finding-illustration-item" data-finding-id="${finding.id}">
                    <div class="report-finding-illustration-head">
                        ${finding.illustration_file_url ? `<img src="${escapeHtml(finding.illustration_file_url)}" alt="">` : ""}
                        <div>
                            <p><strong>${escapeHtml(areaDisplayLabel(finding.area) || "\u0412\u044B\u0432\u043E\u0434")}</strong></p>
                            <p class="muted">${escapeHtml((finding.problem || "").slice(0, 120))}${(finding.problem || "").length > 120 ? "\u2026" : ""}</p>
                        </div>
                    </div>
                    <label class="finding-missing-label">\u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u0434 \u0440\u0438\u0441\u0443\u043D\u043A\u043E\u043C \u0432 PDF</label>
                    <textarea class="form-control report-finding-caption" rows="2" data-finding-id="${finding.id}" placeholder="\u0420\u0438\u0441. \u2026 \u2014 \u0447\u0442\u043E \u043D\u0430 \u0433\u0440\u0430\u0444\u0438\u043A\u0435 \u0438 \u0432\u044B\u0432\u043E\u0434 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430">${escapeHtml(finding.illustration_caption || "")}</textarea>
                    ${warn}
                    <button type="button" class="btn btn-outline btn-sm" onclick="switchTab('results'); document.getElementById('finding-${finding.id}')?.scrollIntoView({behavior:'smooth'})">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432\u044B\u0432\u043E\u0434</button>
                </div>`;
    }).join("")}`;
    preview.querySelectorAll(".report-finding-caption").forEach((el) => {
      el.addEventListener("blur", () => {
        saveFindingIllustrationCaption2(Number(el.dataset.findingId), el.value, { silent: true });
      });
    });
  }
  async function saveFindingIllustrationCaption2(findingId, caption, { silent = false } = {}) {
    if (!requireWriteAccess("\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u043A \u0438\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u0438")) return false;
    const auditId = getCurrentAuditId8();
    if (!auditId) return false;
    try {
      await apiRequest(`/api/audits/${auditId}/findings/${findingId}/illustration`, {
        method: "PATCH",
        body: JSON.stringify({ caption: (caption || "").trim() })
      });
      const auditData2 = await apiRequest(`/api/audits/${auditId}`);
      setAuditData(auditData2);
      renderReportIllustrationsGuide(auditData2);
      renderReportConfirmedPreview(auditData2);
      renderReportAppendix(auditData2);
      renderFindings(auditData2.findings || [], auditData2.data_coverage);
      if (!silent) showAlert("\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0430", "success");
      return true;
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043F\u043E\u0434\u043F\u0438\u0441\u044C: " + error.message, "warning");
      return false;
    }
  }
  function renderReportAppendix(data) {
    const card = document.getElementById("reportAppendixCard");
    const list = document.getElementById("reportAppendixList");
    const counter = document.getElementById("reportAppendixCounter");
    const addBtn = document.getElementById("btnAddReportAppendix");
    if (!card || !list) return;
    if (!canWrite()) {
      card.style.display = "none";
      return;
    }
    card.style.display = "";
    const items = getReportAppendixItems2(data);
    const maxItems = data?.report_appendix?.max_items || 3;
    if (counter) counter.textContent = `${items.length} / ${maxItems}`;
    if (addBtn) addBtn.disabled = items.length >= maxItems;
    if (!items.length) {
      list.innerHTML = '<p class="muted">\u041D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E \u2014 \u043A\u043B\u0438\u0435\u043D\u0442 \u0443\u0432\u0438\u0434\u0438\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0435\u043A\u0441\u0442 \u043E\u0442\u0447\u0451\u0442\u0430.</p>';
      return;
    }
    list.innerHTML = items.map(
      (item, index) => `
        <div class="report-appendix-item" data-material-id="${item.material_id}">
            <div class="report-appendix-preview">
                ${item.file_url ? `<img src="${escapeHtml(item.file_url)}" alt="">` : ""}
            </div>
            <div class="report-appendix-fields">
                <p class="report-appendix-title"><strong>\u0420\u0438\u0441. ${index + 1}</strong> \xB7 ${escapeHtml(item.material_title || "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442")}</p>
                <textarea class="form-control report-appendix-caption" rows="3" data-material-id="${item.material_id}" placeholder="\u0420\u0438\u0441. ${index + 1}. \u0427\u0442\u043E \u043D\u0430 \u0433\u0440\u0430\u0444\u0438\u043A\u0435 \u0438 \u0432\u044B\u0432\u043E\u0434 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430">${escapeHtml(item.caption || "")}</textarea>
                ${item.ocr_hint ? `<details class="report-appendix-ocr"><summary>\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0438\u0437 OCR</summary><pre>${escapeHtml(String(item.ocr_hint).slice(0, 500))}</pre></details>` : ""}
                ${item.needs_review ? '<p class="muted report-appendix-material-note">\u2139 \u0421\u043A\u0440\u0438\u043D \u043D\u0430 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB \u043F\u043E\u043C\u0435\u0447\u0435\u043D \xAB\u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438\xBB \u2014 \u043D\u0430 PDF \u044D\u0442\u043E \u043D\u0435 \u0432\u043B\u0438\u044F\u0435\u0442, \u0435\u0441\u043B\u0438 \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0430.</p>' : ""}
                <div class="report-appendix-item-actions">
                    <button type="button" class="btn btn-outline btn-sm" onclick="moveReportAppendixItem(${item.material_id}, -1)" ${index === 0 ? "disabled" : ""}>\u2191</button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="moveReportAppendixItem(${item.material_id}, 1)" ${index === items.length - 1 ? "disabled" : ""}>\u2193</button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="removeReportAppendixItem(${item.material_id})">\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>
                </div>
            </div>
        </div>`
    ).join("");
    list.querySelectorAll(".report-appendix-caption").forEach((el) => {
      el.addEventListener("blur", () => {
        saveReportAppendixFromUi({ silent: true });
      });
    });
  }
  function collectReportAppendixPayloadFromUi() {
    const items = [];
    document.querySelectorAll(".report-appendix-item").forEach((row) => {
      const materialId = Number(row.dataset.materialId);
      const captionEl = row.querySelector(".report-appendix-caption");
      items.push({
        material_id: materialId,
        caption: (captionEl?.value || "").trim()
      });
    });
    return items;
  }
  async function saveReportAppendixFromUi({ silent = false } = {}) {
    if (!requireWriteAccess("\u0418\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0434\u043B\u044F PDF")) return false;
    const auditId = getCurrentAuditId8();
    if (!auditId) return false;
    const items = collectReportAppendixPayloadFromUi();
    try {
      const result = await apiRequest(`/api/audits/${auditId}/report/appendix`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      const auditData2 = getAuditData6();
      if (auditData2) auditData2.report_appendix = result;
      renderReportAppendix(auditData2);
      if (!silent) showAlert("\u0418\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B", "success");
      return true;
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u0438: " + (error.message || "\u041E\u0448\u0438\u0431\u043A\u0430"), "warning");
      return false;
    }
  }
  function isUsableOcrHint2(text) {
    const value = String(text || "").trim();
    if (value.length < 15) return false;
    if (/\d/.test(value)) return true;
    const lower = value.toLowerCase();
    const keywords = ["\u043A\u043B\u0438\u043A", "\u0437\u0430\u044F\u0432", "\u0431\u044E\u0434\u0436", "\u0440\u0430\u0441\u0445\u043E\u0434", "cpl", "cpa", "romi", "ctr", "\u043F\u0435\u0440\u0438\u043E\u0434", "\u0433\u0440\u0430\u0444", "\u043A\u0430\u043C\u043F\u0430\u043D"];
    return keywords.some((word) => lower.includes(word));
  }
  function buildAppendixCaptionPromptMessage(figureNo, ocrHint) {
    const lines = [
      "\u042D\u0442\u043E \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0434 \u0440\u0438\u0441\u0443\u043D\u043A\u043E\u043C \u0432 PDF \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430 \u2014 \u043D\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0444\u0430\u0439\u043B\u0430 \u0438 \u043D\u0435 \u0441\u044B\u0440\u043E\u0439 OCR.",
      "\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043E\u0438\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438: \u0447\u0442\u043E \u043D\u0430 \u0441\u043A\u0440\u0438\u043D\u0435 \u0438 \u043A\u0430\u043A\u043E\u0439 \u0432\u044B\u0432\u043E\u0434.",
      "",
      `\u0424\u043E\u0440\u043C\u0430\u0442: \xAB\u0420\u0438\u0441. ${figureNo}. \u2026\xBB \u2014 \u043F\u0435\u0440\u0438\u043E\u0434, \u043C\u0435\u0442\u0440\u0438\u043A\u0430, \u0442\u0440\u0435\u043D\u0434.`,
      "\u041F\u0440\u0438\u043C\u0435\u0440: \xAB\u0420\u0438\u0441. 1. \u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 CPL, \u043C\u0430\u0439 2026 \u2014 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 \u0441 890 \u0434\u043E 480 \u20BD \u043F\u043E\u0441\u043B\u0435 \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u0438.\xBB"
    ];
    if (ocrHint && isUsableOcrHint2(ocrHint)) {
      lines.push("", "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u0441 OCR (\u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0446\u0438\u0444\u0440\u044B):", ocrHint.slice(0, 220));
    } else if (ocrHint) {
      lines.push("", "OCR \u043D\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043B \u0441\u043A\u0440\u0438\u043D \u2014 \u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u0433\u0440\u0430\u0444\u0438\u043A \u0432\u0440\u0443\u0447\u043D\u0443\u044E.");
    }
    return lines.join("\n");
  }
  async function openReportAppendixPicker(materialId = null) {
    if (!requireWriteAccess("\u0418\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0434\u043B\u044F PDF")) return;
    const auditId = getCurrentAuditId8();
    const auditData2 = getAuditData6();
    if (!auditId || !auditData2) return;
    const items = getReportAppendixItems2(auditData2);
    const maxItems = auditData2?.report_appendix?.max_items || 3;
    if (items.length >= maxItems) {
      showAlert(`\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C ${maxItems} \u0438\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u0438`, "warning");
      return;
    }
    let targetId = materialId != null ? Number(materialId) : null;
    if (targetId == null) {
      const available = getAvailableAppendixScreenshots(auditData2);
      if (!available.length) {
        showAlert("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0445 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u043A\u0440\u0438\u043D \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB.", "warning");
        return;
      }
      if (available.length === 1) {
        targetId = available[0].id;
      } else {
        const lines = available.map((m, i) => `${i + 1}. ${m.title || "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442"}`).join("\n");
        const pick = await showPromptDialog2({
          title: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442",
          message: `\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 (1\u2013${available.length}):
${lines}`,
          placeholder: "1",
          required: true
        });
        if (!pick) return;
        const idx = parseInt(String(pick).trim(), 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= available.length) {
          showAlert("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440", "warning");
          return;
        }
        targetId = available[idx].id;
      }
    }
    const material = (auditData2.materials || []).find((m) => m.id === targetId);
    const ocr = material ? findOcrMaterial2(material) : null;
    const ocrHint = (ocr?.extracted_text || ocr?.raw_content || "").trim();
    const figureNo = items.length + 1;
    const caption = await showPromptDialog2({
      title: "\u0422\u0435\u043A\u0441\u0442 \u043F\u043E\u0434 \u0440\u0438\u0441\u0443\u043D\u043A\u043E\u043C \u0432 PDF",
      message: buildAppendixCaptionPromptMessage(figureNo, ocrHint),
      placeholder: `\u0420\u0438\u0441. ${figureNo}. \u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430 CPL, \u043C\u0430\u0439 2026 \u2014 \u0441\u043D\u0438\u0436\u0435\u043D\u0438\u0435 \u043F\u043E\u0441\u043B\u0435 \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u0438 \u043C\u0438\u043D\u0443\u0441-\u0441\u043B\u043E\u0432.`,
      required: true
    });
    if (caption === false) return;
    if (!caption || caption.length < 10) {
      showAlert("\u041F\u043E\u0434\u043F\u0438\u0441\u044C \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u043D\u0435 \u043A\u043E\u0440\u043E\u0447\u0435 10 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432", "warning");
      return;
    }
    const newItems = [
      ...items.map((item) => ({ material_id: item.material_id, caption: item.caption })),
      { material_id: targetId, caption }
    ];
    try {
      const result = await apiRequest(`/api/audits/${auditId}/report/appendix`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems })
      });
      auditData2.report_appendix = result;
      setAuditData(auditData2);
      renderReportAppendix(auditData2);
      showAlert("\u0418\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 PDF", "success");
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C: " + (error.message || "\u041E\u0448\u0438\u0431\u043A\u0430"), "warning");
    }
  }
  async function removeReportAppendixItem(materialId) {
    if (!requireWriteAccess("\u0418\u043B\u043B\u044E\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0434\u043B\u044F PDF")) return;
    const auditId = getCurrentAuditId8();
    const auditData2 = getAuditData6();
    if (!auditId || !auditData2) return;
    const items = getReportAppendixItems2(auditData2).filter((item) => item.material_id !== materialId).map((item) => ({ material_id: item.material_id, caption: item.caption }));
    try {
      const result = await apiRequest(`/api/audits/${auditId}/report/appendix`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      auditData2.report_appendix = result;
      setAuditData(auditData2);
      renderReportAppendix(auditData2);
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C: " + (error.message || "\u041E\u0448\u0438\u0431\u043A\u0430"), "warning");
    }
  }
  async function moveReportAppendixItem(materialId, direction) {
    const auditId = getCurrentAuditId8();
    const auditData2 = getAuditData6();
    if (!auditId || !auditData2) return;
    const items = getReportAppendixItems2(auditData2).map((item) => ({
      material_id: item.material_id,
      caption: item.caption
    }));
    const index = items.findIndex((item) => item.material_id === materialId);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    try {
      const result = await apiRequest(`/api/audits/${auditId}/report/appendix`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      auditData2.report_appendix = result;
      setAuditData(auditData2);
      renderReportAppendix(auditData2);
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0440\u044F\u0434\u043E\u043A: " + (error.message || "\u041E\u0448\u0438\u0431\u043A\u0430"), "warning");
    }
  }
  function renderReportExecutiveHero(summary, data) {
    const box = document.getElementById("reportExecutiveHero");
    if (!box) return;
    const clientLabel = String(
      data?.client_name || document.getElementById("clientName")?.textContent || ""
    ).trim();
    const showHero = data?.workflow_ui?.tabs?.report !== false && !data?.workflow_state?.analysis_failed && !isPreliminaryAudit() && Boolean(clientLabel) && (hasGuidedCompletedAnalysis(data) || Boolean(data?.metrics_summary?.period) || Boolean(data?.direct_analytics?.health));
    if (!showHero) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    const client = data?.client_name || document.getElementById("clientName")?.textContent || "\u041A\u043B\u0438\u0435\u043D\u0442";
    const niche = data?.niche_display || data?.niche || "\u2014";
    const period = data?.metrics_summary?.period || "\u2014";
    const periods = data?.metrics_periods?.periods || [];
    const compareLine = periods.length >= 2 ? `${periods[0]?.period || "?"} \u2192 ${periods[periods.length - 1]?.period || "?"}` : "";
    const fresh = data?.analysis_freshness;
    const asOf = fresh?.last_analysis_at ? formatDate(fresh.last_analysis_at) : "";
    const tagline = String(
      summary?.client_problem || summary?.short_conclusion || ""
    ).trim();
    const taglineShort = tagline.length > 160 ? `${tagline.slice(0, 157)}\u2026` : tagline;
    box.style.display = "block";
    box.innerHTML = `
        <div class="report-hero-inner">
            <p class="report-hero-kicker">\u041E\u0442\u0447\u0451\u0442 \u0434\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430</p>
            <h2 class="report-hero-title">${escapeHtml(client)}</h2>
            <p class="report-hero-meta muted">${escapeHtml(niche)} \xB7 \u043F\u0435\u0440\u0438\u043E\u0434 KPI: <strong>${escapeHtml(period)}</strong>${compareLine ? ` \xB7 \u0432 \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0435: ${escapeHtml(compareLine)}` : ""}${asOf ? ` \xB7 \u0430\u043D\u0430\u043B\u0438\u0437 ${escapeHtml(asOf)}` : ""}</p>
            ${taglineShort ? `<p class="report-hero-tagline">${escapeHtml(taglineShort)}</p>` : ""}
        </div>`;
  }

  // src/audit-detail/audit-ai-setup.js
  var opsHealthTimerId = null;
  var aiModelCatalog = null;
  var aiCostEstimateTimer = null;
  var AI_MODEL_STORAGE = {
    analysis: "ppc_ai_model_analysis",
    chat: "ppc_ai_model_chat"
  };
  var AI_CONTEXT_STORAGE = "ppc_ai_context_options";
  var AI_CONTEXT_DEFAULTS = {
    send_direct_summary: true,
    send_notes: false,
    send_screenshots_ocr: false,
    send_setup_screenshots: false,
    send_direct_campaign_detail: false,
    send_direct_conditions: false,
    send_other_documents: false
  };
  function loadStoredAiContextOptions() {
    try {
      const raw = localStorage.getItem(AI_CONTEXT_STORAGE);
      if (!raw) return { ...AI_CONTEXT_DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...AI_CONTEXT_DEFAULTS, ...parsed };
    } catch {
      return { ...AI_CONTEXT_DEFAULTS };
    }
  }
  function saveStoredAiContextOptions(opts) {
    try {
      localStorage.setItem(AI_CONTEXT_STORAGE, JSON.stringify(opts));
    } catch {
    }
  }
  function countAuditMaterials(predicate) {
    const materials = runtimeBridge.getAuditData?.()?.materials || [];
    return materials.filter((m) => m && !m.excluded_from_analysis && predicate(m)).length;
  }
  function screenshotOcrText(materials, screenshot) {
    const label = `OCR/\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435: ${screenshot.title || ""}`;
    const ocr = (materials || []).find((o) => o.type === "screenshot_ocr" && o.title === label);
    return (ocr?.extracted_text || ocr?.raw_content || "").trim();
  }
  function countScreenshotsWithOcrText() {
    const materials = runtimeBridge.getAuditData?.()?.materials || [];
    return materials.filter(
      (m) => m.type === "screenshot" && !m.excluded_from_analysis && screenshotOcrText(materials, m).length >= 8
    ).length;
  }
  function hasDirectSummaryAvailable() {
    const da = runtimeBridge.getAuditData?.()?.direct_analytics;
    return Boolean(da?.health?.score != null || (da?.monthly || []).length);
  }
  function readAiContextOptionsFromModal() {
    const hasDirect = hasDirectSummaryAvailable();
    return {
      send_direct_summary: hasDirect ? true : Boolean(document.getElementById("aiSendDirectSummary")?.checked),
      send_notes: Boolean(document.getElementById("aiSendNotes")?.checked),
      send_screenshots_ocr: Boolean(document.getElementById("aiSendScreenshotsOcr")?.checked),
      send_setup_screenshots: Boolean(document.getElementById("aiSendSetupScreenshots")?.checked),
      send_direct_campaign_detail: Boolean(document.getElementById("aiSendDirectCampaignDetail")?.checked),
      send_direct_conditions: Boolean(document.getElementById("aiSendDirectConditions")?.checked),
      send_other_documents: Boolean(document.getElementById("aiSendOtherDocuments")?.checked)
    };
  }
  function applyAiContextOptionsToModal(stored) {
    const opts = { ...AI_CONTEXT_DEFAULTS, ...stored };
    const hasDirect = hasDirectSummaryAvailable();
    const directCb = document.getElementById("aiSendDirectSummary");
    const directRow = document.getElementById("aiCtxDirectSummaryRow");
    if (directCb) {
      directCb.checked = hasDirect || opts.send_direct_summary;
      directCb.disabled = hasDirect;
    }
    if (directRow) {
      directRow.classList.toggle("privacy-locked", hasDirect);
      directRow.classList.toggle("privacy-muted", !hasDirect);
    }
    const map = [
      ["aiSendNotes", "send_notes"],
      ["aiSendScreenshotsOcr", "send_screenshots_ocr"],
      ["aiSendSetupScreenshots", "send_setup_screenshots"],
      ["aiSendDirectCampaignDetail", "send_direct_campaign_detail"],
      ["aiSendDirectConditions", "send_direct_conditions"],
      ["aiSendOtherDocuments", "send_other_documents"]
    ];
    map.forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(opts[key]);
    });
    const notesN = countAuditMaterials((m) => m.type === "text_note");
    const ocrN = countScreenshotsWithOcrText();
    const setupN = countAuditMaterials((m) => m.type === "screenshot");
    const docsN = countAuditMaterials((m) => ["document", "table", "pdf", "docx", "text"].includes(m.type));
    const setCount = (id, n, label) => {
      const el = document.getElementById(id);
      if (el) el.textContent = n ? `(${n} ${label})` : "(\u043D\u0435\u0442)";
    };
    setCount("aiCtxNotesCount", notesN, notesN === 1 ? "\u0448\u0442." : "\u0448\u0442.");
    setCount("aiCtxOcrCount", ocrN, "\u0448\u0442.");
    setCount("aiCtxSetupCount", setupN, "\u0448\u0442.");
    setCount("aiCtxDocsCount", docsN, "\u0448\u0442.");
    const disableRow = (rowId, cbId, n) => {
      const row = document.getElementById(rowId);
      const cb = document.getElementById(cbId);
      if (cb) {
        cb.disabled = n === 0;
        if (n === 0) cb.checked = false;
      }
      if (row) row.classList.toggle("privacy-muted", n === 0);
    };
    disableRow("aiCtxNotesRow", "aiSendNotes", notesN);
    disableRow("aiCtxOcrRow", "aiSendScreenshotsOcr", ocrN);
    disableRow("aiCtxSetupRow", "aiSendSetupScreenshots", setupN);
    disableRow("aiCtxDocsRow", "aiSendOtherDocuments", docsN);
    disableRow("aiCtxCampaignsRow", "aiSendDirectCampaignDetail", hasDirect ? 1 : 0);
    disableRow("aiCtxConditionsRow", "aiSendDirectConditions", hasDirect ? 1 : 0);
  }
  function initAiContextOptionsPanel() {
    const stored = loadStoredAiContextOptions();
    const derived = deriveAiContextOptionsFromMaterials();
    const merged = { ...stored };
    if (derived.send_screenshots_ocr) merged.send_screenshots_ocr = true;
    if (derived.send_setup_screenshots) merged.send_setup_screenshots = true;
    if (derived.send_notes) merged.send_notes = true;
    applyAiContextOptionsToModal(merged);
  }
  function bindAiContextOptionListeners() {
    if (window._aiContextOptionsBound) return;
    window._aiContextOptionsBound = true;
    const ids = [
      "aiSendDirectSummary",
      "aiSendNotes",
      "aiSendScreenshotsOcr",
      "aiSendSetupScreenshots",
      "aiSendDirectCampaignDetail",
      "aiSendDirectConditions",
      "aiSendOtherDocuments"
    ];
    ids.forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        saveStoredAiContextOptions(readAiContextOptionsFromModal());
        scheduleAiCostEstimateRefresh();
      });
    });
  }
  async function loadOpsHealthPage() {
    const windowHours = Number(document.getElementById("opsHealthWindow")?.value || 24);
    const api5xxEl = document.getElementById("opsApi5xxHour");
    const failedTotalEl = document.getElementById("opsFailedTotal");
    const byActionEl = document.getElementById("opsFailedByAction");
    const alertsEl = document.getElementById("opsHealthAlerts");
    const updatedAtEl = document.getElementById("opsHealthUpdatedAt");
    if (!api5xxEl || !failedTotalEl || !byActionEl || !alertsEl) return;
    try {
      const data = await apiRequest(`/api/telemetry/ops?hours=${windowHours}`);
      const api5xx = Number(data?.in_memory?.api_5xx_last_hour || 0);
      const failedTotal = Number(data?.failed_runs?.total || 0);
      const byAction = data?.failed_runs?.by_action || {};
      const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
      api5xxEl.textContent = String(api5xx);
      failedTotalEl.textContent = String(failedTotal);
      const rows = Object.entries(byAction).sort((a, b) => Number(b[1]) - Number(a[1])).map(([action, count]) => `${action}: ${count}`);
      byActionEl.textContent = rows.length ? rows.join(" \xB7 ") : "\u041D\u0435\u0442 \u043E\u0448\u0438\u0431\u043E\u043A \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432";
      if (!alerts.length) {
        alertsEl.innerHTML = "";
      } else {
        const hasCritical = alerts.some((a) => String(a?.severity || "").toLowerCase() === "critical");
        alertsEl.innerHTML = `
                <div class="ops-alert-banner ${hasCritical ? "critical" : ""}">
                    <p class="ops-alert-title">\u041E\u043F\u043E\u0432\u0435\u0449\u0435\u043D\u0438\u044F (${windowHours}\u0447)</p>
                    ${alerts.map((a) => `<p class="ops-alert-line">${escapeHtml(a.message || "")}</p>`).join("")}
                </div>
            `;
      }
      if (updatedAtEl) {
        updatedAtEl.textContent = `\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435: ${(/* @__PURE__ */ new Date()).toLocaleTimeString("ru-RU")}`;
      }
    } catch (error) {
      alertsEl.innerHTML = `<div class="ops-alert-banner critical"><p class="ops-alert-title">\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u0435 \u0441\u0438\u0441\u0442\u0435\u043C\u044B</p><p class="ops-alert-line">${escapeHtml(error.message || "\u041E\u0448\u0438\u0431\u043A\u0430")}</p></div>`;
      if (updatedAtEl) {
        updatedAtEl.textContent = `\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435: \u043E\u0448\u0438\u0431\u043A\u0430 \u0432 ${(/* @__PURE__ */ new Date()).toLocaleTimeString("ru-RU")}`;
      }
    }
  }
  function toggleOpsHealthAutoRefresh() {
    const checkbox = document.getElementById("opsHealthAutoRefresh");
    const enabled = Boolean(checkbox?.checked);
    if (opsHealthTimerId) {
      clearInterval(opsHealthTimerId);
      opsHealthTimerId = null;
    }
    if (enabled) {
      opsHealthTimerId = setInterval(() => {
        if (window.location.pathname === "/ops-health") {
          loadOpsHealthPage();
        }
      }, 3e4);
    }
  }
  async function loadAiModelCatalog() {
    if (aiModelCatalog) return aiModelCatalog;
    try {
      aiModelCatalog = await apiRequest("/api/ai/models");
    } catch (error) {
      console.warn("AI model catalog load error:", error);
      aiModelCatalog = { models: [], local_mode: true, default_model_id: "gpt-4o" };
    }
    return aiModelCatalog;
  }
  function populateModelSelect(selectEl, scope) {
    if (!selectEl || !aiModelCatalog) return;
    const models = Array.isArray(aiModelCatalog.models) ? aiModelCatalog.models : [];
    const localMode = Boolean(aiModelCatalog.local_mode);
    selectEl.innerHTML = "";
    if (localMode) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C (\u0431\u0435\u0437 API)";
      selectEl.appendChild(opt);
      selectEl.disabled = true;
      return;
    }
    models.forEach((model) => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = model.label;
      opt.disabled = !model.available;
      if (!model.available && model.disabled_reason) opt.title = model.disabled_reason;
      selectEl.appendChild(opt);
    });
    selectEl.disabled = !canWrite();
    applyStoredModelSelection(scope);
    selectEl.onchange = () => saveModelSelection(scope, selectEl.value);
  }
  function applyStoredModelSelection(scope) {
    const selectId = scope === "chat" ? "chatModelSelect" : "aiModelSelect";
    const selectEl = document.getElementById(selectId);
    if (!selectEl || !aiModelCatalog) return;
    const storageKey = AI_MODEL_STORAGE[scope];
    const stored = localStorage.getItem(storageKey);
    const fallback = aiModelCatalog.default_model_id;
    const candidate = stored || fallback;
    const exists = Array.from(selectEl.options).some((opt) => opt.value === candidate && !opt.disabled);
    if (exists) selectEl.value = candidate;
  }
  function saveModelSelection(scope, modelId) {
    const storageKey = AI_MODEL_STORAGE[scope];
    if (!storageKey || !modelId) return;
    localStorage.setItem(storageKey, modelId);
  }
  function getSelectedModelId(scope) {
    const selectId = scope === "chat" ? "chatModelSelect" : "aiModelSelect";
    const selectEl = document.getElementById(selectId);
    const value = selectEl?.value;
    if (value) return value;
    return localStorage.getItem(AI_MODEL_STORAGE[scope]) || aiModelCatalog?.default_model_id || null;
  }
  function updateAiPrivacyProviderLabel() {
    const providerName = document.getElementById("aiPrivacyProviderName");
    if (!providerName) return;
    const privacySettings2 = runtimeBridge.getPrivacySettings?.();
    const external = Boolean(privacySettings2?.ai?.external_ai_enabled);
    if (!external || aiModelCatalog?.local_mode) {
      providerName.textContent = "\u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437";
      return;
    }
    const select = document.getElementById("aiModelSelect");
    const label = select?.selectedOptions?.[0]?.textContent || "ProxyAPI";
    providerName.textContent = `ProxyAPI \u2192 ${label}`;
  }
  async function initAiModelSelectors() {
    await loadAiModelCatalog();
    populateModelSelect(document.getElementById("aiModelSelect"), "analysis");
    populateModelSelect(document.getElementById("chatModelSelect"), "chat");
    updateAiPrivacyProviderLabel();
    bindAiCostEstimateListeners();
    bindAiContextOptionListeners();
  }
  function formatRubRange(minVal, maxVal) {
    const min = formatRubAmount(minVal);
    const max = formatRubAmount(maxVal);
    if (minVal == null || maxVal == null) return "\u2014";
    if (String(minVal) === String(maxVal)) return min;
    const minBare = min.replace(/\s*₽$/, "");
    return `${minBare} \u2013 ${max}`;
  }
  function formatUsdRange(minVal, maxVal) {
    const min = formatUsdAmount(minVal);
    const max = formatUsdAmount(maxVal);
    if (minVal == null || maxVal == null) return "";
    if (String(minVal) === String(maxVal)) return min;
    return `${min} \u2013 ${max}`;
  }
  function renderAiCostEstimate(estimate) {
    const panel = document.getElementById("aiCostEstimatePanel");
    const body = document.getElementById("aiCostEstimateBody");
    const modelEl = document.getElementById("aiCostEstimateModel");
    const noteEl = document.getElementById("aiCostEstimateNote");
    if (!panel || !body) return;
    panel.classList.remove("is-local", "is-high", "is-loading");
    if (!estimate) {
      if (modelEl) modelEl.textContent = "";
      if (noteEl) noteEl.textContent = "";
      body.innerHTML = '<p class="ai-cost-estimate__error">\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0446\u0435\u043D\u0438\u0442\u044C \u0441\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443.</p>';
      return;
    }
    if (estimate.local_mode) {
      panel.classList.add("is-local");
      if (modelEl) modelEl.textContent = "";
      if (noteEl) noteEl.textContent = "";
      body.innerHTML = `<p class="ai-cost-estimate__placeholder">${escapeHtml(estimate.disclaimer || "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u2014 \u0431\u0435\u0437 \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F \u0441 ProxyAPI.")}</p>`;
      return;
    }
    if (modelEl) modelEl.textContent = estimate.model_label || "";
    const promptTokens = formatTokenCount(estimate.estimated_prompt_tokens);
    const completionMin = formatTokenCount(estimate.estimated_completion_tokens_min);
    const completionMax = formatTokenCount(estimate.estimated_completion_tokens_max);
    const totalRub = formatRubRange(estimate.cost_rub_min, estimate.cost_rub_max);
    const totalUsd = formatUsdRange(estimate.cost_usd_min, estimate.cost_usd_max);
    body.innerHTML = `
        <div class="ai-cost-estimate__total">
            <span class="ai-cost-estimate__total-label">\u0418\u0442\u043E\u0433\u043E (\u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440)</span>
            <span class="ai-cost-estimate__total-value">
                <strong>${escapeHtml(totalRub)}</strong>
                ${totalUsd ? `<span class="ai-cost-estimate__usd">${escapeHtml(totalUsd)}</span>` : ""}
            </span>
        </div>
        <dl class="ai-cost-estimate__breakdown">
            <div class="ai-cost-estimate__row">
                <dt>\u0412\u0445\u043E\u0434 \xB7 \u0432\u0430\u0448 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442</dt>
                <dd>
                    ~${promptTokens} \u0442\u043E\u043A\u0435\u043D\u043E\u0432
                    <span class="ai-cost-estimate__sub">${escapeHtml(formatRubAmount(estimate.cost_input_rub))}${estimate.cost_input_usd ? ` \xB7 ${escapeHtml(formatUsdAmount(estimate.cost_input_usd))}` : ""}</span>
                </dd>
            </div>
            <div class="ai-cost-estimate__row">
                <dt>\u041E\u0442\u0432\u0435\u0442 \xB7 JSON-\u0430\u043D\u0430\u043B\u0438\u0437</dt>
                <dd>
                    ~${completionMin}\u2013${completionMax} \u0442\u043E\u043A\u0435\u043D\u043E\u0432
                    <span class="ai-cost-estimate__sub">${escapeHtml(formatRubRange(estimate.cost_output_rub_min, estimate.cost_output_rub_max))}${estimate.cost_output_usd_min ? ` \xB7 ${escapeHtml(formatUsdRange(estimate.cost_output_usd_min, estimate.cost_output_usd_max))}` : ""}</span>
                </dd>
            </div>
        </dl>
    `;
    if (noteEl) {
      noteEl.textContent = "\u0421\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u2014 \u0432 \u043B\u0438\u0447\u043D\u043E\u043C \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0435 ProxyAPI. \u041E\u0446\u0435\u043D\u043A\u0430 \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u043B\u0438\u0447\u0430\u0442\u044C\u0441\u044F \u043E\u0442 \u0444\u0430\u043A\u0442\u0430.";
    }
    const rubMax = Number(estimate.cost_rub_max);
    if (!Number.isNaN(rubMax) && rubMax >= 500) panel.classList.add("is-high");
  }
  function setAiCostEstimateLoading() {
    const panel = document.getElementById("aiCostEstimatePanel");
    const body = document.getElementById("aiCostEstimateBody");
    const modelEl = document.getElementById("aiCostEstimateModel");
    const noteEl = document.getElementById("aiCostEstimateNote");
    if (!panel || !body) return;
    panel.classList.add("is-loading");
    panel.classList.remove("is-local", "is-high");
    if (modelEl) modelEl.textContent = "";
    if (noteEl) noteEl.textContent = "";
    body.innerHTML = '<p class="ai-cost-estimate__placeholder">\u0421\u0447\u0438\u0442\u0430\u0435\u043C \u043E\u0446\u0435\u043D\u043A\u0443\u2026</p>';
  }
  function buildAnalysisEstimatePayload() {
    const sendRevenueSales = document.getElementById("aiSendRevenueSales")?.checked || false;
    const aiTemperature = Number(document.getElementById("aiTemperatureRange")?.value || 0.3);
    const contextOpts = readAiContextOptionsFromModal();
    return {
      model_id: getSelectedModelId("analysis"),
      privacy_options: {
        send_revenue_sales: sendRevenueSales,
        hide_revenue: !sendRevenueSales,
        ai_temperature: aiTemperature,
        ...contextOpts
      }
    };
  }
  function deriveAiContextOptionsFromMaterials() {
    const materials = runtimeBridge.getAuditData?.()?.materials || [];
    const included = (m) => m && !m.excluded_from_analysis;
    const hasType = (t) => materials.some((m) => included(m) && m.type === t);
    const hasDirect = hasDirectSummaryAvailable();
    return {
      send_direct_summary: hasDirect,
      send_notes: hasType("text_note"),
      send_screenshots_ocr: materials.some(
        (m) => included(m) && m.type === "screenshot" && screenshotOcrText(materials, m).length >= 8
      ),
      send_setup_screenshots: materials.some((m) => included(m) && m.type === "screenshot"),
      send_direct_campaign_detail: hasDirect,
      send_direct_conditions: hasDirect,
      send_other_documents: materials.some(
        (m) => included(m) && ["document", "table", "pdf", "docx", "text"].includes(m.type)
      )
    };
  }
  function buildAnalysisPrivacyPayload({ sendRevenueSales, aiTemperature, aiConsent }) {
    const contextOpts = deriveAiContextOptionsFromMaterials();
    saveStoredAiContextOptions(contextOpts);
    return {
      model_id: getSelectedModelId("analysis"),
      privacy_options: {
        ai_consent: aiConsent,
        send_metrics: true,
        send_business_category: true,
        send_revenue_sales: sendRevenueSales,
        hide_revenue: !sendRevenueSales,
        hide_company_name: true,
        hide_contacts: true,
        hide_file_urls: true,
        ai_temperature: aiTemperature,
        model_id: getSelectedModelId("analysis"),
        ...contextOpts
      }
    };
  }
  var AI_ESTIMATE_TIMEOUT_MS = 25e3;
  async function refreshAiCostEstimate() {
    const auditId = runtimeBridge.getCurrentAuditId?.();
    if (!auditId) return;
    setAiCostEstimateLoading();
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), AI_ESTIMATE_TIMEOUT_MS) : null;
    try {
      const estimate = await apiRequest(`/api/audits/${auditId}/analyze/estimate`, {
        method: "POST",
        body: JSON.stringify(buildAnalysisEstimatePayload()),
        signal: controller?.signal
      });
      renderAiCostEstimate(estimate);
    } catch (error) {
      console.warn("AI cost estimate error:", error);
      const panel = document.getElementById("aiCostEstimateBody");
      if (panel && error?.name === "AbortError") {
        panel.innerHTML = '<p class="ai-cost-estimate__error">\u041E\u0446\u0435\u043D\u043A\u0430 \u0437\u0430\u043D\u044F\u043B\u0430 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E. \u0421\u043D\u0438\u043C\u0438\u0442\u0435 \u043B\u0438\u0448\u043D\u0438\u0435 \u0433\u0430\u043B\u043E\u0447\u043A\u0438 \u0438\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435.</p>';
        return;
      }
      renderAiCostEstimate(null);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  function scheduleAiCostEstimateRefresh() {
    if (aiCostEstimateTimer) clearTimeout(aiCostEstimateTimer);
    aiCostEstimateTimer = setTimeout(() => refreshAiCostEstimate(), 280);
  }
  function bindAiCostEstimateListeners() {
    if (window._aiCostEstimateBound) return;
    window._aiCostEstimateBound = true;
    document.getElementById("aiModelSelect")?.addEventListener("change", () => {
      updateAiPrivacyProviderLabel();
      scheduleAiCostEstimateRefresh();
    });
    document.getElementById("aiSendRevenueSales")?.addEventListener("change", scheduleAiCostEstimateRefresh);
    document.getElementById("aiTemperatureRange")?.addEventListener("input", scheduleAiCostEstimateRefresh);
    document.getElementById("aiTemperatureRange")?.addEventListener("change", scheduleAiCostEstimateRefresh);
  }

  // src/media/stt.js
  var speechRecognition = null;
  var isSpeechListening = false;
  async function toggleBrowserSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const consentBox = document.getElementById("webSpeechConsent");
    if (consentBox && !consentBox.checked) {
      const allowed = await showConfirmDialog({
        title: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043E\u0431\u043B\u0430\u0447\u043D\u043E\u0435 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435",
        message: "Web Speech API \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0432 Chrome/Edge \u0438 \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0430\u0443\u0434\u0438\u043E \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u044B Google. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u0438 \u043A\u043B\u0438\u0435\u043D\u0442\u0430.",
        confirmText: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
        confirmType: "primary"
      });
      if (!allowed) return;
      consentBox.checked = true;
    }
    if (!SpeechRecognition) {
      showAlert("\u0412\u0430\u0448 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 Web Speech API. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0437\u0430\u043F\u0438\u0441\u044C \u0430\u0443\u0434\u0438\u043E \u0438 \u0440\u0443\u0447\u043D\u0443\u044E \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0443.", "warning");
      return;
    }
    if (speechRecognition && isSpeechListening) {
      speechRecognition.stop();
      return;
    }
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = "ru-RU";
    speechRecognition.interimResults = true;
    speechRecognition.continuous = true;
    const btn = document.getElementById("btnSpeechToText");
    const textarea = document.getElementById("audioTranscript");
    let finalTranscript = textarea.value ? textarea.value.trim() + "\n" : "";
    speechRecognition.onstart = () => {
      isSpeechListening = true;
      if (btn) btn.textContent = "\u23F9\uFE0F \u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435";
      const sourceSelect = document.getElementById("audioTranscriptSource");
      if (sourceSelect) sourceSelect.value = "web_speech";
      showAlert("\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u043D\u0430\u0447\u0430\u043B\u043E\u0441\u044C. \u0413\u043E\u0432\u043E\u0440\u0438\u0442\u0435 \u0432 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D.", "info");
    };
    speechRecognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript.trim() + " ";
        } else {
          interim += transcript;
        }
      }
      textarea.value = (finalTranscript + interim).trim();
    };
    speechRecognition.onerror = (event) => {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u0440\u0435\u0447\u0438: " + event.error, "warning");
    };
    speechRecognition.onend = () => {
      isSpeechListening = false;
      if (btn) btn.textContent = "\u{1F5E3}\uFE0F \u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0442\u044C \u0440\u0435\u0447\u044C \u0432 \u0442\u0435\u043A\u0441\u0442";
    };
    speechRecognition.start();
  }

  // src/audit-detail/card.js
  function applyRoleUiRestrictions() {
    if (!isViewerReadOnly()) return;
    [
      "btnAnalyze",
      "btnAnalyzeDraft",
      "chatSendBtn"
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (strictViewerMode) {
        el.style.display = "none";
      } else {
        el.disabled = true;
        el.title = "\u0422\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 (viewer)";
      }
    });
    document.querySelectorAll("button").forEach((btn) => {
      const onclick = btn.getAttribute("onclick") || "";
      if (onclick.includes("openNewMaterial(") || onclick.includes("runAuditAnalysis(") || onclick.includes("editMaterial(") || onclick.includes("deleteMaterial(") || onclick.includes("confirmFinding(") || onclick.includes("rejectFinding(") || onclick.includes("materialReviewAction(") || onclick.includes("acceptDataLimitation(") || onclick.includes("saveFindingEdit(") || onclick.includes("createAudit(") || onclick.includes("openEditClientModal(") || onclick.includes("saveEditClient(") || onclick.includes("openContactModal(") || onclick.includes("openContactModalFromList(") || onclick.includes("duplicateAudit(") || onclick.includes("toggleArchiveAudit(") || onclick.includes("saveContact(") || onclick.includes("deleteContact(") || onclick.includes("runAnalysis(") || onclick.includes("deleteAudit(")) {
        if (strictViewerMode) {
          btn.style.display = "none";
        } else {
          btn.disabled = true;
          btn.title = "\u0422\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 (viewer)";
        }
      }
    });
  }
  function applyAdminUiSegmentation() {
    const isAdmin = isAdminUser();
    const adminDivider = document.getElementById("sourcesAddAdminDivider");
    const cleanupBtn = document.getElementById("sourcesAddCleanupBtn");
    if (adminDivider) adminDivider.style.display = isAdmin ? "" : "none";
    if (cleanupBtn) cleanupBtn.style.display = isAdmin ? "" : "none";
    updateExtractMetricsButtonVisibility(auditData);
    const chatBtn = document.getElementById("tabChatBtn");
    const chatPanel = document.getElementById("tab-chat");
    const chatTab = auditData?.workflow_ui?.tabs?.chat || {};
    const showChat = chatTab.visible !== false && (isAdmin || canWrite());
    if (chatBtn) chatBtn.style.display = showChat ? "" : "none";
    if (chatPanel && !showChat && chatPanel.classList.contains("active")) {
      switchTab("results");
    }
    document.querySelectorAll("button").forEach((btn) => {
      const onclick = btn.getAttribute("onclick") || "";
      if (onclick.includes("deleteMaterial(")) {
        btn.style.display = canWrite() ? "" : "none";
      }
      if (onclick.includes("deleteAudit(")) {
        btn.style.display = isAdmin ? "" : "none";
      }
    });
  }
  function fillMetricsFromSummary(summary) {
    if (!summary) return;
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value == null ? "" : String(value);
    };
    set("metricBudgetInput", summary.budget);
    set("metricClicksInput", summary.clicks);
    set("metricLeadsInput", summary.leads);
    set("metricSalesInput", summary.sales);
    set("metricRevenueInput", summary.revenue);
    set("metricGrossProfitInput", summary.gross_profit);
    set("metricMarginInput", summary.margin_percent);
    applyMetricPeriodFromStored(summary.period || "");
    const err = document.getElementById("metricsFormError");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
  }
  function scrollToMetricsPeriodsPanel() {
    switchTab("data");
    switchDataSubtab("direct");
    setTimeout(() => {
      const panel = document.getElementById("directAnalyticsPanel");
      if (!panel) {
        showAlert("\u0411\u043B\u043E\u043A \u0414\u0438\u0440\u0435\u043A\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 (Ctrl+F5).", "warning");
        return;
      }
      _focusScrollTarget(panel);
    }, 120);
  }
  window.scrollToMetricsPeriodsPanel = scrollToMetricsPeriodsPanel;
  async function openMetricsEditorForNewPeriod(focusIssue = null) {
    if (focusIssue) setMetricsModalFocus(focusIssue);
    if (!auditData?.materials?.length && currentAuditId) {
      await loadAuditDetail();
    }
    const setActiveRow = document.getElementById("metricSetActiveRow");
    const modeHint = document.getElementById("metricsModalModeHint");
    const setActiveInput = document.getElementById("metricSetActiveInput");
    clearEditingMaterialId();
    if (!focusIssue) setMetricsModalFocus("period");
    openNewMaterial("metricsModal");
    if (setActiveRow) setActiveRow.style.display = "none";
    if (modeHint) {
      modeHint.textContent = "\u041D\u043E\u0432\u044B\u0439 \u043C\u0435\u0441\u044F\u0446 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u043E\u0439. \u0412 \u043E\u0442\u0447\u0451\u0442 \u0438 AI \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043E\u043F\u0430\u0434\u0451\u0442 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043C\u0435\u0441\u044F\u0446 \u043F\u043E \u0434\u0430\u0442\u0435.";
    }
    setModalSubmitLabel("metricsModal", false);
    clearMetricPeriodPickers();
    focusMetricsModalField();
  }
  async function openMetricsEditor(focusIssue = null, materialId = null) {
    if (focusIssue) setMetricsModalFocus(focusIssue);
    if (!auditData?.materials?.length && currentAuditId) {
      await loadAuditDetail();
    }
    const periods = auditData?.metrics_periods?.periods || [];
    if (!materialId && periods.length > 0 && focusIssue) {
      const active = periods.find((p) => p.is_active) || periods[periods.length - 1];
      if (active?.material_id) {
        materialId = Number(active.material_id);
      }
    }
    const setActiveRow = document.getElementById("metricSetActiveRow");
    const modeHint = document.getElementById("metricsModalModeHint");
    const setActiveInput = document.getElementById("metricSetActiveInput");
    if (materialId) {
      const mat = getMaterialById(materialId);
      if (!mat) {
        showAlert("\u041F\u0435\u0440\u0438\u043E\u0434 \u043C\u0435\u0442\u0440\u0438\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D", "warning");
        return;
      }
      setEditingMaterialId(mat.id);
      fillMetricsForm(mat);
      if (setActiveRow) setActiveRow.style.display = "none";
      if (modeHint) {
        let importHint = "";
        try {
          const raw = JSON.parse(mat.raw_content || "{}");
          if (raw.import_source === "yandex_direct_xlsx") {
            importHint = " \u0418\u043C\u043F\u043E\u0440\u0442 \u0438\u0437 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0438 \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u2014 \u0435\u0441\u043B\u0438 \u0446\u0438\u0444\u0440\u044B \u0432\u0435\u0440\u043D\u044B, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C\xBB.";
          }
        } catch (_e) {
        }
        modeHint.textContent = mat.needs_review ? `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0435\u0440\u0438\u043E\u0434\u0430.${importHint} \u0426\u0438\u0444\u0440\u044B \u043D\u0435 \u0441\u043C\u0435\u0448\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0441 \u0434\u0440\u0443\u0433\u0438\u043C\u0438 \u043C\u0435\u0441\u044F\u0446\u0430\u043C\u0438.` : `\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430.${importHint} \u0426\u0438\u0444\u0440\u044B \u043D\u0435 \u0441\u043C\u0435\u0448\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0441 \u0434\u0440\u0443\u0433\u0438\u043C\u0438 \u043F\u0435\u0440\u0438\u043E\u0434\u0430\u043C\u0438.`;
      }
      setModalSubmitLabel("metricsModal", true);
      openModal("metricsModal");
      focusMetricsModalField();
      return;
    }
    return openMetricsEditorForNewPeriod(focusIssue);
  }
  window.openMetricsEditor = openMetricsEditor;
  function openMetricsEditorAddPeriod() {
    openMetricsEditorForNewPeriod(null);
  }
  window.openMetricsEditorAddPeriod = openMetricsEditorAddPeriod;
  function openMetricsEditorEdit(materialId) {
    openMetricsEditor(null, materialId);
  }
  window.openMetricsEditorEdit = openMetricsEditorEdit;
  async function activateMetricsPeriod(materialId) {
    if (!requireWriteAccess("\u0421\u043C\u0435\u043D\u0430 \u0431\u0430\u0437\u043E\u0432\u043E\u0433\u043E \u043F\u0435\u0440\u0438\u043E\u0434\u0430 KPI")) return;
    const mid = Number(materialId);
    if (!currentAuditId || !mid) return;
    try {
      const updated = await apiRequest(`/api/audits/${currentAuditId}/metrics-periods/active`, {
        method: "POST",
        body: JSON.stringify({ material_id: mid })
      });
      if (auditData) {
        auditData.metrics_periods = updated;
      }
      showAlert("\u0411\u0430\u0437\u043E\u0432\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434 \u0434\u043B\u044F \u043E\u0442\u0447\u0451\u0442\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D", "success");
      await refreshAuditAndAdvanceGuidedFlow(null);
    } catch (error) {
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0431\u0430\u0437\u043E\u0432\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434: " + error.message, "warning");
    }
  }
  window.activateMetricsPeriod = activateMetricsPeriod;
  async function goToAddAuditData() {
    switchTab("data");
    switchDataSubtab("direct");
  }
  window.goToAddAuditData = goToAddAuditData;
  function isAnalysisStale2(data) {
    return Boolean(data?.analysis_freshness?.analysis_stale);
  }
  function needsMetricsReportExplain(_data) {
    return false;
  }
  function _focusScrollTarget(el) {
    if (!el) return;
    if (el.tagName === "DETAILS") el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("focus-target");
    setTimeout(() => el.classList.remove("focus-target"), 1400);
  }
  async function goToDataImprovements() {
    switchTab("data");
    const blocking = (auditData?.data_issues || []).filter(
      (i) => !i.resolved && !i.visible_after_analysis && i.severity === "blocking"
    );
    if (blocking[0]) {
      openDataItemAction(blocking[0].id, blocking[0]);
      return;
    }
    switchDataSubtab("direct");
    setTimeout(() => {
      const actions = document.getElementById("materialActionsBar");
      if (actions) {
        _focusScrollTarget(actions);
        showAlert("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u0438\u043B\u0438 \u043F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u044B\u0435 \u043A\u043D\u043E\u043F\u043A\u0430\u043C\u0438 \xAB\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\xBB / \xAB\u0417\u0430\u043C\u0435\u0442\u043A\u0430\xBB \u0432\u044B\u0448\u0435.", "info");
        return;
      }
      switchDataSubtab("sources");
      showAlert("\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u0438\u043B\u0438 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u0432\u043E \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438\xBB.", "info");
    }, 120);
  }
  window.goToDataImprovements = goToDataImprovements;
  function openMaterialDrawerFromUi(materialId) {
    openMaterialDrawer(materialId, {
      getMaterialById,
      getAuditData: () => auditData,
      manualMetricsTitle: manualMetricsMaterialTitle,
      renderMetricsCompact,
      formatTimestamps: formatMaterialTimestamps,
      canWrite
    });
  }
  window.openMaterialDrawer = openMaterialDrawerFromUi;
  function renderCoverageProgress(coverage) {
    if (!coverage) return;
    const setBar = (barId, labelId, value) => {
      const bar = document.getElementById(barId);
      const label = document.getElementById(labelId);
      const pct = Math.max(0, Math.min(100, Number(value || 0)));
      if (bar) bar.style.width = `${pct}%`;
      if (label) label.textContent = `${pct}%`;
    };
    setBar("structureProgressBar", "structureProgressLabel", coverage.structure_percent);
    setBar("auditProgressBar", "auditProgressLabel", coverage.audit_percent);
    setBar("reportProgressBar", "reportProgressLabel", coverage.report_percent);
    const reportLabel = document.getElementById("reportProgressLabel");
    const reportPct = Number(coverage.report_percent || 0);
    if (reportLabel && reportPct < 100) {
      reportLabel.textContent = `${Math.max(0, Math.min(100, reportPct))}% (\u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A)`;
      const missing = (coverage.missing_items || []).slice(0, 3).map((i) => i.label).filter(Boolean);
      reportLabel.title = missing.length ? `\u0411\u0430\u0437\u043E\u0432\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u0433\u043E\u0442\u043E\u0432\u044B. \u0414\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u043E\u0442\u0447\u0451\u0442\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442: ${missing.join(", ")}.` : "\u0411\u0430\u0437\u043E\u0432\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u0433\u043E\u0442\u043E\u0432\u044B. \u0414\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u043E\u0442\u0447\u0451\u0442\u0430 \u043D\u0443\u0436\u043D\u044B \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438.";
    }
  }
  function buildAnalysisStaleHtml(data, { compact = false } = {}) {
    const fresh = data?.analysis_freshness;
    if (!fresh?.analysis_stale) return "";
    const items = (fresh.stale_materials || []).slice(0, 5);
    const typeLabels = {
      text_note: "\u0417\u0430\u043C\u0435\u0442\u043A\u0430",
      audio: "\u0410\u0443\u0434\u0438\u043E",
      audio_transcript: "\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430",
      screenshot: "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442",
      screenshot_ocr: "OCR",
      manual_metrics: "\u041C\u0435\u0442\u0440\u0438\u043A\u0438",
      document: "\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442"
    };
    const listHtml = items.length ? `<ul class="stale-materials-list">${items.map((m) => {
      if (m.type === "manual_metrics") {
        return `<li>${escapeHtml(manualMetricsMaterialTitle(m))}</li>`;
      }
      const label = typeLabels[m.type] || m.type || "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B";
      return `<li>${escapeHtml(label)}${m.title ? `: ${escapeHtml(m.title)}` : ""}</li>`;
    }).join("")}</ul>` : "";
    const desync = buildKpiDesyncPreviewHtml(data);
    const title = compact ? "<strong>\u0414\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437</strong>" : "<strong>\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u043E \u043F\u043E\u0441\u043B\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u2014 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0432\u044B\u0432\u043E\u0434\u044B AI</strong>";
    const hint = compact ? '<p class="muted ui-note-tight">\u0422\u0430\u0431\u043B\u0438\u0446\u0430 KPI \u0443\u0436\u0435 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430. \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A \u043E\u0431\u043D\u043E\u0432\u0438\u0442 \u043A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434, findings \u0438 \u0433\u0440\u0430\u0444\u0438\u043A\u0438.</p>' : '<p class="muted ui-note-tight">\u0422\u0430\u0431\u043B\u0438\u0446\u0430 KPI \u0443\u0436\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u043D\u043E\u0432\u044B\u0435 \u0446\u0438\u0444\u0440\u044B. \u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u043E\u0431\u043D\u043E\u0432\u0438\u0442 \u043A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434, findings \u0438 \u0433\u0440\u0430\u0444\u0438\u043A\u0438.</p>';
    return `
        <div class="analysis-stale-bar-inner${compact ? " analysis-stale-bar-inner--compact" : ""}">
            <div class="analysis-stale-bar__content">
                ${title}
                ${hint}
                ${listHtml ? `<p class="muted ui-note-gap">\u0418\u0437\u043C\u0435\u043D\u0451\u043D\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B:</p>${listHtml}` : ""}
                ${desync}
            </div>
            <button type="button" class="btn btn-warning btn-sm" onclick="rerunAuditAnalysis()">\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437</button>
        </div>`;
  }
  function buildKpiDesyncPreviewHtml(data) {
    const fresh = data?.analysis_freshness;
    if (!fresh?.analysis_stale || !fresh.last_analysis_metrics) return "";
    const live = data?.metrics_summary || {};
    const old = fresh.last_analysis_metrics || {};
    const diffs = [];
    const keys = [
      ["cpl", "CPL"],
      ["budget", "\u0411\u044E\u0434\u0436\u0435\u0442"],
      ["leads", "\u0417\u0430\u044F\u0432\u043A\u0438"]
    ];
    keys.forEach(([key, label]) => {
      const liveVal = live[key];
      const oldVal = old[key];
      if (liveVal == null || oldVal == null) return;
      if (Math.abs(Number(liveVal) - Number(oldVal)) < 0.01) return;
      const fmt = key === "budget" || key === "cpl" ? formatMoney : formatNumber;
      diffs.push(`${label}: \u0432 \u0442\u0430\u0431\u043B\u0438\u0446\u0435 ${fmt(liveVal)}, \u0432 \u0432\u044B\u0432\u043E\u0434\u0430\u0445 AI ${fmt(oldVal)}`);
    });
    if (!diffs.length) return "";
    return `<div class="kpi-desync-preview"><strong>\u0420\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 KPI</strong><ul class="stale-materials-list">${diffs.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul></div>`;
  }
  function renderAnalysisStaleBar(data) {
    const bar = document.getElementById("analysisStaleBar");
    if (!bar) return;
    const html = buildAnalysisStaleHtml(data, { compact: false });
    if (!html) {
      bar.style.display = "none";
      bar.innerHTML = "";
      return;
    }
    bar.style.display = "flex";
    bar.innerHTML = html;
  }
  function updateExtractMetricsButtonVisibility(_data) {
  }
  function renderReportAnalysisMeta(data) {
    const el = document.getElementById("reportAnalysisMeta");
    if (!el) return;
    const fresh = data?.analysis_freshness;
    if (!fresh?.last_analysis_at || !hasGuidedCompletedAnalysis(data)) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    const types = fresh.last_analysis_material_types || [];
    const typeLabels = {
      text_note: "\u0437\u0430\u043C\u0435\u0442\u043A\u0438",
      manual_metrics: "\u043C\u0435\u0442\u0440\u0438\u043A\u0438",
      document: "\u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B",
      audio_transcript: "\u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0438",
      screenshot_ocr: "OCR"
    };
    const typeLine = types.length ? types.map((t) => typeLabels[t] || t).join(", ") : "\u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0430\u0443\u0434\u0438\u0442\u0430";
    el.style.display = "block";
    el.textContent = `\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 AI-\u0430\u043D\u0430\u043B\u0438\u0437: ${formatDate(fresh.last_analysis_at)}. \u0412 \u0430\u043D\u0430\u043B\u0438\u0437\u0435: ${typeLine}.`;
  }
  function renderMetricsKpiSource(data) {
    const el = document.getElementById("metricsKpiSource");
    if (!el) return;
    const da = data?.direct_analytics;
    const monthly = da?.monthly || [];
    if (!monthly.length && !da?.totals?.cost) {
      el.style.display = "none";
      el.innerHTML = "";
      return;
    }
    const period = da?.period || (monthly.length >= 2 ? `${monthly[0]?.month} \u2014 ${monthly[monthly.length - 1]?.month}` : monthly[0]?.month || "");
    el.style.display = "block";
    el.innerHTML = `<div class="muted">\u041E\u0446\u0435\u043D\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 \u0438 \u0433\u0440\u0430\u0444\u0438\u043A\u0438 \xAB\u0420\u0430\u0441\u0445\u043E\u0434 \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C\xBB \u2014 \u0438\u0437 Excel \u0414\u0438\u0440\u0435\u043A\u0442\u0430${period ? ` (${escapeHtml(period)})` : ""}. \u0422\u0430\u0431\u043B\u0438\u0446\u0430 KPI \u043D\u0438\u0436\u0435 \u2014 \u0438\u0437 \u0444\u043E\u0440\u043C\u044B \xAB\u041F\u0435\u0440\u0438\u043E\u0434 KPI\xBB.</div>`;
  }
  function renderReportActivePeriodNote(data, metrics) {
    const el = document.getElementById("reportActivePeriodNote");
    if (!el) return;
    const periods = data?.metrics_periods?.periods || [];
    const active = periods.find((p) => p.is_active);
    const label = String(metrics?.period || active?.period || "").trim();
    if (!label && !periods.length) {
      el.style.display = "none";
      el.innerHTML = "";
      return;
    }
    const compareHint = periods.length >= 2 ? ` \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \xAB\u0431\u044B\u043B\u043E/\u0441\u0442\u0430\u043B\u043E\xBB: <strong>${escapeHtml(periods[0]?.period || "\u2014")} \u2192 ${escapeHtml(periods[periods.length - 1]?.period || "\u2014")}</strong>.` : "";
    const activeHint = label ? `\u0412 \u0442\u0430\u0431\u043B\u0438\u0446\u0435 \u2014 <strong>\u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u043C\u0435\u0441\u044F\u0446 \u043F\u043E \u0434\u0430\u0442\u0435</strong>: <strong>${escapeHtml(label)}</strong> (\u043E\u0442\u0447\u0451\u0442 \u0438 AI).` : "";
    el.style.display = "block";
    el.innerHTML = `${activeHint}${compareHint} \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043C\u0435\u0441\u044F\u0446 \u2014 \xAB+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0438\u043E\u0434\xBB \u0438\u043B\u0438 \xAB\u0414\u0430\u043D\u043D\u044B\u0435 \u2192 \u0414\u0438\u0440\u0435\u043A\u0442\xBB.`;
  }
  function renderReportStaleDetails(data) {
    const box = document.getElementById("reportStaleDetails");
    if (!box) return;
    const topBar = document.getElementById("analysisStaleBar");
    const topStaleVisible = topBar && topBar.style.display !== "none" && Boolean(topBar.innerHTML?.trim());
    if (topStaleVisible) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    const desyncOnly = buildKpiDesyncPreviewHtml(data);
    if (!data?.analysis_freshness?.analysis_stale) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    if (desyncOnly) {
      box.style.display = "block";
      box.innerHTML = desyncOnly;
      return;
    }
    const html = buildAnalysisStaleHtml(data, { compact: true });
    if (!html) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    box.style.display = "block";
    box.innerHTML = `<div class="analysis-stale-bar analysis-stale-bar--report">${html}</div>`;
  }
  function formatMaterialTimestamps(createdAt, updatedAt) {
    if (!createdAt) return "";
    const createdLabel = formatDate(createdAt);
    const updatedMs = updatedAt ? parseApiDateMs(updatedAt) : parseApiDateMs(createdAt);
    const createdMs = parseApiDateMs(createdAt);
    const wasEdited = Number.isFinite(updatedMs) && Number.isFinite(createdMs) && updatedMs - createdMs > 1e3;
    if (wasEdited) {
      return `
            <div class="material-meta">
                <span>\u0421\u043E\u0437\u0434\u0430\u043D: ${createdLabel}</span>
                <span>\u0418\u0437\u043C\u0435\u043D\u0451\u043D: ${formatDate(updatedAt)}</span>
            </div>
        `;
    }
    return `<div class="material-meta"><span>\u0421\u043E\u0437\u0434\u0430\u043D: ${createdLabel}</span></div>`;
  }
  function isAnalysisLikelyStuck(data) {
    if (!data || data.status !== "in_progress") return false;
    const updatedAt = data.updated_at ? parseApiDateMs(data.updated_at) : 0;
    const ageMs = updatedAt ? Date.now() - updatedAt : 0;
    return ageMs > 8 * 60 * 1e3;
  }
  async function resetStuckAnalysis() {
    if (!requireWriteAccess("\u0421\u0431\u0440\u043E\u0441 \u0430\u043D\u0430\u043B\u0438\u0437\u0430")) return;
    if (!currentAuditId) return;
    const accepted = await showConfirmDialog({
      title: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0437\u0430\u0432\u0438\u0441\u0448\u0438\u0439 \u0430\u043D\u0430\u043B\u0438\u0437",
      message: "\u0421\u0442\u0430\u0442\u0443\u0441 \xAB\u0432 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435\xBB \u0431\u0443\u0434\u0435\u0442 \u0441\u043D\u044F\u0442. \u041F\u043E\u0441\u043B\u0435 \u044D\u0442\u043E\u0433\u043E \u043C\u043E\u0436\u043D\u043E \u0441\u043D\u043E\u0432\u0430 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C AI-\u0430\u043D\u0430\u043B\u0438\u0437.",
      confirmText: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C",
      cancelText: "\u041E\u0442\u043C\u0435\u043D\u0430",
      confirmType: "danger"
    });
    if (!accepted) return;
    try {
      showLoader();
      const result = await apiRequest(`/api/audits/${currentAuditId}/analyze/reset`, { method: "POST" });
      hideLoader();
      showAlert(result?.message || "\u0421\u0442\u0430\u0442\u0443\u0441 \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0441\u0431\u0440\u043E\u0448\u0435\u043D", "success");
      closeAnalysisSocket();
      hideAnalysisProgress();
      await loadAuditDetail();
    } catch (error) {
      hideLoader();
      showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437: " + error.message, "danger");
    }
  }
  window.resetStuckAnalysis = resetStuckAnalysis;
  var currentAuditId = null;
  var auditData = null;
  var METRIC_FIELD_LABELS2 = {
    period: "\u041F\u0435\u0440\u0438\u043E\u0434",
    budget: "\u0411\u044E\u0434\u0436\u0435\u0442 (\u20BD)",
    clicks: "\u041A\u043B\u0438\u043A\u0438",
    leads: "\u0417\u0430\u044F\u0432\u043A\u0438",
    sales: "\u041F\u0440\u043E\u0434\u0430\u0436\u0438",
    revenue: "\u0412\u044B\u0440\u0443\u0447\u043A\u0430 (\u20BD)"
  };
  var privacySettings = null;
  async function loadPrivacySettings() {
    try {
      privacySettings = await apiRequest("/api/privacy/settings");
    } catch (error) {
      console.warn("Privacy settings load error:", error);
      privacySettings = null;
    }
  }
  function setAiPrivacyModalDefaults() {
    const ai = privacySettings?.ai || {};
    const defaults = privacySettings?.defaults || {};
    const external = Boolean(ai.external_ai_enabled);
    const providerName = document.getElementById("aiPrivacyProviderName");
    const providerUrl = document.getElementById("aiPrivacyProviderUrl");
    const consentBlock = document.getElementById("aiExternalConsentBlock");
    const consent = document.getElementById("aiExternalConsent");
    const revenue = document.getElementById("aiSendRevenueSales");
    const tempRange = document.getElementById("aiTemperatureRange");
    const tempValue = document.getElementById("aiTemperatureValue");
    const modeLabel = (val) => {
      const n = Number(val);
      if (n <= 0.3) return "\u0422\u043E\u0447\u043D\u044B\u0439 \u0440\u0430\u0441\u0447\u0451\u0442";
      if (n <= 0.5) return "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0430\u0443\u0434\u0438\u0442";
      if (n <= 0.7) return "\u041A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435";
      return "\u0413\u0438\u043F\u043E\u0442\u0435\u0437\u044B \u0438 \u0438\u0434\u0435\u0438";
    };
    if (tempRange && tempValue) {
      const defaultTemp = privacySettings?.temperature?.analysis ?? 0.3;
      tempRange.value = String(defaultTemp);
      tempValue.textContent = modeLabel(defaultTemp);
      tempRange.oninput = () => {
        tempValue.textContent = modeLabel(tempRange.value);
      };
    }
    if (providerName) {
      updateAiPrivacyProviderLabel();
      if (!external) providerName.textContent = "\u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u043D\u0430\u043B\u0438\u0437";
    }
    if (providerUrl) {
      if (external && ai.privacy_url) {
        providerUrl.innerHTML = `<a href="${escapeHtml(ai.privacy_url)}" target="_blank" rel="noopener">\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438 \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430</a>`;
      } else if (external) {
        providerUrl.innerHTML = '\u0417\u0430\u043F\u0440\u043E\u0441 \u0447\u0435\u0440\u0435\u0437 <a href="https://proxyapi.ru/docs" target="_blank" rel="noopener">ProxyAPI</a>. \u0411\u0430\u043B\u0430\u043D\u0441 \u0438 \u0441\u0447\u0451\u0442 \u2014 \u0432 \u043B\u0438\u0447\u043D\u043E\u043C \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0435 proxyapi.ru.';
      } else {
        providerUrl.textContent = "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0432\u043D\u0435\u0448\u043D\u0435\u043C\u0443 AI-\u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0443.";
      }
    }
    if (consentBlock) consentBlock.style.display = external ? "block" : "none";
    if (consent) consent.checked = !external;
    if (revenue) revenue.checked = Boolean(defaults.send_revenue_sales);
  }
  function showAiPrivacyDialog() {
    return new Promise((resolve) => {
      const modal = document.getElementById("aiPrivacyModal");
      if (!modal) {
        showAlert("\u041E\u043A\u043D\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u0438\u0432\u0430\u0442\u043D\u043E\u0441\u0442\u0438 AI \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0430\u0443\u0434\u0438\u0442\u0430.", "danger");
        resolve(null);
        return;
      }
      setAiPrivacyModalDefaults();
      openModal("aiPrivacyModal");
      initAiContextOptionsPanel();
      refreshAiCostEstimate();
      initAiModelSelectors().then(() => {
        setAiPrivacyModalDefaults();
        initAiContextOptionsPanel();
        refreshAiCostEstimate();
      });
      const btnStart = document.getElementById("aiPrivacyStart");
      const btnCancel = document.getElementById("aiPrivacyCancel");
      const btnClose = modal.querySelector(".modal-close");
      if (!btnStart || !btnCancel) {
        showAlert("\u041E\u043A\u043D\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u0438\u0432\u0430\u0442\u043D\u043E\u0441\u0442\u0438 AI \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u043E: \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u043A\u043D\u043E\u043F\u043A\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 \u0438\u043B\u0438 \u043E\u0442\u043C\u0435\u043D\u044B.", "danger");
        closeModal("aiPrivacyModal");
        resolve(null);
        return;
      }
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        closeModal("aiPrivacyModal");
        resolve(value);
      };
      const onCancel = () => finish(null);
      const onOverlayClick = (event) => {
        if (event.target === modal) onCancel();
      };
      const cleanup = () => {
        btnStart.removeEventListener("click", onStart);
        btnCancel.removeEventListener("click", onCancel);
        btnClose?.removeEventListener("click", onCancel);
        modal.removeEventListener("click", onOverlayClick);
      };
      const onStart = () => {
        const ai = privacySettings?.ai || {};
        const external = Boolean(ai.external_ai_enabled);
        const consent = document.getElementById("aiExternalConsent")?.checked || false;
        const sendRevenueSales = document.getElementById("aiSendRevenueSales")?.checked || false;
        const aiTemperature = Number(document.getElementById("aiTemperatureRange")?.value || 0.3);
        if (external && !consent) {
          showAlert("\u041D\u0443\u0436\u043D\u043E \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0443 \u043E\u0431\u0435\u0437\u043B\u0438\u0447\u0435\u043D\u043D\u043E\u0433\u043E \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430 \u0432\u043E \u0432\u043D\u0435\u0448\u043D\u0438\u0439 AI-\u0441\u0435\u0440\u0432\u0438\u0441.", "warning");
          return;
        }
        finish(buildAnalysisPrivacyPayload({
          sendRevenueSales,
          aiTemperature,
          aiConsent: !external || consent
        }));
      };
      btnStart.addEventListener("click", onStart);
      btnCancel.addEventListener("click", onCancel);
      btnClose?.addEventListener("click", onCancel);
      modal.addEventListener("click", onOverlayClick);
    });
  }
  async function buildAnalysisPayload() {
    if (!privacySettings) await loadPrivacySettings();
    return await showAiPrivacyDialog();
  }
  async function loadAuditDetail() {
    const auditId = getAuditIdFromUrl();
    if (!auditId) return;
    currentAuditId = auditId;
    try {
      auditData = await apiRequest(`/api/audits/${auditId}`);
      renderAuditDetail(auditData);
      return auditData;
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0430\u0443\u0434\u0438\u0442\u0430: " + error.message, "danger");
      return null;
    }
  }
  function getAuditIdFromUrl() {
    const match = window.location.pathname.match(/\/audits\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
  function renderAuditDetail(data) {
    document.getElementById("clientName").textContent = data.client_name;
    const clientName2 = document.getElementById("clientName2");
    if (clientName2) clientName2.textContent = data.client_name;
    const clientRegion = document.getElementById("clientRegion");
    if (clientRegion) clientRegion.textContent = data.region || "\u2014";
    document.getElementById("clientNiche").textContent = data.niche_display || data.niche || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430";
    document.getElementById("clientWebsite").textContent = data.website || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D";
    document.getElementById("auditGoal").textContent = data.goal || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u0430";
    document.getElementById("clientComment").textContent = data.comment || "\u041D\u0435\u0442";
    renderClientContacts(data.contacts || []);
    renderDataNowSummary(data);
    updateDataSubtabBadges(data);
    restoreDataSubtab(data);
    renderMaterials(data.materials || [], data.data_coverage);
    renderReportCharts(data);
    renderAuditFlow(data.data_coverage);
    renderSummary(data.audit_summary, data.metrics_summary, data.data_coverage);
    renderReportSummaryEditor(data.audit_summary, data.data_coverage);
    renderReportSendStatus(data);
    initReportClientViewToggle();
    renderReportSendChecklist(data.id);
    renderReportExecutiveHero(data.audit_summary, data);
    renderReportConfirmedPreview(data);
    renderReportPreliminarySections(data.data_coverage);
    applyWorkflowReportVisibility(data);
    renderAuditCommandBar(data);
    renderDataIssues(data.data_issues || []);
    renderAnalyticsReadiness(data.data_coverage);
    renderDirectAnalyticsPanel(data);
    renderAuditPlanCard(data);
    renderResultsIssues(data.data_issues || []);
    renderFindings(data.findings || [], data.data_coverage);
    renderCommercialOffer(data.commercial_offer, "offerContainer", data.data_coverage, { hideWhenPendingReview: true });
    renderCommercialOffer(data.commercial_offer, "reportOfferContainer", data.data_coverage, { hideWhenPendingReview: false });
    renderRecommendations(data.findings || [], data.commercial_offer, data.data_coverage);
    syncFindingsAuxPanelsVisibility();
    loadKbStatusCard();
    applyWorkflowTabs(data.workflow_ui?.tabs, data);
    renderGuidedFirstRun(data);
    applyFocusModeLayout(data);
    renderChatHistory();
    applyRoleUiRestrictions();
    applyAdminUiSegmentation();
    if (window.location.hash === "#client-contacts") {
      switchTab("report");
      requestAnimationFrame(() => {
        document.getElementById("clientContactsCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    consumePostAnalysisNavigation();
    consumeAnalysisCompleteModal(data);
    renderDirectHealthReport(data);
    if (document.getElementById("tab-report")?.classList.contains("active")) {
      loadComparison();
    }
  }
  function manualMetricsMaterialTitle(material) {
    const title = (material?.title || "").trim();
    if (title) return title;
    try {
      const raw = JSON.parse(material?.raw_content || "{}");
      if (raw.period) return `\u041C\u0435\u0442\u0440\u0438\u043A\u0438: ${raw.period}`;
    } catch (_e) {
    }
    return "\u041C\u0435\u0442\u0440\u0438\u043A\u0438";
  }
  function getStatusLabel(status) {
    const labels = {
      "draft": "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A",
      "in_progress": "\u0412 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0435",
      "completed": "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D",
      "needs_review": "\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438",
      "failed": "\u041E\u0448\u0438\u0431\u043A\u0430"
    };
    return labels[status] || status;
  }
  function renderMaterials(materials, coverage) {
    renderMaterialsGrouped(materials, coverage, {
      getAuditData: () => auditData,
      manualMetricsTitle: manualMetricsMaterialTitle,
      renderMetricsCompact,
      formatTimestamps: formatMaterialTimestamps,
      canWrite
    });
  }
  function formatMetricsPreview(raw) {
    try {
      const data = JSON.parse(raw);
      const visibleKeys = ["period", "budget", "clicks", "leads", "sales", "revenue"];
      return visibleKeys.filter((k) => data[k] !== void 0 && data[k] !== null && data[k] !== "").map((k) => `${METRIC_FIELD_LABELS2[k] || k}: ${data[k]}`).join("\n");
    } catch (e) {
      return raw;
    }
  }
  function renderMetricsCompact(raw) {
    try {
      const data = JSON.parse(raw || "{}");
      const rows = [
        ["\u041F\u0435\u0440\u0438\u043E\u0434", data.period],
        ["\u0411\u044E\u0434\u0436\u0435\u0442", data.budget != null ? formatMoney(data.budget) : null],
        ["\u041A\u043B\u0438\u043A\u0438", data.clicks != null ? formatNumber(data.clicks) : null],
        ["\u0417\u0430\u044F\u0432\u043A\u0438", data.leads != null ? formatNumber(data.leads) : null],
        ["\u041F\u0440\u043E\u0434\u0430\u0436\u0438", data.sales != null ? formatNumber(data.sales) : null],
        ["\u0412\u044B\u0440\u0443\u0447\u043A\u0430", data.revenue != null ? formatMoney(data.revenue) : null]
      ].filter(([, v]) => v !== null && v !== void 0 && v !== "");
      if (!rows.length) return "";
      return `<div class="metrics-compact">${rows.map(([k, v]) => `<div class="metrics-compact-item"><span class="k">${escapeHtml(String(k))}</span><span class="v">${escapeHtml(String(v))}</span></div>`).join("")}</div>`;
    } catch (_error) {
      return `<pre class="metrics-preview">${escapeHtml(formatMetricsPreview(raw))}</pre>`;
    }
  }
  function severityLabel2(value) {
    return { high: "\u0432\u044B\u0441\u043E\u043A\u0438\u0439", medium: "\u0441\u0440\u0435\u0434\u043D\u0438\u0439", low: "\u043D\u0438\u0437\u043A\u0438\u0439" }[String(value || "").toLowerCase()] || value || "\u2014";
  }
  function chartBarEntries(chart) {
    const data = chart?.data;
    if (!data) return [];
    const labels = data.labels;
    const values = data.datasets?.[0]?.data;
    if (Array.isArray(labels) && labels.length && Array.isArray(values)) {
      return labels.map((label, idx) => [String(label ?? "\u2014"), values[idx]]);
    }
    if (Array.isArray(values) && values.length) {
      return values.map((value, idx) => [`\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u044F ${idx + 1}`, value]);
    }
    return Object.entries(data).filter(([key]) => !["labels", "datasets"].includes(key));
  }
  function chartNumericTotal(chart) {
    return chartBarEntries(chart).reduce((s, [, value]) => s + (Number(value) || 0), 0);
  }
  function buildReportCampaignChart(data) {
    const campaigns = data?.direct_analytics?.campaigns || [];
    if (campaigns.length < 2) return null;
    const top = [...campaigns].sort((a, b) => (Number(b.leads) || 0) - (Number(a.leads) || 0)).slice(0, 8);
    const total = top.reduce((s, c) => s + (Number(c.leads) || 0), 0);
    if (total <= 0) return null;
    return {
      type: "bar",
      title: "\u0417\u0430\u044F\u0432\u043A\u0438 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C",
      description: "\u0410\u0433\u0440\u0435\u0433\u0430\u0442 \u0437\u0430 \u0432\u0435\u0441\u044C \u043F\u0435\u0440\u0438\u043E\u0434 \u043E\u0442\u0447\u0451\u0442\u0430 (Excel \u0414\u0438\u0440\u0435\u043A\u0442\u0430)",
      source: "direct_slice",
      data: {
        labels: top.map((c) => String(c.campaign_name || c.campaign_id || "\u2014").slice(0, 40)),
        datasets: [{ label: "\u0417\u0430\u044F\u0432\u043A\u0438", data: top.map((c) => Number(c.leads) || 0) }]
      }
    };
  }
  function dedupeChartsPreferDirect(pool) {
    const byTitle = /* @__PURE__ */ new Map();
    for (const chart of pool || []) {
      const key = (chart.title || "").trim().toLowerCase();
      const existing = byTitle.get(key);
      if (!existing) {
        byTitle.set(key, chart);
        continue;
      }
      const score = (c) => chartNumericTotal(c) + (c.source === "direct_slice" ? 1e9 : 0);
      if (score(chart) > score(existing)) byTitle.set(key, chart);
    }
    return [...byTitle.values()];
  }
  function countMetricPeriods(data) {
    return (data?.materials || []).filter((m) => m.type === "metrics").length;
  }
  function pickReportCharts(data) {
    const hasKpiDynamics = countMetricPeriods(data) >= 2;
    const campaignChart = buildReportCampaignChart(data);
    let pool = dedupeChartsPreferDirect([
      ...data?.charts || [],
      ...data?.direct_analytics?.charts || []
    ]);
    pool = pool.filter((c) => !/(заявки|лиды) по кампаниям/i.test(String(c.title || "")));
    if (campaignChart) pool.push(campaignChart);
    let candidates = pool.filter((c) => chartBarEntries(c).length > 0 && chartNumericTotal(c) > 0);
    if (hasKpiDynamics) {
      candidates = candidates.filter((c) => !/по месяцам/i.test(String(c.title || "")));
    }
    const order = [/(заявки|лиды) по кампаниям/i, /расход по месяцам/i, /(заявки|лиды) по месяцам/i, /cpl по месяцам/i];
    const picked = [];
    for (const re of order) {
      const found = candidates.find((c) => re.test(String(c.title || "")));
      if (found) picked.push(found);
    }
    if (picked.length < 2) {
      const zone = candidates.find((c) => c.type === "score" || String(c.title || "").includes("\u0437\u043E\u043D"));
      if (zone && !picked.includes(zone)) picked.push(zone);
    }
    for (const c of candidates) {
      if (picked.length >= 2) break;
      if (!picked.includes(c)) picked.push(c);
    }
    return picked.slice(0, 2);
  }
  function reportChartDescription(chart) {
    const desc = String(chart?.description || "").trim();
    if (!desc || /ошибка/i.test(desc)) return "";
    if (chart?.source === "direct_slice") return desc;
    return chartNumericTotal(chart) > 0 ? desc : "";
  }
  function renderReportCharts(data) {
    const container = document.getElementById("chartsContainer");
    const items = pickReportCharts(data);
    if (!container) return;
    if (!items.length) {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }
    container.style.display = "";
    renderCharts(items, data.data_coverage, "chartsContainer", { reportMode: true });
  }
  function renderCharts(charts, coverage, containerId = "chartsContainer", options = {}) {
    const { reportMode = false } = options;
    const container = document.getElementById(containerId);
    if (!container) return;
    const onDirectPanel = containerId === "directChartsPanel";
    const directCharts = (charts || []).filter((c) => c.source === "direct_slice").filter((c) => !/(по месяцам|CPL по месяцам|(заявки|лиды) по месяцам)/i.test(String(c.title || "")));
    const chartPool = onDirectPanel ? directCharts : charts || [];
    if (!chartPool.length) {
      if (onDirectPanel) {
        container.innerHTML = "";
        container.style.display = "none";
        return;
      }
      container.innerHTML = `
            <div class="card chart-placeholder">
                <div class="card-header"><h3>\u0413\u0440\u0430\u0444\u0438\u043A\u0438</h3></div>
                <div class="card-body">
                    <p class="muted">${coverage?.is_preliminary ? "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0443 \u042F\u043D\u0434\u0435\u043A\u0441 \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u0438\u043B\u0438 \u043C\u0438\u043D\u0438\u043C\u0443\u043C 2 \u043F\u0435\u0440\u0438\u043E\u0434\u0430 KPI, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0441\u0442\u0440\u043E\u0438\u0442\u044C baseline-\u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0443." : "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043C\u0438\u043D\u0438\u043C\u0443\u043C 2 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0445 \u043F\u0435\u0440\u0438\u043E\u0434\u0430 \u043C\u0435\u0442\u0440\u0438\u043A, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0434\u0438\u043D\u0430\u043C\u0438\u043A\u0443 \u0438 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u0434\u043E/\u043F\u043E\u0441\u043B\u0435."}</p>
                </div>
            </div>`;
      return;
    }
    container.style.display = "";
    const zoneChart = chartPool.find((c) => c.type === "score" || c.title && c.title.includes("\u0437\u043E\u043D"));
    const chartItems = onDirectPanel ? chartPool.filter((c) => c !== zoneChart).slice(0, 3) : reportMode ? chartPool : zoneChart ? [zoneChart] : chartPool.slice(0, 1);
    const chartIdPrefix = reportMode ? "horizontalChart_report_" : onDirectPanel ? "horizontalChart_direct_" : "horizontalChart_";
    container.innerHTML = chartItems.map((c, i) => {
      const desc = reportMode ? reportChartDescription(c) : c.description || "";
      return `
        <div class="card chart-wrapper">
            <div class="card-header"><h3>${escapeHtml(humanizeDisplayText(c.title || "\u0413\u0440\u0430\u0444\u0438\u043A\u0438"))}</h3></div>
            <div class="card-body">
                ${desc ? `<p class="muted chart-desc">${escapeHtml(desc)}</p>` : ""}
                <div class="horizontal-bar-chart" id="${chartIdPrefix}${i}"></div>
                ${c.insight ? `<div class="chart-insight">${escapeHtml(c.insight)}</div>` : ""}
                ${c.needs_review ? `<div class="needs-review-block"><span class="review-label">\u26A0\uFE0F</span> ${escapeHtml(c.review_reason)}</div>` : ""}
            </div>
        </div>`;
    }).join("");
    setTimeout(() => {
      chartItems.forEach((c, i) => {
        const host = document.getElementById(`${chartIdPrefix}${i}`);
        if (!host || !c.data) return;
        const entries = chartBarEntries(c);
        const nums = entries.map(([, value]) => Number(value) || 0);
        const total = nums.reduce((s, n) => s + n, 0);
        if (!entries.length || total === 0) {
          const isCampaigns = /кампани/i.test(String(c.title || ""));
          host.innerHTML = `<p class="muted chart-empty-data">${isCampaigns ? "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C \u0432 Excel. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043E\u0442\u0447\u0451\u0442 \u0441 \u043B\u0438\u0441\u0442\u043E\u043C \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0439 (\u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0414\u0430\u043D\u043D\u044B\u0435 \u2192 \u0414\u0438\u0440\u0435\u043A\u0442\xBB)." : "\u041D\u0435\u0442 \u043D\u0435\u043D\u0443\u043B\u0435\u0432\u044B\u0445 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0439. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 Excel \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u0438\u043B\u0438 \u043F\u0435\u0440\u0438\u043E\u0434\u044B KPI."}</p>`;
          return;
        }
        const maxVal = Math.max(...nums, 1);
        host.innerHTML = entries.map(([label, value]) => {
          const num = Number(value) || 0;
          const pct = Math.min(100, num / maxVal * 100);
          return `
                <div class="hbar-row">
                    <div class="hbar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
                    <div class="hbar-track"><div class="hbar-fill" style="--bar-fill:${pct}%"></div></div>
                    <div class="hbar-value">${escapeHtml(String(value))}</div>
                </div>`;
        }).join("");
      });
    }, 50);
  }
  function renderAuditFlow(coverage) {
    const container = document.getElementById("auditFlowContainer");
    if (!container) return;
    if (!isAdminUser()) {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }
    container.style.display = "block";
    const steps = [
      "\u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B",
      "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445",
      "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B",
      "\u0413\u0438\u043F\u043E\u0442\u0435\u0437\u044B",
      "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438",
      "\u041F\u043B\u0430\u043D \u0440\u0430\u0431\u043E\u0442",
      "\u041E\u0442\u0447\u0451\u0442"
    ];
    container.innerHTML = `
        <details class="card">
            <summary class="card-header card-summary-clickable"><h3>\u041B\u043E\u0433\u0438\u043A\u0430 \u0430\u0443\u0434\u0438\u0442\u0430 \u0438 \u0440\u0435\u0448\u0435\u043D\u0438\u044F (\u0442\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0431\u043B\u043E\u043A)</h3></summary>
            <div class="card-body">
                <p class="muted">\u041A\u0430\u043A \u0441\u0438\u0441\u0442\u0435\u043C\u0430 \u043E\u0442\u0434\u0435\u043B\u044F\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u043E\u0442 \u0433\u0438\u043F\u043E\u0442\u0435\u0437.</p>
                <div class="audit-flow-diagram">
                    ${steps.map((step, idx) => `
                        <div class="audit-flow-step">
                            <div class="audit-flow-node">${escapeHtml(step)}</div>
                            ${idx < steps.length - 1 ? '<div class="audit-flow-arrow">\u2192</div>' : ""}
                        </div>
                    `).join("")}
                </div>
                ${coverage?.is_preliminary ? '<p class="muted ui-note-section">\u0421\u0435\u0439\u0447\u0430\u0441 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043E\u0442\u0447\u0451\u0442\u0430 \u2014 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0434\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0433\u043E \u0446\u0438\u043A\u043B\u0430.</p>' : ""}
            </div>
        </details>`;
  }
  var directConditionsViewCtx = null;
  function getDirectConditionsView(campaignKey = "") {
    const cond = directConditionsViewCtx?.conditions;
    if (!cond) return null;
    if (!campaignKey) return cond;
    const blocks = cond.by_campaign || [];
    const idx = Number(campaignKey);
    const block = !Number.isNaN(idx) && blocks[idx] != null ? blocks[idx] : blocks.find((c) => String(c.campaign_id ?? "") === campaignKey || String(c.campaign_name || "") === campaignKey);
    if (!block) return { top_by_spend: [], high_spend_zero_leads: [], top_best_cpl: [], top_worst_cpl: [] };
    return {
      ...cond,
      top_by_spend: block.top_by_spend || [],
      high_spend_zero_leads: block.high_spend_zero_leads || [],
      top_best_cpl: block.top_best_cpl || [],
      top_worst_cpl: block.top_worst_cpl || []
    };
  }
  function populateDirectConditionsCampaignSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel || sel.options.length > 1) return;
    const cond = directConditionsViewCtx?.conditions;
    (cond?.by_campaign || []).forEach((c, idx) => {
      const label = (c.campaign_name || "\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u044F").slice(0, 50);
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = label;
      sel.appendChild(opt);
    });
  }
  function renderDirectConditionsTables(campaignKey = "", wrapId = "directConditionsTables") {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    const view = getDirectConditionsView(campaignKey);
    if (!view?.top_by_spend?.length) {
      wrap.innerHTML = '<p class="muted ui-empty-muted">\u041D\u0435\u0442 \u0443\u0441\u043B\u043E\u0432\u0438\u0439 \u0434\u043B\u044F \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0439 \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0438.</p>';
      return;
    }
    const condRow = (r) => `
        <tr>
            <td title="${escapeHtml(r.condition || "")}">${escapeHtml((r.condition || "\u2014").slice(0, 48))}</td>
            <td title="${escapeHtml(r.campaign_name || "")}">${escapeHtml((r.campaign_name || "\u2014").slice(0, 28))}</td>
            <td>${formatMoney(r.cost)}</td>
            <td>${formatNumber(r.leads)}</td>
            <td>${r.cpl != null ? formatMoney(r.cpl) : "\u2014"}</td>
        </tr>`;
    const topSpendRows = (view.top_by_spend || []).slice(0, 10).map(condRow).join("");
    const wasteRows = (view.high_spend_zero_leads || []).slice(0, 8).map(condRow).join("");
    const monthly = directConditionsViewCtx?.monthly_tops || [];
    const monthlyHtml = monthly.length ? `
        <details class="direct-conditions-monthly">
            <summary>\u0422\u043E\u043F \u0443\u0441\u043B\u043E\u0432\u0438\u0439 \u043F\u043E \u043C\u0435\u0441\u044F\u0446\u0430\u043C</summary>
            ${monthly.map((m) => `
                <div class="direct-month-block">
                    <div class="muted direct-month-label">${escapeHtml(m.month || "")}</div>
                    <table class="table table-compact table-compact-direct--sm">
                        <thead><tr><th>\u0423\u0441\u043B\u043E\u0432\u0438\u0435</th><th>\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u044F</th><th>\u0420\u0430\u0441\u0445\u043E\u0434</th><th>\u041B\u0438\u0434\u044B</th><th>CPL</th></tr></thead>
                        <tbody>${(m.top_by_spend || []).map(condRow).join("")}</tbody>
                    </table>
                </div>`).join("")}
        </details>` : "";
    wrap.innerHTML = `
        <table class="table table-compact table-compact-direct">
            <thead><tr><th>\u0423\u0441\u043B\u043E\u0432\u0438\u0435</th><th>\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u044F</th><th>\u0420\u0430\u0441\u0445\u043E\u0434</th><th>\u041B\u0438\u0434\u044B</th><th>CPL</th></tr></thead>
            <tbody>${topSpendRows}</tbody>
        </table>
        ${wasteRows ? `<p class="muted direct-waste-caption">\u0420\u0430\u0441\u0445\u043E\u0434 \u0431\u0435\u0437 \u043B\u0438\u0434\u043E\u0432 (\u2265500 \u20BD):</p>
        <table class="table table-compact table-compact-direct">
            <thead><tr><th>\u0423\u0441\u043B\u043E\u0432\u0438\u0435</th><th>\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u044F</th><th>\u0420\u0430\u0441\u0445\u043E\u0434</th><th>\u041B\u0438\u0434\u044B</th><th>CPL</th></tr></thead>
            <tbody>${wasteRows}</tbody>
        </table>` : ""}
        ${monthlyHtml}`;
  }
  function updateDirectConditionsView() {
    const sel = document.getElementById("directConditionsCampaignFilter");
    renderDirectConditionsTables(sel?.value || "", "directConditionsTables");
  }
  function updateDirectConditionsViewModal() {
    const sel = document.getElementById("directConditionsCampaignFilterModal");
    renderDirectConditionsTables(sel?.value || "", "directConditionsTablesModal");
  }
  function openDirectConditionsModal() {
    openDirectConditionsModalHost(() => {
      populateDirectConditionsCampaignSelect("directConditionsCampaignFilterModal");
      renderDirectConditionsTables("", "directConditionsTablesModal");
    });
  }
  window.updateDirectConditionsView = updateDirectConditionsView;
  window.updateDirectConditionsViewModal = updateDirectConditionsViewModal;
  window.openDirectConditionsModal = openDirectConditionsModal;
  function renderDirectUploadHero() {
    return `
        <div class="card direct-analytics-card direct-upload-hero">
            <h3 class="direct-upload-hero__title">${DIRECT_COPY.uploadHeroTitle}</h3>
            <p class="muted direct-upload-hero__hint">${DIRECT_COPY.uploadHeroHint}</p>
            <div class="direct-upload-hero__actions">
                <button type="button" class="btn btn-primary" onclick="openModal('documentModal')">${DIRECT_COPY.uploadHeroBtn}</button>
            </div>
            <p class="muted direct-upload-hero__secondary">${DIRECT_COPY.uploadHeroSecondary}</p>
        </div>`;
  }
  function renderDirectAnalyticsPanel(data) {
    const panel = document.getElementById("directAnalyticsPanel");
    if (!panel) return;
    const da = data?.direct_analytics;
    const monthly = da?.monthly || [];
    if (!hasDirectExcelSlice(data)) {
      panel.innerHTML = renderDirectUploadHero();
      panel.style.display = "block";
      const chartsHost = document.getElementById("directChartsPanel");
      if (chartsHost) {
        chartsHost.innerHTML = "";
        chartsHost.style.display = "none";
      }
      renderAuditCommandBar(data);
      return;
    }
    panel.style.display = "block";
    const campRows = (da.campaigns || []).slice(0, 8).map((c) => `
        <tr>
            <td>${escapeHtml((c.campaign_name || "").slice(0, 42))}</td>
            <td>${formatMoney(c.cost)}</td>
            <td>${formatNumber(c.leads)}</td>
            <td>${c.cpl != null ? formatMoney(c.cpl) : "\u2014"}</td>
        </tr>`).join("");
    const insights = (da.insights || []).map((i) => `<li><strong>${escapeHtml(i.title)}:</strong> ${escapeHtml(i.detail)}</li>`).join("");
    const health = da.health || null;
    const links = health?.data_links || {};
    const semLink = links.semantics_conditions || {};
    const setupLink = links.direct_setup || {};
    const missingHints = [];
    if (semLink.status !== "present" && semLink.hint) missingHints.push(semLink.hint);
    if (setupLink.status !== "present" && setupLink.hint) missingHints.push(setupLink.hint);
    const dataLinksHtml = missingHints.length ? `<p class="muted direct-health-missing-hints">${missingHints.map((h) => escapeHtml(h)).join(" \xB7 ")}</p>` : "";
    const healthExplain = health?.summary_explain ? `<details class="direct-health-explain-collapsible">
                <summary>\u041F\u043E\u0447\u0435\u043C\u0443 \u0442\u0430\u043A\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430</summary>
                <p>${escapeHtml(health.summary_explain)}</p>
           </details>` : "";
    const zoneRows = renderDirectHealthZoneRows(health?.score_breakdown?.zone_breakdown || []);
    const checksTriggered = health?.checks_triggered_count ?? (health?.rules_triggered_ids || []).length;
    const risksForReport = health?.risks_for_report_count ?? buildDirectRiskCatalogFromHealth(health).length;
    const healthBlock = health ? `
        <div id="direct-slice-health" class="direct-health-block">
            <div class="direct-health-head">
                <div>
                    <h4>${DIRECT_COPY.healthScoreTitle}</h4>
                    <p class="muted">${DIRECT_COPY.healthCabinetHint()}</p>
                </div>
                <div class="direct-health-score-box">
                    <div class="direct-health-score-value">${formatNumber(health.health_score || 0)}</div>
                    <div class="muted">\u041E\u0446\u0435\u043D\u043A\u0430 ${escapeHtml(health.grade || "\u2014")}</div>
                </div>
            </div>
            <div class="direct-health-kpis">
                <span class="badge badge-draft">\u041C\u0435\u0441\u044F\u0446\u0435\u0432 \u0432 \u0441\u0440\u0435\u0437\u0435: ${formatNumber(monthly.length)}</span>
                <span class="badge badge-draft" title="\u0412\u0441\u0435 \u0441\u0440\u0430\u0431\u043E\u0442\u0430\u0432\u0448\u0438\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 Excel, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u043F\u043E\u043A\u0440\u044B\u0442\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u0445">\u0410\u0432\u0442\u043E\u043F\u0440\u043E\u0432\u0435\u0440\u043E\u043A: ${formatNumber(checksTriggered)}</span>
                <span class="badge badge-draft" title="\u041A\u0440\u0438\u0442\u0438\u0447\u043D\u044B\u0435 \u0440\u0438\u0441\u043A\u0438 \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \xAB\u0420\u0438\u0441\u043A\u0438 \u0414\u0438\u0440\u0435\u043A\u0442\u0430\xBB \u0438 \u0434\u043B\u044F AI">\u0412\u0430\u0436\u043D\u044B\u0445 \u0440\u0438\u0441\u043A\u043E\u0432: ${formatNumber(risksForReport)}</span>
            </div>
            <p class="muted direct-health-counts-hint">\u0410\u0432\u0442\u043E\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0432\u043B\u0438\u044F\u044E\u0442 \u043D\u0430 \u0431\u0430\u043B\u043B; \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0438\u0436\u0435 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u0430\u0436\u043D\u044B\u0435 \u0440\u0438\u0441\u043A\u0438 \u0434\u043B\u044F \u043E\u0442\u0447\u0451\u0442\u0430 \u0438 AI.</p>
            ${dataLinksHtml}
            ${healthExplain}
            ${zoneRows ? `<div class="direct-health-zones-wrap">${zoneRows}</div>` : ""}
        </div>` : "";
    const cond = da.conditions || {};
    directConditionsViewCtx = {
      conditions: cond,
      monthly_tops: cond.monthly_tops || []
    };
    const condPreviewRows = (cond.top_by_spend || []).slice(0, 5).map((r) => `
        <tr>
            <td title="${escapeHtml(r.condition || "")}">${escapeHtml((r.condition || "\u2014").slice(0, 40))}</td>
            <td>${formatMoney(r.cost)}</td>
            <td>${formatNumber(r.leads)}</td>
            <td>${r.cpl != null ? formatMoney(r.cpl) : "\u2014"}</td>
        </tr>`).join("");
    const conditionsBlock = (cond.top_by_spend || []).length ? `
            <p class="muted direct-conditions-meta">
                \u0423\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0445 \u0443\u0441\u043B\u043E\u0432\u0438\u0439: ${formatNumber(cond.unique_conditions || 0)} \xB7 CPL \u043E\u0442 ${cond.limits?.min_leads_for_cpl_rank || 3} \u043B\u0438\u0434\u043E\u0432
            </p>
            <table class="table table-compact table-compact-direct--sm">
                <thead><tr><th>\u0423\u0441\u043B\u043E\u0432\u0438\u0435</th><th>\u0420\u0430\u0441\u0445\u043E\u0434</th><th>\u041B\u0438\u0434\u044B</th><th>CPL</th></tr></thead>
                <tbody>${condPreviewRows}</tbody>
            </table>
            <button type="button" class="btn btn-outline btn-sm btn-mt-xs" onclick="openDirectConditionsModal()">\u0412\u0441\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F (${formatNumber(cond.unique_conditions || 0)})</button>
            <div id="directConditionsTables" class="visually-hidden" aria-hidden="true"></div>` : "";
    const docId = da.material_id;
    const importBtn = docId ? `<button type="button" class="btn btn-outline btn-sm" onclick="openDocumentMaterialById(${docId})" title="${escapeHtml(DIRECT_COPY.openExcelBtnTitle)}">${escapeHtml(DIRECT_COPY.openExcelBtn)}</button>` : "";
    const totals = da.totals || {};
    const totalsLine = !monthly.length && totals.cost ? `<p class="direct-totals-line muted">\u0417\u0430 \u043F\u0435\u0440\u0438\u043E\u0434: \u0440\u0430\u0441\u0445\u043E\u0434 ${formatMoney(totals.cost)}, \u043A\u043B\u0438\u043A\u0438 ${formatNumber(totals.clicks)}, \u043B\u0438\u0434\u044B ${formatNumber(totals.leads || totals.conversions)}</p>` : "";
    const campaignsBlock = campRows ? wrapDirectCollapsible(
      "\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u0438 (\u0442\u043E\u043F-8)",
      `<table class="table table-compact table-compact-direct">
                <thead><tr><th>\u041A\u0430\u043C\u043F\u0430\u043D\u0438\u044F</th><th>\u0420\u0430\u0441\u0445\u043E\u0434</th><th>\u041B\u0438\u0434\u044B</th><th>CPL</th></tr></thead>
                <tbody>${campRows}</tbody>
            </table>`,
      { id: "direct-slice-campaigns" }
    ) : "";
    const conditionsCollapsible = conditionsBlock ? wrapDirectCollapsible("\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u043E\u043A\u0430\u0437\u0430 (\u043F\u0440\u0435\u0432\u044C\u044E)", conditionsBlock, { id: "direct-slice-conditions" }) : "";
    const insightsBlock = insights ? wrapDirectCollapsible("\u0418\u043D\u0441\u0430\u0439\u0442\u044B Excel", `<ul class="muted direct-insights-list">${insights}</ul>`) : "";
    const periodLine = (() => {
      if (da.period) return escapeHtml(da.period);
      if (monthly.length >= 2) {
        const a = monthly[0]?.month;
        const b = monthly[monthly.length - 1]?.month;
        if (a && b) return escapeHtml(`${a} \u2014 ${b}`);
      }
      if (monthly.length === 1 && monthly[0]?.month) {
        return escapeHtml(monthly[0].month);
      }
      return "\u2014";
    })();
    const score = health?.health_score ?? health?.score;
    const grade = health?.grade || "\u2014";
    const totalCost = da.totals?.cost ?? monthly.reduce((s, m) => s + (m.cost || 0), 0);
    const totalLeads = da.totals?.leads ?? da.totals?.conversions ?? monthly.reduce((s, m) => s + (m.leads || 0), 0);
    const totalCpl = totalLeads > 0 && totalCost ? totalCost / totalLeads : null;
    const growth = buildKpiGrowthSublines(monthly);
    const healthDetails = health ? `<details class="direct-section-details">
            <summary>\u041E\u0446\u0435\u043D\u043A\u0430 \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0430 \xB7 ${formatNumber(score || 0)}/100 (${escapeHtml(grade)})</summary>
            ${healthBlock}
            <details class="direct-health-rules-ref">
                <summary>\u0421\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u0430\u0432\u0442\u043E\u043F\u0440\u043E\u0432\u0435\u0440\u043E\u043A</summary>
                ${renderDirectHealthInfoPanel(health)}
            </details>
        </details>` : "";
    panel.innerHTML = `
        <div class="card direct-analytics-card direct-analytics-card--loaded">
            <div class="direct-kpi-strip">
                <div class="direct-kpi-strip__period">
                    <span class="direct-kpi-label">\u041F\u0435\u0440\u0438\u043E\u0434</span>
                    <strong>${periodLine}</strong>
                    ${growth.periodNote || ""}
                </div>
                <div class="direct-kpi-strip__metric">
                    <span class="direct-kpi-label">\u0420\u0430\u0441\u0445\u043E\u0434</span>
                    <strong>${formatMoney(totalCost)}</strong>
                    ${growth.cost}
                </div>
                <div class="direct-kpi-strip__metric">
                    <span class="direct-kpi-label">\u0417\u0430\u044F\u0432\u043A\u0438</span>
                    <strong>${formatNumber(totalLeads)}</strong>
                    ${growth.leads}
                </div>
                <div class="direct-kpi-strip__metric">
                    <span class="direct-kpi-label">CPL</span>
                    <strong>${totalCpl != null ? formatMoney(totalCpl) : "\u2014"}</strong>
                    ${growth.cpl}
                </div>
            </div>
            <div id="directDynamicsHost" class="direct-dynamics-host"></div>
            <div id="directChartsPanel" class="direct-charts-panel"></div>
            ${importBtn ? `<div class="direct-primary-actions">${importBtn}</div>` : ""}
            ${renderDirectStepsCard(data)}
            <p class="muted direct-supplements-hint">\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u2014 \u0432\u043A\u043B\u0430\u0434\u043A\u0430 \xAB\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438\xBB. \u041F\u0435\u0440\u0435\u0434 \u0430\u043D\u0430\u043B\u0438\u0437\u043E\u043C \u043E\u0442\u043C\u0435\u0442\u044C\u0442\u0435, \u0447\u0442\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432 AI.</p>
            ${healthDetails}
            ${renderDirectRisksOnDirectPage(data)}
            ${campaignsBlock}
            ${conditionsCollapsible}
            ${insightsBlock}
        </div>`;
    mountDirectDynamicsBlock(document.getElementById("directDynamicsHost"), monthly);
    renderCharts(da.charts || [], data.data_coverage, "directChartsPanel");
    if (conditionsBlock) {
      renderDirectConditionsTables("");
    }
  }
  function metricStatusFromCoverage(coverage, fieldId, fallback) {
    const item = (coverage?.checklist || []).find((c) => c.id === fieldId);
    if (!item || item.status === "present") return fallback;
    const labels = {
      period: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u043F\u0435\u0440\u0438\u043E\u0434",
      budget: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0431\u044E\u0434\u0436\u0435\u0442",
      clicks: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u043A\u043B\u0438\u043A\u0438",
      leads: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u0437\u0430\u044F\u0432\u043A\u0438",
      sales: "\u041D\u0435\u0442 \u043F\u0440\u043E\u0434\u0430\u0436",
      revenue: "\u041D\u0435\u0442 \u0432\u044B\u0440\u0443\u0447\u043A\u0438"
    };
    return labels[fieldId] || item.status_label || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E";
  }
  function hideEmptyReportMetricRows() {
    const table = document.getElementById("reportMetricsTable");
    if (!table) return;
    const emptyTokens = /* @__PURE__ */ new Set(["", "\u2014", "\u043D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E", "\u043D\u0435\u0442 \u043F\u0440\u043E\u0434\u0430\u0436", "\u043D\u0435\u0442 \u0432\u044B\u0440\u0443\u0447\u043A\u0438", "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"]);
    table.querySelectorAll("tr").forEach((row) => {
      const valueCell = row.querySelector("td:last-child");
      if (!valueCell) return;
      const value = String(valueCell.textContent || "").trim().toLowerCase();
      row.style.display = emptyTokens.has(value) ? "none" : "";
    });
  }
  function humanizeMetricsReviewReason(reason) {
    const text = String(reason || "").trim();
    if (!text) return "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430";
    if (/romi/i.test(text) && /(слишком высокий|аномал)/i.test(text)) {
      const match = text.match(/(\d+[.,]?\d*)%/);
      const romiValue = match ? match[1].replace(".", ",") : null;
      return `ROMI \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0430\u043D\u043E\u043C\u0430\u043B\u044C\u043D\u043E \u0432\u044B\u0441\u043E\u043A\u0438\u043C${romiValue ? `: ${romiValue}%` : ""}. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E \u043B\u0438 \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u0431\u044E\u0434\u0436\u0435\u0442 \u0438 \u0432\u044B\u0440\u0443\u0447\u043A\u0430. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0432\u044B\u0440\u0443\u0447\u043A\u0430 \u0432\u0432\u0435\u0434\u0435\u043D\u0430 \u0437\u0430 \u0431\u043E\u043B\u044C\u0448\u0438\u0439 \u043F\u0435\u0440\u0438\u043E\u0434, \u0447\u0435\u043C \u0440\u0435\u043A\u043B\u0430\u043C\u043D\u044B\u0439 \u0431\u044E\u0434\u0436\u0435\u0442, \u0438\u043B\u0438 \u0432 \u0431\u044E\u0434\u0436\u0435\u0442 \u043F\u043E\u043F\u0430\u043B\u0438 \u043D\u0435 \u0432\u0441\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B. \u041D\u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u0443\u0435\u0442 \u0437\u0430\u043F\u0443\u0441\u043A, \u043D\u043E \u0431\u0443\u0434\u0435\u0442 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u0432 \u043E\u0442\u0447\u0451\u0442\u0435.`;
    }
    return text;
  }
  function renderSummary(summary, metrics, coverage) {
    const preliminary = coverage?.is_preliminary;
    const problemEl = document.getElementById("summaryProblem");
    const riskEl = document.getElementById("summaryRisk");
    const conclusionEl = document.getElementById("summaryConclusion");
    const priorityTextEl = document.getElementById("summaryPriorityText");
    if (summary) {
      problemEl.textContent = summary.client_problem || "\u0421\u0443\u0449\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0440\u0438\u0441\u043A\u043E\u0432 \u043F\u043E \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u0434\u0430\u043D\u043D\u044B\u043C \u043D\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043E.";
      riskEl.textContent = summary.main_risk || "\u0421\u0443\u0449\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u043F\u043E\u0441\u043B\u0435\u0434\u0441\u0442\u0432\u0438\u044F \u043D\u0435 \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u044B.";
      const priorityEl = document.getElementById("summaryPriority");
      if (preliminary) {
        if (priorityTextEl) priorityTextEl.textContent = "\u041F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430";
        if (priorityEl) {
          priorityEl.textContent = "\u2014";
          priorityEl.className = "badge badge-draft";
          priorityEl.style.display = "none";
        }
      } else {
        const label = reportPriorityLabel(summary.priority || "medium");
        if (priorityTextEl) priorityTextEl.textContent = label;
        if (priorityEl) {
          priorityEl.style.display = "none";
          priorityEl.textContent = severityLabel2(summary.priority || "low");
          priorityEl.className = `badge badge-${summary.priority || "low"}`;
        }
      }
      conclusionEl.textContent = summary.short_conclusion || "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043E\u0442\u0447\u0451\u0442 \u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u0443.";
      renderReportExecutiveHero(summary, auditData);
    } else if (hasGuidedCompletedAnalysis(auditData)) {
      const staleHint = isAnalysisStale2(auditData) ? " \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 (Ctrl+F5) \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u2014 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E run." : " \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 (Ctrl+F5) \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437.";
      problemEl.textContent = `\u041A\u0440\u0430\u0442\u043A\u0438\u0439 \u0432\u044B\u0432\u043E\u0434 AI \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D.${staleHint}`;
      riskEl.textContent = "\u2014";
      conclusionEl.textContent = "\u2014";
      if (priorityTextEl) priorityTextEl.textContent = "\u2014";
      const priorityEl = document.getElementById("summaryPriority");
      if (priorityEl) {
        priorityEl.textContent = "\u2014";
        priorityEl.className = "badge badge-draft";
        priorityEl.style.display = "none";
      }
      renderReportExecutiveHero(null, auditData);
    }
    const btnMetrics = document.getElementById("btnAddMetricsFromReport");
    if (btnMetrics) btnMetrics.style.display = "inline-block";
    if (metrics || coverage) {
      document.getElementById("metricPeriod").textContent = metrics?.period || metricStatusFromCoverage(coverage, "period", "\u2014");
      document.getElementById("metricBudgetDisplay").textContent = metrics?.budget != null ? formatMoney(metrics.budget) : metricStatusFromCoverage(coverage, "budget", "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0431\u044E\u0434\u0436\u0435\u0442");
      document.getElementById("metricClicks").textContent = metrics?.clicks != null ? formatNumber(metrics.clicks) : metricStatusFromCoverage(coverage, "clicks", "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u043A\u043B\u0438\u043A\u0438");
      document.getElementById("metricLeads").textContent = metrics?.leads != null ? formatNumber(metrics.leads) : metricStatusFromCoverage(coverage, "leads", "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u044B \u0437\u0430\u044F\u0432\u043A\u0438");
      document.getElementById("metricSales").textContent = metrics?.sales != null ? formatNumber(metrics.sales) : metricStatusFromCoverage(coverage, "sales", "\u041D\u0435\u0442 \u043F\u0440\u043E\u0434\u0430\u0436");
      document.getElementById("metricRevenue").textContent = metrics?.revenue != null ? formatMoney(metrics.revenue) : metricStatusFromCoverage(coverage, "revenue", "\u041D\u0435\u0442 \u0432\u044B\u0440\u0443\u0447\u043A\u0438");
      const canCpl = metrics?.budget != null && metrics?.leads != null;
      const canCpa = metrics?.budget != null && metrics?.sales != null;
      const canRomi = metrics?.budget != null && metrics?.revenue != null;
      document.getElementById("metricCPL").textContent = canCpl ? formatDerivedMetric(metrics, "cpl") : "\u041D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E";
      document.getElementById("metricCPA").textContent = canCpa ? formatDerivedMetric(metrics, "cpa") : "\u041D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E";
      document.getElementById("metricROMI").textContent = canRomi ? formatDerivedMetric(metrics, "romi") : "\u041D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E";
      const gpEl = document.getElementById("metricGrossProfit");
      if (gpEl) {
        gpEl.textContent = metrics?.gross_profit != null ? formatMoney(metrics.gross_profit) : "\u2014";
      }
      const marginEl = document.getElementById("metricMargin");
      if (marginEl) {
        marginEl.textContent = metrics?.margin_percent != null ? `${metrics.margin_percent}%` : "\u2014";
      }
      const drrEl = document.getElementById("metricDRR");
      if (drrEl) {
        drrEl.textContent = metrics?.drr != null ? `${metrics.drr}%` : canRomi ? "\u041D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E" : "\u2014";
      }
      hideEmptyReportMetricRows();
      const reviewBlock = document.getElementById("metricsReviewBlock");
      if (metrics?.needs_review && !preliminary) {
        reviewBlock.style.display = "block";
        document.getElementById("metricsReviewReason").textContent = humanizeMetricsReviewReason(metrics.review_reason);
      } else if (preliminary && coverage?.missing_items?.length) {
        reviewBlock.style.display = "block";
        document.getElementById("metricsReviewReason").textContent = coverage.missing_items.slice(0, 5).map((i) => i.reason || i.label).join("; ");
      } else {
        reviewBlock.style.display = "none";
      }
    }
    renderReportActivePeriodNote(auditData, metrics);
    renderReportAnalysisMeta(auditData);
    renderReportStaleDetails(auditData);
    renderMetricsKpiSource(auditData);
    renderMetricsReportExplain(auditData);
    renderReportIllustrationsGuide(auditData);
    renderReportConfirmedPreview(auditData);
    renderReportAppendix(auditData);
    updateExtractMetricsButtonVisibility(auditData);
  }
  function renderMetricsReportExplain(data) {
    const box = document.getElementById("metricsReportExplain");
    const asOf = document.getElementById("metricsReportAsOf");
    if (!box) return;
    const fresh = data?.analysis_freshness;
    if (asOf) {
      if (fresh?.last_analysis_at && hasGuidedCompletedAnalysis(data)) {
        asOf.style.display = "block";
        let line = `\u041E\u0442\u0447\u0451\u0442 \u043F\u043E \u0434\u0430\u043D\u043D\u044B\u043C \u043D\u0430 ${formatDate(fresh.last_analysis_at)}.`;
        if (fresh.analysis_stale) {
          line += " \u041C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C \u2014 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437, \u0447\u0442\u043E\u0431\u044B \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0432\u044B\u0432\u043E\u0434\u044B AI (\u0442\u0430\u0431\u043B\u0438\u0446\u0430 KPI \u0443\u0436\u0435 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430).";
        }
        asOf.textContent = line;
      } else {
        asOf.style.display = "none";
        asOf.textContent = "";
      }
    }
    if (!needsMetricsReportExplain(data)) {
      box.style.display = "none";
      box.innerHTML = "";
      return;
    }
    const summary = data?.metrics_summary || {};
    const hasTableKpi = summary.budget != null || summary.clicks != null || summary.leads != null;
    const provLine = data?.metrics_kpi_provenance?.summary_line;
    box.style.display = "block";
    box.innerHTML = hasTableKpi ? `<p><strong>\u0412 \u0442\u0430\u0431\u043B\u0438\u0446\u0435 \u0443\u0436\u0435 \u0435\u0441\u0442\u044C KPI${provLine ? ` (${escapeHtml(provLine.replace(/^KPI:\\s*/, ""))})` : ""}.</strong></p>
        <p class="muted">\u0414\u043B\u044F \u0447\u0435\u043A\u043B\u0438\u0441\u0442\u0430 \u0438 \u0441\u0442\u0430\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u0435\u0440\u0438\u043E\u0434 KPI (\u0444\u043E\u0440\u043C\u0430 \xAB\u041C\u0435\u0442\u0440\u0438\u043A\u0438\xBB) \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u043D\u0435\u0441\u0438\u0442\u0435 \u0446\u0438\u0444\u0440\u044B \u0438\u0437 \u0437\u0430\u043C\u0435\u0442\u043A\u0438.</p>
        <div class="metrics-report-explain-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="openMetricsEditorAddPeriod()">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0438\u043E\u0434</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="extractMetricsFromNotesWithConfirm()">\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 KPI \u0438\u0437 \u0437\u0430\u043C\u0435\u0442\u043E\u043A</button>
        </div>` : `<p><strong>\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u0434\u043B\u044F \u043E\u0442\u0447\u0451\u0442\u0430 \u043D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u044B.</strong></p>
        <p class="muted">\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0438\u043E\u0434, \u0431\u044E\u0434\u0436\u0435\u0442, \u043A\u043B\u0438\u043A\u0438 \u0438 \u0437\u0430\u044F\u0432\u043A\u0438 \u0432 \u0444\u043E\u0440\u043C\u0443 \u0438\u043B\u0438 \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u0441 KPI.</p>
        <div class="metrics-report-explain-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="openMetricsEditorAddPeriod()">\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0438\u043E\u0434</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="extractMetricsFromNotesWithConfirm()">\u041F\u0435\u0440\u0435\u043D\u0435\u0441\u0442\u0438 KPI \u0438\u0437 \u0437\u0430\u043C\u0435\u0442\u043E\u043A</button>
        </div>`;
  }
  function renderReportPreliminarySections(coverage) {
    const banner = document.getElementById("reportPreliminaryBanner");
    const cannot = document.getElementById("reportCannotEvaluate");
    const zones = document.getElementById("zoneScoresContainer");
    if (!coverage) return;
    if (isPreliminaryAudit()) {
      const hasMinimumData = hasGuidedRequiredMetrics(auditData) && hasGuidedEvidenceSource(auditData);
      const hasCoreMetrics = Boolean(auditData?.metrics_summary?.budget != null && auditData?.metrics_summary?.clicks != null && auditData?.metrics_summary?.leads != null);
      const missingLabels = (coverage?.missing_items || []).slice(0, 6).map((i) => i.label).filter(Boolean);
      if (banner) {
        banner.style.display = "block";
        banner.innerHTML = `
                <div class="preliminary-banner">
                    <strong>${hasCoreMetrics ? "\u041F\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442 \u043F\u043E \u0431\u0430\u0437\u043E\u0432\u044B\u043C \u0434\u0430\u043D\u043D\u044B\u043C" : "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043E\u0442\u0447\u0451\u0442\u0430 \u0434\u043E AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430"}</strong>
                    <p>${hasCoreMetrics ? `\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B. \u0414\u043B\u044F \u043F\u043E\u043B\u043D\u043E\u0446\u0435\u043D\u043D\u043E\u0433\u043E \u0430\u0443\u0434\u0438\u0442\u0430 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442: ${missingLabels.join(", ") || "\u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432"}.` : hasMinimumData ? "\u0411\u0430\u0437\u043E\u0432\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B, \u043D\u043E \u0444\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430." : "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0438\u043E\u0434, \u0431\u044E\u0434\u0436\u0435\u0442, \u043A\u043B\u0438\u043A\u0438 \u0438 \u0437\u0430\u044F\u0432\u043A\u0438, \u0447\u0442\u043E\u0431\u044B \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0431\u0430\u0437\u043E\u0432\u044B\u0439 \u043E\u0442\u0447\u0451\u0442."}</p>
                </div>`;
      }
      if (cannot) {
        const cannotList = coverage.cannot_evaluate || [];
        const coreMetrics = ["CPL", "CPA", "ROMI"];
        const hasDerived = {
          CPL: auditData?.metrics_summary?.cpl != null,
          CPA: auditData?.metrics_summary?.cpa != null,
          ROMI: auditData?.metrics_summary?.romi != null
        };
        const canCalculated = coreMetrics.filter((m) => hasDerived[m]);
        const cannotQualityCheck = cannotList.filter((x) => !coreMetrics.includes(String(x || "").trim().toUpperCase()));
        cannot.style.display = "block";
        cannot.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u043E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0443 \u043E\u0446\u0435\u043D\u043A\u0438</h3></div>
                    <div class="card-body">
                        ${canCalculated.length ? `<p><strong>\u041C\u043E\u0436\u043D\u043E \u043F\u043E\u0441\u0447\u0438\u0442\u0430\u0442\u044C \u043F\u043E \u043C\u0435\u0442\u0440\u0438\u043A\u0430\u043C:</strong> ${canCalculated.join(", ")}</p>` : ""}
                        <p><strong>\u041D\u0435\u043B\u044C\u0437\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0441\u0442\u044C \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0435\u0439 \u0431\u0435\u0437:</strong></p>
                        <ul class="cannot-evaluate-list">${cannotQualityCheck.map((x) => `<li>${escapeHtml(x)}</li>`).join("") || "<li>\u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u043E\u0432 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430 \u0434\u0430\u043D\u043D\u044B\u0445</li>"}</ul>
                    </div>
                </div>`;
      }
    } else {
      if (banner) {
        banner.style.display = "none";
        banner.innerHTML = "";
      }
      if (cannot) {
        cannot.style.display = "none";
        cannot.innerHTML = "";
      }
      const limitations = coverage.accepted_limitations || [];
      if (banner && limitations.length) {
        banner.style.display = "block";
        banner.innerHTML = `
                <div class="preliminary-banner limitation-banner">
                    <strong>\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043E\u0442\u0447\u0451\u0442\u0430</strong>
                    <p class="muted">\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043D\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u044B \u0438 \u0443\u0447\u0442\u0435\u043D\u044B \u043A\u0430\u043A \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0430:</p>
                    <ul class="empty-checklist">${limitations.map((i) => `<li>${escapeHtml(i.label)}${i.reason ? ` \u2014 ${escapeHtml(i.reason)}` : ""}</li>`).join("")}</ul>
                </div>`;
      }
    }
    if (zones) {
      if (!isAdminUser()) {
        zones.innerHTML = "";
        zones.style.display = "none";
        return;
      }
      zones.style.display = "block";
      const rows = coverage.zone_scores || [];
      if (coverage.is_preliminary) {
        zones.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>\u041E\u0446\u0435\u043D\u043A\u0430 \u043F\u043E \u0437\u043E\u043D\u0430\u043C</h3></div>
                    <div class="card-body">
                        <p class="muted">\u041E\u0446\u0435\u043D\u043A\u0430 \u0437\u043E\u043D \u0430\u0443\u0434\u0438\u0442\u0430 \u043F\u043E \u0448\u043A\u0430\u043B\u0435 0\u2013100 \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0438 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432.</p>
                        <table class="zone-coverage-table">
                            <thead><tr><th>\u0417\u043E\u043D\u0430</th><th>\u0421\u0442\u0430\u0442\u0443\u0441</th><th>\u041F\u0440\u0438\u0447\u0438\u043D\u0430</th></tr></thead>
                            <tbody>${rows.map((r) => `<tr><td>${escapeHtml(r.zone)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.reason)}</td></tr>`).join("")}</tbody>
                        </table>
                    </div>
                </div>`;
      } else {
        zones.innerHTML = "";
      }
    }
  }
  function formatDerivedMetric(metrics, key) {
    const display = metrics[`${key}_display`];
    if (display && display !== "\u041D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E") {
      if (key === "romi") return typeof display === "string" ? display : `${display}%`;
      return formatMoney(metrics[key]);
    }
    if (metrics[key] != null && metrics[key] !== void 0) {
      return key === "romi" ? `${metrics[key]}%` : formatMoney(metrics[key]);
    }
    return "\u041D\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043D\u043E";
  }
  function renderDataIssues(_issues) {
    const tabBtn = document.getElementById("tabDataBtn");
    if (tabBtn) {
      tabBtn.textContent = "\u0414\u0430\u043D\u043D\u044B\u0435";
      tabBtn.classList.remove("tab-has-issues");
      tabBtn.title = "";
    }
  }
  function renderResultsIssues(issues) {
    const container = document.getElementById("resultsIssuesList");
    if (!container) return;
    if (usesPostAnalysisHero(getCurrentScreenState())) {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }
    const visible = (issues || []).filter((i) => !i.resolved && i.visible_after_analysis);
    if (!visible.length) {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }
    const progress = getFindingReviewProgress(auditData || { findings: [] });
    const findingIssues = visible.filter((i) => i.issue_type === "finding_review");
    const pending = progress.pending;
    if (pending <= 0 && findingIssues.length === 0) {
      container.innerHTML = "";
      container.style.display = "none";
      return;
    }
    const progressLine = progress.total > 0 ? `${formatReviewProgressLine(progress)}. ${formatReviewRemainingLine(progress)}. ` : "";
    container.style.display = "block";
    container.innerHTML = `
        <div class="card results-review-banner">
            <div class="card-body">
                <h3 class="panel-title-flush">\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E\u0441\u043B\u0435 \u0430\u043D\u0430\u043B\u0438\u0437\u0430</h3>
                <p class="data-checklist-summary muted">${escapeHtml(progressLine)}${pending > 0 ? escapeHtml(pluralizeFindingsReview(pending)) + ". " : ""}\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u0444\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043E\u0442\u0447\u0451\u0442.</p>
                <button type="button" class="btn btn-primary btn-sm" onclick="scrollToPendingFindings()">\u041A \u0441\u043F\u0438\u0441\u043A\u0443 \u0432\u044B\u0432\u043E\u0434\u043E\u0432</button>
            </div>
        </div>
    `;
  }
  function applyWorkflowTabs(tabs, data) {
    const map = {
      data: "tabDataBtn",
      results: "tabResultsBtn",
      report: "tabReportBtn",
      chat: "tabChatBtn"
    };
    const config = tabs || {};
    let defaultTab = null;
    Object.entries(map).forEach(([key, btnId]) => {
      const tab = config[key] || {};
      const btn = document.getElementById(btnId);
      const panel = document.getElementById(`tab-${key}`);
      if (btn) {
        const hidden = tab.visible === false;
        btn.style.display = hidden ? "none" : "";
        btn.disabled = tab.enabled === false;
        btn.classList.toggle("tab-disabled", tab.enabled === false);
      }
      if (panel) {
        if (tab.visible === false) {
          panel.classList.remove("active");
          panel.setAttribute("hidden", "");
        } else {
          panel.removeAttribute("hidden");
        }
      }
      if (tab.default) defaultTab = key;
    });
    const active = getActiveWorkflowTab();
    const activeConfig = config[active] || {};
    if (activeConfig.visible === false || activeConfig.enabled === false) {
      switchTab(defaultTab || "data");
    }
    const resultsBtn = document.getElementById("tabResultsBtn");
    const reportBtn = document.getElementById("tabReportBtn");
    const showResults = data?.workflow_state?.show_ai_report_sections;
    const hasMonthly = (data?.direct_analytics?.monthly || []).length > 0;
    if (resultsBtn) {
      resultsBtn.textContent = "\u0412\u044B\u0432\u043E\u0434\u044B";
      resultsBtn.title = showResults ? "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 AI-\u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u043F\u0435\u0440\u0435\u0434 PDF" : "\u041F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430";
    }
    if (reportBtn) {
      if (showResults) {
        reportBtn.textContent = "\u041E\u0442\u0447\u0451\u0442";
        reportBtn.title = "\u0418\u0442\u043E\u0433\u043E\u0432\u044B\u0439 \u043E\u0442\u0447\u0451\u0442, \u0433\u0440\u0430\u0444\u0438\u043A\u0438 \u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 PDF";
      } else if (hasMonthly) {
        reportBtn.textContent = "\u0414\u0438\u043D\u0430\u043C\u0438\u043A\u0430";
        reportBtn.title = DIRECT_COPY.chartsNote;
      } else {
        reportBtn.textContent = "\u041E\u0442\u0447\u0451\u0442";
        reportBtn.title = "\u041F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0441\u0440\u0435\u0437\u0430 \u0414\u0438\u0440\u0435\u043A\u0442\u0430 \u0438\u043B\u0438 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430";
      }
    }
  }
  function resolveDataIssue(itemId, issue = null) {
    if (issue) return issue;
    return (auditData?.data_issues || []).find((row) => String(row.id) === String(itemId)) || null;
  }
  function resolveMetricsFocusField(issueOrItemId) {
    const text = typeof issueOrItemId === "string" ? issueOrItemId : `${issueOrItemId?.id || ""} ${issueOrItemId?.label || ""} ${issueOrItemId?.reason || ""}`;
    const normalized = String(text || "").toLowerCase();
    if (/(^|\W)period(\W|$)|период/.test(normalized)) return "metricPeriodStartDisplay";
    if (/(^|\W)budget(\W|$)|бюджет|расход/.test(normalized)) return "metricBudgetInput";
    if (/(^|\W)clicks(\W|$)|клик/.test(normalized)) return "metricClicksInput";
    if (/(^|\W)leads(\W|$)|заявк/.test(normalized)) return "metricLeadsInput";
    if (/(^|\W)sales(\W|$)|продаж|cpa/.test(normalized)) return "metricSalesInput";
    if (/(^|\W)revenue(\W|$)|выруч|romi/.test(normalized)) return "metricRevenueInput";
    return null;
  }
  function setMetricsModalFocus(issueOrItemId = null) {
    pendingMetricsFocusFieldId = resolveMetricsFocusField(issueOrItemId) || "metricPeriodStartDisplay";
  }
  function focusMetricsModalField() {
    const fieldId = pendingMetricsFocusFieldId;
    pendingMetricsFocusFieldId = null;
    if (!fieldId) return;
    const el = document.getElementById(fieldId);
    if (!el) return;
    setTimeout(() => {
      el.focus();
      if (typeof el.select === "function") el.select();
      el.classList.remove("field-focus-hint");
      void el.offsetWidth;
      el.classList.add("field-focus-hint");
      setTimeout(() => el.classList.remove("field-focus-hint"), 1100);
    }, 0);
  }
  function prefillScreenshotByIssue(itemId) {
    if (itemId !== "campaign_screenshots") return;
    const titleEl = document.getElementById("screenshotTitle");
    if (titleEl && !titleEl.value) {
      titleEl.value = "\u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u0439";
    }
  }
  function prefillTextNoteByIssue(itemId) {
    const noteTemplates = {
      offer: {
        title: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043F\u043E \u043E\u0444\u0444\u0435\u0440\u0443",
        content: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043E\u0444\u0444\u0435\u0440:\n\n\u0427\u0442\u043E \u043C\u0435\u0448\u0430\u0435\u0442 \u043A\u043E\u043D\u0432\u0435\u0440\u0441\u0438\u0438:\n\n\u041F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0435\u043C\u0430\u044F \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430:\n"
      },
      weak_points: {
        title: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043F\u043E \u0441\u043B\u0430\u0431\u044B\u043C \u043C\u0435\u0441\u0442\u0430\u043C",
        content: "\u0421\u043B\u0430\u0431\u043E\u0435 \u043C\u0435\u0441\u0442\u043E:\n\n\u041A\u0430\u043A \u0432\u043B\u0438\u044F\u0435\u0442 \u043D\u0430 \u043B\u0438\u0434\u044B/\u043F\u0440\u043E\u0434\u0430\u0436\u0438:\n\n\u0427\u0442\u043E \u0438\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432 \u043F\u0435\u0440\u0432\u0443\u044E \u043E\u0447\u0435\u0440\u0435\u0434\u044C:\n"
      },
      lead_quality: {
        title: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043F\u043E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0443 \u043B\u0438\u0434\u043E\u0432",
        content: "\u041F\u0440\u0438\u043C\u0435\u0440\u044B \u0446\u0435\u043B\u0435\u0432\u044B\u0445 \u043B\u0438\u0434\u043E\u0432:\n\n\u041F\u0440\u0438\u043C\u0435\u0440\u044B \u043D\u0435\u0446\u0435\u043B\u0435\u0432\u044B\u0445 \u043B\u0438\u0434\u043E\u0432:\n\n\u041F\u0440\u0438\u0447\u0438\u043D\u044B \u0431\u0440\u0430\u043A\u0430:\n"
      }
    };
    const template = noteTemplates[itemId] || null;
    if (!template) return;
    const titleEl = document.getElementById("textNoteTitle");
    const contentEl = document.getElementById("textNoteContent");
    if (titleEl && !titleEl.value) titleEl.value = template.title;
    if (contentEl && !contentEl.value) contentEl.value = template.content;
  }
  function openDataItemAction(itemId, issue = null) {
    if (!requireWriteAccess("\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u0445")) return;
    const resolvedIssue = resolveDataIssue(itemId, issue);
    if (resolvedIssue?.ref_type === "material" && Number.isFinite(Number(resolvedIssue.ref_id))) {
      const metricIssue = `${resolvedIssue?.id || ""} ${resolvedIssue?.label || ""} ${resolvedIssue?.reason || ""}`;
      if (/(метрик|бюджет|клик|заявк|продаж|выруч|cpa|cpl|romi)/i.test(metricIssue)) {
        setMetricsModalFocus(resolvedIssue);
      }
      editMaterial(Number(resolvedIssue.ref_id));
      return;
    }
    if (resolvedIssue?.ref_type === "finding" && Number.isFinite(Number(resolvedIssue.ref_id))) {
      switchTab("results");
      openFindingEditModal(Number(resolvedIssue.ref_id));
      return;
    }
    const metricIds = ["period", "budget", "clicks", "leads", "sales", "revenue", "metrics_minimum", "monthly_dynamics"];
    if (metricIds.includes(String(itemId))) {
      switchTab("data");
      switchDataSubtab("direct");
      return;
    }
    if (itemId === "campaign_screenshots") {
      openNewMaterial("screenshotModal");
      prefillScreenshotByIssue(itemId);
      return;
    }
    if (itemId === "landing") {
      setDocumentIssueContext(itemId);
      openModal("documentModal");
      return;
    }
    if (["search_queries", "metrika", "crm", "crm_statuses", "lead_quality", "metrika_crm"].includes(itemId)) {
      setDocumentIssueContext(itemId === "crm_statuses" ? "crm" : itemId);
      openModal("documentModal");
      return;
    }
    if (resolvedIssue?.issue_type === "missing_data" && resolvedIssue?.source === "coverage") {
      setDocumentIssueContext(itemId);
      openModal("documentModal");
      return;
    }
    setDocumentIssueContext(null);
    openNewMaterial("textNoteModal");
    prefillTextNoteByIssue(itemId);
  }
  async function acceptDataLimitation(itemId) {
    if (!requireWriteAccess("\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439")) return;
    if (!currentAuditId) return;
    const issue = (auditData?.data_issues || []).find((i) => i.id === itemId);
    const label = issue?.label || itemId;
    const accepted = await showConfirmDialog({
      title: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0431\u0435\u0437 \u044D\u0442\u0438\u0445 \u0434\u0430\u043D\u043D\u044B\u0445",
      message: `\u041D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0442\u044C \xAB${label}\xBB \u0438 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u0437\u0430\u043F\u0443\u0441\u043A?

\u0410\u043D\u0430\u043B\u0438\u0437 \u0438 \u043E\u0442\u0447\u0451\u0442 \u0431\u0443\u0434\u0443\u0442 \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u044B \u0431\u0435\u0437 \u044D\u0442\u043E\u0433\u043E \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430.`,
      confirmText: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0431\u0435\u0437 \u0434\u0430\u043D\u043D\u044B\u0445",
      confirmType: "primary"
    });
    if (!accepted) {
      return;
    }
    try {
      await apiRequest(`/api/audits/${currentAuditId}/accept-limitation`, {
        method: "POST",
        body: JSON.stringify({ item_id: itemId })
      });
      loadAuditDetail();
      showAlert("\u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E. \u041F\u0443\u043D\u043A\u0442 \u0443\u0431\u0440\u0430\u043D \u0438\u0437 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0433\u043E \u0447\u0435\u043A\u043B\u0438\u0441\u0442\u0430.", "success");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430: " + error.message, "danger");
    }
  }
  function buildDedupedCampaignRecs(findings) {
    const seen = /* @__PURE__ */ new Set();
    const items = [];
    for (const f of findings || []) {
      if (f.finding_kind === "needs_data" || !f.recommendation) continue;
      if (f.status === "human_rejected") continue;
      if (!["human_confirmed", "human_edited"].includes(f.status || "")) continue;
      const text = sanitizeClientReportText(f.recommendation);
      if (!text || hasInternalReportLeak(text)) continue;
      const key = text.toLowerCase().replace(/\s+/g, " ").slice(0, 140);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: f.id,
        text,
        area: areaDisplayLabel(f.area) || ""
      });
    }
    return items;
  }
  function renderRecommendations(findings, offer, coverage) {
    const container = document.getElementById("recommendationsList");
    if (!container) return;
    if (auditData?.workflow_state?.analysis_failed) {
      container.innerHTML = `
            <div class="empty-state-card">
                <h3>AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D</h3>
                <p class="muted">\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E\u0433\u043E AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>
            </div>`;
      const offerBox = document.getElementById("offerContainer");
      if (offerBox) offerBox.innerHTML = "";
      return;
    }
    if (isPreliminaryAudit()) {
      container.innerHTML = `
            <div class="card rec-card rec-card-data">
                <h4>1. \u0427\u0442\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0434\u043B\u044F \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u0438 \u0430\u0443\u0434\u0438\u0442\u0430</h4>
                <p class="muted"><strong>\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435.</strong> \u041D\u0443\u0436\u043D\u043E \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u043E\u0432.</p>
                <p>${escapeHtml(coverage?.data_collection_recommendation || workflowUi().next_action_hint || "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0434\u043B\u044F \u0430\u0443\u0434\u0438\u0442\u0430.")}</p>
                <ul class="empty-checklist">${(coverage.missing_items || []).slice(0, 8).map((i) => `<li>${escapeHtml(i.label)}</li>`).join("")}</ul>
            </div>
            <p class="muted ui-note-section">\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u0440\u0435\u043A\u043B\u0430\u043C\u043D\u044B\u043C \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445.</p>`;
      return;
    }
    const progress = getFindingReviewProgress(auditData || { findings });
    const pendingReview = progress.pending > 0;
    if (pendingReview > 0 && hasGuidedCompletedAnalysis(auditData)) {
      const imp = getPostAnalysisDataImprovements(auditData);
      container.innerHTML = imp.length ? '<p class="muted recommendations-deferred">\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u044B\u0432\u043E\u0434\u044B \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u0445 \u0432\u044B\u0448\u0435. \u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u044F \u0434\u0430\u043D\u043D\u044B\u0445 \u2014 \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB.</p>' : '<p class="muted recommendations-deferred">\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043F\u043E \u043A\u0430\u0436\u0434\u043E\u043C\u0443 \u0432\u044B\u0432\u043E\u0434\u0443 \u2014 \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430\u0445 \u0432\u044B\u0448\u0435. \u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438.</p>';
      return;
    }
    const dataRecs = findings.filter((f) => f.finding_kind === "needs_data" && f.recommendation).map((f) => f.recommendation);
    if (getCurrentScreenState() === "RESULTS_NEED_REVIEW" && pendingReview && dataRecs.length && !findings.some((f) => f.finding_kind !== "needs_data" && f.recommendation)) {
      container.innerHTML = "";
      return;
    }
    const optItems = buildDedupedCampaignRecs(findings);
    if (!dataRecs.length && !optItems.length && !offer) {
      if (hasGuidedCompletedAnalysis(auditData)) {
        const improvements = getPostAnalysisDataImprovements(auditData);
        const progress2 = getFindingReviewProgress(auditData);
        if (improvements.length && progress2.pending === 0) {
          container.innerHTML = '<p class="muted">\u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u044F \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0435\u043D\u044B \u0432\u044B\u0448\u0435. \u0427\u0435\u043A\u043B\u0438\u0441\u0442 \u2014 \u043D\u0430 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB.</p>';
          return;
        }
        if (improvements.length) {
          const labels = improvements.slice(0, 5).map((i) => escapeHtml(i.label || i.id)).filter(Boolean);
          container.innerHTML = `
                    <div class="empty-state-card">
                        <h3>\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C</h3>
                        <p class="muted">\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0432\u044B\u0432\u043E\u0434\u043E\u0432. \u0417\u0430\u0442\u0435\u043C \u043C\u043E\u0436\u043D\u043E \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435:</p>
                        <ul class="empty-checklist">${labels.map((l) => `<li>${l}</li>`).join("")}</ul>
                        <button type="button" class="btn btn-outline btn-sm" onclick="goToDataImprovements()">\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0434\u0430\u043D\u043D\u044B\u043C</button>
                    </div>`;
          return;
        }
        container.innerHTML = '<p class="ui-empty-muted">\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u043E\u0432 \u0441 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F\u043C\u0438.</p>';
        return;
      }
      container.innerHTML = '<p class="ui-empty-muted">\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430.</p>';
      return;
    }
    let html = "";
    if (dataRecs.length) {
      html += `<div class="card rec-card rec-card-data"><h4>1. \u0427\u0442\u043E \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0434\u043B\u044F \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u0438 \u0430\u0443\u0434\u0438\u0442\u0430</h4><p class="muted"><strong>\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435.</strong> \u041D\u0443\u0436\u043D\u043E \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B\u0432\u043E\u0434\u043E\u0432.</p>${dataRecs.map((t) => `<p>${escapeHtml(t)}</p>`).join("")}</div>`;
    }
    if (optItems.length) {
      html += `<div id="campaignRecommendationsBlock" class="rec-card rec-card-ads">
            <h4 class="rec-card-title">\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043F\u043E \u043A\u0430\u043C\u043F\u0430\u043D\u0438\u044F\u043C</h4>
            <p class="muted rec-card-lead">\u0423\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u0448\u0430\u0433\u0438 \u0438\u0437 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u044B\u0445 \u0432\u044B\u0432\u043E\u0434\u043E\u0432.</p>
            <ol class="rec-summary-list">${optItems.map((it, idx) => `
                <li class="rec-summary-item">
                    <div class="rec-summary-item-head">
                        <span class="rec-summary-idx">${idx + 1}</span>
                        ${it.area ? `<span class="rec-summary-area">${escapeHtml(it.area)}</span>` : ""}
                        <button type="button" class="btn btn-link btn-sm" onclick="goToFindingsInReport(${it.id})">\u2116${it.id}</button>
                    </div>
                    <p class="rec-summary-text">${escapeHtml(it.text)}</p>
                </li>`).join("")}</ol>
        </div>`;
    }
    container.innerHTML = html;
    syncFindingsAuxPanelsVisibility();
  }
  function toggleMoreMenu(event) {
    event?.stopPropagation?.();
    const menu = document.getElementById("moreActionsMenu");
    if (menu) menu.classList.toggle("show");
    closeSourcesAddMenu();
  }
  function toggleSourcesAddMenu(event) {
    event?.stopPropagation?.();
    const menu = document.getElementById("sourcesAddMenu");
    if (menu) menu.classList.toggle("show");
    const more = document.getElementById("moreActionsMenu");
    if (more) more.classList.remove("show");
  }
  function closeSourcesAddMenu() {
    const menu = document.getElementById("sourcesAddMenu");
    if (menu) menu.classList.remove("show");
  }
  document.addEventListener("click", () => {
    const menu = document.getElementById("moreActionsMenu");
    if (menu) menu.classList.remove("show");
    closeSourcesAddMenu();
  });
  function openFindingFromReview(id) {
    switchTab("results");
    openFindingEdit(id);
  }
  async function runAuditAnalysis(forceDraft = false) {
    if (!requireWriteAccess("\u0417\u0430\u043F\u0443\u0441\u043A AI-\u0430\u043D\u0430\u043B\u0438\u0437\u0430")) return;
    if (!privacySettings) await loadPrivacySettings();
    const ui = auditData?.workflow_ui || {};
    const primary = ui.primary_button || {};
    const secondary = ui.secondary_button || {};
    if (forceDraft) {
      if (!secondary.enabled) {
        showAlert(secondary.reason_disabled || "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D", "warning");
        return;
      }
    } else if (primary.enabled === false) {
      const openData = await showConfirmDialog({
        title: "\u0417\u0430\u043F\u0443\u0441\u043A \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
        message: `${primary.reason_disabled || "\u0417\u0430\u043F\u0443\u0441\u043A \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D."}

\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432\u043A\u043B\u0430\u0434\u043A\u0443 \xAB\u0414\u0430\u043D\u043D\u044B\u0435\xBB?`,
        confirmText: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435",
        confirmType: "primary"
      });
      if (openData) switchTab("data");
      return;
    }
    const payload = await buildAnalysisPayload();
    if (!payload) return;
    if (forceDraft) payload.force_draft = true;
    try {
      showAnalysisProgress({ percent: 0, message: "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0437\u0430\u043F\u0443\u0441\u043A\u0430...", status: "in_progress" });
      connectAnalysisProgress(currentAuditId);
      await apiRequest(`/api/audits/${currentAuditId}/analyze/start`, { method: "POST", body: JSON.stringify(payload) });
      showAlert(forceDraft ? "\u0427\u0435\u0440\u043D\u043E\u0432\u043E\u0439 AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u043F\u0443\u0449\u0435\u043D" : "AI-\u0430\u043D\u0430\u043B\u0438\u0437 \u0437\u0430\u043F\u0443\u0449\u0435\u043D. \u0421\u043B\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u043F\u0440\u043E\u0433\u0440\u0435\u0441\u0441\u043E\u043C \u043D\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u0430\u0443\u0434\u0438\u0442\u0430.", "info");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u043D\u0430\u043B\u0438\u0437\u0430: " + error.message, "danger");
      hideAnalysisProgress();
    }
  }
  async function verifyUiBuildSync() {
    const htmlBuild = (document.body?.dataset?.uiBuild || "").trim();
    if (!htmlBuild) {
      showUiBuildMismatch(
        "\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u0434\u0430\u0451\u0442 \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0439 HTML (\u043D\u0435\u0442 \u043C\u0435\u0442\u043A\u0438 UI \u0432 \u043F\u043E\u0434\u0432\u0430\u043B\u0435). \u0417\u0430\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0430\u0440\u044B\u0439 uvicorn \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 .\\start_dev_windows.bat"
      );
      return;
    }
    try {
      const res = await fetch("/api/dev/ui-build", { cache: "no-store" });
      if (!res.ok) {
        showUiBuildMismatch(
          "\u0421\u0435\u0440\u0432\u0435\u0440 \u0431\u0435\u0437 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0433\u043E API (\u0437\u0430\u043F\u0443\u0449\u0435\u043D \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u0438\u043B\u0438 \u0441\u0442\u0430\u0440\u0430\u044F \u043A\u043E\u043F\u0438\u044F). \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 .\\start_dev_windows.bat \u0438 Ctrl+Shift+R"
        );
        return;
      }
      const api = await res.json();
      if (api.static_build && api.static_build !== htmlBuild) {
        showUiBuildMismatch(
          `\u0412\u0435\u0440\u0441\u0438\u044F UI \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442: \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 ${htmlBuild}, \u0441\u0435\u0440\u0432\u0435\u0440 ${api.static_build}. Ctrl+Shift+R \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A start_dev_windows.bat`
        );
        return;
      }
      if (api.has_open_metrics_editor !== true) {
        showUiBuildMismatch("\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D \u0443\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0439 app.js. Ctrl+Shift+R \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0430.");
      }
      if (api.max_upload_mb) {
        window.__MAX_UPLOAD_MB = Number(api.max_upload_mb) || 50;
        const lim = document.getElementById("documentFileLimits");
        if (lim) {
          lim.textContent = `txt, md, csv, xlsx, pdf, docx \u2014 \u0434\u043E ${window.__MAX_UPLOAD_MB} \u041C\u0411`;
        }
      }
      if (api.display_timezone) {
        window.__DISPLAY_TIMEZONE = api.display_timezone;
      }
      if (api.display_tz_suffix) {
        window.__DISPLAY_TZ_SUFFIX = api.display_tz_suffix;
      }
    } catch (_e) {
    }
  }
  function showUiBuildMismatch(message) {
    if (document.getElementById("uiBuildMismatchBanner")) return;
    const el = document.createElement("div");
    el.id = "uiBuildMismatchBanner";
    el.className = "ui-build-mismatch-banner";
    el.setAttribute("role", "alert");
    el.innerHTML = `<strong>\u0423\u0441\u0442\u0430\u0440\u0435\u0432\u0448\u0438\u0439 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441.</strong> ${escapeHtml(message)}`;
    document.body.prepend(el);
  }
  configureRuntimeBridge({
    getCurrentAuditId: () => currentAuditId,
    getAuditIdFromUrl,
    getAuditData: () => auditData,
    setAuditData: (data) => {
      auditData = data;
    },
    getDocumentIssueContext,
    setDocumentIssueContext,
    applyDocumentModalGuidance,
    getMediaRecorder,
    clearEditingMaterialId,
    fillMetricsFromSummary,
    focusMetricsModalField,
    renderChatHistory,
    askInChat,
    loadComparison,
    renderDirectHealthReport,
    getSelectedModelId,
    getPrivacySettings: () => privacySettings,
    loadPrivacySettings,
    buildAnalysisPayload,
    applyRoleUiRestrictions,
    applyAdminUiSegmentation,
    renderAuditDetail,
    renderDataIssues,
    renderFindings,
    switchTab,
    openModal,
    closeModal,
    openMetricsEditor,
    openMetricsEditorEdit,
    openMetricsEditorForNewPeriod,
    scrollToMetricsPeriodsPanel,
    switchDataSubtab,
    isSourcesDataSubtabActive,
    handleDataFlowRunAi,
    setSourcesAiFilter,
    scrollToDirectSliceAnchor,
    openNewMaterial,
    openDataItemAction,
    editMaterial,
    getMaterialById,
    goToAddAuditData,
    loadAuditDetail,
    renderAuditSummaryBlock: (summary, metrics, coverage) => {
      renderSummary(summary, metrics, coverage);
      renderReportSummaryEditor(summary, coverage);
    },
    runAuditAnalysis,
    rerunAuditAnalysis,
    openReportPanel,
    acceptDataLimitation,
    updateExtractMetricsButtonVisibility,
    getStatusLabel,
    renderAnalysisStaleBar,
    renderCoverageProgress,
    isAnalysisLikelyStuck,
    resetStuckAnalysis,
    showAnalysisProgress,
    hideAnalysisProgress,
    connectAnalysisProgress,
    goToDataImprovements,
    isAnalysisStale: isAnalysisStale2,
    focusScrollTarget: _focusScrollTarget,
    loadKbStatusCard,
    getCurrentScreenState,
    renderGuidedFirstRun,
    onClientSaved: (auditId, updated) => {
      if (auditData && String(currentAuditId) === String(auditId)) {
        Object.assign(auditData, {
          client_name: updated.client_name,
          region: updated.region,
          niche_category: updated.niche_category,
          niche_subcategory: updated.niche_subcategory,
          niche: updated.niche_display,
          niche_display: updated.niche_display,
          website: updated.website,
          comment: updated.comment,
          goal: updated.goal
        });
        renderAuditDetail(auditData);
      }
    },
    onAuthSessionChanged: async () => {
      applyRoleUiRestrictions();
      applyAdminUiSegmentation();
    },
    onAuthLogoutNavigate: async () => {
      if (window.location.pathname.match(/\/audits\/\d+/)) {
        await loadAuditDetail();
      } else if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
        loadAuditsList();
      }
    }
  });
  registerWindowHandlers({
    closeModal,
    openModal,
    openAuthLoginModal,
    submitAuthLogin,
    logoutAuth,
    fillDevAuthCredentials,
    switchTab,
    openNewMaterial,
    createAudit,
    runPrimaryAction,
    runFocusAction,
    handleGuidedPrimaryAction,
    handleGuidedSecondaryAction,
    toggleFocusMode,
    toggleMoreMenu,
    toggleSourcesAddMenu,
    closeSourcesAddMenu,
    toggleDataSecondaryArea,
    switchDataSubtab,
    handleDataFlowRunAi,
    filterMaterialsList,
    clearMaterialsSearch,
    setSourcesAiFilter,
    closeMaterialDrawer,
    openDirectConditionsModal,
    previewAuditReport,
    exportAuditReport,
    runPrePdfCheck,
    renderReportSendChecklist,
    saveSendChecklistItem,
    initReportClientViewToggle,
    setReportClientView,
    goFixDirectAiConsistency,
    openAiSummaryForConsistency,
    exportSlidesPptx,
    exportGoogleSlides,
    syncDirectHealthFindings,
    openIssuesPanel,
    cleanupStaleMaterials,
    sendAuditQuestion,
    applyChatSuggestion,
    applyChatAnswerToFindingFromBtn,
    askFromFinding,
    saveFindingEdit,
    submitTextNote,
    submitAudioMaterial,
    submitScreenshot,
    submitMetrics,
    addDocument,
    importDirectPeriodsFromPreview,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleBrowserSpeechRecognition,
    loadOpsHealthPage,
    toggleOpsHealthAutoRefresh,
    applyAuditTemplate,
    applyRunsFilter,
    clearRunsFilter,
    toggleRunDetails,
    openMetricsEditor,
    openMetricsEditorAddPeriod,
    openMetricsEditorEdit,
    openMetricsEditorForNewPeriod,
    scrollToMetricsPeriodsPanel,
    goToAddAuditData,
    goToDataImprovements,
    rerunAuditAnalysis,
    scrollToPendingFindings,
    openRecommendationsPanel,
    openReportPanel,
    openDocumentMaterialById,
    openDocumentMaterial,
    editDocumentText,
    resetStuckAnalysis,
    setAuditsListFilter,
    resetAuditsListFilters,
    goToAuditsPage,
    setAuditsListPageSize,
    toggleAuditsListSort,
    toggleAuditActionsMenu,
    closeAllAuditActionsMenus,
    runAnalysis,
    openAudit,
    loadAuditsList,
    updateNicheSubnicheUi,
    updateNichePreview,
    openEditClientModal,
    saveEditClient,
    openContactModalFromList,
    openContactModal,
    saveContact,
    deleteContact,
    duplicateAudit,
    toggleArchiveAudit,
    deleteAudit,
    previewAudit,
    exportAudit,
    editMaterial,
    deleteMaterial,
    saveFindingIllustrationCaption: saveFindingIllustrationCaption2,
    openReportAppendixPicker,
    addScreenshotToReportAppendix: openReportAppendixPicker,
    removeReportAppendixItem,
    moveReportAppendixItem,
    saveReportAppendixFromUi,
    setFindingsMarketerFilter,
    goToFindingsInReport,
    scrollToDirectRisks,
    goToDirectResultsRisks,
    openAiFindingFromDirectRisk,
    openFindingsStubEnrichment,
    openDirectExcelSource,
    openFindingEvidenceMaterial,
    openFindingIllustrationPicker,
    clearFindingIllustration,
    unconfirmFinding,
    confirmFinding,
    confirmFindingRiskPattern,
    rejectFinding,
    restoreFindingToReview,
    openFindingEdit,
    openFindingFromReview,
    captureAuditBaseline,
    saveAuditPlan,
    saveReportCommercialOffer,
    saveReportAuditSummary,
    refreshReportSummaryFromAudit,
    refreshReportCommercialOfferFromAudit,
    toggleReportSummaryEdit,
    applyForecastFromCommercialOffer,
    generateClientSnapshotDraft,
    setMetricPeriodPreset,
    activateMetricsPeriod,
    extractMetricsFromNotesWithConfirm,
    extractMetricsFromNoteWithConfirm,
    extractMetricsWithAiConfirm,
    openDataItemAction,
    acceptDataLimitation,
    materialReviewAction,
    setMaterialAiInclusion,
    saveMaterialAiHint,
    rerunScreenshotOcr,
    reocrAllScreenshots,
    toggleChatWhy
  });
  document.addEventListener("DOMContentLoaded", function() {
    const uiBuild = document.body?.dataset?.uiBuild || "unknown";
    console.info("[PPC Audit] UI build:", uiBuild, "| openMetricsEditor:", typeof window.openMetricsEditor);
    verifyUiBuildSync();
    const path = window.location.pathname;
    loadAuthContext().finally(() => {
      renderIdentityBadges();
      renderAuthControls();
      if (path === "/" || path === "/index.html") {
        initAuditsListToolbar();
        loadAuditsList();
        loadOpsAlerts();
        loadAuditTemplates();
        initNicheFormUi();
      } else if (path.match(/\/audits\/\d+/)) {
        initNicheFormUi();
        loadAuditDetail().then(() => {
          if (auditData && auditData.status === "in_progress") {
            connectAnalysisProgress(currentAuditId);
          }
        }).catch((err) => {
          console.error("[PPC Audit] loadAuditDetail failed:", err);
        });
      } else if (path === "/audit-runs") {
        loadRunsList();
      } else if (path === "/ops-health") {
        loadOpsHealthPage();
        toggleOpsHealthAutoRefresh();
      }
    });
    try {
      setupDropZones();
      initMaterialFileTitleAutofill();
      initMetricPeriodPickers();
      loadPrivacySettings();
      initAiModelSelectors();
    } catch (err) {
      console.error("[PPC Audit] UI widgets init:", err);
    }
  });
  async function loadRunsList() {
    const tbody = document.getElementById("runsTableBody");
    const hint = document.getElementById("runsFilterHint");
    const resetBtn = document.getElementById("runsFilterResetBtn");
    const statusSelect = document.getElementById("runsStatusFilter");
    const actionInput = document.getElementById("runsActionFilter");
    const auditIdInput = document.getElementById("runsAuditIdFilter");
    if (!tbody) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const savedRaw = localStorage.getItem("runsFilters");
      let saved = {};
      try {
        saved = savedRaw ? JSON.parse(savedRaw) : {};
      } catch (_e) {
        saved = {};
      }
      const statusFilter = (params.get("status") || saved.status || "").trim().toLowerCase();
      const actionFilter = (params.get("action") || saved.action || "").trim().toLowerCase();
      const auditIdFilter = (params.get("audit_id") || saved.audit_id || "").trim();
      let restoredFromStorage = false;
      if (!window.location.search && (statusFilter || actionFilter || auditIdFilter)) {
        const restoreParams = new URLSearchParams();
        if (statusFilter) restoreParams.set("status", statusFilter);
        if (actionFilter) restoreParams.set("action", actionFilter);
        if (auditIdFilter) restoreParams.set("audit_id", auditIdFilter);
        const restoredQuery = restoreParams.toString();
        if (restoredQuery) {
          window.history.replaceState({}, "", `/audit-runs?${restoredQuery}`);
          restoredFromStorage = true;
        }
      }
      if (statusSelect) statusSelect.value = statusFilter;
      if (actionInput) actionInput.value = actionFilter;
      if (auditIdInput) auditIdInput.value = auditIdFilter;
      const runs = await apiRequest("/api/audit-runs/");
      const filteredRuns = runs.filter((r) => {
        if (statusFilter && String(r.status || "").toLowerCase() !== statusFilter) return false;
        if (actionFilter && !String(r.action || "").toLowerCase().includes(actionFilter)) return false;
        if (auditIdFilter && String(r.audit_project_id || "") !== auditIdFilter) return false;
        return true;
      });
      if (hint) {
        const active = [];
        if (statusFilter) active.push(`status=${statusFilter}`);
        if (actionFilter) active.push(`action~${actionFilter}`);
        if (auditIdFilter) active.push(`audit_id=${auditIdFilter}`);
        if (active.length) {
          hint.style.display = "block";
          hint.textContent = `\u0424\u0438\u043B\u044C\u0442\u0440: ${active.join(", ")}`;
        } else {
          hint.style.display = "none";
          hint.textContent = "";
        }
      }
      if (resetBtn) {
        const hasFilter = Boolean(statusFilter || actionFilter || auditIdFilter);
        resetBtn.style.display = hasFilter ? "inline-flex" : "none";
      }
      if (restoredFromStorage) {
        showAlert("\u0424\u0438\u043B\u044C\u0442\u0440 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u043E\u0432 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D", "info");
      }
      if (filteredRuns.length === 0) {
        const emptyText = statusFilter ? "\u041F\u043E \u0442\u0435\u043A\u0443\u0449\u0435\u043C\u0443 \u0444\u0438\u043B\u044C\u0442\u0440\u0443 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043D\u0435\u0442." : "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043E \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0445";
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty-state">${emptyText}</td></tr>`;
        return;
      }
      tbody.innerHTML = filteredRuns.map((r) => {
        const detailsId = `run_details_${r.id}`;
        const input = r.input_json ? escapeHtml(prettyJson(r.input_json)) : "\u2014";
        const output = r.output_json ? escapeHtml(prettyJson(r.output_json)) : r.error ? escapeHtml(r.error) : "\u2014";
        return `
            <tr>
                <td>${r.id}</td>
                <td><a href="/audits/${r.audit_project_id}">\u0410\u0443\u0434\u0438\u0442 #${r.audit_project_id}</a></td>
                <td>${escapeHtml(r.action)}</td>
                <td><span class="badge badge-${r.status === "success" ? "completed" : r.status === "failed" ? "failed" : "draft"}">${escapeHtml(r.status || "\u2014")}</span></td>
                <td>${r.duration_ms ? (r.duration_ms / 1e3).toFixed(1) + " \u0441\u0435\u043A" : "\u2014"}</td>
                <td>${formatDate(r.created_at)}</td>
                <td><button class="btn btn-outline btn-sm" onclick="toggleRunDetails('${detailsId}')">\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C</button></td>
            </tr>
            <tr id="${detailsId}" class="run-details-row is-hidden">
                <td colspan="7">
                    <div class="raw-json-grid">
                        <div><strong>Input</strong><pre class="raw-json">${input}</pre></div>
                        <div><strong>Output / Error</strong><pre class="raw-json">${output}</pre></div>
                    </div>
                </td>
            </tr>`;
      }).join("");
    } catch (error) {
      showAlert("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0441\u0442\u043E\u0440\u0438\u0438: " + error.message, "danger");
    }
  }
  function clearRunsFilter() {
    localStorage.removeItem("runsFilters");
    window.location.href = "/audit-runs";
  }
  function applyRunsFilter() {
    const status = (document.getElementById("runsStatusFilter")?.value || "").trim();
    const action = (document.getElementById("runsActionFilter")?.value || "").trim();
    const auditId = (document.getElementById("runsAuditIdFilter")?.value || "").trim();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (action) params.set("action", action);
    if (auditId) params.set("audit_id", auditId);
    localStorage.setItem("runsFilters", JSON.stringify({
      status: status || "",
      action: action || "",
      audit_id: auditId || ""
    }));
    const query = params.toString();
    window.location.href = query ? `/audit-runs?${query}` : "/audit-runs";
  }
  function prettyJson(value) {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch (e) {
      return value || "";
    }
  }
  function toggleRunDetails(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("is-hidden");
  }

  // src/main.js
  initModalOverlayClose();
})();
