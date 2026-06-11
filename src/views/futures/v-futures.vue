<script>
import {mapState} from "vuex";

export default {
  computed: {
    ...mapState({
      metrics: state => state.futures.METRICS,
      equity: state => state.futures.EQUITY,
      positions: state => state.futures.POSITIONS,
      trades: state => state.futures.TRADES,
    }),
    equityPoints() {
      if (!this.equity.length) return "";
      const values = this.equity.map(point => Number(point.equity || 0));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      return values.map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
      }).join(" ");
    },
  },
  mounted() {
    this.$store.dispatch("futures/LOAD");
  },
  methods: {
    fmt(value) {
      const number = Number(value || 0);
      return number.toFixed(Math.abs(number) >= 100 ? 2 : 4);
    },
  },
};
</script>

<template>
  <div class="futures-page">
    <div class="futures-heading">
      <p class="futures-eyebrow margin-0">Research Mode</p>
      <h2 class="c-mode-1 margin-0">Futures Trend Following + Pullback</h2>
    </div>

    <section class="metric-grid">
      <div class="metric"><span>Win rate</span><strong>{{ fmt(metrics?.win_rate) }}%</strong></div>
      <div class="metric"><span>Profit factor</span><strong>{{ fmt(metrics?.profit_factor) }}</strong></div>
      <div class="metric"><span>Total PnL</span><strong>{{ fmt(metrics?.total_pnl) }}</strong></div>
      <div class="metric"><span>Current equity</span><strong>{{ fmt(metrics?.current_equity) }}</strong></div>
      <div class="metric"><span>Total trades</span><strong>{{ metrics?.total_trades || 0 }}</strong></div>
      <div class="metric"><span>Max drawdown</span><strong>{{ fmt(metrics?.max_drawdown) }}</strong></div>
    </section>

    <section class="futures-section">
      <h3>Equity Curve</h3>
      <svg class="equity-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline v-if="equityPoints" :points="equityPoints" fill="none" stroke="#46cdcf" stroke-width="2"/>
      </svg>
    </section>

    <section class="futures-section">
      <h3>Open Positions</h3>
      <div class="futures-table">
        <div class="row row--head"><span>Symbol</span><span>Side</span><span>Entry</span><span>TP</span><span>SL</span><span>Liq</span><span>Margin</span><span>PnL</span></div>
        <div class="row" v-for="position in positions.filter(item => item.status === 'open')" :key="position.id">
          <span>{{ position.symbol }}</span><span>{{ position.side }}</span><span>{{ fmt(position.entry_price) }}</span><span>{{ fmt(position.take_profit_price) }}</span><span>{{ fmt(position.stop_loss_price) }}</span><span>{{ fmt(position.liquidation_price) }}</span><span>{{ fmt(position.margin) }}</span><span>{{ fmt(position.unrealized_pnl) }}</span>
        </div>
      </div>
    </section>

    <section class="futures-section">
      <h3>Trade History</h3>
      <div class="futures-table">
        <div class="row row--head"><span>Symbol</span><span>Side</span><span>Entry</span><span>Exit</span><span>Reason</span><span>Fee</span><span>PnL</span><span>Closed</span></div>
        <div class="row" v-for="trade in trades" :key="trade.id">
          <span>{{ trade.symbol }}</span><span>{{ trade.side }}</span><span>{{ fmt(trade.entry_price) }}</span><span>{{ fmt(trade.exit_price) }}</span><span>{{ trade.exit_reason }}</span><span>{{ fmt(trade.fee) }}</span><span>{{ fmt(trade.realized_pnl) }}</span><span>{{ trade.closed_at }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.futures-page{
  display: grid;
  gap: 16px;
  color: #d7deef;
}
.futures-heading,
.futures-section{
  display: grid;
  gap: 12px;
}
.futures-eyebrow{
  color: #ffb86b;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: 12px;
  font-weight: 700;
}
.metric-grid{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
.metric,
.futures-section{
  padding: 16px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
}
.metric{
  display: grid;
  gap: 6px;
}
.metric span,
.row--head{
  color: #90a0be;
  font-size: 12px;
  text-transform: uppercase;
}
.metric strong{
  color: #fff;
  font-size: 22px;
}
.equity-chart{
  width: 100%;
  height: 220px;
  border-radius: 8px;
  background: rgba(8,12,22,.7);
}
.futures-table{
  display: grid;
  gap: 8px;
  overflow-x: auto;
}
.row{
  min-width: 940px;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
}
</style>
