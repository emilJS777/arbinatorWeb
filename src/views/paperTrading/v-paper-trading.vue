<script>
import {mapState} from "vuex";
import { getResponseMessage, isResponseSuccess } from "@/store/request.js";

export default {
  computed: {
    ...mapState({
      signals: state => state.paperTrading.SIGNALS,
      paperOrders: state => state.paperTrading.PAPER_ORDERS,
      paperPositions: state => state.paperTrading.PAPER_POSITIONS,
      riskStatus: state => state.paperTrading.RISK_STATUS,
    }),
  },
  data() {
    return {
      form: {
        exchange: "binance",
        symbol: "BTC/USDT",
        side: "buy",
        entry_price: 100,
        take_profit_price: 101,
        amount: 0.01,
        leverage: 1,
        order_type: "market",
      },
      closePrices: {},
    };
  },
  mounted() {
    this.load();
    this.emitter.on("signal.created", payload => this.$store.commit("paperTrading/UPSERT_SIGNAL", payload.data || payload));
    this.emitter.on("paper_order.created", payload => this.$store.commit("paperTrading/UPSERT_PAPER_ORDER", payload.data || payload));
    this.emitter.on("paper_order.filled", payload => this.$store.commit("paperTrading/UPSERT_PAPER_ORDER", payload.data || payload));
    this.emitter.on("paper_position.opened", payload => this.$store.commit("paperTrading/UPSERT_PAPER_POSITION", payload.data || payload));
    this.emitter.on("paper_position.closed", payload => this.$store.commit("paperTrading/UPSERT_PAPER_POSITION", payload.data || payload));
    this.emitter.on("risk.rejected", payload => {
      this.emitter.emit("toster", {success: false, msg: payload?.data?.reason || "Risk rejected signal"});
      this.load();
    });
  },
  methods: {
    load() {
      this.$store.dispatch("paperTrading/LOAD");
    },
    submitPaperSignal() {
      this.emitter.emit("loader", true);
      this.$store.dispatch("paperTrading/CREATE_PAPER_SIGNAL", this.form).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Paper order filled" : getResponseMessage(res),
        });
        this.load();
      }).finally(() => this.emitter.emit("loader", false));
    },
    closePosition(position) {
      const price = this.closePrices[position.id] || position.entry_price;
      this.emitter.emit("loader", true);
      this.$store.dispatch("paperTrading/CLOSE_POSITION", {id: position.id, body: {price}}).then(res => {
        this.emitter.emit("toster", {
          success: isResponseSuccess(res),
          msg: isResponseSuccess(res) ? "Paper position closed" : getResponseMessage(res),
        });
        this.load();
      }).finally(() => this.emitter.emit("loader", false));
    },
  },
};
</script>

<template>
  <div class="paper-page">
    <div class="paper-heading">
      <p class="paper-eyebrow margin-0">Safe Execution</p>
      <h2 class="c-mode-1 margin-0">Paper Trading</h2>
    </div>

    <section class="paper-section">
      <h3>Risk Status</h3>
      <div class="paper-grid">
        <span>Live trading</span>
        <strong>{{ riskStatus?.live_trading_enabled ? 'enabled' : 'disabled' }}</strong>
        <span>Daily realized PnL</span>
        <strong>{{ riskStatus?.daily_realized_pnl ?? 0 }}</strong>
      </div>
    </section>

    <section class="paper-section">
      <h3>Create Paper Signal</h3>
      <div class="paper-form">
        <input v-model="form.exchange" placeholder="exchange"/>
        <input v-model="form.symbol" placeholder="symbol"/>
        <select v-model="form.side">
          <option value="buy">buy</option>
          <option value="sell">sell</option>
          <option value="long">long</option>
          <option value="short">short</option>
        </select>
        <input v-model.number="form.entry_price" type="number" placeholder="entry price"/>
        <input v-model.number="form.take_profit_price" type="number" placeholder="take profit"/>
        <input v-model.number="form.amount" type="number" placeholder="amount"/>
        <input v-model.number="form.leverage" type="number" placeholder="leverage"/>
        <button @click="submitPaperSignal">Submit</button>
      </div>
    </section>

    <section class="paper-section">
      <h3>Signals</h3>
      <div class="paper-table">
        <div class="paper-row paper-row--head"><span>ID</span><span>Exchange</span><span>Symbol</span><span>Side</span><span>Status</span></div>
        <div class="paper-row" v-for="signal in signals" :key="signal.id">
          <span>{{ signal.id }}</span><span>{{ signal.exchange }}</span><span>{{ signal.symbol }}</span><span>{{ signal.side }}</span><span>{{ signal.status }}</span>
        </div>
      </div>
    </section>

    <section class="paper-section">
      <h3>Paper Orders</h3>
      <div class="paper-table">
        <div class="paper-row paper-row--head"><span>ID</span><span>Symbol</span><span>Side</span><span>Amount</span><span>Status</span></div>
        <div class="paper-row" v-for="order in paperOrders" :key="order.id">
          <span>{{ order.id }}</span><span>{{ order.symbol }}</span><span>{{ order.side }}</span><span>{{ order.filled_amount || order.amount }}</span><span>{{ order.status }}</span>
        </div>
      </div>
    </section>

    <section class="paper-section">
      <h3>Paper Positions</h3>
      <div class="paper-table">
        <div class="paper-row paper-row--head"><span>ID</span><span>Symbol</span><span>Entry</span><span>PnL</span><span>Status</span></div>
        <div class="paper-row paper-row--position" v-for="position in paperPositions" :key="position.id">
          <span>{{ position.id }}</span><span>{{ position.symbol }}</span><span>{{ position.entry_price }}</span><span>{{ position.realized_pnl }}</span><span>{{ position.status }}</span>
          <div v-if="position.status === 'open'" class="paper-close">
            <input v-model.number="closePrices[position.id]" type="number" :placeholder="position.entry_price"/>
            <button @click="closePosition(position)">Close</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.paper-page{
  display: grid;
  gap: 16px;
  color: #d7deef;
}
.paper-heading,
.paper-section{
  display: grid;
  gap: 10px;
}
.paper-eyebrow{
  color: #ffb86b;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: 12px;
  font-weight: 700;
}
.paper-section{
  padding: 16px;
  border-radius: 8px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
}
.paper-section h3{
  margin: 0;
  color: #fff;
}
.paper-grid,
.paper-row{
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  align-items: center;
}
.paper-grid{
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.paper-form{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
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
button{
  cursor: pointer;
  background: #ffb86b;
  color: #161b25;
  font-weight: 700;
}
.paper-table{
  display: grid;
  gap: 8px;
}
.paper-row{
  padding: 10px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
}
.paper-row--head{
  color: #90a0be;
  font-size: 12px;
  text-transform: uppercase;
}
.paper-row--position{
  grid-template-columns: repeat(5, minmax(0, 1fr)) minmax(180px, .8fr);
}
.paper-close{
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
@media (max-width: 820px){
  .paper-row,
  .paper-row--position{
    grid-template-columns: 1fr;
  }
}
</style>
