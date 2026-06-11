<script>
import {mapState} from "vuex";
import { getResponseMessage, isResponseSuccess } from "@/store/request.js";

export default {
  computed: {
    ...mapState({
      backtests: state => state.research.BACKTESTS,
      active: state => state.research.ACTIVE_BACKTEST,
      candidates: state => state.research.CANDIDATES,
      heatmaps: state => state.research.HEATMAPS,
      lastExperiment: state => state.research.LAST_EXPERIMENT,
    }),
    equityPoints() {
      return this.polyline(this.active?.equity_curve || []);
    },
    drawdownPoints() {
      return this.polyline(this.active?.drawdown_curve || []);
    },
    wins() {
      return (this.active?.trades || []).filter(item => item.pnl > 0).length;
    },
    losses() {
      return (this.active?.trades || []).filter(item => item.pnl < 0).length;
    },
  },
  data() {
    return {
      form: {
        exchange: "binance",
        symbol: "BTCUSDT",
        timeframe: "5m",
        start_date: "",
        end_date: "",
        strategy_config: {},
        monte_carlo_iterations: 1000,
        run_optimization: false,
      },
      experimentForm: {
        symbols: ["BTCUSDT", "ETHUSDT"],
        timeframes: ["5m", "15m"],
        periods: [30, 90, 180, 365],
        max_combinations: 2400,
      },
    };
  },
  mounted() {
    this.$store.dispatch("research/LOAD");
    this.$store.dispatch("research/LOAD_CANDIDATES");
  },
  methods: {
    runBacktest() {
      this.emitter.emit("loader", true);
      this.$store.dispatch("research/CREATE", this.form).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Backtest finished" : getResponseMessage(res),
        });
        this.$store.dispatch("research/LOAD");
      }).finally(() => this.emitter.emit("loader", false));
    },
    runExperiment() {
      this.emitter.emit("loader", true);
      this.$store.dispatch("research/RUN_EXPERIMENT", this.experimentForm).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? `Experiment finished: ${res.data.obj.runs} runs` : getResponseMessage(res),
        });
        this.$store.dispatch("research/LOAD_CANDIDATES");
      }).finally(() => this.emitter.emit("loader", false));
    },
    loadBacktest(id) {
      this.$store.dispatch("research/LOAD_ONE", id);
    },
    acceptedCount() {
      return this.candidates.filter(item => !item.rejection_reasons?.length).length;
    },
    fmt(value) {
      const number = Number(value || 0);
      return number.toFixed(Math.abs(number) >= 100 ? 2 : 4);
    },
    polyline(values) {
      if (!values.length) return "";
      const nums = values.map(Number);
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const range = max - min || 1;
      return nums.map((value, index) => {
        const x = (index / Math.max(nums.length - 1, 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
      }).join(" ");
    },
  },
};
</script>

<template>
  <div class="research-page">
    <div class="research-heading">
      <p class="research-eyebrow margin-0">Research Platform</p>
      <h2 class="c-mode-1 margin-0">Strategy Expectancy Lab</h2>
    </div>

    <section class="research-section">
      <h3>Candidates Experiment</h3>
      <div class="research-form">
        <input v-model.number="experimentForm.max_combinations" type="number" placeholder="max combinations">
        <button @click="runExperiment">Run Candidates Experiment</button>
      </div>
      <div class="bar-row" v-if="lastExperiment">
        <span>Last run</span>
        <strong>{{ lastExperiment.runs }} combinations, {{ lastExperiment.summary?.accepted || 0 }} accepted</strong>
      </div>
    </section>

    <section class="research-section">
      <h3>Top Candidates</h3>
      <div class="research-table">
        <div class="candidate-row row--head"><span>Score</span><span>Market</span><span>EMA</span><span>TP/SL</span><span>Risk</span><span>PF</span><span>Expectancy</span><span>DD%</span><span>Trades</span></div>
        <div class="candidate-row" v-for="item in candidates" :key="item.id">
          <span>{{ fmt(item.stability_score) }}</span>
          <span>{{ item.symbol }} {{ item.timeframe }} {{ item.period_days }}d</span>
          <span>{{ item.parameters.ema_fast }}/{{ item.parameters.ema_slow }}</span>
          <span>{{ item.parameters.take_profit_percent }}/{{ item.parameters.stop_loss_percent }}</span>
          <span>{{ item.parameters.risk_per_trade_percent }}</span>
          <span>{{ fmt(item.profit_factor) }}</span>
          <span>{{ fmt(item.expectancy) }}</span>
          <span>{{ fmt(item.max_drawdown_percent) }}</span>
          <span>{{ item.trades_count }}</span>
        </div>
      </div>
    </section>

    <section class="chart-grid">
      <div class="research-section">
        <h3>EMA Heatmap</h3>
        <div class="bar-row" v-for="item in (heatmaps?.ema_combinations || []).slice(0, 12)" :key="item.key"><span>{{ item.key }}</span><strong>{{ fmt(item.average_stability_score) }}</strong></div>
      </div>
      <div class="research-section">
        <h3>TP/SL Heatmap</h3>
        <div class="bar-row" v-for="item in (heatmaps?.tp_sl_combinations || []).slice(0, 12)" :key="item.key"><span>{{ item.key }}</span><strong>{{ fmt(item.average_stability_score) }}</strong></div>
      </div>
      <div class="research-section">
        <h3>Risk Heatmap</h3>
        <div class="bar-row" v-for="item in (heatmaps?.risk_combinations || []).slice(0, 12)" :key="item.key"><span>{{ item.key }}</span><strong>{{ fmt(item.average_stability_score) }}</strong></div>
      </div>
    </section>

    <section class="research-section">
      <h3>Run Backtest</h3>
      <div class="research-form">
        <input v-model="form.exchange" placeholder="exchange">
        <input v-model="form.symbol" placeholder="symbol">
        <input v-model="form.timeframe" placeholder="timeframe">
        <input v-model="form.start_date" placeholder="start date">
        <input v-model="form.end_date" placeholder="end date">
        <label><span>Grid search</span><input v-model="form.run_optimization" type="checkbox"></label>
        <button @click="runBacktest">Run</button>
      </div>
    </section>

    <section class="research-section">
      <h3>Backtests</h3>
      <div class="research-table">
        <div class="row row--head"><span>ID</span><span>Symbol</span><span>Trades</span><span>PnL</span><span>PF</span><span>Expectancy</span></div>
        <button class="row row--button" v-for="run in backtests" :key="run.id" @click="loadBacktest(run.id)">
          <span>{{ run.id }}</span><span>{{ run.symbol }}</span><span>{{ run.trades_count }}</span><span>{{ fmt(run.total_pnl) }}</span><span>{{ fmt(run.profit_factor) }}</span><span>{{ fmt(run.expectancy) }}</span>
        </button>
      </div>
    </section>

    <section class="metric-grid" v-if="active">
      <div class="metric"><span>Win rate</span><strong>{{ fmt(active.win_rate) }}%</strong></div>
      <div class="metric"><span>Profit factor</span><strong>{{ fmt(active.profit_factor) }}</strong></div>
      <div class="metric"><span>Expectancy</span><strong>{{ fmt(active.expectancy) }}</strong></div>
      <div class="metric"><span>Sharpe</span><strong>{{ fmt(active.sharpe_ratio) }}</strong></div>
      <div class="metric"><span>Sortino</span><strong>{{ fmt(active.sortino_ratio) }}</strong></div>
      <div class="metric"><span>Recovery</span><strong>{{ fmt(active.recovery_factor) }}</strong></div>
    </section>

    <section class="chart-grid" v-if="active">
      <div class="research-section">
        <h3>Equity Curve</h3>
        <svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline :points="equityPoints" fill="none" stroke="#46cdcf" stroke-width="2"/></svg>
      </div>
      <div class="research-section">
        <h3>Drawdown Curve</h3>
        <svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline :points="drawdownPoints" fill="none" stroke="#ff6b6b" stroke-width="2"/></svg>
      </div>
    </section>

    <section class="chart-grid" v-if="active">
      <div class="research-section">
        <h3>Monthly Returns</h3>
        <div class="bar-row" v-for="(value, month) in active.monthly_returns" :key="month"><span>{{ month }}</span><strong>{{ fmt(value) }}</strong></div>
      </div>
      <div class="research-section">
        <h3>Winning vs Losing Trades</h3>
        <div class="bar-row"><span>Wins</span><strong>{{ wins }}</strong></div>
        <div class="bar-row"><span>Losses</span><strong>{{ losses }}</strong></div>
      </div>
    </section>

    <section class="research-section" v-if="active">
      <h3>Monte Carlo</h3>
      <div class="metric-grid">
        <div class="metric"><span>Worst DD</span><strong>{{ fmt(active.monte_carlo?.worst_drawdown) }}</strong></div>
        <div class="metric"><span>Median equity</span><strong>{{ fmt(active.monte_carlo?.median_equity) }}</strong></div>
        <div class="metric"><span>Ruin probability</span><strong>{{ fmt(active.monte_carlo?.probability_of_ruin) }}%</strong></div>
        <div class="metric"><span>Best equity</span><strong>{{ fmt(active.monte_carlo?.best_equity) }}</strong></div>
      </div>
    </section>

    <section class="research-section" v-if="active">
      <h3>Walk Forward</h3>
      <div class="bar-row"><span>Train PF</span><strong>{{ fmt(active.walk_forward?.train_profit_factor) }}</strong></div>
      <div class="bar-row"><span>Test PF</span><strong>{{ fmt(active.walk_forward?.test_profit_factor) }}</strong></div>
      <div class="bar-row"><span>Overfitted</span><strong>{{ active.walk_forward?.is_overfitted ? 'yes' : 'no' }}</strong></div>
    </section>

    <section class="research-section" v-if="active">
      <h3>Best Parameter Sets</h3>
      <div class="research-table">
        <div class="row row--head"><span>EMA</span><span>RSI</span><span>TP</span><span>SL</span><span>PF</span><span>Expectancy</span></div>
        <div class="row" v-for="(item, index) in active.optimization?.best_parameter_sets || []" :key="index">
          <span>{{ item.config.ema_fast }}/{{ item.config.ema_slow }}</span><span>{{ item.config.rsi_long_max }}</span><span>{{ item.config.take_profit_percent }}</span><span>{{ item.config.stop_loss_percent }}</span><span>{{ fmt(item.metrics.profit_factor) }}</span><span>{{ fmt(item.metrics.expectancy) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.research-page{display:grid;gap:16px;color:#d7deef}
.research-heading,.research-section{display:grid;gap:12px}
.research-eyebrow{color:#ffb86b;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700}
.research-section,.metric{padding:16px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.research-form,.metric-grid,.chart-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
input,button{min-height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(8,12,22,.7);color:#fff;padding:0 10px}
button{cursor:pointer;background:#ffb86b;color:#161b25;font-weight:700}
label{display:grid;gap:6px;color:#90a0be;font-size:12px}
input[type="checkbox"]{justify-self:start;min-height:20px}
.metric{display:grid;gap:6px}.metric span,.row--head{color:#90a0be;font-size:12px;text-transform:uppercase}.metric strong{font-size:22px;color:#fff}
.chart{width:100%;height:220px;border-radius:8px;background:rgba(8,12,22,.7)}
.research-table{display:grid;gap:8px;overflow-x:auto}.row{min-width:760px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;align-items:center;padding:10px;border-radius:8px;background:rgba(255,255,255,.04);color:#d7deef;text-align:left}.row--button{border:0}
.candidate-row{min-width:1100px;display:grid;grid-template-columns:.7fr 1.4fr .8fr .8fr .6fr .6fr .8fr .6fr .6fr;gap:10px;align-items:center;padding:10px;border-radius:8px;background:rgba(255,255,255,.04)}
.bar-row{display:flex;justify-content:space-between;gap:10px;padding:10px;border-radius:8px;background:rgba(255,255,255,.04)}
</style>
