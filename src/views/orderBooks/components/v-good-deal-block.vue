<script>
  import {mapState} from "vuex";
  import VCryptocoinIcon from "@/components/_general/v-cryptocoin-icon.vue";

  export default {
    components: {VCryptocoinIcon},
    data() {
      return {
        search: "",
        statusFilter: "all",
        sortBy: "expected_profit_usdt",
        visibleCount: 12,
        isCollapsed: false,
      }
    },
    computed: {
      ...mapState({
        arbitrage_opportunity_list: state => state.arbitrage.OPPORTUNITIES
      }),
      filteredOpportunities() {
        const normalizedSearch = this.search.trim().toLowerCase();

        const list = this.arbitrage_opportunity_list.filter((opportunity) => {
          const matchesSearch = !normalizedSearch || [
            opportunity.pair,
            opportunity.symbol,
            opportunity.buy_exchange,
            opportunity.sell_exchange,
            opportunity.buyFrom,
            opportunity.sellTo,
          ].some(value => value?.toLowerCase().includes(normalizedSearch));

          const matchesStatus = this.statusFilter === "all" || opportunity.status === this.statusFilter;

          return matchesSearch && matchesStatus;
        });

        const sorters = {
          profitTotal: (left, right) => (right.profitTotal || 0) - (left.profitTotal || 0),
          expected_profit_usdt: (left, right) => right.expected_profit_usdt - left.expected_profit_usdt,
          roi: (left, right) => (right.net_profit_percent || right.roi || 0) - (left.net_profit_percent || left.roi || 0),
          spread: (left, right) => (right.gross_spread_percent || right.spread || 0) - (left.gross_spread_percent || left.spread || 0),
          tradeAmount: (left, right) => (right.amount || right.tradeAmount || 0) - (left.amount || left.tradeAmount || 0),
        };

        return [...list]
            .sort(sorters[this.sortBy] || sorters.expected_profit_usdt)
            .slice(0, this.visibleCount);
      },
      summary() {
        return this.arbitrage_opportunity_list.reduce((acc, opportunity) => {
          acc.total += 1;
          if (acc[opportunity.status] === undefined) acc[opportunity.status] = 0;
          acc[opportunity.status] += 1;
          return acc;
        }, {
          total: 0,
          executable: 0,
          created: 0,
          paper_executed: 0,
          balance_limited: 0,
          inactive: 0,
        });
      },
    },
    methods: {
      formatMoney(value) {
        const number = Number(value || 0);
        return number.toFixed(number >= 100 ? 2 : 4);
      },
      formatAmount(value) {
        const number = Number(value || 0);
        return number.toFixed(number >= 1 ? 4 : 8);
      },
      statusLabel(status) {
        if (status === "executable") return "Ready";
        if (status === "created") return "Signal";
        if (status === "paper_executed") return "Paper";
        if (status === "balance_limited") return "Limited";
        if (status === "inactive") return "Inactive";
        return "Unknown";
      },
      statusClass(status) {
        if (status === "executable") return "bg-success-50";
        if (status === "created" || status === "paper_executed") return "bg-success-50";
        if (status === "balance_limited") return "bg-notification-warning";
        return "bg-pallete-error-Error-20";
      },
      toggleCollapsed() {
        this.isCollapsed = !this.isCollapsed;
      },
    }
  }
</script>

<template>
  <div class="opportunities-panel p-fixed z-index-max d-grid g-gap-_5 overflow-auto" style="right: 15px; top: 9vh; max-height: 91vh;">
    <button class="opportunities-toggle bg-mode-3 box-shadow-slim b-radius-6 c-mode-1" v-if="isCollapsed" @click="toggleCollapsed">
      <i class="fa-solid fa-chart-line"></i>
      <span>Opportunities</span>
      <strong>{{ summary.total }}</strong>
    </button>

    <template v-else>
    <div class="bg-mode-3 padding-1 c-mode-1 box-shadow-slim b-radius-6 d-grid g-gap-_5">
      <div class="d-grid g-gap-_3">
        <div class="d-flex a-items-center j-content-space-between g-gap-_5">
          <span class="f-size-14 f-weight-bold c-mode-3">Opportunities</span>
          <div class="d-flex a-items-center g-gap-_3">
            <span class="c-mode-2 f-size-12">{{ summary.total }} total</span>
            <button class="panel-icon-button" title="Hide opportunities" @click="toggleCollapsed">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
        <div class="d-grid g-gap-_3">
          <input v-model="search" class="filter-input" placeholder="Search pair or exchange">
          <div class="d-grid grid-template-column-2fr g-gap-_3">
            <select v-model="statusFilter" class="filter-input">
              <option value="all">All statuses</option>
              <option value="executable">Ready</option>
              <option value="balance_limited">Balance limited</option>
              <option value="inactive">Inactive pair</option>
            </select>
            <select v-model="sortBy" class="filter-input">
              <option value="profitTotal">Sort by profit</option>
              <option value="expected_profit_usdt">Sort by backend profit</option>
              <option value="roi">Sort by ROI</option>
              <option value="spread">Sort by spread</option>
              <option value="tradeAmount">Sort by size</option>
            </select>
          </div>
        </div>
      </div>

      <div class="d-grid grid-template-column-3fr g-gap-_3">
        <div class="summary-pill">
          <span class="f-size-10 c-mode-2">Ready</span>
          <span class="f-weight-bold">{{ summary.created + summary.paper_executed + summary.executable }}</span>
        </div>
        <div class="summary-pill">
          <span class="f-size-10 c-mode-2">Limited</span>
          <span class="f-weight-bold">{{ summary.balance_limited }}</span>
        </div>
        <div class="summary-pill">
          <span class="f-size-10 c-mode-2">Inactive</span>
          <span class="f-weight-bold">{{ summary.inactive }}</span>
        </div>
      </div>
    </div>

    <div
        class="bg-mode-3 padding-1 c-mode-1 box-shadow-slim b-radius-6 animation-from-bottom d-grid g-gap-_3"
        v-for="(arbitrage_opportunity, index) in filteredOpportunities"
        :key="`${arbitrage_opportunity.pair}-${arbitrage_opportunity.buyFrom}-${arbitrage_opportunity.sellTo}-${index}`"
    >
      <div class="d-flex a-items-center j-content-space-between g-gap-_5">
        <span class="f-size-14 f-weight-bold c-mode-3">{{ arbitrage_opportunity.symbol || arbitrage_opportunity.pair }}</span>
        <span :class="`padding-x-8p padding-y-10p b-radius-6 f-size-10 c-mode-1 f-weight-bold ${statusClass(arbitrage_opportunity.status)}`">
          {{ statusLabel(arbitrage_opportunity.status) }}
        </span>
      </div>

      <div class="d-grid g-gap-_2">
        <div class="deal-side">
          <span class="c-mode-2 f-size-12">Buy</span>
          <div class="d-flex a-items-center g-gap-_3">
            <v-cryptocoin-icon size="18" :path="arbitrage_opportunity.buy_exchange_icon_path" v-if="arbitrage_opportunity.buy_exchange_icon_path"/>
            <span class="f-weight-bold">{{ arbitrage_opportunity.buy_exchange || arbitrage_opportunity.buyFrom }}</span>
          </div>
          <span class="f-size-12">$ {{ formatMoney(arbitrage_opportunity.buy_price || arbitrage_opportunity.buyPrice) }}</span>
        </div>

        <div class="deal-side">
          <span class="c-mode-2 f-size-12">Sell</span>
          <div class="d-flex a-items-center g-gap-_3">
            <v-cryptocoin-icon size="18" :path="arbitrage_opportunity.sell_exchange_icon_path" v-if="arbitrage_opportunity.sell_exchange_icon_path"/>
            <span class="f-weight-bold">{{ arbitrage_opportunity.sell_exchange || arbitrage_opportunity.sellTo }}</span>
          </div>
          <span class="f-size-12">$ {{ formatMoney(arbitrage_opportunity.sell_price || arbitrage_opportunity.sellPrice) }}</span>
        </div>
      </div>

      <div class="d-grid g-gap-_2">
        <span class="metric-row">
          <span class="c-mode-2">Trade size</span>
          <span class="f-weight-bold">{{ formatAmount(arbitrage_opportunity.amount || arbitrage_opportunity.tradeAmount) }}</span>
        </span>
        <span class="metric-row">
          <span class="c-mode-2">Market size</span>
          <span>{{ formatAmount(arbitrage_opportunity.marketTradeAmount) }}</span>
        </span>
        <span class="metric-row">
          <span class="c-mode-2">Total cost</span>
          <span class="f-weight-bold c-pallete-error-Error-50">$ {{ formatMoney(arbitrage_opportunity.total_cost_usdt || arbitrage_opportunity.totalPrice) }}</span>
        </span>
        <span class="metric-row">
          <span class="c-mode-2">Net profit</span>
          <span class="f-weight-bold c-success-50">$ {{ formatMoney(arbitrage_opportunity.expected_profit_usdt || arbitrage_opportunity.profitTotal) }}</span>
        </span>
        <span class="metric-row">
          <span class="c-mode-2">ROI</span>
          <span class="f-weight-bold">% {{ formatMoney(arbitrage_opportunity.net_profit_percent || arbitrage_opportunity.roi) }}</span>
        </span>
        <span class="metric-row">
          <span class="c-mode-2">Spread</span>
          <span>% {{ formatMoney(arbitrage_opportunity.gross_spread_percent || arbitrage_opportunity.spread) }}</span>
        </span>
      </div>

      <div class="opportunity-note">
        <span v-if="arbitrage_opportunity.status === 'balance_limited'">
          Trade size is capped by available balance or max purchase limit.
        </span>
        <span v-else-if="arbitrage_opportunity.status === 'inactive'">
          One of the trading pair configs is inactive, so this is informational only.
        </span>
        <span v-else>
          Balances and pair config currently allow execution at the shown size.
        </span>
      </div>

      <div class="d-grid g-gap-_2 f-size-12">
        <span class="metric-row">
          <span class="c-mode-2">Buy quote balance</span>
          <span>{{ arbitrage_opportunity.quoteBalance ?? '-' }}</span>
        </span>
        <span class="metric-row">
          <span class="c-mode-2">Sell base balance</span>
          <span>{{ arbitrage_opportunity.baseBalance ?? '-' }}</span>
        </span>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.opportunities-panel{
  width: min(360px, calc(100vw - 30px));
}
.opportunities-toggle{
  min-height: 42px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255,255,255,.10);
  padding: 0 12px;
  cursor: pointer;
}
.opportunities-toggle strong{
  min-width: 24px;
  min-height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(255,255,255,.10);
}
.panel-icon-button{
  width: 30px;
  height: 30px;
  border: 1px solid rgba(255,255,255,.10);
  border-radius: 8px;
  background: rgba(255,255,255,.08);
  color: inherit;
  cursor: pointer;
}
.filter-input{
  width: 100%;
  border: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
}
.summary-pill{
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}
.deal-side{
  display: grid;
  gap: 4px;
  grid-template-columns: .5fr 1fr auto;
  align-items: center;
}
.metric-row{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.opportunity-note{
  font-size: 12px;
  color: var(--c-mode-2, #b9bfd5);
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}
</style>
