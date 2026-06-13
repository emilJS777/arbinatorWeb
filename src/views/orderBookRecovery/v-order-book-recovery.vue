<script>
import {mapState} from "vuex";
import {getResponseMessage, isResponseSuccess} from "@/store/request.js";
import {buildConfigPayload, normalizeConfigForm, pairOptionsForExchange, resolveExchange, resolvePair} from "@/utils/orderBookRecoveryConfig.js";

export default {
  computed: {
    ...mapState({
      config: state => state.orderBookRecovery.CONFIG,
      options: state => state.orderBookRecovery.OPTIONS,
      statePayload: state => state.orderBookRecovery.STATE,
      trades: state => state.orderBookRecovery.TRADES,
      metrics: state => state.orderBookRecovery.METRICS,
      debug: state => state.orderBookRecovery.DEBUG,
      scannerDiagnostics: state => state.orderBookRecovery.SCANNER_DIAGNOSTICS,
      showArchived: state => state.orderBookRecovery.SHOW_ARCHIVED,
    }),
    recoveryState() {
      return this.statePayload?.recovery_state || {};
    },
    openPosition() {
      return this.statePayload?.open_position || this.metrics?.open_position || null;
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
  },
  data() {
    return {
      form: null,
      poller: null,
      decisionDetails: null,
    };
  },
  mounted() {
    this.load();
    this.poller = setInterval(() => this.$store.dispatch("orderBookRecovery/LOAD_DEBUG"), 2000);
    this.emitter.on("orderbook_recovery.position_opened", () => this.load());
    this.emitter.on("orderbook_recovery.position_closed", () => this.load());
    this.emitter.on("orderbook_recovery.started", () => this.load());
    this.emitter.on("orderbook_recovery.stopped", () => this.load());
  },
  beforeUnmount() {
    if (this.poller) clearInterval(this.poller);
  },
  watch: {
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
    load() {
      this.$store.dispatch("orderBookRecovery/LOAD");
    },
    syncFormSelection() {
      if (!this.config || !this.options) return;
      const form = normalizeConfigForm(this.form ? {...this.form, ...this.config} : {...this.config});
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
      if (!this.form?.exchange_id) {
        this.emitter.emit("toster", {success: false, msg: "Select exchange"});
        return;
      }
      if (!this.form?.trading_pair_id) {
        this.emitter.emit("toster", {success: false, msg: "Select trading pair"});
        return;
      }
      this.emitter.emit("loader", true);
      this.$store.dispatch("orderBookRecovery/SAVE_CONFIG", buildConfigPayload(this.form)).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Config saved" : getResponseMessage(res),
        });
      }).finally(() => this.emitter.emit("loader", false));
    },
    start() {
      if ((this.form?.execution_mode || this.config?.execution_mode) === "live") {
        if (!window.confirm("You are enabling LIVE trading. Real orders may be placed on the exchange.")) return;
      }
      this.emitter.emit("loader", true);
      this.$store.dispatch("orderBookRecovery/START").then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Strategy started" : getResponseMessage(res),
        });
        this.$store.dispatch("orderBookRecovery/LOAD");
      }).finally(() => this.emitter.emit("loader", false));
    },
    stop() {
      this.emitter.emit("loader", true);
      this.$store.dispatch("orderBookRecovery/STOP").then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Strategy stopped" : getResponseMessage(res),
        });
        this.$store.dispatch("orderBookRecovery/LOAD");
      }).finally(() => this.emitter.emit("loader", false));
    },
    closePosition() {
      if (!this.openPosition) return;
      if (!window.confirm("Close current paper position manually?")) return;
      this.emitter.emit("loader", true);
      this.$store.dispatch("orderBookRecovery/CLOSE_MANUAL", this.openPosition.id).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Position closed manually" : getResponseMessage(res),
        });
        this.$store.dispatch("orderBookRecovery/LOAD");
      }).finally(() => this.emitter.emit("loader", false));
    },
    fmt(value, digits = 4) {
      if (value === null || value === undefined) return "-";
      const number = Number(value);
      if (Number.isNaN(number)) return "-";
      return number.toFixed(digits);
    },
    dt(value) {
      return value ? new Date(value).toLocaleString() : "-";
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
      if ((trade?.execution_mode || "paper") !== "live") return "Not required";
      if (trade?.tp_sl_protected) return "Protected";
      if (trade?.tp_sl_error || trade?.live_status === "tp_sl_unprotected") return "Unprotected";
      if (trade?.live_status === "open_failed") return "Not created";
      if (trade?.live_status === "open" && !trade?.exchange_tp_order_id && !trade?.exchange_sl_order_id) return "Pending";
      return "Not created";
    },
    protectionTone(trade) {
      const status = this.formatProtectionStatus(trade);
      if (status === "Protected") return "positive";
      if (["Unprotected", "Not created"].includes(status)) return "negative";
      if (status === "Pending") return "warning";
      return "neutral";
    },
    resultLabel(trade) {
      if (["open_failed", "close_failed"].includes(trade?.live_status)) return "Failed";
      if (!trade?.closed_at) return "Floating";
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
      if ((trade?.execution_mode || "paper") !== "live") return "";
      const fees = Number(trade?.live_entry_fee || 0) + Number(trade?.live_exit_fee || 0);
      return fees ? "net incl. fees" : "net/gross unknown";
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
      this.$store.dispatch("orderBookRecovery/ARCHIVE_TRADE", trade.id).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Trade archived" : getResponseMessage(res),
        });
      });
    },
    deleteArchivedTrade(trade) {
      if (!trade?.is_archived) return;
      if (!window.confirm("Delete archived trade permanently?")) return;
      this.$store.dispatch("orderBookRecovery/DELETE_ARCHIVED_TRADE", trade.id).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Archived trade deleted" : getResponseMessage(res),
        });
      });
    },
    deleteAllArchivedTrades() {
      if (!window.confirm("Delete all archived trades permanently?")) return;
      this.$store.dispatch("orderBookRecovery/DELETE_ALL_ARCHIVED_TRADES").then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Archived trades deleted" : getResponseMessage(res),
        });
      });
    },
    archiveAllClosed() {
      this.$store.dispatch("orderBookRecovery/ARCHIVE_ALL_CLOSED").then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Closed trades archived" : getResponseMessage(res),
        });
      });
    },
    unarchiveAll() {
      this.$store.dispatch("orderBookRecovery/UNARCHIVE_ALL").then(res => {
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
    exportTrades(format = "csv") {
      if (!this.exportableTradesCount) {
        this.emitter.emit("toster", {success: false, msg: "No non-archived closed trades to export"});
        return;
      }
      this.$store.dispatch("orderBookRecovery/EXPORT_TRADES", {format, includeArchived: false}).then(async response => {
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
    <div class="recovery-heading">
      <p class="recovery-eyebrow margin-0">Paper Futures</p>
      <h2 class="c-mode-1 margin-0">OrderBook Recovery</h2>
    </div>

    <section class="summary-grid">
      <div class="summary-card" :class="metricTone(metrics?.net_pnl)">
        <span>Net PnL</span><strong>{{ fmt(metrics?.net_pnl, 2) }} USDT</strong>
      </div>
      <div class="summary-card positive">
        <span>Total Wins</span><strong>{{ fmt(metrics?.total_win_pnl, 2) }} USDT</strong>
      </div>
      <div class="summary-card negative">
        <span>Total Losses</span><strong>{{ fmt(metrics?.total_loss_pnl, 2) }} USDT</strong>
      </div>
      <div class="summary-card neutral">
        <span>Win Rate</span><strong>{{ fmt(metrics?.win_rate, 2) }}%</strong>
      </div>
      <div class="summary-card neutral">
        <span>Profit Factor</span><strong>{{ fmt(metrics?.profit_factor, 2) }}</strong>
      </div>
      <div class="summary-card neutral">
        <span>Trades Count</span><strong>{{ metrics?.total_trades ?? 0 }}</strong>
      </div>
      <div class="summary-card neutral">
        <span>Current Recovery Step</span><strong>{{ recoveryState.current_step ?? 0 }}</strong>
      </div>
      <div class="summary-card neutral">
        <span>Current Margin</span><strong>{{ fmt(recoveryState.current_margin, 2) }} USDT</strong>
      </div>
    </section>

    <section class="recovery-section" v-if="form">
      <div class="section-title">
        <h3>Config</h3>
        <span :class="['mode-badge', form.execution_mode === 'live' ? 'live' : 'paper']">{{ (form.execution_mode || 'paper').toUpperCase() }}</span>
      </div>
      <div class="recovery-form">
        <label>Execution mode
          <select v-model="form.execution_mode">
            <option value="paper">Paper</option>
            <option value="live">Live</option>
          </select>
        </label>
        <template v-if="form.execution_mode === 'live'">
          <div class="live-warning">WARNING: Live mode places real orders on the selected exchange.</div>
          <label class="check-row"><input v-model="form.live_enabled_confirmation" type="checkbox"/> Live enabled confirmation</label>
          <label class="check-row"><input v-model="form.live_kill_switch" type="checkbox"/> Live kill switch</label>
          <label>Live max margin USDT<input v-model.number="form.live_max_margin_usdt" type="number" step="0.1"/></label>
          <label>Live max daily loss<input v-model.number="form.live_max_daily_loss_usdt" type="number" step="0.1"/></label>
          <label>Live max total loss<input v-model.number="form.live_max_total_loss_usdt" type="number" step="0.1"/></label>
          <label>Live open failed cooldown sec<input v-model.number="form.live_open_failed_cooldown_seconds" type="number" min="0" step="1"/></label>
          <label>Live order type
            <select v-model="form.live_order_type">
              <option value="market">Market</option>
            </select>
          </label>
          <label class="check-row"><input v-model="form.live_reduce_only_close" type="checkbox"/> Reduce-only close</label>
        </template>
        <label>Exchange
          <select v-model.number="form.exchange_id" @change="onExchangeChange">
            <option :value="null" disabled>Select exchange</option>
            <option v-for="exchange in exchangeOptions" :key="exchange.id" :value="exchange.id">{{ exchange.title }}</option>
          </select>
        </label>
        <label>Symbol
          <select v-model.number="form.trading_pair_id" :disabled="!form.exchange_id || !pairOptions.length" @change="onPairChange">
            <option :value="null" disabled>{{ form.exchange_id && !pairOptions.length ? 'No active trading pairs for this exchange' : 'Select pair' }}</option>
            <option v-for="pair in pairOptions" :key="pair.id" :value="pair.id">{{ pair.pair }}</option>
          </select>
        </label>
        <label>Base margin<input v-model.number="form.base_margin_usdt" type="number"/></label>
        <label>Leverage<input v-model.number="form.leverage" type="number"/></label>
        <label>Max recovery steps<input v-model.number="form.max_recovery_steps" type="number"/></label>
        <label>Recovery multiplier<input v-model.number="form.recovery_multiplier" type="number" step="0.1"/></label>
        <label>TP % of margin<input v-model.number="form.take_profit_percent_of_margin" type="number" step="0.1"/></label>
        <label>SL % of margin<input v-model.number="form.stop_loss_percent_of_margin" type="number" step="0.1"/></label>
        <label>Max daily loss<input v-model.number="form.max_daily_loss_usdt" type="number"/></label>
        <label>Max total loss<input v-model.number="form.max_total_loss_usdt" type="number"/></label>
        <label>Max open positions<input v-model.number="form.max_open_positions" type="number"/></label>
        <label>Cooldown loss sec<input v-model.number="form.cooldown_after_loss_seconds" type="number"/></label>
        <label>Cooldown win sec<input v-model.number="form.cooldown_after_win_seconds" type="number"/></label>
        <label>Long imbalance<input v-model.number="form.long_imbalance_threshold" type="number" step="0.01"/></label>
        <label>Short imbalance<input v-model.number="form.short_imbalance_threshold" type="number" step="0.01"/></label>
        <label>Max spread %<input v-model.number="form.max_spread_percent" type="number" step="0.01"/></label>
        <label>Momentum window<input v-model.number="form.momentum_window_snapshots" type="number"/></label>
        <label>Min valid exchanges<input v-model.number="form.min_valid_exchanges" type="number"/></label>
        <label>Min confirming exchanges<input v-model.number="form.min_confirming_exchanges" type="number"/></label>
        <label>Min consensus ratio<input v-model.number="form.min_consensus_ratio" type="number" step="0.01"/></label>
        <label>Max snapshot age sec<input v-model.number="form.max_snapshot_age_seconds" type="number" step="0.5"/></label>
        <label>Anomaly min<input v-model.number="form.imbalance_anomaly_min" type="number" step="0.01"/></label>
        <label>Anomaly max<input v-model.number="form.imbalance_anomaly_max" type="number" step="0.1"/></label>
        <label>Entry mode
          <select v-model="form.entry_mode">
            <option value="instant">Instant</option>
            <option value="two_step_confirmation">Two-step confirmation</option>
          </select>
        </label>
        <template v-if="form.entry_mode === 'two_step_confirmation'">
          <label>Confirmation delay sec<input v-model.number="form.confirmation_delay_seconds" type="number" step="0.5"/></label>
          <label>Confirmation max wait sec<input v-model.number="form.confirmation_max_wait_seconds" type="number" step="0.5"/></label>
          <label>Min momentum delta<input v-model.number="form.confirmation_min_momentum_delta" type="number" step="0.000001"/></label>
          <label class="check-row"><input v-model="form.confirmation_require_same_direction" type="checkbox"/> Require same direction</label>
          <label class="check-row"><input v-model="form.confirmation_require_momentum_improvement" type="checkbox"/> Require momentum improvement</label>
          <label class="check-row"><input v-model="form.confirmation_require_consensus_still_valid" type="checkbox"/> Require consensus still valid</label>
        </template>
        <label>Max recovery cooldown sec<input v-model.number="form.cooldown_after_max_recovery_seconds" type="number"/></label>
        <label>Feedback lookback<input v-model.number="form.feedback_lookback_trades" type="number"/></label>
        <label>Side loss streak limit<input v-model.number="form.side_loss_streak_limit" type="number"/></label>
        <label>Side cooldown sec<input v-model.number="form.side_cooldown_seconds" type="number"/></label>
        <label>Min side win rate<input v-model.number="form.min_side_win_rate" type="number" step="1"/></label>
        <label>Adaptive consensus boost<input v-model.number="form.adaptive_consensus_boost" type="number" step="0.01"/></label>
        <label>Adaptive valid exchanges boost<input v-model.number="form.adaptive_min_valid_exchanges_boost" type="number"/></label>
        <label>Paper equity<input v-model.number="form.paper_equity_usdt" type="number"/></label>
        <label class="check-row"><input v-model="form.consensus_enabled" type="checkbox"/> Consensus enabled</label>
        <label class="check-row"><input v-model="form.use_median_imbalance" type="checkbox"/> Use median imbalance</label>
        <label class="check-row"><input v-model="form.exclude_anomalous_imbalance" type="checkbox"/> Exclude imbalance anomalies</label>
        <label class="check-row"><input v-model="form.feedback_enabled" type="checkbox"/> Feedback enabled</label>
        <label class="check-row"><input v-model="form.require_configured_exchange_signal" type="checkbox"/> Require configured signal</label>
        <label class="check-row"><input v-model="form.enabled" type="checkbox"/> Enabled</label>
      </div>
      <div class="action-row">
        <button @click="saveConfig"><i class="fa-solid fa-floppy-disk"></i> Save</button>
        <button @click="start"><i class="fa-solid fa-play"></i> Start Paper</button>
        <button class="button-danger" @click="stop"><i class="fa-solid fa-stop"></i> Stop</button>
      </div>
    </section>

    <section class="recovery-section">
      <h3>State</h3>
      <div class="metric-grid">
        <div><span>Current step</span><strong>{{ recoveryState.current_step ?? 0 }}</strong></div>
        <div><span>Current margin</span><strong>{{ fmt(recoveryState.current_margin, 2) }} USDT</strong></div>
        <div><span>Consecutive losses</span><strong>{{ recoveryState.consecutive_losses ?? 0 }}</strong></div>
        <div><span>Status</span><strong>{{ debug?.status || statePayload?.status || (recoveryState.is_stopped ? 'stopped' : (config?.enabled ? 'running' : 'stopped')) }}</strong></div>
        <div><span>Enabled</span><strong>{{ config?.enabled ? 'true' : 'false' }}</strong></div>
        <div><span>Exchange</span><strong>{{ config?.exchange || '-' }}</strong></div>
        <div><span>Symbol</span><strong>{{ config?.symbol || '-' }}</strong></div>
        <div><span>Total PnL</span><strong>{{ fmt(metrics?.total_pnl, 2) }} USDT</strong></div>
        <div><span>Win rate</span><strong>{{ fmt(metrics?.win_rate, 2) }}%</strong></div>
        <div><span>Max drawdown</span><strong>{{ fmt(metrics?.max_drawdown, 2) }} USDT</strong></div>
        <div><span>Stop reason</span><strong>{{ recoveryState.stop_reason || '-' }}</strong></div>
        <div><span>Paused until</span><strong>{{ dt(recoveryState.paused_until) }}</strong></div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>Debug</h3>
      <div class="debug-warning" v-if="debug?.reason_if_not_trading">
        {{ debug.reason_if_not_trading }}
      </div>
      <div class="metric-grid">
        <div><span>Scanner hook</span><strong>{{ debug?.scanner_hook_active ? 'active' : 'waiting' }}</strong></div>
        <div><span>Last hook</span><strong>{{ dt(debug?.last_scanner_hook_at) }}</strong></div>
        <div><span>Snapshot time</span><strong>{{ dt(debug?.latest_snapshot?.updated_at || statePayload?.last_order_book_snapshot_time) }}</strong></div>
        <div><span>Snapshot source exchange</span><strong>{{ debug?.last_snapshot_source_exchange || '-' }}</strong></div>
        <div><span>Snapshot source pair</span><strong>{{ debug?.last_snapshot_source_pair || '-' }}</strong></div>
        <div><span>Snapshot keys</span><strong>{{ (debug?.snapshot_keys || []).join(', ') || '-' }}</strong></div>
        <div><span>Bids count</span><strong>{{ debug?.bids_count ?? '-' }}</strong></div>
        <div><span>Asks count</span><strong>{{ debug?.asks_count ?? '-' }}</strong></div>
        <div><span>Purchases count</span><strong>{{ debug?.purchases_count ?? '-' }}</strong></div>
        <div><span>Sales count</span><strong>{{ debug?.sales_count ?? '-' }}</strong></div>
        <div><span>Last evaluation</span><strong>{{ dt(debug?.last_evaluation?.evaluated_at || statePayload?.last_evaluation?.evaluated_at) }}</strong></div>
        <div><span>Configured exchange</span><strong>{{ debug?.configured_exchange || '-' }}</strong></div>
        <div><span>Hook exchange</span><strong>{{ debug?.last_hook_exchange || '-' }}</strong></div>
        <div><span>Exchange match</span><strong>{{ debug?.exchange_match ? 'true' : 'false' }}</strong></div>
        <div><span>Configured symbol</span><strong>{{ debug?.configured_symbol || '-' }}</strong></div>
        <div><span>Hook symbol</span><strong>{{ debug?.last_hook_symbol || '-' }}</strong></div>
        <div><span>Hook raw pair</span><strong>{{ debug?.last_hook_raw_pair || '-' }}</strong></div>
        <div><span>Symbol match</span><strong>{{ debug?.symbol_match ? 'true' : 'false' }}</strong></div>
        <div><span>Norm config exchange</span><strong>{{ debug?.normalized_config_exchange || '-' }}</strong></div>
        <div><span>Norm hook exchange</span><strong>{{ debug?.normalized_hook_exchange || '-' }}</strong></div>
        <div><span>Norm config symbol</span><strong>{{ debug?.normalized_config_symbol || '-' }}</strong></div>
        <div><span>Norm hook symbol</span><strong>{{ debug?.normalized_hook_symbol || '-' }}</strong></div>
        <div><span>Last decision</span><strong>{{ debug?.last_evaluation?.last_decision || statePayload?.last_evaluation?.last_decision || 'none' }}</strong></div>
        <div><span>Reject reason</span><strong>{{ debug?.last_evaluation?.reject_reason || '-' }}</strong></div>
        <div><span>Entry blocked</span><strong>{{ debug?.entry_blocked_reason || '-' }}</strong></div>
        <div><span>Entry mode</span><strong>{{ debug?.entry_mode || config?.entry_mode || 'instant' }}</strong></div>
        <div><span>Resolved live symbol</span><strong>{{ debug?.resolved_live_symbol || statePayload?.live_market?.resolved_live_symbol || '-' }}</strong></div>
        <div><span>Live market type</span><strong>{{ debug?.live_market_type || statePayload?.live_market?.live_market_type || '-' }}</strong></div>
        <div><span>Live market valid</span><strong>{{ debug?.live_market_valid ? 'true' : 'false' }}</strong></div>
        <div><span>Live market error</span><strong>{{ debug?.live_market_error || statePayload?.live_market?.live_market_error || '-' }}</strong></div>
        <div><span>Bid top 5</span><strong>{{ fmt(debug?.last_evaluation?.bid_volume_top_5, 2) }}</strong></div>
        <div><span>Ask top 5</span><strong>{{ fmt(debug?.last_evaluation?.ask_volume_top_5, 2) }}</strong></div>
        <div><span>Imbalance</span><strong>{{ fmt(debug?.last_evaluation?.imbalance, 4) }}</strong></div>
        <div><span>Spread %</span><strong>{{ fmt(debug?.last_evaluation?.spread_percent, 4) }}</strong></div>
        <div><span>Momentum</span><strong>{{ fmt(debug?.last_evaluation?.momentum, 8) }}</strong></div>
        <div><span>Signals</span><strong>L: {{ debug?.last_evaluation?.long_signal ? 'yes' : 'no' }} / S: {{ debug?.last_evaluation?.short_signal ? 'yes' : 'no' }}</strong></div>
        <div><span>Consensus direction</span><strong>{{ debug?.consensus_direction || 'none' }}</strong></div>
        <div><span>Valid exchanges</span><strong>{{ debug?.valid_exchanges_count ?? 0 }}</strong></div>
        <div><span>Long consensus</span><strong>{{ debug?.confirming_long_count ?? 0 }} / {{ fmt(debug?.consensus_ratio_long, 2) }}</strong></div>
        <div><span>Short consensus</span><strong>{{ debug?.confirming_short_count ?? 0 }} / {{ fmt(debug?.consensus_ratio_short, 2) }}</strong></div>
        <div><span>Median imbalance</span><strong>{{ fmt(debug?.median_imbalance, 4) }}</strong></div>
        <div><span>Raw avg imbalance</span><strong>{{ fmt(debug?.raw_average_imbalance, 4) }}</strong></div>
        <div><span>Avg imbalance</span><strong>{{ fmt(debug?.average_imbalance, 4) }}</strong></div>
        <div><span>Avg momentum</span><strong>{{ fmt(debug?.average_momentum, 8) }}</strong></div>
        <div><span>Anomalous exchanges</span><strong>{{ debug?.anomalous_exchanges_count ?? 0 }}</strong></div>
        <div><span>Excluded anomalies</span><strong>{{ (debug?.excluded_anomalous_imbalance_exchanges || []).join(', ') || '-' }}</strong></div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>Pending Entry</h3>
      <div class="metric-grid">
        <div><span>Exists</span><strong>{{ debug?.pending_entry_exists ? 'yes' : 'no' }}</strong></div>
        <div><span>Side</span><strong>{{ debug?.pending_entry_side || '-' }}</strong></div>
        <div><span>Age</span><strong>{{ fmt(debug?.pending_entry_age_seconds, 2) }} sec</strong></div>
        <div><span>Expires in</span><strong>{{ fmt(debug?.pending_entry_expires_in_seconds, 2) }} sec</strong></div>
        <div><span>Created at</span><strong>{{ dt(debug?.pending_entry_created_at) }}</strong></div>
        <div><span>Expires at</span><strong>{{ dt(debug?.pending_entry_expires_at) }}</strong></div>
        <div><span>First momentum</span><strong>{{ fmt(debug?.pending_entry_first_momentum, 8) }}</strong></div>
        <div><span>Current momentum</span><strong>{{ fmt(debug?.pending_entry_current_momentum, 8) }}</strong></div>
        <div><span>First consensus</span><strong>{{ debug?.pending_entry_first_consensus || '-' }}</strong></div>
        <div><span>Current consensus</span><strong>{{ debug?.pending_entry_current_consensus || '-' }}</strong></div>
        <div><span>Status</span><strong>{{ debug?.pending_entry_status || '-' }}</strong></div>
        <div><span>Reject reason</span><strong>{{ debug?.last_confirmation_reject_reason || '-' }}</strong></div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>Signal Feedback</h3>
      <div class="metric-grid">
        <div><span>Feedback enabled</span><strong>{{ debug?.feedback_enabled ? 'true' : 'false' }}</strong></div>
        <div><span>Long win rate</span><strong>{{ fmt(debug?.long_recent_win_rate, 2) }}%</strong></div>
        <div><span>Short win rate</span><strong>{{ fmt(debug?.short_recent_win_rate, 2) }}%</strong></div>
        <div><span>Long loss streak</span><strong>{{ debug?.long_loss_streak ?? 0 }}</strong></div>
        <div><span>Short loss streak</span><strong>{{ debug?.short_loss_streak ?? 0 }}</strong></div>
        <div><span>Adaptive consensus ratio</span><strong>{{ fmt(debug?.adaptive_min_consensus_ratio, 2) }}</strong></div>
        <div><span>Adaptive valid exchanges</span><strong>{{ debug?.adaptive_min_valid_exchanges ?? config?.min_valid_exchanges ?? 0 }}</strong></div>
        <div><span>Blocked side</span><strong>{{ debug?.blocked_side || '-' }}</strong></div>
        <div><span>Feedback reason</span><strong>{{ debug?.feedback_reject_reason || '-' }}</strong></div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>Signal Diagnostics</h3>
      <div class="metric-grid">
        <div><span>Long signals</span><strong>{{ debug?.long_signals_count ?? 0 }}</strong></div>
        <div><span>Short signals</span><strong>{{ debug?.short_signals_count ?? 0 }}</strong></div>
        <div><span>Long opened</span><strong>{{ debug?.long_opened_count ?? 0 }}</strong></div>
        <div><span>Short opened</span><strong>{{ debug?.short_opened_count ?? 0 }}</strong></div>
      </div>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--signal-diagnostics"><span>Time</span><span>Median</span><span>Avg</span><span>Momentum</span><span>Long</span><span>Short</span><span>L ratio</span><span>S ratio</span><span>Proposed</span><span>Final</span><span>Reject</span><span>Blocked</span><span>L win</span><span>S win</span></div>
        <div class="recovery-row recovery-row--signal-diagnostics" v-for="row in (debug?.signal_diagnostics_last_100 || [])" :key="`${row.timestamp}-${row.proposed_side}-${row.final_side}`">
          <span>{{ dt(row.timestamp) }}</span>
          <span>{{ fmt(row.median_imbalance, 4) }}</span>
          <span>{{ fmt(row.avg_imbalance, 4) }}</span>
          <span>{{ fmt(row.momentum, 8) }}</span>
          <span>{{ row.long_confirms ?? '-' }}</span>
          <span>{{ row.short_confirms ?? '-' }}</span>
          <span>{{ fmt(row.long_ratio, 2) }}</span>
          <span>{{ fmt(row.short_ratio, 2) }}</span>
          <span>{{ row.proposed_side || 'none' }}</span>
          <span>{{ row.final_side || 'none' }}</span>
          <span>{{ row.reject_reason || '-' }}</span>
          <span>{{ row.blocked_side || '-' }}</span>
          <span>{{ fmt(row.long_win_rate, 2) }}%</span>
          <span>{{ fmt(row.short_win_rate, 2) }}%</span>
        </div>
        <div class="empty-row" v-if="!(debug?.signal_diagnostics_last_100 || []).length">No signal diagnostics yet</div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>Multi-exchange consensus</h3>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--consensus"><span>Exchange</span><span>Valid</span><span>Imbalance</span><span>Raw imbalance</span><span>Anomaly</span><span>Spread %</span><span>Momentum</span><span>Long</span><span>Short</span><span>Reject reason</span></div>
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
        <div class="empty-row" v-if="!(debug?.per_exchange_features || []).length">No consensus snapshots yet</div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>Scanner Diagnostics</h3>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--scanner"><span>Exchange</span><span>Symbol</span><span>Status</span><span>Latency</span><span>Stale sec</span><span>Last success</span><span>Last error</span><span>Error</span><span>Cooldown</span></div>
        <div class="recovery-row recovery-row--scanner" v-for="row in scannerDiagnostics" :key="`${row.exchange}-${row.symbol}`">
          <span>{{ row.exchange }}</span>
          <span>{{ row.symbol }}</span>
          <span :class="['result-pill', scannerStatusTone(row.status)]">{{ row.status || '-' }}</span>
          <span>{{ fmt(row.latency_ms, 1) }} ms</span>
          <span>{{ fmt(row.stale_seconds, 2) }}</span>
          <span>{{ dt(row.last_success_at) }}</span>
          <span>{{ dt(row.last_error_at) }}</span>
          <span>{{ row.error_message || '-' }}</span>
          <span>{{ dt(row.cooldown_until) }}</span>
        </div>
        <div class="empty-row" v-if="!scannerDiagnostics.length">No scanner diagnostics yet</div>
      </div>
    </section>

    <section class="recovery-section">
      <h3>Open Position</h3>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head"><span>Side</span><span>Margin</span><span>Notional</span><span>Entry</span><span>PnL</span></div>
        <div class="recovery-row" v-if="openPosition">
          <span>{{ openPosition.side }}</span>
          <span>{{ fmt(openPosition.margin, 2) }}</span>
          <span>{{ fmt(openPosition.notional, 2) }}</span>
          <span>{{ fmt(openPosition.entry_price, 4) }}</span>
          <span>{{ fmt(openPosition.pnl, 4) }}</span>
        </div>
        <div class="empty-row" v-else>No open position</div>
      </div>
      <div class="action-row" v-if="openPosition">
        <button class="button-danger" @click="closePosition"><i class="fa-solid fa-xmark"></i> Close Position</button>
      </div>
    </section>

    <section class="recovery-section">
      <h3>Last Trades</h3>
      <div class="action-row">
        <label class="check-row"><input :checked="showArchived" type="checkbox" @change="setShowArchived"/> Show archived trades</label>
        <button @click="exportTrades('csv')"><i class="fa-solid fa-file-csv"></i> Export non-archived trades</button>
        <button @click="exportTrades('json')"><i class="fa-solid fa-file-code"></i> Export JSON</button>
        <button @click="archiveAllClosed"><i class="fa-solid fa-box-archive"></i> Archive all closed trades</button>
        <button @click="unarchiveAll"><i class="fa-solid fa-rotate-left"></i> Unarchive all</button>
        <button class="button-danger" @click="deleteAllArchivedTrades"><i class="fa-solid fa-trash"></i> Delete all archived trades</button>
      </div>
      <div class="metric-grid">
        <div><span>Archived trades</span><strong>{{ metrics?.archived_trades_count ?? 0 }}</strong></div>
        <div><span>Archived PnL</span><strong>{{ fmt(metrics?.archived_pnl, 2) }} USDT</strong></div>
        <div><span>Gross profit</span><strong>{{ fmt(metrics?.gross_profit, 2) }} USDT</strong></div>
        <div><span>Gross loss</span><strong>{{ fmt(metrics?.gross_loss, 2) }} USDT</strong></div>
      </div>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--trades"><span>ID</span><span>Mode</span><span>Side</span><span>Step</span><span>Margin</span><span>Entry</span><span>Exit</span><span>PnL</span><span>Result</span><span>Live</span><span>Protection</span><span>Action</span></div>
        <div class="recovery-row recovery-row--trades" v-for="trade in trades" :key="trade.id">
          <span data-label="ID">#{{ trade.id }}</span>
          <span data-label="Mode"><span :class="['mode-badge', String(trade.execution_mode || 'paper').toLowerCase() === 'live' ? 'live' : 'paper']">{{ trade.execution_mode || 'paper' }}</span></span>
          <span data-label="Side"><span :class="['side-badge', String(trade.side || '').toLowerCase()]">{{ trade.side }}</span></span>
          <span data-label="Step">{{ trade.recovery_step }}</span>
          <span data-label="Margin">{{ fmt(trade.margin, 2) }}</span>
          <span data-label="Entry">{{ fmt(trade.entry_price, 4) }}</span>
          <span data-label="Exit">{{ fmt(trade.exit_price, 4) }}</span>
          <span data-label="PnL" :class="['pnl-badge', resultTone(trade)]">
            <strong>{{ moneyResult(trade.pnl) }}</strong>
            <small>{{ feeIndicator(trade) || resultLabel(trade) }}</small>
          </span>
          <span data-label="Result"><span :class="['status-badge', resultTone(trade)]">{{ resultLabel(trade) }}</span></span>
          <span data-label="Live"><span :class="['status-badge', liveStatusTone(trade.live_status)]">{{ formatLiveStatus(trade.live_status) }}</span></span>
          <span data-label="Protection"><span :class="['status-badge', protectionTone(trade)]">{{ formatProtectionStatus(trade) }}</span></span>
          <span class="trade-actions" data-label="Action">
            <span v-if="formatWarningSummary(trade)" class="warning-chip"><i class="fa-solid fa-triangle-exclamation"></i> {{ formatWarningSummary(trade) }}</span>
            <button @click="viewDetails(trade)">View Details</button>
            <button v-if="trade.closed_at && !trade.is_archived" @click="archiveTrade(trade)">Archive</button>
            <button v-if="trade.is_archived" class="button-danger" @click="deleteArchivedTrade(trade)">Delete</button>
          </span>
        </div>
      </div>
    </section>

    <div class="details-backdrop" v-if="decisionDetails" @click.self="closeDetails">
      <div class="details-modal">
        <div class="section-title">
          <h3>Decision Snapshot</h3>
          <button @click="closeDetails">Close</button>
        </div>

        <div class="detail-block">
          <h4>Trade summary</h4>
          <div class="metric-grid">
            <div><span>Trade</span><strong>#{{ detail('summary.id') }}</strong></div>
            <div><span>Mode</span><strong>{{ detail('trade.execution_mode', 'paper') }}</strong></div>
            <div><span>Side</span><strong>{{ detail('summary.side') }}</strong></div>
            <div><span>Exchange</span><strong>{{ detail('summary.exchange') }}</strong></div>
            <div><span>Symbol</span><strong>{{ detail('summary.symbol') }}</strong></div>
            <div><span>Step</span><strong>{{ detail('trade.recovery_step') }}</strong></div>
            <div><span>Margin</span><strong>{{ fmt(detail('trade.margin', 0), 2) }} USDT</strong></div>
            <div><span>Notional</span><strong>{{ fmt(detail('trade.notional', 0), 2) }} USDT</strong></div>
            <div><span>Opened at</span><strong>{{ dt(detail('trade.opened_at')) }}</strong></div>
            <div><span>Closed at</span><strong>{{ dt(detail('trade.closed_at')) }}</strong></div>
            <div><span>Close reason</span><strong>{{ closeReasonLabel(detail('trade.reason_close')) }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>Execution</h4>
          <div class="metric-grid">
            <div><span>Live status</span><strong>{{ formatLiveStatus(detail('trade.live_status')) }}</strong></div>
            <div><span>Entry</span><strong>{{ fmt(detail('summary.entry_price', 0), 6) }}</strong></div>
            <div><span>Exit</span><strong>{{ fmt(detail('trade.exit_price', 0), 6) }}</strong></div>
            <div><span>Filled amount</span><strong>{{ fmt(detail('trade.live_filled_amount', 0), 8) }}</strong></div>
            <div><span>Open order ID</span><strong>{{ formatOrderId(detail('trade.live_exchange_order_id')) }}</strong></div>
            <div><span>Close order ID</span><strong>{{ formatOrderId(detail('trade.live_close_order_id')) }}</strong></div>
            <div><span>Live error</span><strong>{{ detail('trade.live_error') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>TP/SL protection</h4>
          <div class="metric-grid">
            <div><span>Status</span><strong>{{ detail('trade.tp_sl_protected') ? 'Protected' : 'Exchange TP/SL not created' }}</strong></div>
            <div><span>TP price</span><strong>{{ fmt(detail('trade.exchange_tp_price', 0), 6) }}</strong></div>
            <div><span>SL price</span><strong>{{ fmt(detail('trade.exchange_sl_price', 0), 6) }}</strong></div>
            <div><span>TP order ID</span><strong>{{ formatOrderId(detail('trade.exchange_tp_order_id')) }}</strong></div>
            <div><span>SL order ID</span><strong>{{ formatOrderId(detail('trade.exchange_sl_order_id')) }}</strong></div>
            <div><span>Created at</span><strong>{{ dt(detail('trade.tp_sl_created_at')) }}</strong></div>
            <div><span>TP/SL error</span><strong>{{ detail('trade.tp_sl_error') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>PnL & fees</h4>
          <div class="metric-grid">
            <div><span>PnL</span><strong>{{ moneyResult(detail('summary.pnl', 0)) }}</strong></div>
            <div><span>Entry fee</span><strong>{{ fmt(detail('trade.live_entry_fee', 0), 6) }} USDT</strong></div>
            <div><span>Exit fee</span><strong>{{ fmt(detail('trade.live_exit_fee', 0), 6) }} USDT</strong></div>
            <div><span>Fee status</span><strong>{{ feeIndicator(detail('trade', {})) || '-' }}</strong></div>
            <div><span>PnL source</span><strong>{{ detail('trade.pnl_source') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>Reconciliation</h4>
          <div class="metric-grid">
            <div><span>Close reason</span><strong>{{ closeReasonLabel(detail('trade.reason_close')) }}</strong></div>
            <div><span>Exit fallback used</span><strong>{{ detail('trade.exit_price_fallback_used') ? 'Yes' : 'No' }}</strong></div>
            <div><span>Exit warning</span><strong>{{ detail('trade.exit_price_warning') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>Signal</h4>
          <div class="metric-grid">
            <div><span>Entry reason</span><strong>{{ detail('signal.entry_reason') }}</strong></div>
            <div><span>Current step</span><strong>{{ detail('decision_snapshot.current_recovery_step') }}</strong></div>
            <div><span>Margin</span><strong>{{ fmt(detail('decision_snapshot.current_margin', 0), 2) }}</strong></div>
            <div><span>Notional</span><strong>{{ fmt(detail('decision_snapshot.current_notional', 0), 2) }}</strong></div>
            <div><span>TP target PnL</span><strong>{{ fmt(detail('decision_snapshot.take_profit_target_pnl', 0), 4) }}</strong></div>
            <div><span>SL target PnL</span><strong>{{ fmt(detail('decision_snapshot.stop_loss_target_pnl', 0), 4) }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>Consensus</h4>
          <div class="metric-grid">
            <div><span>Direction</span><strong>{{ detail('consensus.direction') }}</strong></div>
            <div><span>Valid exchanges</span><strong>{{ detail('consensus.valid_exchanges_count') }}</strong></div>
            <div><span>Long confirms</span><strong>{{ detail('consensus.confirming_long_count') }}</strong></div>
            <div><span>Short confirms</span><strong>{{ detail('consensus.confirming_short_count') }}</strong></div>
            <div><span>Long ratio</span><strong>{{ fmt(detail('consensus.consensus_ratio_long', 0), 3) }}</strong></div>
            <div><span>Short ratio</span><strong>{{ fmt(detail('consensus.consensus_ratio_short', 0), 3) }}</strong></div>
            <div><span>Median imbalance</span><strong>{{ fmt(detail('consensus.median_imbalance', 0), 4) }}</strong></div>
            <div><span>Raw avg imbalance</span><strong>{{ fmt(detail('consensus.raw_average_imbalance', 0), 4) }}</strong></div>
            <div><span>Avg imbalance</span><strong>{{ fmt(detail('consensus.average_imbalance', 0), 4) }}</strong></div>
            <div><span>Avg momentum</span><strong>{{ fmt(detail('consensus.average_momentum', 0), 8) }}</strong></div>
            <div><span>Anomalies</span><strong>{{ detail('consensus.anomalous_exchanges_count') }}</strong></div>
            <div><span>Excluded</span><strong>{{ (detail('consensus.excluded_anomalous_imbalance_exchanges') || []).join(', ') || '-' }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>Feedback</h4>
          <div class="metric-grid">
            <div><span>Enabled</span><strong>{{ detail('feedback.feedback_enabled') }}</strong></div>
            <div><span>Long win rate</span><strong>{{ fmt(detail('feedback.long_recent_win_rate', 0), 2) }}%</strong></div>
            <div><span>Short win rate</span><strong>{{ fmt(detail('feedback.short_recent_win_rate', 0), 2) }}%</strong></div>
            <div><span>Blocked side</span><strong>{{ detail('feedback.blocked_side') }}</strong></div>
            <div><span>Reject reason</span><strong>{{ detail('feedback.feedback_reject_reason') }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>Risk</h4>
          <div class="metric-grid">
            <div><span>Approved</span><strong>{{ detail('risk.approved') }}</strong></div>
            <div><span>Reason</span><strong>{{ detail('risk.reason') }}</strong></div>
          </div>
        </div>

        <div class="detail-block">
          <h4>Raw exchange responses</h4>
          <details class="raw-details">
            <summary>Open response</summary>
            <pre class="raw-block">{{ prettyRaw(detail('trade.live_raw_open_response_json', null)) }}</pre>
          </details>
          <details class="raw-details">
            <summary>Close response</summary>
            <pre class="raw-block">{{ prettyRaw(detail('trade.live_raw_close_response_json', null)) }}</pre>
          </details>
        </div>

        <div class="detail-block">
          <h4>Per-exchange order book</h4>
          <div class="recovery-table">
            <div class="recovery-row recovery-row--details recovery-row--head"><span>Exchange</span><span>Symbol</span><span>Bid top 5</span><span>Ask top 5</span><span>Imbalance</span><span>Raw</span><span>Anomaly</span><span>Spread %</span><span>Momentum</span><span>Age</span><span>Valid</span><span>Long</span><span>Short</span><span>Reject</span></div>
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
}
.recovery-heading,
.recovery-section{
  display: grid;
  gap: 10px;
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
}
.section-title{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
}
label{
  display: grid;
  gap: 6px;
  color: #90a0be;
  font-size: 12px;
}
input,
select,
button{
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
}
.metric-grid div{
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
}
.metric-grid span,
.recovery-row--head{
  color: #90a0be;
  font-size: 12px;
  text-transform: uppercase;
}
.metric-grid strong{
  color: #fff;
}
.debug-warning{
  padding: 10px 12px;
  border-radius: 8px;
  color: #ffcf9b;
  background: rgba(255,184,107,.10);
  border: 1px solid rgba(255,184,107,.18);
}
.recovery-table{
  display: grid;
  gap: 8px;
}
.recovery-row{
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
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
  grid-template-columns: minmax(150px, 1.3fr) repeat(7, minmax(78px, .72fr)) minmax(88px, .8fr) minmax(78px, .7fr) minmax(160px, 1.3fr) minmax(92px, .8fr) minmax(72px, .65fr) minmax(72px, .65fr);
  min-width: 1320px;
}
.recovery-row--consensus{
  grid-template-columns: repeat(10, minmax(0, 1fr));
  min-width: 980px;
}
.empty-row{
  color: #90a0be;
  padding: 10px;
}
@media (max-width: 760px){
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
}
</style>
