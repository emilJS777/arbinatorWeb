<script>
import {mapState} from "vuex";
import {getResponseMessage, isResponseSuccess} from "@/store/request.js";

export default {
  computed: {
    ...mapState({
      config: state => state.orderBookRecovery.CONFIG,
      statePayload: state => state.orderBookRecovery.STATE,
      trades: state => state.orderBookRecovery.TRADES,
      metrics: state => state.orderBookRecovery.METRICS,
      debug: state => state.orderBookRecovery.DEBUG,
      showArchived: state => state.orderBookRecovery.SHOW_ARCHIVED,
    }),
    recoveryState() {
      return this.statePayload?.recovery_state || {};
    },
    openPosition() {
      return this.statePayload?.open_position || this.metrics?.open_position || null;
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
      handler(value) {
        if (value && !this.form) this.form = {...value};
      },
    },
  },
  methods: {
    load() {
      this.$store.dispatch("orderBookRecovery/LOAD");
    },
    saveConfig() {
      this.emitter.emit("loader", true);
      this.$store.dispatch("orderBookRecovery/SAVE_CONFIG", this.form).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Config saved" : getResponseMessage(res),
        });
      }).finally(() => this.emitter.emit("loader", false));
    },
    start() {
      this.emitter.emit("loader", true);
      this.$store.dispatch("orderBookRecovery/START").then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Paper strategy started" : getResponseMessage(res),
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
        <span>{{ form.paper_mode_only ? 'paper mode only' : 'invalid mode' }}</span>
      </div>
      <div class="recovery-form">
        <label>Exchange<input v-model="form.exchange"/></label>
        <label>Symbol<input v-model="form.symbol"/></label>
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
        <label>Max recovery cooldown sec<input v-model.number="form.cooldown_after_max_recovery_seconds" type="number"/></label>
        <label>Feedback lookback<input v-model.number="form.feedback_lookback_trades" type="number"/></label>
        <label>Side loss streak limit<input v-model.number="form.side_loss_streak_limit" type="number"/></label>
        <label>Side cooldown sec<input v-model.number="form.side_cooldown_seconds" type="number"/></label>
        <label>Min side win rate<input v-model.number="form.min_side_win_rate" type="number" step="1"/></label>
        <label>Adaptive consensus boost<input v-model.number="form.adaptive_consensus_boost" type="number" step="0.01"/></label>
        <label>Adaptive valid exchanges boost<input v-model.number="form.adaptive_min_valid_exchanges_boost" type="number"/></label>
        <label>Paper equity<input v-model.number="form.paper_equity_usdt" type="number"/></label>
        <label class="check-row"><input v-model="form.consensus_enabled" type="checkbox"/> Consensus enabled</label>
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
        <div><span>Avg imbalance</span><strong>{{ fmt(debug?.average_imbalance, 4) }}</strong></div>
        <div><span>Avg momentum</span><strong>{{ fmt(debug?.average_momentum, 8) }}</strong></div>
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
      <h3>Multi-exchange consensus</h3>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--consensus"><span>Exchange</span><span>Valid</span><span>Imbalance</span><span>Spread %</span><span>Momentum</span><span>Long</span><span>Short</span><span>Reject reason</span></div>
        <div class="recovery-row recovery-row--consensus" v-for="row in (debug?.per_exchange_features || [])" :key="`${row.exchange}-${row.symbol}`">
          <span>{{ row.exchange }}</span>
          <span>{{ row.valid ? 'yes' : 'no' }}</span>
          <span>{{ fmt(row.imbalance, 4) }}</span>
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
        <div class="empty-row" v-else>No open paper position</div>
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
      </div>
      <div class="metric-grid">
        <div><span>Archived trades</span><strong>{{ metrics?.archived_trades_count ?? 0 }}</strong></div>
        <div><span>Archived PnL</span><strong>{{ fmt(metrics?.archived_pnl, 2) }} USDT</strong></div>
        <div><span>Gross profit</span><strong>{{ fmt(metrics?.gross_profit, 2) }} USDT</strong></div>
        <div><span>Gross loss</span><strong>{{ fmt(metrics?.gross_loss, 2) }} USDT</strong></div>
      </div>
      <div class="recovery-table">
        <div class="recovery-row recovery-row--head recovery-row--trades"><span>ID</span><span>Side</span><span>Step</span><span>Margin</span><span>Entry</span><span>Exit</span><span>P/L</span><span>Result</span><span>Close reason</span><span>Archived</span><span>Action</span></div>
        <div class="recovery-row recovery-row--trades" v-for="trade in trades" :key="trade.id">
          <span>{{ trade.id }}</span>
          <span>{{ trade.side }}</span>
          <span>{{ trade.recovery_step }}</span>
          <span>{{ fmt(trade.margin, 2) }}</span>
          <span>{{ fmt(trade.entry_price, 4) }}</span>
          <span>{{ fmt(trade.exit_price, 4) }}</span>
          <span :class="['pnl-badge', metricTone(trade.pnl)]">
            <strong>{{ moneyResult(trade.pnl) }}</strong>
            <small>{{ pnlLabel(trade) }}</small>
          </span>
          <span :class="['result-pill', trade.result || 'open']">{{ trade.result || 'open' }}</span>
          <span>{{ trade.reason_close || '-' }}</span>
          <span>{{ trade.is_archived ? 'yes' : 'no' }}</span>
          <span class="trade-actions">
            <button @click="viewDetails(trade)">View Details</button>
            <button v-if="trade.closed_at && !trade.is_archived" @click="archiveTrade(trade)">Archive</button>
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
          <h4>Summary</h4>
          <div class="metric-grid">
            <div><span>Trade</span><strong>#{{ detail('summary.id') }}</strong></div>
            <div><span>Side</span><strong>{{ detail('summary.side') }}</strong></div>
            <div><span>Exchange</span><strong>{{ detail('summary.exchange') }}</strong></div>
            <div><span>Symbol</span><strong>{{ detail('summary.symbol') }}</strong></div>
            <div><span>Entry</span><strong>{{ fmt(detail('summary.entry_price', 0), 6) }}</strong></div>
            <div><span>P/L</span><strong>{{ moneyResult(detail('summary.pnl', 0)) }}</strong></div>
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
            <div><span>Avg imbalance</span><strong>{{ fmt(detail('consensus.average_imbalance', 0), 4) }}</strong></div>
            <div><span>Avg momentum</span><strong>{{ fmt(detail('consensus.average_momentum', 0), 8) }}</strong></div>
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
          <h4>Per-exchange order book</h4>
          <div class="recovery-table">
            <div class="recovery-row recovery-row--details recovery-row--head"><span>Exchange</span><span>Symbol</span><span>Bid top 5</span><span>Ask top 5</span><span>Imbalance</span><span>Spread %</span><span>Momentum</span><span>Age</span><span>Valid</span><span>Long</span><span>Short</span><span>Reject</span></div>
            <div class="recovery-row recovery-row--details" v-for="row in decisionDetails.per_exchange_features" :key="`${row.exchange}-${row.symbol}`">
              <span>{{ row.exchange }}</span>
              <span>{{ row.symbol }}</span>
              <span>{{ fmt(row.bid_volume_top_5, 2) }}</span>
              <span>{{ fmt(row.ask_volume_top_5, 2) }}</span>
              <span>{{ fmt(row.imbalance, 4) }}</span>
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
  grid-template-columns: .5fr repeat(10, minmax(0, 1fr));
}
.trade-actions{
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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
  grid-template-columns: repeat(12, minmax(90px, 1fr));
  min-width: 1080px;
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
.pnl-badge small{
  color: #90a0be;
  font-size: 11px;
  text-transform: uppercase;
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
.recovery-row--consensus{
  grid-template-columns: repeat(8, minmax(0, 1fr));
}
.empty-row{
  color: #90a0be;
  padding: 10px;
}
@media (max-width: 760px){
  .recovery-row,
  .recovery-row--trades{
    grid-template-columns: 1fr 1fr;
  }
}
</style>
