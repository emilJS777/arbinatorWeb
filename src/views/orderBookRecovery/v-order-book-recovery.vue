<script>
import {mapState} from "vuex";
import {executionPreview} from '@/utils/executionPreview.js';
import {canOfferPaperAbandonment, paperAbandonmentBody, paperCloseBlockReason, paperAbandonmentUnavailableReason} from '@/utils/paperAbandonment.js';
import {getResponseMessage, isResponseSuccess} from "@/store/request.js";
import {buildConfigPayload, normalizeConfigForm, pairOptionsForExchange, resolveExchange, resolvePair} from "@/utils/orderBookRecoveryConfig.js";
import {startBlockReasons, pnlEvidence, protectionLabel, sectionTitle, settingsChanges, snapshotAge, utcTime, validateSettings} from '@/utils/workspacePresentation.js';

export default {
  computed: {
    accountingNote() {
      if (this.metrics?.accounting_scope === 'paper_session') return this.metrics.paper_session_id ? 'Current paper session only. Simulated PnL, not confirmed profit.' : 'Legacy paper results only. Simulated PnL.';
      if (this.metrics?.accounting_scope === 'live_history') return 'Live ledger only. Verify fills, fees and reconciliation.';
      return 'Accounting scope unavailable; do not compare with trading history.';
    },
    executionPreview() { return executionPreview(this.form || {}); },
    section() { return this.$route.meta.workspaceSection || 'overview'; },
    pageTitle() { return sectionTitle(this.section); },
    startBlockReasons() { return startBlockReasons({config: this.config, runtime: this.statePayload, dirty: this.formDirty, loading: this.actionLoading.start}); },
    canStart() { return this.startBlockReasons.length === 0; },
    canOfferAbandon() { return canOfferPaperAbandonment(this.openPosition, this.statePayload, this.stateRequest); },
    closeBlockReason() { return paperCloseBlockReason(this.openPosition, this.statePayload, this.stateRequest); },
    abandonmentUnavailableReason() { return paperAbandonmentUnavailableReason(this.openPosition, this.statePayload, this.stateRequest); },
    formDirty() {return this.form && this.savedForm && JSON.stringify(this.form) !== JSON.stringify(this.savedForm);},
    visibleTrades() {return (this.trades || []).filter(trade => this.historyMode === 'all' || (trade.execution_mode || 'paper') === this.historyMode);},
    reviewedChanges() {return settingsChanges(this.savedForm || {}, this.form || {});},
    bookAge() {return snapshotAge(this.statePayload?.last_order_book_snapshot_time || this.debug?.last_order_book_snapshot_time, this.uiNow);},
    ...mapState({
      config: state => state.orderBookRecovery.CONFIG,
      options: state => state.orderBookRecovery.OPTIONS,
      statePayload: state => state.orderBookRecovery.STATE,
      stateRequest: state => state.orderBookRecovery.STATE_REQUEST,
      trades: state => state.orderBookRecovery.TRADES,
      metrics: state => state.orderBookRecovery.METRICS,
      debug: state => state.orderBookRecovery.DEBUG,
      mlStats: state => state.orderBookRecovery.ML_STATS,
      scannerDiagnostics: state => state.orderBookRecovery.SCANNER_DIAGNOSTICS,
      backendStatus: state => state.orderBookRecovery.BACKEND_STATUS,
      showArchived: state => state.orderBookRecovery.SHOW_ARCHIVED,
    }),
    recoveryState() {
      return this.statePayload?.recovery_state || {};
    },
    openPosition() {
      return this.statePayload && Object.hasOwn(this.statePayload, 'open_position') ? this.statePayload.open_position : this.metrics?.open_position || null;
    },
    exchangeOptions() {
      return this.options?.exchanges || [];
    },
    selectedExchange() {
      return resolveExchange(this.exchangeOptions, this.form || {});
    },
    pairOptions() {
      return pairOptionsForExchange(this.exchangeOptions, this.form?.exchange_id);
    },
    exportableTradesCount() {
      return (this.trades || []).filter(trade => trade.closed_at && !trade.is_archived).length;
    },
    estimatedNotional() {
      return Number(this.recoveryState.current_margin || this.config?.base_margin_usdt || 0) * Number(this.config?.leverage || 0);
    },
    sideBiasWarning() {
      const finalRows = (this.debug?.signal_diagnostics_last_100 || [])
          .filter(row => ["long", "short"].includes(row.final_side))
          .slice(-50);
      if (finalRows.length < 10) return null;
      const longCount = finalRows.filter(row => row.final_side === "long").length;
      const shortCount = finalRows.filter(row => row.final_side === "short").length;
      if (longCount / finalRows.length > 0.9) return "Side bias detected: mostly long. Check thresholds and diagnostics.";
      if (shortCount / finalRows.length > 0.9) return "Side bias detected: mostly short. Check thresholds and diagnostics.";
      return null;
    },
    mlMarketSnapshotStats() {
      const total = Number(this.mlStats?.ml_market_snapshots_count || 0);
      const pending = Number(this.mlStats?.ml_market_snapshots_pending_count || 0);
      const labeled = Number(this.mlStats?.ml_market_snapshots_labeled_count || 0);
      const completion = total > 0 ? (labeled / total) * 100 : 0;
      const exchangeLabelsTotal = Number(this.mlStats?.ml_exchange_labels_count || 0);
      const exchangeLabelsPending = Number(this.mlStats?.ml_exchange_labels_pending_count || 0);
      const exchangeLabelsLabeled = Number(this.mlStats?.ml_exchange_labels_labeled_count || 0);
      const exchangeLabelCompletion = Number(this.mlStats?.ml_exchange_label_completion_percent || 0);
      return {total, pending, labeled, completion, exchangeLabelsTotal, exchangeLabelsPending, exchangeLabelsLabeled, exchangeLabelCompletion};
    },
    mlExplorerTabs() {
      return [
        {key: "feature", label: "Feature snapshots"},
        {key: "market", label: "Market snapshots"},
        {key: "price_history", label: "Price history"},
        {key: "exchange_label", label: "Exchange labels"},
      ];
    },
    activeMlExplorerData() {
      return this.mlExplorer.datasets[this.mlExplorer.active] || {items: [], page: 1, page_size: 50, total: 0, total_pages: 0};
    },
    activeMlExplorerColumns() {
      const common = {
        feature: ["id", "timestamp", "exchange", "symbol", "proposed_side", "final_side", "result", "ml_score"],
        market: ["id", "timestamp", "exchange", "symbol", "reference_price", "label_status", "future_return_10s", "mfe_long_10s", "mae_long_10s"],
        price_history: ["id", "timestamp", "exchange", "symbol", "mid_price", "bid", "ask", "spread"],
        exchange_label: ["id", "snapshot_id", "exchange", "symbol", "reference_price", "label_status", "future_return_10s", "mfe_long_10s", "mae_long_10s"],
      };
      return common[this.mlExplorer.active] || common.feature;
    },
  },
  data() {
    return {
      form: null,
      savedForm: null,
      reviewOpen: false,
      validationErrors: [],
      initialLoading: true,
      historyMode: 'all',
      eventHandlers: {},
      uiNow: Date.now(),
      uiClock: null,
      poller: null,
      pollers: [],
      decisionDetails: null,
      mlExplorerDetail: null,
      mlExplorerDetailLoading: false,
      mlExplorerDetailError: "",
      mlExplorerDetailRequest: null,
      manualMarginValue: null,
      actionLoading: {},
      mlExplorer: {
        active: "feature",
        loading: false,
        error: "",
        datasets: {
          feature: {items: [], page: 1, page_size: 50, total: 0, total_pages: 0},
          market: {items: [], page: 1, page_size: 50, total: 0, total_pages: 0},
          price_history: {items: [], page: 1, page_size: 50, total: 0, total_pages: 0},
          exchange_label: {items: [], page: 1, page_size: 50, total: 0, total_pages: 0},
        },
        filters: {
          symbol: "",
          exchange: "",
          date_from: "",
          date_to: "",
          side: "",
          result: "",
          label_status: "",
          has_ml_score: "",
          sort_by: "timestamp",
          sort_dir: "desc",
        },
      },
    };
  },
  mounted() {
    this.uiClock = setInterval(() => {this.uiNow = Date.now();}, 1000);
    this.load().finally(() => {this.initialLoading = false;});
    if (this.section === 'research') this.loadMlExplorer();
    this.startPolling();
    this.eventHandlers = {
      'orderbook_recovery.position_opened': () => this.refreshTradingData(),
      'orderbook_recovery.position_closed': () => this.refreshTradingData(),
      'orderbook_recovery.started': () => this.refreshStatusData(),
      'orderbook_recovery.stopped': () => this.refreshStatusData(),
    };
    Object.entries(this.eventHandlers).forEach(([event, handler]) => this.emitter.on(event, handler));
  },
  beforeUnmount() {
    clearInterval(this.uiClock);
    if (this.poller) clearInterval(this.poller);
    this.pollers.forEach(poller => clearInterval(poller));
    this.pollers = [];
    Object.entries(this.eventHandlers).forEach(([event, handler]) => this.emitter.off(event, handler));
  },
  watch: {
    section(value) {if (value === 'research') this.loadMlExplorer();},
    config: {
      immediate: true,
      handler() {
        this.syncFormSelection();
      },
    },
    options: {
      immediate: true,
      deep: true,
      handler() {
        this.syncFormSelection();
      },
    },
  },
  methods: {
    pnlEvidence,
    listText(value) {return Array.isArray(value) ? value.join(', ') || '-' : '-';},
    reviewSettings() {
      this.validationErrors = validateSettings(this.form || {}, this.exchangeOptions);
      if (!this.validationErrors.length) this.reviewOpen = true;
    },
    load() {
      return this.$store.dispatch("orderBookRecovery/LOAD");
    },
    refreshStatusData() {
      return Promise.allSettled([
        this.$store.dispatch("orderBookRecovery/LOAD_STATUS"),
        this.$store.dispatch("orderBookRecovery/LOAD_DIAGNOSTICS"),
      ]);
    },
    refreshTradingData() {
      return Promise.allSettled([
        this.$store.dispatch("orderBookRecovery/LOAD_STATUS"),
        this.$store.dispatch("orderBookRecovery/LOAD_TRADES"),
      ]);
    },
    setActionLoading(action, value) {
      this.actionLoading = {...this.actionLoading, [action]: value};
    },
    async runAction(action, handler) {
      if (this.actionLoading[action]) return null;
      this.setActionLoading(action, true);
      try {
        return await handler();
      } finally {
        this.setActionLoading(action, false);
      }
    },
    startPolling() {
      this.pollers.forEach(poller => clearInterval(poller));
      this.pollers = [
        setInterval(() => this.$store.dispatch("orderBookRecovery/LOAD_STATUS"), 5000),
        setInterval(() => this.$store.dispatch("orderBookRecovery/LOAD_TRADES"), 12000),
        setInterval(() => {if (this.section === 'research') this.$store.dispatch("orderBookRecovery/LOAD_ML_STATS");}, 30000),
        setInterval(() => this.$store.dispatch("orderBookRecovery/LOAD_DIAGNOSTICS"), 60000),
      ];
    },
    syncFormSelection() {
      if (!this.config || !this.options) return;
      if (this.formDirty) return;
      const form = normalizeConfigForm({...this.config});
      const exchange = this.resolveExchange(form);
      if (exchange) {
        form.exchange_id = exchange.id;
        form.exchange = exchange.title;
      }
      const pair = this.resolvePair(exchange, form);
      if (pair) {
        form.trading_pair_id = pair.id;
        form.symbol = pair.pair;
      }
      this.form = form;
      this.savedForm = JSON.parse(JSON.stringify(form));
    },
    resolveExchange(form) {
      return resolveExchange(this.exchangeOptions, form);
    },
    resolvePair(exchange, form) {
      return resolvePair(exchange, form);
    },
    onExchangeChange() {
      const exchange = this.selectedExchange;
      this.form.exchange = exchange?.title || "";
      this.form.trading_pair_id = null;
      this.form.symbol = "";
      if ((exchange?.pairs || []).length === 1) {
        this.form.trading_pair_id = exchange.pairs[0].id;
        this.form.symbol = exchange.pairs[0].pair;
      }
    },
    onPairChange() {
      const pair = this.pairOptions.find(item => Number(item.id) === Number(this.form?.trading_pair_id));
      this.form.symbol = pair?.pair || "";
    },
    saveConfig() {
      this.validationErrors = validateSettings(this.form || {}, this.exchangeOptions);
      if (this.validationErrors.length) {this.reviewOpen = false; return;}
      if (!this.form?.exchange_id) {
        this.emitter.emit("toster", {success: false, msg: "Select exchange"});
        return;
      }
      if (!this.form?.trading_pair_id) {
        this.emitter.emit("toster", {success: false, msg: "Select trading pair"});
        return;
      }
      this.runAction("saveConfig", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/SAVE_CONFIG", buildConfigPayload(this.form));
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Config saved" : getResponseMessage(res),
        });
        if (isResponseSuccess(res)) {
          this.reviewOpen = false;
          this.form = null;
          this.savedForm = null;
          this.syncFormSelection();
          await this.refreshStatusData();
        }
      });
    },
    async start() {
      if (!this.canStart) {
        this.emitter.emit('toster', {success: false, msg: this.startBlockReasons.map(reason => this.$t(reason)).join('; ')});
        return;
      }
      if (this.form) {
        if (!this.form.exchange_id) {
          this.emitter.emit("toster", {success: false, msg: "Select exchange"});
          return;
        }
        if (!this.form.trading_pair_id) {
          this.emitter.emit("toster", {success: false, msg: "Select trading pair"});
          return;
        }
      }
      await this.runAction("start", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/START");
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Strategy started" : getResponseMessage(res),
        });
      });
    },
    stop() {
      this.runAction("stop", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/STOP");
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Strategy stopped" : getResponseMessage(res),
        });
      });
    },
    newPaperSession() {
      if (!window.confirm(this.$t('Start a new paper experiment? History is preserved; balance and metrics start separately.'))) return;
      this.runAction('newPaperSession', async () => {
        const res = await this.$store.dispatch('orderBookRecovery/NEW_PAPER_SESSION');
        this.emitter.emit('toster', {success: isResponseSuccess(res), msg: isResponseSuccess(res) ? this.$t('Paper session created') : getResponseMessage(res)});
      });
    },
    closePosition() {
      if (!this.openPosition || this.closeBlockReason) return;
      if (!window.confirm(this.$t(this.openPosition.execution_mode === 'live' ? 'Close live position on the exchange? This sends a real closing order.' : 'Close current paper position manually?'))) return;
      this.runAction("closePosition", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/CLOSE_MANUAL", this.openPosition.id);
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? this.$t(res.data?.obj?.closed_at ? 'Position closed manually' : 'Close requested; execution unresolved') : this.$t(getResponseMessage(res)),
        });
      });
    },
    abandonLegacyPaper() {
      if (!this.canOfferAbandon || this.statePayload?.enabled !== false) return;
      const positionId = this.openPosition.id;
      const message = `${this.$t('Abandon legacy paper position')} #${positionId}?\n${this.$t('Preserve history as unverified. No exit, fill or PnL will be created. This cannot be undone.')}`;
      if (!window.confirm(message)) return;
      this.runAction('abandonLegacyPaper', async () => {
        const res = await this.$store.dispatch('orderBookRecovery/ABANDON_LEGACY_PAPER', {positionId, body: paperAbandonmentBody(positionId)});
        this.emitter.emit('toster', {success: isResponseSuccess(res), msg: isResponseSuccess(res) ? this.$t('Paper position abandoned; history preserved') : this.$t(getResponseMessage(res))});
      });
    },
    resetRecovery() {
      if (this.openPosition) {
        this.emitter.emit("toster", {success: false, msg: "cannot_change_margin_with_open_position"});
        return;
      }
      if (!window.confirm("Reset recovery to base margin?")) return;
      this.runAction("resetRecovery", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/RESET_RECOVERY");
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Recovery reset" : getResponseMessage(res),
        });
      });
    },
    setCurrentMargin() {
      if (this.openPosition) {
        this.emitter.emit("toster", {success: false, msg: "cannot_change_margin_with_open_position"});
        return;
      }
      const value = Number(this.manualMarginValue);
      if (!value || value <= 0) {
        this.emitter.emit("toster", {success: false, msg: "Enter valid current margin"});
        return;
      }
      this.runAction("setCurrentMargin", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/SET_CURRENT_MARGIN", value);
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Current margin updated" : getResponseMessage(res),
        });
      });
    },
    fmt(value, digits = 4) {
      if (value === null || value === undefined) return "-";
      const number = Number(value);
      if (Number.isNaN(number)) return "-";
      return number.toFixed(digits);
    },
    dt(value) {
      return Number.isFinite(utcTime(value)) ? new Date(utcTime(value)).toLocaleString(this.$locale.value === 'ru' ? 'ru-RU' : 'en-GB') : "-";
    },
    scannerStatusTone(status) {
      if (["active", "waiting"].includes(status)) return "positive";
      if (["cooldown", "timeout", "failed"].includes(status)) return "negative";
      return "neutral";
    },
    metricTone(value) {
      const number = Number(value || 0);
      if (number > 0) return "positive";
      if (number < 0) return "negative";
      return "neutral";
    },
    moneyResult(value) {
      if (value === null || value === undefined) return "-";
      const number = Number(value || 0);
      const sign = number > 0 ? "+" : "";
      return `${sign}${number.toFixed(4)} USDT`;
    },
    pnlLabel(trade) {
      const pnl = Number(trade?.pnl || 0);
      if (!trade?.closed_at) return "Floating";
      if (pnl > 0) return "Won";
      if (pnl < 0) return "Lost";
      return "Break even";
    },
    closeReasonLabel(reason) {
      const labels = {
        exchange_position_already_closed: "Exchange position already closed",
        exchange_position_closed_external: "Closed externally on exchange",
        exchange_take_profit: "Exchange take profit",
        exchange_stop_loss: "Exchange stop loss",
        manual_close: "Manual close",
        take_profit: "Take profit",
        stop_loss: "Stop loss",
      };
      return labels[reason] || reason || "-";
    },
    formatOrderId(raw) {
      if (!raw) return "-";
      if (typeof raw === "string") {
        try {
          return this.formatOrderId(JSON.parse(raw));
        } catch {
          return raw;
        }
      }
      if (typeof raw === "object") {
        return raw.orderId || raw.order_id || raw.id || raw.clientOrderId || raw.externalOid || "-";
      }
      return String(raw);
    },
    formatLiveStatus(status) {
      const labels = {
        paper_abandoned: 'Abandoned / unverified',
        open: "Open",
        closed: "Closed",
        open_failed: "Open failed",
        close_failed: "Close failed",
        tp_sl_unprotected: "Needs attention",
        reconciled: "Reconciled",
      };
      return labels[status] || (status ? String(status).replaceAll("_", " ") : "-");
    },
    liveStatusTone(status) {
      if (["open", "closed", "reconciled"].includes(status)) return "positive";
      if (["open_failed", "close_failed", "tp_sl_unprotected"].includes(status)) return "negative";
      return "neutral";
    },
    formatProtectionStatus(trade) {
      return protectionLabel(trade, this.uiNow);
    },
    protectionTone(trade) {
      const status = this.formatProtectionStatus(trade);
      if (status === "Protected") return "positive";
      if (["Unprotected", "Not created"].includes(status)) return "negative";
      if (status === "Pending") return "warning";
      return "neutral";
    },
    resultLabel(trade) {
      if (trade?.abandoned_at) return 'Abandoned / unverified';
      if (trade?.live_status === 'paper_pending') return 'Pending';
      if (trade?.live_status === 'paper_cancelled') return 'Cancelled';
      if (["open_failed", "close_failed"].includes(trade?.live_status)) return "Failed";
      if (!trade?.closed_at) return "Floating";
      if (trade?.execution_mode === 'live' && pnlEvidence(trade) !== 'Exchange-reconciled PnL') return 'Unverified';
      if (trade?.live_status === "closed" && ["exchange_position_already_closed", "exchange_position_closed_external"].includes(trade?.reason_close)) return "Closed";
      return this.pnlLabel(trade);
    },
    resultTone(trade) {
      const label = this.resultLabel(trade);
      if (label === "Won") return "positive";
      if (["Lost", "Failed"].includes(label)) return "negative";
      if (label === "Floating") return "info";
      return "neutral";
    },
    formatWarningSummary(trade) {
      if (!trade) return "";
      if (trade.tp_sl_error || trade.live_status === "tp_sl_unprotected") return "Needs attention";
      if (["open_failed", "close_failed"].includes(trade.live_status)) return "Warning";
      if (trade.exit_price_fallback_used || trade.exit_price_warning || trade.live_error) return "Warning";
      return "";
    },
    feeIndicator(trade) {
      return this.$t(pnlEvidence(trade));
    },
    prettyRaw(value) {
      if (!value) return "-";
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return JSON.stringify(parsed, null, 2);
      } catch {
        return String(value);
      }
    },
    setShowArchived(event) {
      this.$store.dispatch("orderBookRecovery/SET_SHOW_ARCHIVED", event.target.checked);
    },
    archiveTrade(trade) {
      if (!trade || !trade.closed_at) return;
      this.runAction(`archiveTrade:${trade.id}`, async () => {
        const res = await this.$store.dispatch("orderBookRecovery/ARCHIVE_TRADE", trade.id);
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Trade archived" : getResponseMessage(res),
        });
      });
    },
    deleteArchivedTrade(trade) {
      if (!trade?.is_archived) return;
      if (!window.confirm("Delete archived trade permanently?")) return;
      this.runAction(`deleteArchivedTrade:${trade.id}`, async () => {
        const res = await this.$store.dispatch("orderBookRecovery/DELETE_ARCHIVED_TRADE", trade.id);
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Archived trade deleted" : getResponseMessage(res),
        });
      });
    },
    deleteAllArchivedTrades() {
      if (!window.confirm("Delete all archived trades permanently?")) return;
      this.runAction("deleteAllArchivedTrades", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/DELETE_ALL_ARCHIVED_TRADES");
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Archived trades deleted" : getResponseMessage(res),
        });
      });
    },
    archiveAllClosed() {
      this.runAction("archiveAllClosed", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/ARCHIVE_ALL_CLOSED");
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Closed trades archived" : getResponseMessage(res),
        });
      });
    },
    unarchiveAll() {
      this.runAction("unarchiveAll", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/UNARCHIVE_ALL");
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Trades restored" : getResponseMessage(res),
        });
      });
    },
    viewDetails(trade) {
      this.$store.dispatch("orderBookRecovery/LOAD_DECISION_DETAILS", trade.id).then(res => {
        if (isResponseSuccess(res)) {
          this.decisionDetails = res.data.obj;
          return;
        }
        this.emitter.emit("toster", {success: false, msg: getResponseMessage(res)});
      });
    },
    closeDetails() {
      this.decisionDetails = null;
    },
    mlExplorerParams(overrides = {}) {
      const data = this.activeMlExplorerData;
      const filters = this.mlExplorer.filters;
      const params = {
        page: data.page || 1,
        page_size: data.page_size || 50,
        symbol: filters.symbol,
        exchange: filters.exchange,
        date_from: filters.date_from,
        date_to: filters.date_to,
        sort_by: filters.sort_by,
        sort_dir: filters.sort_dir,
        ...overrides,
      };
      if (this.mlExplorer.active === "feature") {
        params.side = filters.side;
        params.result = filters.result;
        params.has_ml_score = filters.has_ml_score;
      }
      if (["market", "exchange_label"].includes(this.mlExplorer.active)) {
        params.label_status = filters.label_status;
      }
      return params;
    },
    loadMlExplorer(overrides = {}) {
      this.mlExplorer.loading = true;
      this.mlExplorer.error = "";
      const dataset = this.mlExplorer.active;
      const params = this.mlExplorerParams(overrides);
      this.$store.dispatch("orderBookRecovery/LOAD_ML_DATASET", {dataset, params}).then(res => {
        if (!isResponseSuccess(res)) {
          this.mlExplorer.error = getResponseMessage(res);
          return;
        }
        this.mlExplorer.datasets[dataset] = res.data.obj;
      }).catch(error => {
        this.mlExplorer.error = error?.message || "Failed to load ML dataset";
      }).finally(() => {
        this.mlExplorer.loading = false;
      });
    },
    setMlExplorerTab(tab) {
      this.mlExplorer.active = tab;
      this.loadMlExplorer({page: 1});
    },
    applyMlExplorerFilters() {
      this.loadMlExplorer({page: 1});
    },
    resetMlExplorerFilters() {
      this.mlExplorer.filters = {
        symbol: "",
        exchange: "",
        date_from: "",
        date_to: "",
        side: "",
        result: "",
        label_status: "",
        has_ml_score: "",
        sort_by: "timestamp",
        sort_dir: "desc",
      };
      this.loadMlExplorer({page: 1});
    },
    changeMlExplorerPage(delta) {
      const data = this.activeMlExplorerData;
      const next = Math.min(Math.max(1, Number(data.page || 1) + delta), Math.max(1, Number(data.total_pages || 1)));
      this.loadMlExplorer({page: next});
    },
    changeMlExplorerPageSize(event) {
      this.loadMlExplorer({page: 1, page_size: Number(event.target.value)});
    },
    openMlExplorerDetail(row) {
      const dataset = this.mlExplorer.active;
      this.loadMlExplorerDetail(dataset, row.id, row);
    },
    loadMlExplorerDetail(dataset, id, fallback = null) {
      this.mlExplorerDetail = {dataset, item: fallback || {id}};
      this.mlExplorerDetailRequest = {dataset, id, fallback};
      this.mlExplorerDetailError = "";
      this.mlExplorerDetailLoading = true;
      this.$store.dispatch("orderBookRecovery/LOAD_ML_DATASET_DETAIL", {dataset, id}).then(res => {
        if (isResponseSuccess(res) && res.data?.obj && typeof res.data.obj === "object") {
          this.mlExplorerDetail = {dataset, item: res.data.obj};
          return;
        }
        this.mlExplorerDetailError = "Failed to load record details";
        this.emitter.emit("toster", {success: false, msg: getResponseMessage(res) || this.mlExplorerDetailError});
      }).catch(error => {
        this.mlExplorerDetailError = "Failed to load record details";
        this.emitter.emit("toster", {success: false, msg: error?.message || this.mlExplorerDetailError});
      }).finally(() => {
        this.mlExplorerDetailLoading = false;
      });
    },
    retryMlExplorerDetail() {
      if (!this.mlExplorerDetailRequest) return;
      const {dataset, id, fallback} = this.mlExplorerDetailRequest;
      this.loadMlExplorerDetail(dataset, id, fallback);
    },
    closeMlExplorerDetail() {
      this.mlExplorerDetail = null;
      this.mlExplorerDetailError = "";
      this.mlExplorerDetailRequest = null;
    },
    copyMlExplorerJson() {
      navigator.clipboard?.writeText(JSON.stringify(this.mlExplorerDetail?.item || {}, null, 2));
      this.emitter.emit("toster", {success: true, msg: "JSON copied"});
    },
    exportMlExplorer(format = "csv") {
      const dataset = this.mlExplorer.active;
      const params = this.mlExplorerParams({format, page: undefined, page_size: undefined});
      this.$store.dispatch("orderBookRecovery/EXPORT_ML_DATASET_EXPLORER", {dataset, params}).then(async response => {
        if (!response?.ok) {
          this.emitter.emit("toster", {success: false, msg: "ML dataset export failed"});
          return;
        }
        const blob = await response.blob();
        const now = new Date();
        const pad = value => String(value).padStart(2, "0");
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const extension = format === "json" ? "json" : "csv";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `orderbook-recovery-ml-${dataset}-${stamp}.${extension}`;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        link.remove();
      });
    },
    mlExplorerCell(row, column) {
      const value = row?.[column];
      if (column.includes("timestamp") || column === "created_at") return this.dt(value);
      if (typeof value === "number") return Number.isInteger(value) ? value : this.fmt(value, Math.abs(value) < 1 ? 6 : 4);
      if (value === null || value === undefined || value === "") return "-";
      return value;
    },
    mlExplorerBadgeTone(value) {
      if (["labeled", "win", "long", "shadow"].includes(value)) return "positive";
      if (["pending", "created"].includes(value)) return "warning";
      if (["loss", "rejected", "failed"].includes(value)) return "negative";
      return "neutral";
    },
    clearDiagnostics() {
      this.$store.dispatch("orderBookRecovery/CLEAR_DIAGNOSTICS").then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Signal diagnostics cleared" : getResponseMessage(res),
        });
      });
    },
    clearMlDataset() {
      if (!window.confirm("Delete all collected ML training dataset rows from the database? This cannot be undone.")) return;
      this.runAction("clearMlDataset", async () => {
        const res = await this.$store.dispatch("orderBookRecovery/CLEAR_ML_DATASET");
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "ML dataset cleared" : getResponseMessage(res),
        });
        if (isResponseSuccess(res)) {
          await this.loadMlExplorer();
        }
      });
    },
    exportTrades(format = "csv") {
      if (!this.exportableTradesCount) {
        this.emitter.emit("toster", {success: false, msg: "No non-archived closed trades to export"});
        return;
      }
      this.runAction(`exportTrades:${format}`, async () => {
        const response = await this.$store.dispatch("orderBookRecovery/EXPORT_TRADES", {format, includeArchived: false});
        if (!response?.ok) {
          this.emitter.emit("toster", {success: false, msg: "Export failed"});
          return;
        }
        const blob = await response.blob();
        const now = new Date();
        const pad = value => String(value).padStart(2, "0");
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const extension = format === "json" ? "json" : "csv";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `orderbook-recovery-trades-${stamp}.${extension}`;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        link.remove();
      });
    },
    exportMlDataset(format = "csv") {
      this.$store.dispatch("orderBookRecovery/EXPORT_ML_DATASET", {format}).then(async response => {
        if (!response?.ok) {
          this.emitter.emit("toster", {success: false, msg: "ML dataset export failed"});
          return;
        }
        const blob = await response.blob();
        const now = new Date();
        const pad = value => String(value).padStart(2, "0");
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const extension = format === "json" ? "json" : "csv";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `orderbook-recovery-ml-dataset-${stamp}.${extension}`;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        link.remove();
      });
    },
    exportMlMarketSnapshots(format = "csv") {
      this.$store.dispatch("orderBookRecovery/EXPORT_ML_MARKET_SNAPSHOTS", {format}).then(async response => {
        if (!response?.ok) {
          this.emitter.emit("toster", {success: false, msg: "ML market snapshot export failed"});
          return;
        }
        const blob = await response.blob();
        const now = new Date();
        const pad = value => String(value).padStart(2, "0");
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const extension = format === "json" ? "json" : "csv";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `orderbook-recovery-ml-market-snapshots-${stamp}.${extension}`;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        link.remove();
      });
    },
    exportMlExchangeLabels(format = "csv") {
      this.$store.dispatch("orderBookRecovery/EXPORT_ML_EXCHANGE_LABELS", {format}).then(async response => {
        if (!response?.ok) {
          this.emitter.emit("toster", {success: false, msg: "ML exchange labels export failed"});
          return;
        }
        const blob = await response.blob();
        const now = new Date();
        const pad = value => String(value).padStart(2, "0");
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const extension = format === "json" ? "json" : "csv";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `orderbook-recovery-ml-exchange-labels-${stamp}.${extension}`;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        link.remove();
      });
    },
    detail(path, fallback = "-") {
      const parts = path.split(".");
      let value = this.decisionDetails;
      for (const part of parts) value = value?.[part];
      return value === null || value === undefined || value === "" ? fallback : value;
    },
  },
};
</script>

<template>
  <div class="recovery-page">
    <div class="workspace-page-heading">
      <div><div class="workspace-eyebrow">{{ $t("ORDER FLOW / FUTURES") }}</div><h1>{{ $t(pageTitle) }}</h1><p>{{ $t("OrderBookRecovery") }}<span v-if="config"> · {{ $t('Saved configuration') }}: {{ config.exchange }} / {{ config.symbol }} · {{ (config.execution_mode || 'paper').toUpperCase() }}</span></p></div>
      <div class="action-row">
        <button :disabled="actionLoading.refresh" @click="runAction('refresh', load)"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i>{{ $t('Refresh') }}</button>
        <button v-if="section === 'overview'" class="primary-button" :disabled="!canStart" aria-describedby="start-block-reasons" @click="start"><i class="fa-solid fa-play" aria-hidden="true"></i>{{ $t('Start paper entries') }}</button>
        <button v-if="section === 'overview'" :disabled="!config || actionLoading.stop" @click="stop"><i class="fa-solid fa-pause" aria-hidden="true"></i>{{ $t('Pause new entries') }}</button>
      </div>
    </div>
    <div v-if="section === 'overview'" id="start-block-reasons" role="status" aria-live="polite">
      <ul v-if="startBlockReasons.length" class="workspace-notice"><li v-for="reason in startBlockReasons" :key="reason">{{ $t(reason) }}</li></ul>
      <p>{{ $t('Saved configuration') }}: {{ config?.execution_mode || '—' }} · {{ $t('Runtime mode') }}: {{ statePayload?.config?.execution_mode || '—' }} · {{ $t('Unsaved draft') }}: {{ form?.execution_mode || '—' }}</p>
      <p v-if="config?.execution_mode === 'live'">{{ $t('Live activation locked') }}</p>
    </div>
    <div v-if="initialLoading" role="status" class="workspace-notice neutral">{{ $t('Loading workspace...') }}</div>
    <div v-else-if="!config" role="alert" class="workspace-notice">{{ $t('Backend unavailable. Retained data may be out of date.') }}</div>
    <div class="workspace-notice neutral" role="status">
      <p>{{ $t('Last state request') }}: {{ stateRequest?.httpStatus === null ? '—' : (stateRequest?.httpStatus || $t('Network error')) }} · {{ dt(stateRequest?.lastAttemptAt) }} · {{ $t('Last successful state') }}: {{ dt(stateRequest?.lastSuccessfulAt) }}</p>
      <p v-if="stateRequest?.stale">{{ $t('State request failed; retained values are not current runtime evidence') }} <span v-if="stateRequest.incidentId">incident_id: {{ stateRequest.incidentId }}</span></p>
      <p v-if="stateRequest?.missingFields?.length">{{ $t('State contract fields missing; check deployed compatibility') }}: {{ stateRequest.missingFields.join(', ') }}</p>
      <p v-if="statePayload?.runtime_diagnostics">{{ $t('State source process') }}: {{ statePayload.runtime_diagnostics.instance }} / {{ statePayload.runtime_diagnostics.process_id }} · {{ $t('State contract') }}: {{ statePayload.runtime_diagnostics.state_contract_version }} · {{ $t('Build revision') }}: {{ statePayload.runtime_diagnostics.build_revision || $t('Unknown') }}</p>
    </div>
    <div v-if="statePayload?.pending_order" role="status" class="workspace-notice neutral">{{ $t('Pending paper entry') }} #{{ statePayload.pending_order.id }} · {{ statePayload.pending_order.pending_entry_expires_at }} · {{ statePayload.pending_order.live_error || 'paper_pending' }}</div>
    <div v-if="openPosition?.paper_exit_status && openPosition.paper_exit_status !== 'filled'" role="status" class="workspace-notice">{{ $t('Paper exit status') }}: {{ $t(openPosition.paper_exit_status) }}</div>
    <div v-if="openPosition && openPosition.execution_mode !== 'live'" class="workspace-notice neutral" role="status">
      <template v-if="statePayload?.paper_exit_diagnostics">
        <p>{{ $t('Exit blocking reason') }}: {{ $t(statePayload.paper_exit_diagnostics.exit_block_reason) }}</p>
        <p>{{ $t('Pending age seconds') }}: {{ fmt(statePayload.paper_exit_diagnostics.pending_age_seconds) }} · {{ $t('Latency deadline UTC') }}: {{ statePayload.paper_exit_diagnostics.latency_deadline || '—' }}</p>
        <p>{{ $t('Valid execution book age seconds') }}: {{ fmt(statePayload.paper_exit_diagnostics.last_valid_book_age_seconds) }} · {{ $t('Worker heartbeat UTC') }}: {{ statePayload.paper_exit_diagnostics.worker_heartbeat || '—' }} · {{ $t('Worker age seconds') }}: {{ fmt(statePayload.paper_exit_diagnostics.worker_age_seconds) }}</p>
        <p>{{ $t('Execution book source') }}: {{ statePayload.paper_exit_diagnostics.execution_exchange || '—' }} / {{ statePayload.paper_exit_diagnostics.execution_symbol || '—' }} · {{ statePayload.paper_exit_diagnostics.resolved_book_symbol || '—' }} · {{ statePayload.paper_exit_diagnostics.book_market_type || '—' }}</p>
        <p>{{ $t('Book source / received UTC') }}: {{ statePayload.paper_exit_diagnostics.book_source_at || '—' }} / {{ statePayload.paper_exit_diagnostics.book_received_at || '—' }}</p>
      </template>
      <p v-else>{{ $t(stateRequest?.stale ? 'State request failed; retained values are not current runtime evidence' : 'Exit diagnostics absent in last state response; inspect HTTP response and compatibility') }}</p>
      <p>{{ $t('Heartbeat is process-local. WebSocket connectivity does not prove fresh futures data. Latency is a minimum, not a fill deadline.') }}</p>
    </div>
    <div class="debug-warning" v-if="backendStatus?.temporarilyUnavailable">
      {{ $t('Backend unavailable. Retained data may be out of date.') }}
    </div>

    <section v-if="section === 'overview'" class="summary-grid" :aria-label="$t('Overview')">
      <div class="summary-card"><span>{{ $t('Entries') }}</span><strong>{{ !statePayload ? $t('No data yet') : $t(statePayload.enabled && !recoveryState.is_stopped ? 'Running' : 'Paused') }}</strong><small>{{ recoveryState.stop_reason || debug?.reason_if_not_trading || '—' }}</small></div>
      <div class="summary-card"><span>{{ $t('Execution venue') }}</span><strong>{{ config?.exchange || '—' }}</strong><small>{{ config?.symbol || '—' }} · {{ config?.execution_mode || '—' }}</small></div>
      <div class="summary-card"><span>{{ $t('Position exposure') }}</span><strong>{{ fmt(openPosition?.notional ?? (statePayload ? 0 : null), 2) }}</strong><small>{{ $t("USDT ·") }}{{ openPosition?.side || $t('No open position') }}</small></div>
      <div class="summary-card"><span>{{ $t('Reported ledger PnL') }}</span><strong>{{ fmt(metrics?.net_pnl, 2) }}</strong><small>{{ $t("USDT ·") }}{{ $t(accountingNote) }}</small></div>
    </section>
    <section v-if="section === 'overview'" class="recovery-section">
      <h3>{{ $t('Management and reconciliation') }}</h3>
      <p class="workspace-notice neutral">{{ $t('Pausing entries does not close positions. Position management depends on the backend worker; check protection and reconciliation below.') }}</p>
      <div class="metric-grid">
        <div><span>{{ $t('Latest configured snapshot') }}</span><strong>{{ dt(statePayload?.last_order_book_snapshot_time || debug?.last_order_book_snapshot_time) }}</strong><small v-if="bookAge !== null" :class="bookAge > Number(config?.max_snapshot_age_seconds ?? 5) ? 'negative' : ''">{{ fmt(bookAge, 1) }}{{ $t("s ·") }}{{ $t(bookAge > Number(config?.max_snapshot_age_seconds ?? 5) ? 'Stale' : 'Fresh') }}</small></div>
        <div><span>{{ $t('Entry blocked') }}</span><strong>{{ debug?.reason_if_not_trading || statePayload?.reason_if_not_trading || $t(statePayload ? 'No block reported' : 'No data yet') }}</strong></div>
        <div><span>{{ $t('Protection') }}</span><strong>{{ openPosition ? $t(formatProtectionStatus(openPosition)) : '—' }}</strong></div>
        <div><span>{{ $t('Reconciliation') }}</span><strong>{{ openPosition?.live_error || openPosition?.live_status || '—' }}</strong></div>
      </div>
    </section>
    <section class="summary-grid" v-if="section === 'positions'">
      <div class="summary-card" :class="metricTone(metrics?.net_pnl)">
        <span>{{ $t('Reported ledger PnL') }}</span><strong>{{ fmt(metrics?.net_pnl, 2) }}{{ $t("USDT") }}</strong><small>{{ $t(accountingNote) }}</small>
      </div>
      <div class="summary-card positive">
        <span>{{ $t("Total Wins") }}</span><strong>{{ fmt(metrics?.total_win_pnl, 2) }}{{ $t("USDT") }}</strong>
      </div>
      <div class="summary-card negative">
        <span>{{ $t("Total Losses") }}</span><strong>{{ fmt(metrics?.total_loss_pnl, 2) }}{{ $t("USDT") }}</strong>
      </div>
      <div class="summary-card neutral">
        <span>{{ $t("Win Rate") }}</span><strong>{{ fmt(metrics?.win_rate, 2) }}%</strong>
      </div>
      <div class="summary-card neutral">
        <span>{{ $t("Profit Factor") }}</span><strong>{{ fmt(metrics?.profit_factor, 2) }}</strong>
      </div>
      <div class="summary-card neutral">
        <span>{{ $t("Trades Count") }}</span><strong>{{ metrics?.total_trades ?? 0 }}</strong>
      </div>
      <div class="summary-card neutral">
        <span>{{ $t("Current Recovery Step") }}</span><strong>{{ recoveryState.current_step ?? 0 }}</strong>
      </div>
      <div class="summary-card neutral">
        <span>{{ $t("Current Margin") }}</span><strong>{{ fmt(recoveryState.current_margin, 2) }}{{ $t("USDT") }}</strong>
      </div>
    </section>

    <section class="recovery-section" v-if="form && section === 'settings'">
      <div class="section-title">
        <h3>{{ $t('Execution') }} · {{ $t(formDirty ? 'Unsaved draft' : 'Saved settings') }}</h3>
        <span :class="['mode-badge', form.execution_mode === 'live' ? 'live' : 'paper']">{{ (form.execution_mode || 'paper').toUpperCase() }}</span>
      </div>
      <div class="recovery-form">
        <div class="workspace-notice neutral config-group-title">
          {{ $t('Runtime mode') }}: {{ statePayload?.config?.execution_mode?.toUpperCase() || $t('Unknown') }} ·
          {{ $t('Open position mode') }}: {{ openPosition?.execution_mode?.toUpperCase() || $t('No open position') }}.
          {{ $t('Editing this form does not switch the running bot or an existing position.') }}
        </div>
        <div v-if="executionPreview" class="workspace-notice neutral config-group-title" aria-live="polite">
          <strong>{{ $t('Draft cost preview') }}</strong>
          <p>{{ $t('Estimated notional') }}: {{ fmt(executionPreview.notional, 6) }} USDT ·
            {{ $t('Gross TP target') }}: +{{ fmt(executionPreview.tp, 6) }} USDT ·
            {{ $t('Gross SL threshold') }}: −{{ fmt(executionPreview.sl, 6) }} USDT ·
            {{ $t('Estimated round-trip fees') }}: {{ fmt(executionPreview.fees, 6) }} USDT</p>
          <p>{{ $t('Base-margin estimate only. Risk caps and contract rounding may reduce size. Fees use equal entry/exit notional; spread, slippage and funding are excluded.') }}</p>
          <p v-if="executionPreview.belowCosts" class="error-message" role="status">{{ $t('Gross TP is below estimated fees: a TP exit can still be a net loss.') }}</p>
          <p>{{ $t('Estimated net TP / SL') }}: {{ fmt(executionPreview.netTp, 6) }} / {{ fmt(executionPreview.netSl, 6) }} USDT · {{ $t('Break-even win rate') }}: {{ executionPreview.breakEvenWinRate === null ? $t('Not attainable under these assumptions') : fmt(executionPreview.breakEvenWinRate, 2) + '%' }}</p>
          <p>{{ $t('Binary TP/SL outcomes at target prices, equal entry/exit notional fees; excludes slippage, spread, funding and latency overshoot. Not a profitability forecast.') }}</p>
          <p v-if="form.execution_mode === 'paper' && executionPreview.lossLimitsExceedEquity" class="error-message">{{ $t('A loss limit exceeds configured paper equity; it may not protect the account before capital is exhausted. Existing sessions use their frozen initial equity.') }}</p>
          <p>{{ $t('Percent units: 0.1 means 0.1%, not 10%. TP/SL use gross PnL; closed results include fees.') }}</p>
        </div>
        <div class="workspace-notice neutral config-group-title">{{ $t('Live activation unavailable in this workspace') }}</div>
        <label>{{ $t("Execution mode") }}<select v-model="form.execution_mode" :disabled="Boolean(openPosition)">
            <option value="paper">{{ $t("Paper") }}</option>
            <option value="live" disabled>{{ $t("Live") }}</option>
          </select>
        </label>
        <template v-if="form.execution_mode === 'live'">
          <div class="live-warning">{{ $t("WARNING: Live mode places real orders on the selected exchange.") }}</div>
          <label class="check-row"><input v-model="form.live_enabled_confirmation" :disabled="!form.live_enabled_confirmation" type="checkbox"/>{{ $t("Live enabled confirmation") }}</label>
          <label class="check-row"><input v-model="form.live_kill_switch" :disabled="form.live_kill_switch" type="checkbox"/>{{ $t("Live kill switch") }}</label>
          <label>{{ $t("Live max margin USDT") }}<input v-model.number="form.live_max_margin_usdt" type="number" step="0.1"/></label>
          <label>{{ $t("Live max daily loss") }}<input v-model.number="form.live_max_daily_loss_usdt" type="number" step="0.1"/></label>
          <label>{{ $t("Live max total loss") }}<input v-model.number="form.live_max_total_loss_usdt" type="number" step="0.1"/></label>
          <label>{{ $t("Live open failed cooldown sec") }}<input v-model.number="form.live_open_failed_cooldown_seconds" type="number" min="0" step="1"/></label>
          <label class="check-row"><input v-model="form.live_fee_filter_enabled" type="checkbox"/>{{ $t("Live fee-aware entry filter") }}</label>
          <label>{{ $t("Taker fee % per side") }}<input v-model.number="form.live_fee_filter_taker_fee_percent" type="number" min="0" step="0.01"/></label>
          <label>{{ $t("Live order type") }}<select v-model="form.live_order_type">
              <option value="market">{{ $t("Market") }}</option>
            </select>
          </label>
          <label class="check-row"><input v-model="form.live_reduce_only_close" type="checkbox"/>{{ $t("Reduce-only close") }}</label>
        </template>
        <label>{{ $t("Exchange") }}<select v-model.number="form.exchange_id" @change="onExchangeChange">
            <option :value="null" disabled>{{ $t("Select exchange") }}</option>
            <option v-for="exchange in exchangeOptions" :key="exchange.id" :value="exchange.id">{{ exchange.title }}</option>
          </select>
        </label>
        <label>{{ $t("Symbol") }}<select v-model.number="form.trading_pair_id" :disabled="!form.exchange_id || !pairOptions.length" @change="onPairChange">
            <option :value="null" disabled>{{ form.exchange_id && !pairOptions.length ? 'No active trading pairs for this exchange' : 'Select pair' }}</option>
            <option v-for="pair in pairOptions" :key="pair.id" :value="pair.id">{{ pair.pair }}</option>
          </select>
        </label>
        <h4 class="config-group-title">{{ $t('Risk & position sizing') }}<small>{{ $t("USDT ·") }}{{ $t('TP and SL are percentages of margin, not price movement.') }}</small></h4>
        <label>{{ $t("Base margin · USDT") }}<input v-model.number="form.base_margin_usdt" type="number" min="0.01" step="0.01"/></label>
        <label>{{ $t("Leverage") }}<input v-model.number="form.leverage" type="number"/></label>
        <label>{{ $t("Max leverage") }}<input v-model.number="form.max_leverage" type="number" min="1" max="10"/></label>
        <label>{{ $t("Risk per trade %") }}<input v-model.number="form.risk_per_trade_percent" type="number" min="0.01" max="1" step="0.01"/></label>
        <label>{{ $t("Max position margin USDT") }}<input v-model.number="form.max_position_margin_usdt" type="number" min="0.01" step="0.01"/></label>
        <label>{{ $t("Max consecutive losses") }}<input v-model.number="form.max_consecutive_losses" type="number" min="1"/></label>
        <label class="checkbox-label"><input v-model="form.emergency_entry_block" type="checkbox"/>{{ $t("Block new entries") }}</label>
        <label>{{ $t("Paper taker fee %") }}<input v-model.number="form.paper_taker_fee_percent" type="number" min="0" step="0.01"/></label>
        <label>{{ $t("Fixed paper latency ms") }}<input v-model.number="form.paper_latency_ms" type="number" min="0"/></label>
        <label>{{ $t('Pending entry TTL seconds') }}<input v-model.number="form.pending_entry_ttl_seconds" type="number" min="0.1" max="3600" step="0.1"/></label>
        <div class="workspace-notice neutral config-group-title">
          {{ $t('Paper uses fixed latency and full-depth fills only. Partial fills and queue priority are not simulated. Exits wait visibly when fresh data or depth are unavailable.') }}
          <p>{{ $t('Paper session') }}: {{ config?.paper_session_id || $t('Legacy paper history') }}</p>
          <button :disabled="actionLoading.newPaperSession || formDirty || config?.execution_mode !== 'paper' || statePayload?.enabled !== false || !!openPosition || !!statePayload?.pending_order" @click="newPaperSession">{{ $t('New paper session') }}</button>
        </div>
        <label>{{ $t("TP % of margin") }}<input v-model.number="form.take_profit_percent_of_margin" type="number" step="0.1"/></label>
        <label>{{ $t("SL % of margin") }}<input v-model.number="form.stop_loss_percent_of_margin" type="number" step="0.1"/></label>
        <label>{{ $t("Max daily loss") }}<input v-model.number="form.max_daily_loss_usdt" type="number"/></label>
        <label>{{ $t("Max total loss") }}<input v-model.number="form.max_total_loss_usdt" type="number"/></label>
        <label>{{ $t("Max open positions") }}<input v-model.number="form.max_open_positions" type="number"/></label>
        <label>{{ $t("Cooldown loss sec") }}<input v-model.number="form.cooldown_after_loss_seconds" type="number"/></label>
        <label>{{ $t("Cooldown win sec") }}<input v-model.number="form.cooldown_after_win_seconds" type="number"/></label>
        <details class="advanced-config"><summary>{{ $t('Advanced parameters') }}</summary><div class="recovery-form">
        <h4 class="config-group-title">{{ $t('Signal rules') }}</h4>
        <label>{{ $t("Long imbalance") }}<input v-model.number="form.long_imbalance_threshold" type="number" step="0.01"/></label>
        <label>{{ $t("Short imbalance") }}<input v-model.number="form.short_imbalance_threshold" type="number" step="0.01"/></label>
        <label>{{ $t("Max spread %") }}<input v-model.number="form.max_spread_percent" type="number" step="0.01"/></label>
        <label>{{ $t("Momentum window") }}<input v-model.number="form.momentum_window_snapshots" type="number"/></label>
        <h4 class="config-group-title">{{ $t('Cross-exchange confirmation') }}</h4>
        <label>{{ $t("Min valid exchanges") }}<input v-model.number="form.min_valid_exchanges" type="number"/></label>
        <label>{{ $t("Min confirming exchanges") }}<input v-model.number="form.min_confirming_exchanges" type="number"/></label>
        <label>{{ $t("Min consensus ratio") }}<input v-model.number="form.min_consensus_ratio" type="number" step="0.01"/></label>
        <label>{{ $t("Max snapshot age sec") }}<input v-model.number="form.max_snapshot_age_seconds" type="number" step="0.5"/></label>
        <label>{{ $t("Anomaly min") }}<input v-model.number="form.imbalance_anomaly_min" type="number" step="0.01"/></label>
        <label>{{ $t("Anomaly max") }}<input v-model.number="form.imbalance_anomaly_max" type="number" step="0.1"/></label>
        <label>{{ $t("Entry mode") }}<select v-model="form.entry_mode">
            <option value="instant">{{ $t("Instant") }}</option>
            <option value="two_step_confirmation">{{ $t("Two-step confirmation") }}</option>
          </select>
        </label>
        <template v-if="form.entry_mode === 'two_step_confirmation'">
          <label>{{ $t("Confirmation delay sec") }}<input v-model.number="form.confirmation_delay_seconds" type="number" step="0.5"/></label>
          <label>{{ $t("Confirmation max wait sec") }}<input v-model.number="form.confirmation_max_wait_seconds" type="number" step="0.5"/></label>
          <label>{{ $t("Min momentum delta") }}<input v-model.number="form.confirmation_min_momentum_delta" type="number" step="0.000001"/></label>
          <label class="check-row"><input v-model="form.confirmation_require_same_direction" type="checkbox"/>{{ $t("Require same direction") }}</label>
          <label class="check-row"><input v-model="form.confirmation_require_momentum_improvement" type="checkbox"/>{{ $t("Require momentum improvement") }}</label>
          <label class="check-row"><input v-model="form.confirmation_require_consensus_still_valid" type="checkbox"/>{{ $t("Require consensus still valid") }}</label>
        </template>
        <label>{{ $t("Max recovery cooldown sec") }}<input v-model.number="form.cooldown_after_max_recovery_seconds" type="number"/></label>
        <h4 class="config-group-title">{{ $t('Feedback protection') }}</h4>
        <label>{{ $t("Feedback lookback") }}<input v-model.number="form.feedback_lookback_trades" type="number"/></label>
        <label>{{ $t("Side loss streak limit") }}<input v-model.number="form.side_loss_streak_limit" type="number"/></label>
        <label>{{ $t("Side cooldown sec") }}<input v-model.number="form.side_cooldown_seconds" type="number"/></label>
        <label>{{ $t("Min side win rate") }}<input v-model.number="form.min_side_win_rate" type="number" step="1"/></label>
        <label>{{ $t("Adaptive consensus boost") }}<input v-model.number="form.adaptive_consensus_boost" type="number" step="0.01"/></label>
        <label>{{ $t("Adaptive valid exchanges boost") }}<input v-model.number="form.adaptive_min_valid_exchanges_boost" type="number"/></label>
        <label class="check-row"><input v-model="form.momentum_confirmation_enabled" type="checkbox"/>{{ $t("Profit protection: momentum direction") }}</label>
        <label class="check-row"><input v-model="form.side_quality_filter_enabled" type="checkbox"/>{{ $t("Profit protection: side quality") }}</label>
        <label>{{ $t("Side quality lookback") }}<input v-model.number="form.side_quality_lookback_trades" type="number" min="1"/></label>
        <label>{{ $t("Side quality cooldown sec") }}<input v-model.number="form.side_quality_cooldown_seconds" type="number" min="0"/></label>
        <h4 class="config-group-title">{{ $t('ML dataset') }}</h4>
        <label>{{ $t("ML mode") }}<select v-model="form.ml_mode">
            <option value="disabled">{{ $t("Disabled") }}</option>
            <option value="shadow">{{ $t("Shadow") }}</option>
          </select>
        </label>
        <label class="check-row"><input v-model="form.ml_snapshot_capture_enabled" type="checkbox"/>{{ $t("Capture ML market snapshots") }}</label>
        <label>{{ $t("ML snapshot sample rate") }}<input v-model.number="form.ml_snapshot_sample_rate" type="number" min="0" max="1" step="0.05"/></label>
        <label>{{ $t("ML max snapshots / hour") }}<input v-model.number="form.ml_max_snapshots_per_hour" type="number" min="1" step="100"/></label>
        <label>{{ $t("Signal diagnostics max rows") }}<input v-model.number="form.signal_diagnostics_max_rows" type="number" min="20" max="500" step="1"/></label>
        <label>{{ $t("Paper equity") }}<input v-model.number="form.paper_equity_usdt" type="number"/></label>
        <label class="check-row"><input v-model="form.consensus_enabled" type="checkbox"/>{{ $t("Consensus enabled") }}</label>
        <label class="check-row"><input v-model="form.use_median_imbalance" type="checkbox"/>{{ $t("Use median imbalance") }}</label>
        <label class="check-row"><input v-model="form.exclude_anomalous_imbalance" type="checkbox"/>{{ $t("Exclude imbalance anomalies") }}</label>
        <label class="check-row"><input v-model="form.feedback_enabled" type="checkbox"/>{{ $t("Feedback enabled") }}</label>
        <label class="check-row"><input v-model="form.require_configured_exchange_signal" type="checkbox"/>{{ $t("Require configured signal") }}</label>
        <label class="check-row"><input v-model="form.enabled" :disabled="form.execution_mode === 'live' && !form.enabled" type="checkbox"/>{{ $t("Enabled") }}</label>
        </div></details>
      </div>
      <ul v-if="validationErrors.length" role="alert" class="workspace-notice"><li v-for="error in validationErrors" :key="error">{{ $t(error) }}</li></ul>
      <div class="action-row">
        <button class="primary-button" :disabled="actionLoading.saveConfig || !formDirty" @click="reviewSettings"><i class="fa-solid fa-list-check" aria-hidden="true"></i>{{ $t('Review changes') }}</button>
      </div>
    </section>

    <section class="recovery-section" v-if="section === 'settings'">
      <h3>{{ $t("State") }}</h3>
      <div class="metric-grid">
        <div><span>{{ $t("Base margin") }}</span><strong>{{ fmt(config?.base_margin_usdt, 2) }}{{ $t("USDT") }}</strong></div>
        <div><span>{{ $t("Current step") }}</span><strong>{{ recoveryState.current_step ?? 0 }}</strong></div>
        <div><span>{{ $t("Current margin") }}</span><strong>{{ fmt(recoveryState.current_margin, 2) }}{{ $t("USDT") }}</strong></div>
        <div><span>{{ $t("Live max margin") }}</span><strong>{{ fmt(config?.live_max_margin_usdt, 2) }}{{ $t("USDT") }}</strong></div>
        <div><span>{{ $t("Estimated notional") }}</span><strong>{{ fmt(estimatedNotional, 2) }}{{ $t("USDT") }}</strong></div>
        <div><span>{{ $t("Consecutive losses") }}</span><strong>{{ recoveryState.consecutive_losses ?? 0 }}</strong></div>
        <div><span>{{ $t("Status") }}</span><strong>{{ debug?.status || statePayload?.status || (recoveryState.is_stopped ? 'stopped' : (config?.enabled ? 'running' : 'stopped')) }}</strong></div>
        <div><span>{{ $t("Enabled") }}</span><strong>{{ config?.enabled ? 'true' : 'false' }}</strong></div>
        <div><span>{{ $t("Exchange") }}</span><strong>{{ config?.exchange || '-' }}</strong></div>
        <div><span>{{ $t("Symbol") }}</span><strong>{{ config?.symbol || '-' }}</strong></div>
        <div><span>{{ $t("Total PnL") }}</span><strong>{{ fmt(metrics?.total_pnl, 2) }}{{ $t("USDT") }}</strong></div>
        <div><span>{{ $t("Win rate") }}</span><strong>{{ fmt(metrics?.win_rate, 2) }}%</strong></div>
        <div><span>{{ $t("Max drawdown") }}</span><strong>{{ fmt(metrics?.max_drawdown, 2) }}{{ $t("USDT") }}</strong></div>
        <div><span>{{ $t("Stop reason") }}</span><strong>{{ recoveryState.stop_reason || '-' }}</strong></div>
        <div><span>{{ $t("Paused until") }}</span><strong>{{ dt(recoveryState.paused_until) }}</strong></div>
        <div><span>{{ $t("Manual reset at") }}</span><strong>{{ dt(recoveryState.last_manual_recovery_reset_at) }}</strong></div>
        <div><span>{{ $t("Manual margin at") }}</span><strong>{{ dt(recoveryState.last_manual_margin_override_at) }}</strong></div>
        <div><span>{{ $t("Manual margin value") }}</span><strong>{{ fmt(recoveryState.last_manual_margin_override_value, 2) }}{{ $t("USDT") }}</strong></div>
      </div>
      <div class="action-row">
        <button :disabled="Boolean(openPosition) || actionLoading.resetRecovery" @click="resetRecovery"><i class="fa-solid fa-rotate-left"></i> {{ $t(actionLoading.resetRecovery ? 'Resetting...' : 'Reset recovery to base margin') }}</button>
        <input v-model.number="manualMarginValue" :disabled="Boolean(openPosition)" min="0" step="0.1" type="number" placeholder="Current margin USDT"/>
        <button :disabled="Boolean(openPosition) || actionLoading.setCurrentMargin" @click="setCurrentMargin"><i class="fa-solid fa-sliders"></i> {{ $t(actionLoading.setCurrentMargin ? 'Saving...' : 'Set current margin') }}</button>
      </div>
    </section>

    <details class="system-details" v-if="section === 'overview'"><summary>{{ $t('System & diagnostics') }}</summary>
    <section class="recovery-section">
      <h3>{{ $t("Debug") }}</h3>
      <div class="debug-warning" v-if="debug?.reason_if_not_trading">
        {{ debug.reason_if_not_trading }}
      </div>
      <div class="metric-grid">
        <div><span>{{ $t("Scanner hook") }}</span><strong>{{ debug?.scanner_hook_active ? 'active' : 'waiting' }}</strong></div>
        <div><span>{{ $t("Last hook") }}</span><strong>{{ dt(debug?.last_scanner_hook_at) }}</strong></div>
        <div><span>{{ $t("Snapshot time") }}</span><strong>{{ dt(debug?.latest_snapshot?.updated_at || statePayload?.last_order_book_snapshot_time) }}</strong></div>
        <div><span>{{ $t("Snapshot source exchange") }}</span><strong>{{ debug?.last_snapshot_source_exchange || '-' }}</strong></div>
        <div><span>{{ $t("Snapshot source pair") }}</span><strong>{{ debug?.last_snapshot_source_pair || '-' }}</strong></div>
        <div><span>{{ $t("Snapshot keys") }}</span><strong>{{ (debug?.snapshot_keys || []).join(', ') || '-' }}</strong></div>
        <div><span>{{ $t("Bids count") }}</span><strong>{{ debug?.bids_count ?? '-' }}</strong></div>
        <div><span>{{ $t("Asks count") }}</span><strong>{{ debug?.asks_count ?? '-' }}</strong></div>
        <div><span>{{ $t("Purchases count") }}</span><strong>{{ debug?.purchases_count ?? '-' }}</strong></div>
        <div><span>{{ $t("Sales count") }}</span><strong>{{ debug?.sales_count ?? '-' }}</strong></div>
        <div><span>{{ $t("Last evaluation") }}</span><strong>{{ dt(debug?.last_evaluation?.evaluated_at || statePayload?.last_evaluation?.evaluated_at) }}</strong></div>
        <div><span>{{ $t("Configured exchange") }}</span><strong>{{ debug?.configured_exchange || '-' }}</strong></div>
        <div><span>{{ $t("Hook exchange") }}</span><strong>{{ debug?.last_hook_exchange || '-' }}</strong></div>
        <div><span>{{ $t("Exchange match") }}</span><strong>{{ debug?.exchange_match ? 'true' : 'false' }}</strong></div>
        <div><span>{{ $t("Configured symbol") }}</span><strong>{{ debug?.configured_symbol || '-' }}</strong></div>
        <div><span>{{ $t("Hook symbol") }}</span><strong>{{ debug?.last_hook_symbol || '-' }}</strong></div>
        <div><span>{{ $t("Hook raw pair") }}</span><strong>{{ debug?.last_hook_raw_pair || '-' }}</strong></div>
        <div><span>{{ $t("Symbol match") }}</span><strong>{{ debug?.symbol_match ? 'true' : 'false' }}</strong></div>
        <div><span>{{ $t("Norm config exchange") }}</span><strong>{{ debug?.normalized_config_exchange || '-' }}</strong></div>
        <div><span>{{ $t("Norm hook exchange") }}</span><strong>{{ debug?.normalized_hook_exchange || '-' }}</strong></div>
        <div><span>{{ $t("Norm config symbol") }}</span><strong>{{ debug?.normalized_config_symbol || '-' }}</strong></div>
        <div><span>{{ $t("Norm hook symbol") }}</span><strong>{{ debug?.normalized_hook_symbol || '-' }}</strong></div>
        <div><span>{{ $t("Last decision") }}</span><strong>{{ debug?.last_evaluation?.last_decision || statePayload?.last_evaluation?.last_decision || 'none' }}</strong></div>
        <div><span>{{ $t("Reject reason") }}</span><strong>{{ debug?.last_evaluation?.reject_reason || '-' }}</strong></div>
        <div><span>{{ $t("Entry blocked") }}</span><strong>{{ debug?.entry_blocked_reason || '-' }}</strong></div>
        <div><span>{{ $t("Skip reason") }}</span><strong>{{ debug?.entry_skip_reason || '-' }}</strong></div>
        <div><span>{{ $t("Entry mode") }}</span><strong>{{ debug?.entry_mode || config?.entry_mode || 'instant' }}</strong></div>
        <div><span>{{ $t("Resolved live symbol") }}</span><strong>{{ debug?.resolved_live_symbol || statePayload?.live_market?.resolved_live_symbol || '-' }}</strong></div>
        <div><span>{{ $t("Live market type") }}</span><strong>{{ debug?.live_market_type || statePayload?.live_market?.live_market_type || '-' }}</strong></div>
        <div><span>{{ $t("Live market valid") }}</span><strong>{{ debug?.live_market_valid ? 'true' : 'false' }}</strong></div>
        <div><span>{{ $t("Live market error") }}</span><strong>{{ debug?.live_market_error || statePayload?.live_market?.live_market_error || '-' }}</strong></div>
        <div><span>{{ $t("Bid top 5") }}</span><strong>{{ fmt(debug?.last_evaluation?.bid_volume_top_5, 2) }}</strong></div>
        <div><span>{{ $t("Ask top 5") }}</span><strong>{{ fmt(debug?.last_evaluation?.ask_volume_top_5, 2) }}</strong></div>
        <div><span>{{ $t("Imbalance") }}</span><strong>{{ fmt(debug?.last_evaluation?.imbalance, 4) }}</strong></div>
        <div><span>{{ $t("Spread %") }}</span><strong>{{ fmt(debug?.last_evaluation?.spread_percent, 4) }}</strong></div>
        <div><span>{{ $t("Momentum") }}</span><strong>{{ fmt(debug?.last_evaluation?.momentum, 8) }}</strong></div>
        <div><span>{{ $t("Signals") }}</span><strong>{{ $t("L:") }}{{ debug?.last_evaluation?.long_signal ? 'yes' : 'no' }}{{ $t("/ S:") }}{{ debug?.last_evaluation?.short_signal ? 'yes' : 'no' }}</strong></div>
        <div><span>{{ $t("Consensus direction") }}</span><strong>{{ debug?.consensus_direction || 'none' }}</strong></div>
        <div><span>{{ $t("Valid exchanges") }}</span><strong>{{ debug?.valid_exchanges_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Long consensus") }}</span><strong>{{ debug?.confirming_long_count ?? 0 }} / {{ fmt(debug?.consensus_ratio_long, 2) }}</strong></div>
        <div><span>{{ $t("Short consensus") }}</span><strong>{{ debug?.confirming_short_count ?? 0 }} / {{ fmt(debug?.consensus_ratio_short, 2) }}</strong></div>
        <div><span>{{ $t("Median imbalance") }}</span><strong>{{ fmt(debug?.median_imbalance, 4) }}</strong></div>
        <div><span>{{ $t("Raw avg imbalance") }}</span><strong>{{ fmt(debug?.raw_average_imbalance, 4) }}</strong></div>
        <div><span>{{ $t("Avg imbalance") }}</span><strong>{{ fmt(debug?.average_imbalance, 4) }}</strong></div>
        <div><span>{{ $t("Avg momentum") }}</span><strong>{{ fmt(debug?.average_momentum, 8) }}</strong></div>
        <div><span>{{ $t("Anomalous exchanges") }}</span><strong>{{ debug?.anomalous_exchanges_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Excluded anomalies") }}</span><strong>{{ (debug?.excluded_anomalous_imbalance_exchanges || []).join(', ') || '-' }}</strong></div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>{{ $t("Pending Entry") }}</h3>
      <div class="metric-grid">
        <div><span>{{ $t("Exists") }}</span><strong>{{ debug?.pending_entry_exists ? 'yes' : 'no' }}</strong></div>
        <div><span>{{ $t("Side") }}</span><strong>{{ debug?.pending_entry_side || '-' }}</strong></div>
        <div><span>{{ $t("Age") }}</span><strong>{{ fmt(debug?.pending_entry_age_seconds, 2) }}{{ $t("sec") }}</strong></div>
        <div><span>{{ $t("Expires in") }}</span><strong>{{ fmt(debug?.pending_entry_expires_in_seconds, 2) }}{{ $t("sec") }}</strong></div>
        <div><span>{{ $t("Created at") }}</span><strong>{{ dt(debug?.pending_entry_created_at) }}</strong></div>
        <div><span>{{ $t("Expires at") }}</span><strong>{{ dt(debug?.pending_entry_expires_at) }}</strong></div>
        <div><span>{{ $t("First momentum") }}</span><strong>{{ fmt(debug?.pending_entry_first_momentum, 8) }}</strong></div>
        <div><span>{{ $t("Current momentum") }}</span><strong>{{ fmt(debug?.pending_entry_current_momentum, 8) }}</strong></div>
        <div><span>{{ $t("First consensus") }}</span><strong>{{ debug?.pending_entry_first_consensus || '-' }}</strong></div>
        <div><span>{{ $t("Current consensus") }}</span><strong>{{ debug?.pending_entry_current_consensus || '-' }}</strong></div>
        <div><span>{{ $t("Status") }}</span><strong>{{ debug?.pending_entry_status || '-' }}</strong></div>
        <div><span>{{ $t("Reject reason") }}</span><strong>{{ debug?.last_confirmation_reject_reason || '-' }}</strong></div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>{{ $t("Signal Feedback") }}</h3>
      <div class="metric-grid">
        <div><span>{{ $t("Feedback enabled") }}</span><strong>{{ debug?.feedback_enabled ? 'true' : 'false' }}</strong></div>
        <div><span>{{ $t("Long win rate") }}</span><strong>{{ fmt(debug?.long_recent_win_rate, 2) }}%</strong></div>
        <div><span>{{ $t("Short win rate") }}</span><strong>{{ fmt(debug?.short_recent_win_rate, 2) }}%</strong></div>
        <div><span>{{ $t("Long loss streak") }}</span><strong>{{ debug?.long_loss_streak ?? 0 }}</strong></div>
        <div><span>{{ $t("Short loss streak") }}</span><strong>{{ debug?.short_loss_streak ?? 0 }}</strong></div>
        <div><span>{{ $t("Adaptive consensus ratio") }}</span><strong>{{ fmt(debug?.adaptive_min_consensus_ratio, 2) }}</strong></div>
        <div><span>{{ $t("Adaptive valid exchanges") }}</span><strong>{{ debug?.adaptive_min_valid_exchanges ?? config?.min_valid_exchanges ?? 0 }}</strong></div>
        <div><span>{{ $t("Blocked side") }}</span><strong>{{ debug?.blocked_side || '-' }}</strong></div>
        <div><span>{{ $t("Feedback reason") }}</span><strong>{{ debug?.feedback_reject_reason || '-' }}</strong></div>
      </div>
    </section>

    </details>

    <section v-if="section === 'research'" class="recovery-section">
      <h3>{{ $t('Replay & collection') }} <span class="status-badge">{{ $t('Inconclusive') }}</span></h3>
      <p class="workspace-notice neutral">{{ $t('Collection and depth replay are CLI-only. This API does not expose collection jobs or replay reports. Dataset rows below are not replay trades.') }}</p>
      <p>{{ $t('Use the frozen protocol and separate chronological development/evaluation files. Do not tune on evaluation data.') }}</p>
      <details><summary>{{ $t('Historical research') }}</summary><div class="workspace-tabs"><router-link to="/research/legacy">{{ $t("FuturesTrend /") }}{{ $t('Research') }}</router-link><router-link to="/futures">{{ $t("FuturesTrend / Paper") }}</router-link><router-link to="/paper-trading">{{ $t('Closed history') }}{{ $t("/ Paper") }}</router-link></div></details>
    </section>
    <section class="recovery-section" v-if="section === 'research'">
      <h3>{{ $t("ML Market Snapshot Statistics") }}</h3>
      <div class="debug-warning" v-if="mlStats?.loading">{{ $t("Refreshing ML statistics...") }}</div>
      <div class="debug-warning" v-if="mlStats?.error">{{ mlStats.error }}</div>
      <p v-if="!mlStats?.lastSuccessfulAt">{{ $t('No data yet') }}</p>
      <div class="metric-grid" v-else>
        <div><span>{{ $t("Total market snapshots") }}</span><strong>{{ mlMarketSnapshotStats.total }}</strong></div>
        <div><span>{{ $t("Pending labels") }}</span><strong>{{ mlMarketSnapshotStats.pending }}</strong></div>
        <div><span>{{ $t("Labeled snapshots") }}</span><strong>{{ mlMarketSnapshotStats.labeled }}</strong></div>
        <div><span>{{ $t("Label completion") }}</span><strong>{{ fmt(mlMarketSnapshotStats.completion, 2) }}%</strong></div>
        <div><span>{{ $t("Exchange labels total") }}</span><strong>{{ mlMarketSnapshotStats.exchangeLabelsTotal }}</strong></div>
        <div><span>{{ $t("Pending exchange labels") }}</span><strong>{{ mlMarketSnapshotStats.exchangeLabelsPending }}</strong></div>
        <div><span>{{ $t("Labeled exchange labels") }}</span><strong>{{ mlMarketSnapshotStats.exchangeLabelsLabeled }}</strong></div>
        <div><span>{{ $t("Exchange label completion") }}</span><strong>{{ fmt(mlMarketSnapshotStats.exchangeLabelCompletion, 2) }}%</strong></div>
      </div>
    </section>

    <section class="recovery-section" v-if="section === 'research'">
      <div class="section-title">
        <h3>{{ $t("ML Dataset Explorer") }}</h3>
        <button @click="loadMlExplorer()"><i class="fa-solid fa-rotate"></i>{{ $t("Refresh") }}</button>
      </div>
      <div class="ml-tabs">
        <button
            v-for="tab in mlExplorerTabs"
            :key="tab.key"
            :class="{active: mlExplorer.active === tab.key}"
            @click="setMlExplorerTab(tab.key)"
        >{{ $t(tab.label) }}</button>
      </div>
      <div class="ml-filter-grid">
        <label>{{ $t("Symbol") }}<input v-model="mlExplorer.filters.symbol" placeholder="TON/USDT"/></label>
        <label>{{ $t("Exchange") }}<input v-model="mlExplorer.filters.exchange" placeholder="Mexc"/></label>
        <label>{{ $t("Date from") }}<input v-model="mlExplorer.filters.date_from" type="datetime-local"/></label>
        <label>{{ $t("Date to") }}<input v-model="mlExplorer.filters.date_to" type="datetime-local"/></label>
        <label v-if="mlExplorer.active === 'feature'">{{ $t("Side") }}<select v-model="mlExplorer.filters.side">
            <option value="">{{ $t("Any") }}</option>
            <option value="long">{{ $t("Long") }}</option>
            <option value="short">{{ $t("Short") }}</option>
            <option value="none">{{ $t("None") }}</option>
          </select>
        </label>
        <label v-if="mlExplorer.active === 'feature'">{{ $t("Result") }}<select v-model="mlExplorer.filters.result">
            <option value="">{{ $t("Any") }}</option>
            <option value="win">{{ $t("Win") }}</option>
            <option value="loss">{{ $t("Loss") }}</option>
          </select>
        </label>
        <label v-if="mlExplorer.active === 'feature'">{{ $t("ML score") }}<select v-model="mlExplorer.filters.has_ml_score">
            <option value="">{{ $t("Any") }}</option>
            <option value="true">{{ $t("Has score") }}</option>
            <option value="false">{{ $t("No score") }}</option>
          </select>
        </label>
        <label v-if="['market', 'exchange_label'].includes(mlExplorer.active)">{{ $t("Label status") }}<select v-model="mlExplorer.filters.label_status">
            <option value="">{{ $t("Any") }}</option>
            <option value="pending">{{ $t("Pending") }}</option>
            <option value="labeled">{{ $t("Labeled") }}</option>
          </select>
        </label>
        <label>{{ $t("Sort by") }}<select v-model="mlExplorer.filters.sort_by">
            <option value="timestamp">{{ $t("Timestamp") }}</option>
            <option value="id">{{ $t("ID") }}</option>
            <option value="symbol">{{ $t("Symbol") }}</option>
            <option value="exchange">{{ $t("Exchange") }}</option>
            <option value="label_status" v-if="['market', 'exchange_label'].includes(mlExplorer.active)">{{ $t("Label status") }}</option>
            <option value="future_return_10s" v-if="['market', 'exchange_label'].includes(mlExplorer.active)">{{ $t("10s return") }}</option>
            <option value="ml_score" v-if="mlExplorer.active === 'feature'">{{ $t("ML score") }}</option>
            <option value="mid_price" v-if="mlExplorer.active === 'price_history'">{{ $t("Mid price") }}</option>
          </select>
        </label>
        <label>{{ $t("Sort") }}<select v-model="mlExplorer.filters.sort_dir">
            <option value="desc">{{ $t("Desc") }}</option>
            <option value="asc">{{ $t("Asc") }}</option>
          </select>
        </label>
      </div>
      <div class="action-row">
        <button @click="applyMlExplorerFilters"><i class="fa-solid fa-filter"></i>{{ $t("Apply filters") }}</button>
        <button @click="resetMlExplorerFilters"><i class="fa-solid fa-eraser"></i>{{ $t("Reset") }}</button>
        <button @click="exportMlExplorer('csv')"><i class="fa-solid fa-file-csv"></i>{{ $t("Export CSV") }}</button>
        <button @click="exportMlExplorer('json')"><i class="fa-solid fa-file-code"></i>{{ $t("Export JSON") }}</button>
        <button class="button-danger" :disabled="actionLoading.clearMlDataset" @click="clearMlDataset"><i class="fa-solid fa-trash"></i> {{ $t(actionLoading.clearMlDataset ? 'Clearing...' : 'Clear ML dataset') }}</button>
        <label class="inline-select">{{ $t("Page size") }}<select :value="activeMlExplorerData.page_size" @change="changeMlExplorerPageSize">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="250">250</option>
            <option :value="500">500</option>
          </select>
        </label>
      </div>
      <div class="debug-warning" v-if="mlExplorer.error">{{ mlExplorer.error }}</div>
      <div class="empty-row" v-if="mlExplorer.loading">{{ $t("Loading ML dataset...") }}</div>
      <div class="recovery-table recovery-table--ml" v-else>
        <div class="recovery-row recovery-row--head recovery-row--ml" :style="{gridTemplateColumns: `repeat(${activeMlExplorerColumns.length}, minmax(110px, 1fr))`}">
          <span v-for="column in activeMlExplorerColumns" :key="column">{{ column.replaceAll('_', ' ') }}</span>
        </div>
        <button class="recovery-row recovery-row--ml recovery-row--clickable" :style="{gridTemplateColumns: `repeat(${activeMlExplorerColumns.length}, minmax(110px, 1fr))`}" v-for="row in activeMlExplorerData.items" :key="`${mlExplorer.active}-${row.id}`" @click="openMlExplorerDetail(row)">
          <span v-for="column in activeMlExplorerColumns" :key="column" :class="{'status-pill': ['label_status', 'result', 'final_side', 'proposed_side'].includes(column), [mlExplorerBadgeTone(row[column])]: ['label_status', 'result', 'final_side', 'proposed_side'].includes(column)}">{{ mlExplorerCell(row, column) }}</span>
        </button>
        <div class="empty-row" v-if="!activeMlExplorerData.items.length">{{ $t("No ML dataset rows found") }}</div>
      </div>
      <div class="pagination-row">
        <button :disabled="activeMlExplorerData.page <= 1" @click="changeMlExplorerPage(-1)"><i class="fa-solid fa-chevron-left"></i></button>
        <span>{{ $t("Page") }}{{ activeMlExplorerData.page }} / {{ activeMlExplorerData.total_pages || 1 }} · {{ activeMlExplorerData.total }}{{ $t("rows") }}</span>
        <button :disabled="activeMlExplorerData.page >= activeMlExplorerData.total_pages" @click="changeMlExplorerPage(1)"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
    </section>

    <section class="recovery-section" v-if="section === 'research'">
      <div class="section-title">
        <h3>{{ $t("Signal Diagnostics") }}</h3>
        <button @click="clearDiagnostics"><i class="fa-solid fa-broom"></i>{{ $t("Clear diagnostics") }}</button>
      </div>
      <div class="metric-grid">
        <div><span>{{ $t("Long signals") }}</span><strong>{{ debug?.long_signals_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Short signals") }}</span><strong>{{ debug?.short_signals_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Long opened") }}</span><strong>{{ debug?.long_opened_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Short opened") }}</span><strong>{{ debug?.short_opened_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Raw long hits") }}</span><strong>{{ debug?.raw_long_threshold_hits ?? 0 }}</strong></div>
        <div><span>{{ $t("Raw short hits") }}</span><strong>{{ debug?.raw_short_threshold_hits ?? 0 }}</strong></div>
        <div><span>{{ $t("Long consensus passed") }}</span><strong>{{ debug?.long_consensus_passed_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Short consensus passed") }}</span><strong>{{ debug?.short_consensus_passed_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Long blocked") }}</span><strong>{{ debug?.long_blocked_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Short blocked") }}</span><strong>{{ debug?.short_blocked_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Final long") }}</span><strong>{{ debug?.final_long_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Final short") }}</span><strong>{{ debug?.final_short_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Max rows") }}</span><strong>{{ config?.signal_diagnostics_max_rows ?? 100 }}</strong></div>
        <div><span>{{ $t("ML mode") }}</span><strong>{{ config?.ml_mode || 'disabled' }}</strong></div>
        <div><span>{{ $t("ML score") }}</span><strong>{{ debug?.ml_score ?? '-' }}</strong></div>
        <div><span>{{ $t("ML decision") }}</span><strong>{{ debug?.ml_decision || '-' }}</strong></div>
      </div>
      <div class="debug-warning" v-if="sideBiasWarning">{{ sideBiasWarning }}</div>
      <div class="action-row">
        <button @click="exportMlDataset('csv')"><i class="fa-solid fa-database"></i>{{ $t("Export ML dataset") }}</button>
        <button @click="exportMlDataset('json')"><i class="fa-solid fa-file-code"></i>{{ $t("Export ML JSON") }}</button>
        <button @click="exportMlMarketSnapshots('csv')"><i class="fa-solid fa-table"></i>{{ $t("Export market snapshots") }}</button>
        <button @click="exportMlMarketSnapshots('json')"><i class="fa-solid fa-file-code"></i>{{ $t("Export market JSON") }}</button>
        <button @click="exportMlExchangeLabels('csv')"><i class="fa-solid fa-layer-group"></i>{{ $t("Export exchange labels") }}</button>
        <button @click="exportMlExchangeLabels('json')"><i class="fa-solid fa-file-code"></i>{{ $t("Export labels JSON") }}</button>
      </div>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--signal-diagnostics"><span>{{ $t("Time") }}</span><span>{{ $t("Median") }}</span><span>{{ $t("Momentum") }}</span><span>{{ $t("Long") }}</span><span>{{ $t("Short") }}</span><span>{{ $t("L ratio") }}</span><span>{{ $t("S ratio") }}</span><span>{{ $t("Proposed") }}</span><span>{{ $t("Final") }}</span><span>{{ $t("ML score") }}</span><span>{{ $t("ML decision") }}</span><span>{{ $t("Short hit") }}</span><span>{{ $t("Cfg L/S") }}</span><span>{{ $t("Short blocks") }}</span><span>{{ $t("Why long") }}</span><span>{{ $t("Why short rejected") }}</span><span>{{ $t("Skip") }}</span><span>{{ $t("Reject") }}</span><span>{{ $t("L win") }}</span><span>{{ $t("S win") }}</span></div>
        <div class="recovery-row recovery-row--signal-diagnostics" v-for="row in (debug?.signal_diagnostics_last_100 || [])" :key="`${row.timestamp}-${row.proposed_side}-${row.final_side}`">
          <span>{{ dt(row.timestamp) }}</span>
          <span>{{ fmt(row.median_imbalance, 4) }}</span>
          <span>{{ fmt(row.momentum, 8) }}</span>
          <span>{{ row.long_confirms ?? '-' }}</span>
          <span>{{ row.short_confirms ?? '-' }}</span>
          <span>{{ fmt(row.long_ratio, 2) }}</span>
          <span>{{ fmt(row.short_ratio, 2) }}</span>
          <span>{{ row.proposed_side || 'none' }}</span>
          <span>{{ row.final_side || 'none' }}</span>
          <span>{{ row.ml_score ?? '-' }}</span>
          <span>{{ row.ml_decision || '-' }}</span>
          <span>{{ row.short_threshold_hit ? 'yes' : 'no' }}</span>
          <span>{{ row.configured_exchange_long_signal ? 'L' : '-' }} / {{ row.configured_exchange_short_signal ? 'S' : '-' }}</span>
          <span>{{ $t("C:") }}{{ row.short_blocked_by_consensus ? 'yes' : 'no' }}{{ $t("CFG:") }}{{ row.short_blocked_by_configured_exchange ? 'yes' : 'no' }}{{ $t("FB:") }}{{ row.short_blocked_by_feedback ? 'yes' : 'no' }}</span>
          <span>{{ row.why_long_selected || '-' }}</span>
          <span>{{ row.why_short_rejected || '-' }}</span>
          <span>{{ row.skip_reason || '-' }}</span>
          <span>{{ row.reject_reason || '-' }}</span>
          <span>{{ fmt(row.long_win_rate, 2) }}%</span>
          <span>{{ fmt(row.short_win_rate, 2) }}%</span>
        </div>
        <div class="empty-row" v-if="!(debug?.signal_diagnostics_last_100 || []).length">{{ $t("No signal diagnostics yet") }}</div>
      </div>
    </section>

    <section class="recovery-section" v-if="section === 'overview'">
      <h3>{{ $t("Multi-exchange consensus") }}</h3>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--consensus"><span>{{ $t("Exchange") }}</span><span>{{ $t("Valid") }}</span><span>{{ $t("Imbalance") }}</span><span>{{ $t("Raw imbalance") }}</span><span>{{ $t("Anomaly") }}</span><span>{{ $t("Spread %") }}</span><span>{{ $t("Momentum") }}</span><span>{{ $t("Long") }}</span><span>{{ $t("Short") }}</span><span>{{ $t("Reject reason") }}</span></div>
        <div class="recovery-row recovery-row--consensus" v-for="row in (debug?.per_exchange_features || [])" :key="`${row.exchange}-${row.symbol}`">
          <span>{{ row.exchange }}</span>
          <span>{{ row.valid ? 'yes' : 'no' }}</span>
          <span>{{ fmt(row.imbalance, 4) }}</span>
          <span>{{ fmt(row.raw_imbalance, 4) }}</span>
          <span>{{ row.is_imbalance_anomaly ? 'yes' : 'no' }}</span>
          <span>{{ fmt(row.spread_percent, 4) }}</span>
          <span>{{ fmt(row.momentum, 8) }}</span>
          <span>{{ row.long_signal ? 'yes' : 'no' }}</span>
          <span>{{ row.short_signal ? 'yes' : 'no' }}</span>
          <span>{{ row.reject_reason || '-' }}</span>
        </div>
        <div class="empty-row" v-if="!(debug?.per_exchange_features || []).length">{{ $t("No consensus snapshots yet") }}</div>
      </div>
    </section>

    <details class="system-details" v-if="section === 'overview'"><summary>{{ $t('Scanner Diagnostics') }}</summary>
    <section class="recovery-section">
      <h3>{{ $t("Scanner Diagnostics") }}</h3>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--scanner"><span>{{ $t("Exchange") }}</span><span>{{ $t("Symbol") }}</span><span>{{ $t("Status") }}</span><span>{{ $t("Latency") }}</span><span>{{ $t("Stale sec") }}</span><span>{{ $t("Last success") }}</span><span>{{ $t("Last error") }}</span><span>{{ $t("Error") }}</span><span>{{ $t("Cooldown") }}</span></div>
        <div class="recovery-row recovery-row--scanner" v-for="row in scannerDiagnostics" :key="`${row.exchange}-${row.symbol}`">
          <span>{{ row.exchange }}</span>
          <span>{{ row.symbol }}</span>
          <span :class="['result-pill', scannerStatusTone(row.status)]">{{ row.status || '-' }}</span>
          <span>{{ fmt(row.latency_ms, 1) }}{{ $t("ms") }}</span>
          <span>{{ fmt(row.stale_seconds, 2) }}</span>
          <span>{{ dt(row.last_success_at) }}</span>
          <span>{{ dt(row.last_error_at) }}</span>
          <span>{{ row.error_message || '-' }}</span>
          <span>{{ dt(row.cooldown_until) }}</span>
        </div>
        <div class="empty-row" v-if="!scannerDiagnostics.length">{{ $t("No scanner diagnostics yet") }}</div>
      </div>
    </section>

    </details>
    <section class="recovery-section" v-if="['overview', 'positions'].includes(section)">
      <h3>{{ $t("Open Position") }}</h3>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head"><span>{{ $t("Side") }}</span><span>{{ $t("Margin") }}</span><span>{{ $t("Notional") }}</span><span>{{ $t("Entry") }}</span><span>{{ $t("PnL") }}</span></div>
        <div class="recovery-row" v-if="openPosition">
          <span>{{ openPosition.side }}</span>
          <span>{{ fmt(openPosition.margin, 2) }}</span>
          <span>{{ fmt(openPosition.notional, 2) }}</span>
          <span>{{ fmt(openPosition.entry_price, 4) }}</span>
          <span>{{ fmt(openPosition.pnl, 4) }}<small>{{ $t(pnlEvidence(openPosition)) }}</small></span>
        </div>
        <div class="empty-row" v-else>{{ $t("No open position") }}</div>
      </div>
      <div class="action-row" v-if="openPosition">
        <button class="button-danger" :disabled="Boolean(closeBlockReason) || actionLoading.closePosition || actionLoading.abandonLegacyPaper" @click="closePosition"><i class="fa-solid fa-xmark"></i> {{ $t(actionLoading.closePosition ? 'Closing...' : 'Close Position') }}</button>
        <button v-if="canOfferAbandon" class="button-danger" :disabled="statePayload?.enabled !== false || actionLoading.abandonLegacyPaper || actionLoading.closePosition" @click="abandonLegacyPaper">{{ $t('Abandon legacy paper position') }} #{{ openPosition.id }}</button>
        <button v-if="canOfferAbandon && statePayload?.enabled !== false" :disabled="actionLoading.stop || actionLoading.abandonLegacyPaper" @click="stop"><i class="fa-solid fa-pause" aria-hidden="true"></i> {{ $t('Pause new entries') }}</button>
      </div>
      <div v-if="openPosition && closeBlockReason" class="workspace-notice" role="status">
        <p>{{ $t(closeBlockReason) }}</p>
        <p v-if="abandonmentUnavailableReason">{{ $t(abandonmentUnavailableReason) }}</p>
        <p v-if="canOfferAbandon">{{ $t('Preserve history as unverified. No exit, fill or PnL will be created. This cannot be undone.') }}</p>
      </div>
    </section>

    <section class="recovery-section" v-if="section === 'positions'">
      <h3>{{ $t("Last Trades") }}</h3>
      <p>{{ $t('History preserves all sessions and modes; summary metrics use the current accounting scope.') }}</p>
      <p v-if="metrics?.paper_session_id">{{ $t('Paper session') }}: {{ metrics.paper_session_id }}</p>
      <div class="action-row">
        <label>{{ $t('Mode') }}<select v-model="historyMode"><option value="all">{{ $t('All modes') }}</option><option value="paper">{{ $t("Paper") }}</option><option value="live">{{ $t("Live") }}</option></select></label>
        <label class="check-row"><input :checked="showArchived" type="checkbox" @change="setShowArchived"/>{{ $t("Show archived trades") }}</label>
        <button :disabled="actionLoading['exportTrades:csv']" @click="exportTrades('csv')"><i class="fa-solid fa-file-csv"></i> {{ actionLoading['exportTrades:csv'] ? 'Exporting...' : 'Export non-archived trades' }}</button>
        <button :disabled="actionLoading['exportTrades:json']" @click="exportTrades('json')"><i class="fa-solid fa-file-code"></i> {{ actionLoading['exportTrades:json'] ? 'Exporting...' : 'Export JSON' }}</button>
      </div>
      <details class="history-tools"><summary>{{ $t('Archive management') }}</summary><div class="action-row">
        <button :disabled="actionLoading.archiveAllClosed" @click="archiveAllClosed"><i class="fa-solid fa-box-archive"></i> {{ $t(actionLoading.archiveAllClosed ? 'Archiving...' : 'Archive all closed trades') }}</button>
        <button :disabled="actionLoading.unarchiveAll" @click="unarchiveAll"><i class="fa-solid fa-rotate-left"></i> {{ $t(actionLoading.unarchiveAll ? 'Restoring...' : 'Unarchive all') }}</button>
        <button class="button-danger" :disabled="actionLoading.deleteAllArchivedTrades" @click="deleteAllArchivedTrades"><i class="fa-solid fa-trash"></i> {{ $t(actionLoading.deleteAllArchivedTrades ? 'Deleting...' : 'Delete all archived trades') }}</button>
      </div>
      <div class="metric-grid">
        <div><span>{{ $t("Archived trades") }}</span><strong>{{ metrics?.archived_trades_count ?? 0 }}</strong></div>
        <div><span>{{ $t("Archived PnL") }}</span><strong>{{ fmt(metrics?.archived_pnl, 2) }}{{ $t("USDT") }}</strong></div>
        <div><span>{{ $t("Gross profit") }}</span><strong>{{ fmt(metrics?.gross_profit, 2) }}{{ $t("USDT") }}</strong></div>
        <div><span>{{ $t("Gross loss") }}</span><strong>{{ fmt(metrics?.gross_loss, 2) }}{{ $t("USDT") }}</strong></div>
      </div>
      </details>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--trades"><span>{{ $t("ID") }}</span><span>{{ $t("Mode") }}</span><span>{{ $t("Side") }}</span><span>{{ $t("Step") }}</span><span>{{ $t("Margin") }}</span><span>{{ $t("Entry") }}</span><span>{{ $t("Exit") }}</span><span>{{ $t("PnL") }}</span><span>{{ $t("Result") }}</span><span>{{ $t("Live") }}</span><span>{{ $t("Protection") }}</span><span>{{ $t("Action") }}</span></div>
        <div class="empty-row" v-if="!visibleTrades.length">{{ $t('No trades in this mode') }}</div>
        <div class="recovery-row recovery-row--trades" v-for="trade in visibleTrades" :key="trade.id">
          <span data-label="ID">#{{ trade.id }}</span>
          <span data-label="Mode"><span :class="['mode-badge', String(trade.execution_mode || 'paper').toLowerCase() === 'live' ? 'live' : 'paper']">{{ trade.execution_mode || 'paper' }}</span></span>
          <span data-label="Side"><span :class="['side-badge', String(trade.side || '').toLowerCase()]">{{ trade.side }}</span></span>
          <span data-label="Step">{{ trade.recovery_step }}</span>
          <span data-label="Margin">{{ fmt(trade.margin, 2) }}</span>
          <span data-label="Entry">{{ fmt(trade.entry_price, 4) }}</span>
          <span data-label="Exit">{{ fmt(trade.exit_price, 4) }}</span>
          <span data-label="PnL" :class="['pnl-badge', resultTone(trade)]">
            <strong>{{ moneyResult(trade.pnl) }}</strong>
            <small>{{ $t(pnlEvidence(trade)) }}</small>
          </span>
          <span data-label="Result"><span :class="['status-badge', resultTone(trade)]">{{ $t(resultLabel(trade)) }}</span></span>
          <span data-label="Live"><span :class="['status-badge', liveStatusTone(trade.live_status)]">{{ $t(formatLiveStatus(trade.live_status)) }}</span></span>
          <span data-label="Protection"><span :class="['status-badge', protectionTone(trade)]">{{ $t(formatProtectionStatus(trade)) }}</span></span>
          <span class="trade-actions" data-label="Action">
            <span v-if="formatWarningSummary(trade)" class="warning-chip"><i class="fa-solid fa-triangle-exclamation"></i> {{ $t(formatWarningSummary(trade)) }}</span>
            <button @click="viewDetails(trade)">{{ $t("View Details") }}</button>
            <button v-if="trade.closed_at && !trade.is_archived" :disabled="actionLoading[`archiveTrade:${trade.id}`]" @click="archiveTrade(trade)">{{ $t("Archive") }}</button>
            <button v-if="trade.is_archived && !trade.abandoned_at" class="button-danger" :disabled="actionLoading[`deleteArchivedTrade:${trade.id}`]" @click="deleteArchivedTrade(trade)">{{ $t("Delete") }}</button>
          </span>
        </div>
      </div>
    </section>

    <div class="details-backdrop" v-if="reviewOpen" @click.self="reviewOpen = false" @keydown.esc="reviewOpen = false">
      <div class="details-modal" v-dialog-focus="() => reviewOpen = false" :aria-label="$t('Review before saving')">
        <div class="details-header"><h3>{{ $t('Review before saving') }}</h3><button autofocus @click="reviewOpen = false">{{ $t('Cancel') }}</button></div>
        <p>{{ form.exchange }} · {{ form.symbol }} · {{ form.execution_mode }}</p>
        <p>{{ $t('Estimated notional') }}: {{ fmt(Number(form.base_margin_usdt) * Number(form.leverage), 2) }}{{ $t("USDT") }}</p>
        <table class="review-table"><thead><tr><th>{{ $t('Field') }}</th><th>{{ $t('Current') }}</th><th>{{ $t('Proposed') }}</th></tr></thead><tbody><tr v-for="change in reviewedChanges" :key="change.key"><td>{{ change.key }}</td><td>{{ String(change.before ?? '—') }}</td><td>{{ String(change.after ?? '—') }}</td></tr></tbody></table>
        <div class="action-row"><button class="primary-button" :disabled="actionLoading.saveConfig" @click="saveConfig">{{ $t('Save changes') }}</button><button @click="reviewOpen = false">{{ $t('Cancel') }}</button></div>
      </div>
    </div>
    <div class="details-backdrop" v-if="mlExplorerDetail" @click.self="closeMlExplorerDetail">
      <div class="details-modal" v-dialog-focus="closeMlExplorerDetail" :aria-label="$t('ML Dataset Details')">
        <div class="details-header">
          <div>
            <h3>{{ $t("ML Dataset Details") }}</h3>
            <p>{{ mlExplorerDetail.dataset.replaceAll('_', ' ') }} #{{ mlExplorerDetail.item?.id }}</p>
          </div>
          <div class="action-row">
            <button @click="copyMlExplorerJson"><i class="fa-solid fa-copy"></i>{{ $t("Copy JSON") }}</button>
            <button @click="closeMlExplorerDetail"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </div>
        <div class="debug-warning" v-if="mlExplorerDetailLoading">{{ $t("Loading record details...") }}</div>
        <div class="debug-warning detail-error-row" v-if="mlExplorerDetailError">
          <span>{{ mlExplorerDetailError }}</span>
          <button @click="retryMlExplorerDetail"><i class="fa-solid fa-rotate-right"></i>{{ $t("Retry") }}</button>
        </div>
        <div class="details-section">
          <h4>{{ $t("Main fields") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("ID") }}</span><strong>{{ mlExplorerDetail.item?.id }}</strong></div>
            <div><span>{{ $t("Exchange") }}</span><strong>{{ mlExplorerDetail.item?.exchange || '-' }}</strong></div>
            <div><span>{{ $t("Symbol") }}</span><strong>{{ mlExplorerDetail.item?.symbol || '-' }}</strong></div>
            <div><span>{{ $t("Timestamp") }}</span><strong>{{ dt(mlExplorerDetail.item?.timestamp || mlExplorerDetail.item?.created_at) }}</strong></div>
            <div v-if="mlExplorerDetail.item?.label_status"><span>{{ $t("Label status") }}</span><strong>{{ mlExplorerDetail.item.label_status }}</strong></div>
            <div v-if="mlExplorerDetail.item?.result"><span>{{ $t("Result") }}</span><strong>{{ mlExplorerDetail.item.result }}</strong></div>
            <div v-if="mlExplorerDetail.item?.ml_score !== undefined"><span>{{ $t("ML score") }}</span><strong>{{ mlExplorerDetail.item.ml_score ?? '-' }}</strong></div>
            <div v-if="mlExplorerDetail.item?.reference_price !== undefined"><span>{{ $t("Reference price") }}</span><strong>{{ fmt(mlExplorerDetail.item.reference_price, 6) }}</strong></div>
            <div v-if="mlExplorerDetail.item?.mid_price !== undefined"><span>{{ $t("Mid price") }}</span><strong>{{ fmt(mlExplorerDetail.item.mid_price, 6) }}</strong></div>
          </div>
        </div>
        <div class="details-section" v-if="mlExplorerDetail.dataset === 'market' || mlExplorerDetail.dataset === 'exchange_label'">
          <h4>{{ $t("Future Returns & MFE/MAE") }}</h4>
          <div class="recovery-table">
            <div class="recovery-row recovery-row--head recovery-row--details"><span>{{ $t("Horizon") }}</span><span>{{ $t("Future") }}</span><span>{{ $t("Return") }}</span><span>{{ $t("Max") }}</span><span>{{ $t("Min") }}</span><span>{{ $t("MFE long") }}</span><span>{{ $t("MAE long") }}</span><span>{{ $t("MFE short") }}</span><span>{{ $t("MAE short") }}</span></div>
            <div class="recovery-row recovery-row--details" v-for="horizon in [10, 30, 60]" :key="horizon">
              <span>{{ horizon }}{{ $t("s") }}</span>
              <span>{{ fmt(mlExplorerDetail.item?.[`future_price_${horizon}s`], 6) }}</span>
              <span>{{ fmt(mlExplorerDetail.item?.[`future_return_${horizon}s`], 6) }}</span>
              <span>{{ fmt(mlExplorerDetail.item?.[`max_price_${horizon}s`], 6) }}</span>
              <span>{{ fmt(mlExplorerDetail.item?.[`min_price_${horizon}s`], 6) }}</span>
              <span>{{ fmt(mlExplorerDetail.item?.[`mfe_long_${horizon}s`], 6) }}</span>
              <span>{{ fmt(mlExplorerDetail.item?.[`mae_long_${horizon}s`], 6) }}</span>
              <span>{{ fmt(mlExplorerDetail.item?.[`mfe_short_${horizon}s`], 6) }}</span>
              <span>{{ fmt(mlExplorerDetail.item?.[`mae_short_${horizon}s`], 6) }}</span>
            </div>
          </div>
        </div>
        <div class="details-section" v-if="mlExplorerDetail.item?.exchange_labels?.length">
          <h4>{{ $t("Exchange Labels") }}</h4>
          <div class="recovery-table">
            <div class="recovery-row recovery-row--head recovery-row--details"><span>{{ $t("Exchange") }}</span><span>{{ $t("Symbol") }}</span><span>{{ $t("Status") }}</span><span>{{ $t("Ref") }}</span><span>{{ $t("10s return") }}</span><span>{{ $t("30s return") }}</span><span>{{ $t("60s return") }}</span></div>
            <div class="recovery-row recovery-row--details" v-for="label in mlExplorerDetail.item.exchange_labels" :key="label.id">
              <span>{{ label.exchange }}</span>
              <span>{{ label.symbol }}</span>
              <span>{{ label.label_status }}</span>
              <span>{{ fmt(label.reference_price, 6) }}</span>
              <span>{{ fmt(label.future_return_10s, 6) }}</span>
              <span>{{ fmt(label.future_return_30s, 6) }}</span>
              <span>{{ fmt(label.future_return_60s, 6) }}</span>
            </div>
          </div>
        </div>
        <div class="details-section">
          <h4>{{ $t("Raw JSON") }}</h4>
          <pre class="raw-block">{{ JSON.stringify(mlExplorerDetail.item, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <div class="details-backdrop" v-if="decisionDetails" @click.self="closeDetails">
      <div class="details-modal" v-dialog-focus="closeDetails" :aria-label="$t('Decision Snapshot')">
        <div class="section-title">
          <h3>{{ $t("Decision Snapshot") }}</h3>
          <button @click="closeDetails">{{ $t("Close") }}</button>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Trade summary") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Trade") }}</span><strong>#{{ detail('summary.id') }}</strong></div>
            <div><span>{{ $t("Mode") }}</span><strong>{{ detail('trade.execution_mode', 'paper') }}</strong></div>
            <div><span>{{ $t("Side") }}</span><strong>{{ detail('summary.side') }}</strong></div>
            <div><span>{{ $t("Exchange") }}</span><strong>{{ detail('summary.exchange') }}</strong></div>
            <div><span>{{ $t("Symbol") }}</span><strong>{{ detail('summary.symbol') }}</strong></div>
            <div><span>{{ $t("Step") }}</span><strong>{{ detail('trade.recovery_step') }}</strong></div>
            <div><span>{{ $t("Margin") }}</span><strong>{{ fmt(detail('trade.margin', 0), 2) }}{{ $t("USDT") }}</strong></div>
            <div><span>{{ $t("Notional") }}</span><strong>{{ fmt(detail('trade.notional', 0), 2) }}{{ $t("USDT") }}</strong></div>
            <div><span>{{ $t("Opened at") }}</span><strong>{{ dt(detail('trade.opened_at')) }}</strong></div>
            <div><span>{{ $t("Closed at") }}</span><strong>{{ dt(detail('trade.closed_at')) }}</strong></div>
            <div v-if="detail('trade.abandoned_at')"><span>{{ $t('Abandoned at') }}</span><strong>{{ dt(detail('trade.abandoned_at')) }}</strong><small>{{ $t('Abandoned / unverified; excluded from accounting') }}</small></div>
            <div><span>{{ $t("Close reason") }}</span><strong>{{ closeReasonLabel(detail('trade.reason_close')) }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Execution") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Live status") }}</span><strong>{{ formatLiveStatus(detail('trade.live_status')) }}</strong></div>
            <div><span>{{ $t("Entry") }}</span><strong>{{ fmt(detail('summary.entry_price', 0), 6) }}</strong></div>
            <div><span>{{ $t("Exit") }}</span><strong>{{ fmt(detail('trade.exit_price', 0), 6) }}</strong></div>
            <div><span>{{ $t("Filled amount") }}</span><strong>{{ fmt(detail('trade.live_filled_amount', 0), 8) }}</strong></div>
            <div><span>{{ $t("Open order ID") }}</span><strong>{{ formatOrderId(detail('trade.live_exchange_order_id')) }}</strong></div>
            <div><span>{{ $t("Close order ID") }}</span><strong>{{ formatOrderId(detail('trade.live_close_order_id')) }}</strong></div>
            <div><span>{{ $t("Live error") }}</span><strong>{{ detail('trade.live_error') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("TP/SL protection") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Status") }}</span><strong>{{ $t(formatProtectionStatus(detail('trade', {}))) }}</strong></div>
            <div><span>{{ $t('Last protection check') }}</span><strong>{{ dt(detail('trade.protection_checked_at', null)) }}</strong></div>
            <div><span>{{ $t('Protection expiry') }}</span><strong>{{ dt(detail('trade.protection_expires_at', null)) }}</strong></div>
            <div><span>{{ $t("TP price") }}</span><strong>{{ fmt(detail('trade.exchange_tp_price', 0), 6) }}</strong></div>
            <div><span>{{ $t("SL price") }}</span><strong>{{ fmt(detail('trade.exchange_sl_price', 0), 6) }}</strong></div>
            <div><span>{{ $t("TP order ID") }}</span><strong>{{ formatOrderId(detail('trade.exchange_tp_order_id')) }}</strong></div>
            <div><span>{{ $t("SL order ID") }}</span><strong>{{ formatOrderId(detail('trade.exchange_sl_order_id')) }}</strong></div>
            <div><span>{{ $t("Created at") }}</span><strong>{{ dt(detail('trade.tp_sl_created_at')) }}</strong></div>
            <div><span>{{ $t("TP/SL error") }}</span><strong>{{ detail('trade.tp_sl_error') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("PnL & fees") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("PnL") }}</span><strong>{{ moneyResult(detail('summary.pnl', null)) }}</strong></div>
            <div><span>{{ $t("Gross PnL") }}</span><strong>{{ moneyResult(detail('trade.gross_pnl', null)) }}</strong></div>
            <div><span>{{ $t("Net PnL") }}</span><strong>{{ moneyResult(detail('trade.net_pnl', null)) }}</strong></div>
            <div><span>{{ $t("Total fees") }}</span><strong>{{ fmt(detail('trade.total_fee', null), 6) }} USDT</strong></div>
            <div><span>{{ $t("Entry fee") }}</span><strong>{{ fmt(detail('trade.live_entry_fee', null), 6) }} USDT</strong></div>
            <div><span>{{ $t("Exit fee") }}</span><strong>{{ fmt(detail('trade.live_exit_fee', null), 6) }} USDT</strong></div>
            <div><span>{{ $t('Funding PnL') }}</span><strong>{{ fmt(detail('trade.funding_pnl', null), 6) }} USDT</strong></div>
            <div><span>{{ $t('Funding status') }}</span><strong>{{ detail('trade.funding_status') }}</strong></div>
            <div><span>{{ $t("Fee status") }}</span><strong>{{ feeIndicator(detail('trade', {})) || '-' }}</strong></div>
            <div><span>{{ $t("PnL source") }}</span><strong>{{ detail('trade.pnl_source') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Reconciliation") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Close reason") }}</span><strong>{{ closeReasonLabel(detail('trade.reason_close')) }}</strong></div>
            <div><span>{{ $t("Exit fallback used") }}</span><strong>{{ detail('trade.exit_price_fallback_used') ? 'Yes' : 'No' }}</strong></div>
            <div><span>{{ $t("Exit warning") }}</span><strong>{{ detail('trade.exit_price_warning') || '-' }}</strong></div>
            <div><span>{{ $t('Legacy reconciliation') }}</span><strong>{{ detail('trade.legacy_reconciliation_status') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Signal") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Entry reason") }}</span><strong>{{ detail('signal.entry_reason') }}</strong></div>
            <div><span>{{ $t("Current step") }}</span><strong>{{ detail('decision_snapshot.current_recovery_step') }}</strong></div>
            <div><span>{{ $t("Margin") }}</span><strong>{{ fmt(detail('decision_snapshot.current_margin', 0), 2) }}</strong></div>
            <div><span>{{ $t("Notional") }}</span><strong>{{ fmt(detail('decision_snapshot.current_notional', 0), 2) }}</strong></div>
            <div><span>{{ $t("TP target PnL") }}</span><strong>{{ fmt(detail('decision_snapshot.take_profit_target_pnl', 0), 4) }}</strong></div>
            <div><span>{{ $t("SL target PnL") }}</span><strong>{{ fmt(detail('decision_snapshot.stop_loss_target_pnl', 0), 4) }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Consensus") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Direction") }}</span><strong>{{ detail('consensus.direction') }}</strong></div>
            <div><span>{{ $t("Valid exchanges") }}</span><strong>{{ detail('consensus.valid_exchanges_count') }}</strong></div>
            <div><span>{{ $t("Long confirms") }}</span><strong>{{ detail('consensus.confirming_long_count') }}</strong></div>
            <div><span>{{ $t("Short confirms") }}</span><strong>{{ detail('consensus.confirming_short_count') }}</strong></div>
            <div><span>{{ $t("Long ratio") }}</span><strong>{{ fmt(detail('consensus.consensus_ratio_long', 0), 3) }}</strong></div>
            <div><span>{{ $t("Short ratio") }}</span><strong>{{ fmt(detail('consensus.consensus_ratio_short', 0), 3) }}</strong></div>
            <div><span>{{ $t("Median imbalance") }}</span><strong>{{ fmt(detail('consensus.median_imbalance', 0), 4) }}</strong></div>
            <div><span>{{ $t("Raw avg imbalance") }}</span><strong>{{ fmt(detail('consensus.raw_average_imbalance', 0), 4) }}</strong></div>
            <div><span>{{ $t("Avg imbalance") }}</span><strong>{{ fmt(detail('consensus.average_imbalance', 0), 4) }}</strong></div>
            <div><span>{{ $t("Avg momentum") }}</span><strong>{{ fmt(detail('consensus.average_momentum', 0), 8) }}</strong></div>
            <div><span>{{ $t("Anomalies") }}</span><strong>{{ detail('consensus.anomalous_exchanges_count') }}</strong></div>
            <div><span>{{ $t("Excluded") }}</span><strong>{{ listText(detail('consensus.excluded_anomalous_imbalance_exchanges', [])) }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Feedback") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Enabled") }}</span><strong>{{ detail('feedback.feedback_enabled') }}</strong></div>
            <div><span>{{ $t("Long win rate") }}</span><strong>{{ fmt(detail('feedback.long_recent_win_rate', 0), 2) }}%</strong></div>
            <div><span>{{ $t("Short win rate") }}</span><strong>{{ fmt(detail('feedback.short_recent_win_rate', 0), 2) }}%</strong></div>
            <div><span>{{ $t("Blocked side") }}</span><strong>{{ detail('feedback.blocked_side') }}</strong></div>
            <div><span>{{ $t("Reject reason") }}</span><strong>{{ detail('feedback.feedback_reject_reason') }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Risk") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Approved") }}</span><strong>{{ detail('risk.approved') }}</strong></div>
            <div><span>{{ $t("Reason") }}</span><strong>{{ detail('risk.reason') }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("ML Shadow") }}</h4>
          <div class="metric-grid">
            <div><span>{{ $t("Score") }}</span><strong>{{ detail('ml.ml_score') }}</strong></div>
            <div><span>{{ $t("Decision") }}</span><strong>{{ detail('ml.ml_decision') }}</strong></div>
            <div><span>{{ $t("Reason") }}</span><strong>{{ detail('ml.ml_reason') }}</strong></div>
            <div><span>{{ $t("Model version") }}</span><strong>{{ detail('ml.ml_model_version') }}</strong></div>
            <div><span>{{ $t("Evaluation") }}</span><strong>{{ detail('ml.evaluation_id') }}</strong></div>
            <div><span>{{ $t("Snapshot at") }}</span><strong>{{ dt(detail('ml.timestamp')) }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Raw exchange responses") }}</h4>
          <details class="raw-details">
            <summary>{{ $t("Open response") }}</summary>
            <pre class="raw-block">{{ prettyRaw(detail('trade.live_raw_open_response_json', null)) }}</pre>
          </details>
          <details class="raw-details">
            <summary>{{ $t("Close response") }}</summary>
            <pre class="raw-block">{{ prettyRaw(detail('trade.live_raw_close_response_json', null)) }}</pre>
          </details>
        </div>

        <div class="detail-block">
          <h4>{{ $t("Per-exchange order book") }}</h4>
          <div class="recovery-table">
            <div class="recovery-row recovery-row--details recovery-row--head"><span>{{ $t("Exchange") }}</span><span>{{ $t("Symbol") }}</span><span>{{ $t("Bid top 5") }}</span><span>{{ $t("Ask top 5") }}</span><span>{{ $t("Imbalance") }}</span><span>{{ $t("Raw") }}</span><span>{{ $t("Anomaly") }}</span><span>{{ $t("Spread %") }}</span><span>{{ $t("Momentum") }}</span><span>{{ $t("Age") }}</span><span>{{ $t("Valid") }}</span><span>{{ $t("Long") }}</span><span>{{ $t("Short") }}</span><span>{{ $t("Reject") }}</span></div>
            <div class="recovery-row recovery-row--details" v-for="row in decisionDetails.per_exchange_features" :key="`${row.exchange}-${row.symbol}`">
              <span>{{ row.exchange }}</span>
              <span>{{ row.symbol }}</span>
              <span>{{ fmt(row.bid_volume_top_5, 2) }}</span>
              <span>{{ fmt(row.ask_volume_top_5, 2) }}</span>
              <span>{{ fmt(row.imbalance, 4) }}</span>
              <span>{{ fmt(row.raw_imbalance, 4) }}</span>
              <span>{{ row.is_imbalance_anomaly ? 'yes' : 'no' }}</span>
              <span>{{ fmt(row.spread_percent, 4) }}</span>
              <span>{{ fmt(row.momentum, 8) }}</span>
              <span>{{ fmt(row.snapshot_age_seconds, 2) }}</span>
              <span>{{ row.valid ? 'yes' : 'no' }}</span>
              <span>{{ row.long_signal ? 'yes' : 'no' }}</span>
              <span>{{ row.short_signal ? 'yes' : 'no' }}</span>
              <span>{{ row.reject_reason || '-' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recovery-page{
  display: grid;
  gap: 16px;
  color: #d7deef;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}
.recovery-heading,
.recovery-section{
  display: grid;
  gap: 10px;
  min-width: 0;
}
.summary-grid{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}
.summary-card{
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
}
.summary-card span{
  color: #90a0be;
  font-size: 12px;
  text-transform: uppercase;
}
.summary-card strong{
  font-size: 20px;
  color: #fff;
}
.positive strong,
.pnl-badge.positive strong{
  color: #62d98f;
}
.negative strong,
.pnl-badge.negative strong{
  color: #ff6b6b;
}
.neutral strong,
.pnl-badge.neutral strong{
  color: #d7deef;
}
.recovery-eyebrow{
  color: #46cdcf;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: 12px;
  font-weight: 700;
}
.recovery-section{
  padding: 16px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
  max-width: 100%;
  overflow: hidden;
}
.section-title{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}
.recovery-section h3{
  margin: 0;
  color: #fff;
}
.section-title span{
  color: #8fdfe0;
  font-size: 12px;
  text-transform: uppercase;
}
.mode-badge{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.mode-badge.paper{
  color: #8fdfe0;
  background: rgba(70,205,207,.12);
}
.mode-badge.live{
  color: #ffb5b5;
  background: rgba(255,107,107,.14);
}
.live-warning{
  grid-column: 1 / -1;
  padding: 12px;
  border-radius: 8px;
  color: #ffb5b5;
  background: rgba(255,107,107,.12);
  border: 1px solid rgba(255,107,107,.24);
  font-weight: 800;
}
.recovery-form{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  min-width: 0;
}
label{
  display: grid;
  gap: 6px;
  color: #90a0be;
  font-size: 12px;
  min-width: 0;
}
input,
select,
button{
  max-width: 100%;
  min-width: 0;
  min-height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(8,12,22,.7);
  color: #fff;
  padding: 0 10px;
}
.check-row{
  display: flex;
  align-items: center;
}
.check-row input{
  min-height: auto;
}
.action-row{
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-width: 0;
}
.ml-tabs{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.ml-tabs button{
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  color: #d7deef;
}
.ml-tabs button.active{
  background: rgba(70,205,207,.18);
  border-color: rgba(70,205,207,.55);
  color: #ecfeff;
}
.ml-filter-grid{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin: 12px 0;
}
.inline-select{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #aeb8cc;
  font-size: 12px;
}
.pagination-row{
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
  color: #aeb8cc;
}
button{
  cursor: pointer;
  background: #46cdcf;
  color: #09111f;
  font-weight: 700;
}
.button-danger{
  background: #ff6b6b;
}
.metric-grid{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  min-width: 0;
}
.metric-grid div{
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
  min-width: 0;
}
.metric-grid span,
.recovery-row--head{
  color: #90a0be;
  font-size: 12px;
  text-transform: uppercase;
}
.metric-grid strong{
  color: #fff;
  min-width: 0;
  overflow-wrap: anywhere;
}
.debug-warning{
  padding: 10px 12px;
  border-radius: 8px;
  color: #ffcf9b;
  background: rgba(255,184,107,.10);
  border: 1px solid rgba(255,184,107,.18);
}
.detail-error-row{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.detail-error-row button{
  flex: 0 0 auto;
}
.recovery-table{
  display: block;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  scrollbar-width: thin;
  -webkit-overflow-scrolling: touch;
}
.recovery-table--ml{
  overflow-x: auto;
}
.recovery-row{
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
  margin-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
}
.recovery-row--ml{
  min-width: 980px;
}
.recovery-row--clickable{
  width: 100%;
  border: 0;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.recovery-row--clickable:hover{
  background: rgba(70,205,207,.08);
}
.recovery-row > span{
  min-width: 0;
  overflow-wrap: anywhere;
}
.recovery-row--trades{
  grid-template-columns: minmax(54px, .55fr) minmax(70px, .65fr) minmax(72px, .7fr) minmax(48px, .45fr) minmax(74px, .7fr) minmax(86px, .8fr) minmax(86px, .8fr) minmax(132px, 1.05fr) minmax(86px, .8fr) minmax(110px, .95fr) minmax(120px, 1fr) minmax(180px, 1.35fr);
  min-width: 1120px;
}
.trade-actions{
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.trade-actions button{
  min-height: 32px;
  padding: 0 8px;
}
.details-backdrop{
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  justify-items: end;
  background: rgba(0,0,0,.52);
}
.details-modal{
  width: min(980px, 96vw);
  max-width: 100vw;
  height: 100vh;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 18px;
  background: #101827;
  border-left: 1px solid rgba(255,255,255,.10);
  box-shadow: -20px 0 40px rgba(0,0,0,.25);
}
.detail-block{
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
}
.detail-block h4{
  margin: 0;
  color: #fff;
}
.recovery-row--details{
  grid-template-columns: repeat(14, minmax(90px, 1fr));
  min-width: 1260px;
}
.pnl-badge{
  display: grid;
  gap: 2px;
  min-width: 116px;
  padding: 7px 8px;
  border-radius: 8px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
}
.pnl-badge.positive{
  background: rgba(98,217,143,.10);
  border-color: rgba(98,217,143,.22);
}
.pnl-badge.negative{
  background: rgba(255,107,107,.10);
  border-color: rgba(255,107,107,.22);
}
.pnl-badge.info{
  background: rgba(92,169,255,.10);
  border-color: rgba(92,169,255,.22);
}
.pnl-badge.info strong{
  color: #8ec5ff;
}
.pnl-badge small{
  color: #90a0be;
  font-size: 11px;
  text-transform: uppercase;
}
.side-badge,
.status-badge,
.warning-chip{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: fit-content;
  min-height: 26px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
}
.side-badge.long,
.side-badge.buy{
  color: #62d98f;
  background: rgba(98,217,143,.10);
  border: 1px solid rgba(98,217,143,.22);
}
.side-badge.short,
.side-badge.sell{
  color: #ff6b6b;
  background: rgba(255,107,107,.10);
  border: 1px solid rgba(255,107,107,.22);
}
.status-badge.positive{
  color: #62d98f;
  background: rgba(98,217,143,.10);
  border: 1px solid rgba(98,217,143,.22);
}
.status-badge.negative{
  color: #ff8f8f;
  background: rgba(255,107,107,.10);
  border: 1px solid rgba(255,107,107,.22);
}
.status-badge.warning,
.warning-chip{
  color: #ffcf9b;
  background: rgba(255,184,107,.12);
  border: 1px solid rgba(255,184,107,.24);
}
.status-badge.info{
  color: #8ec5ff;
  background: rgba(92,169,255,.10);
  border: 1px solid rgba(92,169,255,.22);
}
.status-badge.neutral{
  color: #d7deef;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.10);
}
.raw-details{
  display: grid;
  gap: 8px;
  color: #d7deef;
}
.raw-details summary{
  cursor: pointer;
  color: #8fdfe0;
  font-weight: 800;
}
.raw-block{
  max-height: 260px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  color: #d7deef;
  background: rgba(4,8,15,.75);
  border: 1px solid rgba(255,255,255,.08);
  white-space: pre-wrap;
  word-break: break-word;
}
.result-pill.win{
  color: #62d98f;
}
.result-pill.loss{
  color: #ff6b6b;
}
.result-pill.open{
  color: #d7deef;
}
.recovery-row--scanner{
  grid-template-columns: minmax(95px, .9fr) minmax(95px, .9fr) minmax(85px, .8fr) minmax(80px, .7fr) minmax(80px, .7fr) minmax(150px, 1.2fr) minmax(150px, 1.2fr) minmax(180px, 1.4fr) minmax(150px, 1.2fr);
  min-width: 1120px;
}
.recovery-row--signal-diagnostics{
  grid-template-columns: minmax(150px, 1.2fr) repeat(6, minmax(72px, .65fr)) minmax(88px, .75fr) minmax(78px, .65fr) minmax(82px, .7fr) minmax(100px, .85fr) minmax(78px, .65fr) minmax(82px, .7fr) minmax(180px, 1.4fr) minmax(180px, 1.4fr) minmax(220px, 1.7fr) minmax(130px, 1fr) minmax(160px, 1.2fr) minmax(72px, .6fr) minmax(72px, .6fr);
  min-width: 2250px;
}
.recovery-row--consensus{
  grid-template-columns: repeat(10, minmax(0, 1fr));
  min-width: 980px;
}
.empty-row{
  color: #90a0be;
  padding: 10px;
}

/* Light fintech redesign overrides */
.recovery-page{
  color: #18181b;
}
.recovery-heading h2{
  color: #18181b;
  font-size: clamp(28px, 3.5vw, 44px);
  font-weight: 650;
  letter-spacing: -.03em;
}
.page-section-label{
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding: 14px 16px;
  border-radius: 18px;
  background:
      linear-gradient(135deg, rgba(237,233,254,.72), rgba(239,246,255,.58)),
      rgba(255,255,255,.56);
  border: 1px solid rgba(124,58,237,.10);
}
.page-section-label span{
  color: #18181b;
  font-size: 15px;
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
.page-section-label span::before{
  content: "";
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c3aed, #3b82f6);
  box-shadow: 0 0 0 6px rgba(124,58,237,.10);
}
.page-section-label p{
  margin: 0;
  color: #71717a;
  font-size: 13px;
}
.summary-card,
.recovery-section,
.metric-grid div,
.recovery-row,
.detail-block,
.details-section{
  background:
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,255,255,.86)),
      radial-gradient(circle at top right, rgba(124,58,237,.075), transparent 44%);
  border: 1px solid rgba(124,58,237,.11);
  box-shadow: 0 16px 40px rgba(76,29,149,.08);
}
.summary-card,
.recovery-section,
.metric-grid div,
.recovery-row,
.detail-block,
.details-section,
.pnl-badge{
  border-radius: 16px;
}
.summary-card,
.recovery-section{
  position: relative;
  overflow: hidden;
}
.summary-card::before,
.recovery-section::before{
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, rgba(124,58,237,.70), rgba(59,130,246,.46), rgba(6,182,212,.34));
}
.summary-card.positive::before{
  background: linear-gradient(90deg, #10b981, rgba(16,185,129,.24));
}
.summary-card.negative::before{
  background: linear-gradient(90deg, #ef4444, rgba(239,68,68,.24));
}
.summary-card.neutral::before{
  background: linear-gradient(90deg, rgba(124,58,237,.54), rgba(59,130,246,.32));
}
.summary-card span,
.metric-grid span,
.recovery-row--head,
label,
.inline-select,
.pagination-row,
.pnl-badge small,
.raw-details{
  color: #71717a;
}
.summary-card strong,
.metric-grid strong,
.recovery-section h3,
.detail-block h4,
.details-section h4,
.neutral strong,
.pnl-badge.neutral strong,
.result-pill.open{
  color: #18181b;
}
.recovery-eyebrow,
.section-title span,
.raw-details summary{
  color: #7c3aed;
}
input,
select,
button{
  background: #fff;
  color: #18181b;
  border-color: rgba(24,24,27,.12);
}
input:focus,
select:focus{
  outline: none;
  border-color: rgba(124,58,237,.55);
  box-shadow: 0 0 0 4px rgba(124,58,237,.12);
}
button{
  background: #18181b;
  color: #fff;
  border-color: #18181b;
  box-shadow: 0 1px 2px rgba(24,24,27,.06);
}
button:hover:not(:disabled){
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(24,24,27,.12);
}
.button-danger{
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}
.check-row,
.ml-tabs button,
.recovery-row--head,
.empty-row{
  background: linear-gradient(135deg, #faf5ff, #f8fafc);
  border: 1px solid rgba(124,58,237,.09);
}
.ml-tabs button{
  color: #52525b;
}
.ml-tabs button.active{
  background: linear-gradient(180deg, #ede9fe, #ffffff);
  border-color: rgba(124,58,237,.28);
  color: #6d28d9;
}
.mode-badge,
.side-badge,
.status-badge,
.warning-chip{
  border-radius: 999px;
  font-weight: 650;
}
.mode-badge.paper,
.status-badge.info,
.pnl-badge.info{
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
}
.mode-badge.live,
.side-badge.short,
.side-badge.sell,
.status-badge.negative,
.pnl-badge.negative{
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}
.side-badge.long,
.side-badge.buy,
.status-badge.positive,
.pnl-badge.positive{
  color: #059669;
  background: #ecfdf5;
  border-color: #bbf7d0;
}
.debug-warning,
.status-badge.warning,
.warning-chip{
  color: #d97706;
  background: #fffbeb;
  border-color: #fde68a;
}
.live-warning{
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}
.positive strong,
.pnl-badge.positive strong,
.result-pill.win{
  color: #059669;
}
.negative strong,
.pnl-badge.negative strong,
.result-pill.loss{
  color: #dc2626;
}
.recovery-table{
  background: rgba(255,255,255,.96);
  border: 1px solid rgba(124,58,237,.10);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(76,29,149,.06);
}
.recovery-row{
  box-shadow: none;
  margin: 0;
  border-radius: 0;
  border-width: 0 0 1px;
  background: #fff;
}
.recovery-row:hover{
  background: linear-gradient(90deg, rgba(237,233,254,.50), rgba(239,246,255,.38));
}
.recovery-row:last-child{
  border-bottom: 0;
}
.details-backdrop{
  background: rgba(24,24,27,.24);
  backdrop-filter: blur(8px);
}
.details-modal{
  background: #fff;
  color: #18181b;
  border-left-color: rgba(24,24,27,.10);
  box-shadow: -24px 0 60px rgba(24,24,27,.16);
}
.details-header{
  background: #fff;
  border-bottom: 1px solid rgba(24,24,27,.10);
}
.details-header h3{
  color: #18181b;
}
.details-header p{
  color: #71717a;
}
.raw-block{
  color: #27272a;
  background: #f8fafc;
  border-color: rgba(24,24,27,.10);
}
.config-group-title{
  color: #18181b;
  border-top: 1px solid rgba(24,24,27,.10);
  display: flex;
  align-items: center;
  gap: 10px;
}
.config-group-title::before{
  content: "";
  width: 22px;
  height: 22px;
  border-radius: 8px;
  background:
      radial-gradient(circle at 30% 25%, rgba(255,255,255,.86), transparent 28%),
      linear-gradient(135deg, rgba(124,58,237,.88), rgba(59,130,246,.72));
  box-shadow: 0 8px 18px rgba(124,58,237,.18);
}
@media (max-width: 760px){
  .recovery-page{
    gap: 12px;
  }
  .recovery-section{
    padding: 12px;
  }
  .section-title{
    align-items: flex-start;
    flex-direction: column;
  }
  .summary-grid{
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .summary-card{
    padding: 10px;
  }
  .summary-card strong{
    font-size: 16px;
  }
  .recovery-form,
  .metric-grid{
    grid-template-columns: 1fr;
  }
  .action-row{
    display: grid;
    grid-template-columns: 1fr;
  }
  .action-row button{
    width: 100%;
  }
  .recovery-table{
    overflow-x: auto;
  }
  .recovery-row{
    grid-template-columns: 1fr 1fr;
  }
  .recovery-row--trades{
    grid-template-columns: 1fr;
    min-width: 0;
    gap: 8px;
    align-items: stretch;
  }
  .recovery-row--head{
    display: none;
  }
  .recovery-row--trades > span{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .recovery-row--trades > span::before{
    content: attr(data-label);
    color: #90a0be;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }
  .recovery-row--trades > span:last-child{
    border-bottom: 0;
  }
  .recovery-row--trades .trade-actions{
    justify-content: flex-end;
  }
  .details-backdrop{
    justify-items: stretch;
  }
  .details-modal{
    width: 100vw;
    padding: 12px;
    border-left: 0;
  }
  .detail-block{
    padding: 10px;
  }
}
@media (max-width: 480px){
  .summary-grid{
    grid-template-columns: 1fr;
  }
  .recovery-row{
    grid-template-columns: 1fr;
  }
}
</style>
