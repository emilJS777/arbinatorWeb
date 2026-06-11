<script>
import VCryptocoinIcon from "@/components/_general/v-cryptocoin-icon.vue";
import VButtonStandard from "@/components/_general/v-button-standard.vue";
import VTradingChartBlock from "@/views/tradingPairs/components/v-trading-chart-block.vue";
import {mapState} from "vuex";
import VOrderBookTable from "@/views/orderBooks/components/v-order-book-table.vue";
import VBlockLoader from "@/components/_general/v-block-loader.vue";
import { getResponseData, isResponseSuccess } from "@/store/request.js";

export default {
  components: {VBlockLoader, VOrderBookTable, VTradingChartBlock, VButtonStandard, VCryptocoinIcon},
  props: ['tradingPair'],
  computed: {
    ...mapState({
      orderBooks: state => state.orderBooks.ORDER_BOOKS
    }),
    baseSymbol() {
      return this.tradingPair.pair.split('/')[0]
    },
    quoteSymbol() {
      return this.tradingPair.pair.split('/')[1]
    },
  },
  data(){
    return{
      tradeData: null
    }
  },
  mounted() {
    this.getTrades()
  },
  methods: {
    formatBalance(value){
      if(value === null || value === undefined || value === '') return '-';
      const number = Number(value);
      if(!Number.isFinite(number)) return value;
      return number >= 1 ? number.toFixed(4) : number.toFixed(8);
    },
    async getTrades(){
      this.$store.dispatch("trades/GET", `?trading_pair_id=${this.tradingPair.id}`).then(data => {
        if(isResponseSuccess(data)){
          this.tradeData = getResponseData(data)?.obj;
        }
      })
    }
  }

}
</script>

<template>
  <div class="pair-card d-grid g-gap-1 a-items-flex-start">
    <div class="d-flex a-items-center j-content-space-between h-max-content pair-card__top">
      <div class="d-flex a-items-center g-gap-_5 pair-card__exchange">
        <v-cryptocoin-icon size="22" :path="tradingPair.exchange.icon_path"/>
        <span class="c-mode-1 f-weight-bold">{{ tradingPair.exchange.title }}</span>
      </div>

      <div class="d-flex a-items-center g-gap-_5 pair-card__pair">
        <div class="d-flex pair-card__coins">
          <v-cryptocoin-icon :symbol="baseSymbol" size="20" style="margin-right: -7px; z-index: 1"/>
          <v-cryptocoin-icon :symbol="quoteSymbol" size="20"/>
        </div>
        <span class="f-weight-bold c-mode-1 f-size-14">{{tradingPair.pair}}</span>
      </div>
    </div>

    <div class="pair-card__section d-flex j-content-space-between a-items-center g-gap-_3">
      <div class="pair-balance-card d-grid g-gap-_3">
        <span class="pair-balance-card__title">{{ baseSymbol }} balance</span>
        <div class="d-flex a-items-center g-gap-_3">
          <v-cryptocoin-icon :symbol="baseSymbol" size="16"/>
          <span class="f-weight-bold c-mode-3 f-size-10">Free: {{ formatBalance(tradingPair.free_base) }}</span>
        </div>
        <div class="d-flex a-items-center g-gap-_3">
          <v-cryptocoin-icon :symbol="baseSymbol" size="16"/>
          <span class="f-weight-bold c-mode-3 f-size-10">Used: {{ formatBalance(tradingPair.used_base) }}</span>
        </div>
        <div class="d-flex a-items-center g-gap-_3">
          <v-cryptocoin-icon :symbol="baseSymbol" size="16"/>
          <span class="f-weight-bold c-mode-3 f-size-10">Total: {{ formatBalance(tradingPair.total_base) }}</span>
        </div>
      </div>

      <div class="pair-balance-card d-grid g-gap-_3">
        <span class="pair-balance-card__title">{{ quoteSymbol }} balance</span>
        <div class="d-flex a-items-center g-gap-_3">
          <v-cryptocoin-icon :symbol="quoteSymbol" size="16"/>
          <span class="f-weight-bold c-mode-3 f-size-10">Free: {{ formatBalance(tradingPair.free_quote) }}</span>
        </div>
        <div class="d-flex a-items-center g-gap-_3">
          <v-cryptocoin-icon :symbol="quoteSymbol" size="16"/>
          <span class="f-weight-bold c-mode-3 f-size-10">Used: {{ formatBalance(tradingPair.used_quote) }}</span>
        </div>
        <div class="d-flex a-items-center g-gap-_3">
          <v-cryptocoin-icon :symbol="quoteSymbol" size="16"/>
          <span class="f-weight-bold c-mode-3 f-size-10">Total: {{ formatBalance(tradingPair.total_quote) }}</span>
        </div>
      </div>
    </div>

    <div class="pair-card__section d-grid g-gap-_5 a-items-center">
      <div class="pair-metric-row">
        <span class="pair-metric-row__label">Order depth</span>
        <span class="c-mode-1 f-size-12 f-weight-bold">{{tradingPair.order_limit}}</span>
      </div>
      <div class="pair-metric-row">
        <span class="pair-metric-row__label">Max purchase price</span>
        <span class="c-mode-1 f-size-12 f-weight-bold">{{formatBalance(tradingPair.max_purchase_price)}}</span>
      </div>
    </div>

    <div class="pair-card__section d-grid g-gap-_5 a-items-center d-grid grid-template-column-2fr g-gap-1 a-items-center">
      <div class="d-flex g-gap-_5 a-items-center pair-card__toolbar">
        <span class="pair-card__icon-btn bg-blue" @click="this.$emit('edit', tradingPair)"><i class="fa fa-pen"></i></span>
        <span class="pair-card__icon-btn bg-pallete-error-Error-20" @click="this.$emit('delete', tradingPair)"><i class="fa fa-trash"></i></span>
        <span v-if="tradingPair.enabled" class="pair-status pair-status--active">Active</span>
        <span v-else class="pair-status pair-status--inactive">Inactive</span>
      </div>

      <div class="d-grid grid-template-column-2fr g-gap-_5 pair-card__actions">
        <v-button-standard label="Buy" @click="this.$emit('buy', tradingPair)" class="bg-success-50 c-mode-1"/>
        <v-button-standard label="Sell" @click="this.$emit('sell', tradingPair)" class="bg-pallete-error-Error-20 c-mode-1"/>
      </div>
    </div>


    <div>
      <v-trading-chart-block v-if="this.tradeData" :trades="this.tradeData" />
    </div>

    <div class="d-grid grid-template-column-2fr g-gap-_5 pair-card__section" v-if="orderBooks[tradingPair.exchange.title]?.[tradingPair.pair]">
      <v-order-book-table :fontSize="10" type="purchases" v-if="orderBooks[tradingPair.exchange.title]?.[tradingPair.pair]" :order-book="orderBooks[tradingPair.exchange.title][tradingPair.pair]"/>
      <v-order-book-table :fontSize="10" type="sales" v-if="orderBooks[tradingPair.exchange.title]?.[tradingPair.pair]" :order-book="orderBooks[tradingPair.exchange.title][tradingPair.pair]"/>
    </div>
    <div class="d-flex a-items-center j-content-center g-gap-_5 pair-card__section" v-else style="height: 400px;">
      <v-block-loader/>
    </div>
  </div>
</template>

<style scoped>
.pair-card{
  padding: 20px;
  border-radius: 26px;
  background:
      linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03)),
      rgba(16, 22, 36, 0.84);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(16px);
}
.pair-card__top{
  gap: 12px;
}
.pair-card__exchange,
.pair-card__pair{
  min-width: 0;
}
.pair-card__section{
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 14px;
}
.pair-balance-card{
  flex: 1;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.04);
}
.pair-balance-card__title{
  color: #f7fbff;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.pair-metric-row{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pair-metric-row__label{
  color: #90a0be;
  font-weight: 600;
}
.pair-card__icon-btn{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  cursor: pointer;
  color: #fff;
}
.pair-status{
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.pair-status--active{
  background: rgba(61, 204, 127, 0.18);
  color: #beffd9;
}
.pair-status--inactive{
  background: rgba(255, 107, 107, 0.16);
  color: #ffd0d0;
}
@media (max-width: 820px){
  .pair-card{
    padding: 16px;
  }
  .pair-card__top,
  .pair-card__section{
    grid-template-columns: 1fr;
  }
}
</style>
