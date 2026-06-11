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
          <span class="nav-brand__title">Arbi<span class="c-pallete-error-Error-50">Nator</span></span>
          <span class="nav-brand__subtitle">Realtime scanner</span>
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
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04));
  border: 1px solid rgba(255,255,255,0.09);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.16);
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
  color: #f7fbff;
  font-size: 20px;
  font-weight: 700;
}
.nav-brand__subtitle{
  display: block;
  margin-top: 4px;
  color: #90a0be;
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
  border: 0;
  background: transparent;
  color: #c7d2e5;
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
  background: rgba(255,255,255,0.07);
  color: #fff;
  transform: translateY(-1px);
}
.nav-link--active{
  background: linear-gradient(135deg, rgba(255,184,107,0.22), rgba(70,205,207,0.18));
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
}
.nav-actions{
  display: flex;
  justify-content: flex-end;
}
.nav-logout{
  color: #ffcf9b;
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
