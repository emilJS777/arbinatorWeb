<script>
import {mapState} from "vuex";
import { getResponseMessage, isResponseSuccess } from "@/store/request.js";

export default {
  computed: {
    ...mapState({
      config: state => state.arbitrage.CONFIG,
      opportunities: state => state.arbitrage.OPPORTUNITIES,
      signals: state => state.arbitrage.SIGNALS,
    }),
  },
  data() {
    return {
      form: null,
      symbolsText: "",
      exchangesText: "",
    };
  },
  mounted() {
    this.load();
    this.emitter.on("arbitrage.opportunity.created", payload => {
      this.$store.commit("arbitrage/UPSERT_OPPORTUNITY", payload.data || payload);
    });
    this.emitter.on("arbitrage.signal.created", payload => {
      this.$store.commit("arbitrage/UPSERT_SIGNAL", payload.data || payload);
    });
  },
  watch: {
    config: {
      immediate: true,
      handler(value) {
        if (!value || this.form) return;
        this.form = JSON.parse(JSON.stringify(value));
        this.symbolsText = (value.symbols_allowlist || []).join(", ");
        this.exchangesText = (value.exchanges_allowlist || []).join(", ");
      },
    },
  },
  methods: {
    load() {
      this.$store.dispatch("arbitrage/LOAD");
    },
    payload() {
      return {
        ...this.form,
        symbols_allowlist: this.symbolsText.split(",").map(item => item.trim()).filter(Boolean),
        exchanges_allowlist: this.exchangesText.split(",").map(item => item.trim()).filter(Boolean),
      };
    },
    saveConfig() {
      this.emitter.emit("loader", true);
      this.$store.dispatch("arbitrage/PATCH_CONFIG", this.payload()).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Arbitrage config saved" : getResponseMessage(res),
        });
        this.form = null;
        this.load();
      }).finally(() => this.emitter.emit("loader", false));
    },
    runOnce() {
      this.emitter.emit("loader", true);
      this.$store.dispatch("arbitrage/RUN_ONCE").then(res => {
        const count = res?.data?.obj?.opportunities?.length || 0;
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? `Run once found ${count} opportunities` : getResponseMessage(res),
        });
        this.load();
      }).finally(() => this.emitter.emit("loader", false));
    },
    fmt(value) {
      const number = Number(value || 0);
      return number.toFixed(Math.abs(number) >= 100 ? 2 : 4);
    },
  },
};
</script>

<template>
  <div class="arb-page">
    <div class="arb-heading">
      <p class="arb-eyebrow margin-0">Backend Strategy</p>
      <h2 class="c-mode-1 margin-0">Arbitrage</h2>
    </div>

    <section class="arb-section" v-if="form">
      <div class="arb-section__head">
        <h3>Arbitrage Config</h3>
        <button @click="runOnce">Run Once</button>
      </div>
      <div class="arb-form">
        <label><span>Enabled</span><input v-model="form.enabled" type="checkbox"></label>
        <label><span>Paper execute</span><input v-model="form.paper_execute_enabled" type="checkbox"></label>
        <label><span>Symbols</span><input v-model="symbolsText" placeholder="BTC/USDT, ETH/USDT"></label>
        <label><span>Exchanges</span><input v-model="exchangesText" placeholder="binance, bybit"></label>
        <label><span>Min spread %</span><input v-model.number="form.min_spread_percent" type="number"></label>
        <label><span>Min net profit %</span><input v-model.number="form.min_net_profit_percent" type="number"></label>
        <label><span>Min profit USDT</span><input v-model.number="form.min_profit_usdt" type="number"></label>
        <label><span>Max margin USDT</span><input v-model.number="form.max_order_margin_usdt" type="number"></label>
        <label><span>Max leverage</span><input v-model.number="form.max_leverage" type="number"></label>
        <label><span>Fee buffer %</span><input v-model.number="form.taker_fee_buffer_percent" type="number"></label>
        <label><span>Slippage buffer %</span><input v-model.number="form.slippage_buffer_percent" type="number"></label>
        <label><span>Cooldown seconds</span><input v-model.number="form.cooldown_seconds_per_symbol" type="number"></label>
      </div>
      <button class="arb-save" @click="saveConfig">Save Config</button>
    </section>

    <section class="arb-section">
      <h3>Opportunities</h3>
      <div class="arb-table">
        <div class="arb-row arb-row--head">
          <span>Symbol</span><span>Buy</span><span>Sell</span><span>Buy price</span><span>Sell price</span><span>Gross %</span><span>Net %</span><span>Profit</span><span>Status</span>
        </div>
        <div class="arb-row" v-for="item in opportunities" :key="item.id">
          <span>{{ item.symbol }}</span>
          <span>{{ item.buy_exchange }}</span>
          <span>{{ item.sell_exchange }}</span>
          <span>{{ fmt(item.buy_price) }}</span>
          <span>{{ fmt(item.sell_price) }}</span>
          <span>{{ fmt(item.gross_spread_percent) }}</span>
          <span>{{ fmt(item.net_profit_percent) }}</span>
          <span>{{ fmt(item.expected_profit_usdt) }}</span>
          <span>{{ item.status }}</span>
        </div>
      </div>
    </section>

    <section class="arb-section">
      <h3>Signals</h3>
      <div class="arb-table">
        <div class="arb-row arb-row--signals">
          <span>ID</span><span>Symbol</span><span>Buy</span><span>Sell</span><span>Net %</span><span>Expected</span><span>Status</span>
        </div>
        <div class="arb-row arb-row--signals" v-for="signal in signals" :key="signal.id">
          <span>{{ signal.id }}</span>
          <span>{{ signal.symbol }}</span>
          <span>{{ signal.buy_exchange }}</span>
          <span>{{ signal.sell_exchange }}</span>
          <span>{{ fmt(signal.net_profit_percent) }}</span>
          <span>{{ fmt(signal.expected_profit_usdt) }}</span>
          <span>{{ signal.status }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.arb-page{
  display: grid;
  gap: 16px;
  color: #d7deef;
}
.arb-heading,
.arb-section{
  display: grid;
  gap: 12px;
}
.arb-eyebrow{
  color: #ffb86b;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: 12px;
  font-weight: 700;
}
.arb-section{
  padding: 16px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
}
.arb-section h3{
  margin: 0;
  color: #fff;
}
.arb-section__head{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.arb-form{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
input[type="checkbox"]{
  justify-self: start;
  min-height: 20px;
}
button{
  cursor: pointer;
  background: #ffb86b;
  color: #161b25;
  font-weight: 700;
}
.arb-save{
  justify-self: start;
}
.arb-table{
  display: grid;
  gap: 8px;
  overflow-x: auto;
}
.arb-row{
  min-width: 960px;
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr .9fr .9fr .8fr .8fr .8fr .8fr;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
}
.arb-row--signals{
  grid-template-columns: .5fr 1.2fr 1fr 1fr .8fr .8fr .8fr;
}
.arb-row--head,
.arb-row--signals:first-child{
  color: #90a0be;
  font-size: 12px;
  text-transform: uppercase;
}
</style>
