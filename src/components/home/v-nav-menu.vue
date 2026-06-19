<script>
import toggleMixin from "@/mixins/toggle-mixin.js";
import VConfirmModal from "@/components/_general/v-confirm-modal.vue";

export default {
  components: {VConfirmModal},
  mixins: [toggleMixin],
  data() {
    return {
      navItems: [
        { path: "/", label: "Home", icon: "fa-solid fa-house" },
        { path: "/exchanges", label: "Exchanges", icon: "fa-solid fa-dice-d6" },
        { path: "/tradingPairs", label: "Trading Pairs", icon: "fa-solid fa-money-bill-trend-up" },
        { path: "/accountOrders", label: "Account Orders", icon: "fa-solid fa-store" },
        { path: "/orderBooks", label: "Order Books", icon: "fa-solid fa-book" },
        { path: "/paper-trading", label: "Paper Trading", icon: "fa-solid fa-shield-halved" },
        { path: "/arbitrage", label: "Arbitrage", icon: "fa-solid fa-code-compare" },
        { path: "/futures", label: "Futures", icon: "fa-solid fa-chart-line" },
        { path: "/research", label: "Research", icon: "fa-solid fa-flask" },
        { path: "/orderbook-recovery", label: "OrderBook Recovery", icon: "fa-solid fa-repeat" },
      ],
    }
  },
  mounted() {
    this.menuAnimation()
  },
  methods: {
    menuAnimation(){
      this.setModalName(true)
    },
    logout(){
      localStorage.setItem('access_token', '')
      location.reload();
    }
  }
}
</script>

<template>
  <div class="nav-shell" v-if="modalName">
    <div class="nav-bar animation-from-hidden">
      <div class="nav-brand">
<!--        <div class="nav-brand__badge">A</div>-->
        <div>
          <span class="nav-brand__title">Arbi<span>Nator</span></span>
          <span class="nav-brand__subtitle">Quant dashboard</span>
        </div>
      </div>

      <div class="nav-links">
        <button
            v-for="item in navItems"
            :key="item.path"
            :class="`nav-link ${this.$route.path === item.path ? 'nav-link--active' : ''}`"
            @click="this.$router.push(item.path); this.menuAnimation()"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div class="nav-actions">
        <button class="nav-logout" @click="this.setModalName('logoutConfirm')">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  </div>

  <v-confirm-modal title="Logout" msg="Are you sure you want to log out?" @skip="this.menuAnimation()" @confirm="this.logout()" v-if="modalName === 'logoutConfirm'"/>
</template>

<style scoped>
.nav-shell{
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}
.nav-bar{
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 14px 18px;
  border-radius: 22px;
  background:
      linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.76)),
      radial-gradient(circle at 25% 0%, rgba(124,58,237,.08), transparent 38%);
  border: 1px solid rgba(124,58,237,0.12);
  backdrop-filter: blur(22px);
  box-shadow: 0 18px 44px rgba(76, 29, 149, 0.10);
}
.nav-brand{
  display: flex;
  align-items: center;
  gap: 12px;
}
.nav-brand__badge{
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffb86b, #ff6b6b);
  color: #131722;
  font-weight: 800;
  font-size: 20px;
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.25);
}
.nav-brand__title{
  display: block;
  color: #18181b;
  font-size: 20px;
  font-weight: 750;
}
.nav-brand__title span{
  color: #7c3aed;
  text-shadow: 0 8px 24px rgba(124,58,237,.18);
}
.nav-brand__subtitle{
  display: block;
  margin-top: 4px;
  color: #71717a;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .12em;
}
.nav-links{
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}
.nav-link,
.nav-logout{
  position: relative;
  border: 0;
  background: transparent;
  color: #52525b;
  border-radius: 999px;
  padding: 12px 16px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all .2s ease;
  font-size: 14px;
  font-weight: 600;
}
.nav-link:hover,
.nav-logout:hover{
  background: rgba(124,58,237,.07);
  color: #18181b;
  transform: translateY(-1px);
}
.nav-link--active{
  background: linear-gradient(180deg, #f3e8ff, #ffffff);
  color: #6d28d9;
  box-shadow: inset 0 0 0 1px rgba(124,58,237,0.18), 0 10px 22px rgba(124,58,237,.10);
}
.nav-link--active::after{
  content: "";
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 5px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, #7c3aed, #3b82f6);
}
.nav-actions{
  display: flex;
  justify-content: flex-end;
}
.nav-logout{
  color: #a16207;
}
@media (max-width: 1120px){
  .nav-bar{
    grid-template-columns: 1fr;
  }
  .nav-actions{
    justify-content: center;
  }
}
</style>
