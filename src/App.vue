<script>
import VToster from "@/components/_general/v-toster.vue";
import VLoader from "@/components/_general/v-loader.vue";
import {mapState} from "vuex";
import VMessageModal from "@/components/_general/v-message-modal.vue";
import VAlertBlock from "@/components/_general/v-alert-block.vue";
import VNavMenu from "@/components/home/v-nav-menu.vue";
import VGoodDealBlock from "@/views/orderBooks/components/v-good-deal-block.vue";

export default {
  components: {VGoodDealBlock, VNavMenu, VAlertBlock, VMessageModal, VLoader, VToster},
  data(){
    return{
      toster_msg: '',
      toster_success: null,
      loader: false,
      messageModal: false,
      alert_msg: false,
      alert_title: false,
    }
  },
  computed: {
    ...mapState({
      isSocketConnected: state => state.socket.IS_CONNECTED,
      tradingPairs: state => state.tradingPairs.TRADING_PAIRS,
      opportunities: state => state.arbitrage.OPPORTUNITIES,
    }),
  },
  async mounted() {
    this.onMount()
    this.getTradingPairsData()
    this.$store.dispatch("arbitrage/LOAD")
    this.$connectWebSocket();
    // this.sockets.subscribe('order_book', (book) => {
    //   console.log(book)
    // })
  },

  methods: {
    getTradingPairsData(){
      this.$store.commit("tradingPairs/SET_TRADING_PAIRS", null)
      this.$store.dispatch("tradingPairs/GET", ``).then(res=>{
        if(res.data.success)
          this.$store.commit("tradingPairs/SET_TRADING_PAIRS", res.data.obj)
      })
    },
    async onMount(){
      // ORDER BOOK EMIT
      this.emitter.on('order_book', payload => {
        console.log('order book', payload)
        this.$store.commit('orderBooks/SET_ORDER_BOOKS', payload)
      })

      // BALANCE EMIT
      this.emitter.on('balance', payload => {
        this.$store.commit('tradingPairs/SET_BALANCES', payload.data)
      })

      // ACCOUNT ACTIVE ORDERS EMIT
      this.emitter.on('account_active_orders', payload => {
        this.$store.commit('accountOrders/SET_ACCOUNT_ACTIVE_ORDERS', payload)
      })

      this.emitter.on('exchange_status', payload => {
        if(payload?.status === 'unavailable') {
          this.toster_msg = `${payload.exchange} ${payload.scope}: ${payload.message}`
          this.toster_success = false
        }
        if(payload?.status === 'available') {
          this.toster_msg = `${payload.exchange} ${payload.scope}: recovered`
          this.toster_success = true
        }
      })

      this.emitter.on('socket_error', payload => {
        this.toster_msg = payload?.msg || 'WebSocket error'
        this.toster_success = false
      })

      this.emitter.on('arbitrage.opportunity.created', payload => {
        this.$store.commit('arbitrage/UPSERT_OPPORTUNITY', payload.data)
      })

      this.emitter.on('arbitrage.signal.created', payload => {
        this.$store.commit('arbitrage/UPSERT_SIGNAL', payload.data)
      })

      this.emitter.on('arbitrage.signal.rejected', payload => {
        this.toster_msg = payload?.data?.reason || 'Arbitrage signal rejected'
        this.toster_success = false
        this.$store.dispatch("arbitrage/LOAD")
      })

      this.emitter.on('arbitrage.paper.executed', payload => {
        this.toster_msg = `Arbitrage paper executed: ${payload?.data?.signal?.symbol || ''}`
        this.toster_success = true
        this.$store.dispatch("arbitrage/LOAD")
        this.$store.dispatch("paperTrading/LOAD")
      })

      // SET DEFAULT LANG
      if(!localStorage.getItem('lang')) {
        localStorage.setItem('lang', 'en');
      }

      // TOSTER EMIT
      this.emitter.on('toster', payload => {
        this.toster_msg = payload.msg;
        this.toster_success = payload.success;
      })

      // LOADER ETMI
      this.emitter.on('loader', bool => {
        this.loader = bool;
      })

      // MESSAGE MODAL EMIT
      this.emitter.on('messageModal', messageModal => {
        this.messageModal = messageModal;
      })

      // ALERT MODAL EMIT
      this.emitter.on('onAlert', payload => {
        this.alert_msg = payload.msg;
        this.alert_title = payload.title;
      })
    }
  }
}
</script>

<template>
  <div :class="`light-mode appBlock min-height-100vh app-shell`">
    <div class="app-background"></div>
    <div class="bg-mode-1 min-height-100vh app-shell__content">
      <v-message-modal v-if="this.messageModal" @close="this.messageModal = false" :message="this.messageModal"/>
      <v-toster v-if="this.toster_msg" :msg="this.toster_msg" :success="toster_success" @close="toster_msg='';toster_success=null;"/>
      <v-loader v-if="loader"/>
      <v-alert-block @close="this.alert_title=false;this.alert_msg=false;" v-if="alert_msg" :title="this.alert_title" :msg="alert_msg"/>
      <div class="app-topbar">
        <div class="app-topbar__meta">
          <span class="app-chip">ArbiNator Quant Workspace</span>
          <span :class="`app-chip ${isSocketConnected ? 'app-chip--online' : 'app-chip--offline'}`">
            {{ isSocketConnected ? 'Scanner connected' : 'Scanner reconnecting' }}
          </span>
        </div>
      </div>
      <v-nav-menu class="app-nav-wrap"/>

      <div class="app-hero m-0-auto">
        <div>
          <p class="app-eyebrow margin-0">Trading Research Platform</p>
          <h1 class="app-title margin-0">Monitor markets, paper/live execution, and ML datasets from one calm workspace.</h1>
        </div>
        <div class="app-stats">
          <div class="app-stat-card">
            <span class="app-stat-label">Tracked pairs</span>
            <strong class="app-stat-value">{{ tradingPairs?.length || 0 }}</strong>
          </div>
          <div class="app-stat-card">
            <span class="app-stat-label">Live opportunities</span>
            <strong class="app-stat-value">{{ opportunities?.length || 0 }}</strong>
          </div>
        </div>
      </div>

      <div class="pageBlock app-layout d-flex j-content-center min-height-100vh m-0-auto" style="max-width: 1400px;">
        <v-good-deal-block/>

        <div class="app-main-content w-max">
          <router-view class=""/>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="@/assets/main.css" lang="scss">
</style>

<style scoped>
.app-shell{
  position: relative;
  overflow: hidden;
}
.app-background{
  position: fixed;
  inset: 0;
  background:
      radial-gradient(circle at top left, rgba(124, 58, 237, 0.10), transparent 32%),
      radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 28%),
      radial-gradient(circle at 50% 18%, rgba(6, 182, 212, 0.055), transparent 30%),
      linear-gradient(180deg, #fbfaff 0%, #f8fafc 45%, #ffffff 100%);
  pointer-events: none;
}
.app-background::before,
.app-background::after{
  content: "";
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  filter: blur(34px);
  opacity: .42;
}
.app-background::before{
  left: -120px;
  top: 120px;
  background: rgba(124, 58, 237, .10);
}
.app-background::after{
  right: -120px;
  top: 220px;
  background: rgba(59, 130, 246, .09);
}
.app-shell__content{
  position: relative;
  z-index: 1;
}
.app-topbar{
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 24px 0;
}
.app-topbar__meta{
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.app-chip{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72));
  border: 1px solid rgba(124,58,237,0.13);
  color: #52525b;
  font-size: 12px;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.app-chip--online{
  color: #047857;
  background: linear-gradient(180deg, rgba(236,253,245,.95), rgba(255,255,255,.75));
  border-color: rgba(16, 185, 129, 0.24);
}
.app-chip--offline{
  color: #b45309;
  background: linear-gradient(180deg, rgba(255,251,235,.96), rgba(255,255,255,.75));
  border-color: rgba(245, 158, 11, 0.28);
}
.app-nav-wrap{
  margin-top: 12px;
}
.app-hero{
  max-width: 1400px;
  padding: 28px 24px 0;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, .8fr);
  gap: 20px;
  align-items: end;
}
.app-eyebrow{
  color: #7c3aed;
  text-transform: uppercase;
  letter-spacing: .16em;
  font-size: 12px;
  font-weight: 600;
}
.app-eyebrow::before{
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  box-shadow: 0 0 0 5px rgba(124,58,237,.10);
}
.app-title{
  margin-top: 10px;
  color: #18181b;
  font-family: "Poppins", sans-serif;
  font-size: clamp(30px, 3.5vw, 48px);
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1.05;
  max-width: 920px;
  text-wrap: balance;
}
.app-stats{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.app-stat-card{
  position: relative;
  overflow: hidden;
  padding: 18px;
  border-radius: 18px;
  background:
      linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.78)),
      radial-gradient(circle at top right, rgba(124,58,237,.10), transparent 42%);
  border: 1px solid rgba(124,58,237,0.11);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 50px rgba(68, 64, 60, 0.10);
}
.app-stat-card::before{
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4);
}
.app-stat-label{
  display: block;
  color: #71717a;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.app-stat-value{
  display: block;
  margin-top: 12px;
  color: #18181b;
  font-size: 34px;
  line-height: 1;
}
.app-layout{
  align-items: start;
  gap: 24px;
  padding: 24px;
}
.app-main-content{
  margin-top: 0;
  min-width: 0;
}
@media (max-width: 1180px){
  .app-hero{
    grid-template-columns: 1fr;
  }
}
@media (max-width: 900px){
  .app-layout{
    padding: 18px;
  }
  .app-stats{
    grid-template-columns: 1fr;
  }
}
</style>
