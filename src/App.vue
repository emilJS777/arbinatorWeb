<script>
import VToster from '@/components/_general/v-toster.vue';
import VLoader from '@/components/_general/v-loader.vue';
import VMessageModal from '@/components/_general/v-message-modal.vue';
import VAlertBlock from '@/components/_general/v-alert-block.vue';
import VNavMenu from '@/components/home/v-nav-menu.vue';
export default {
  components: {VToster, VLoader, VMessageModal, VAlertBlock, VNavMenu},
  data: () => ({toster_msg: '', toster_success: null, loader: false, messageModal: false, alert_msg: false, alert_title: false, listeners: {}}),
  computed: {connected() { return this.$store.state.socket.IS_CONNECTED; }},
  mounted() {
    this.listeners = {
      order_book: payload => this.$store.commit('orderBooks/SET_ORDER_BOOKS', payload),
      balance: payload => this.$store.commit('tradingPairs/SET_BALANCES', payload?.data),
      account_active_orders: payload => this.$store.commit('accountOrders/SET_ACCOUNT_ACTIVE_ORDERS', payload),
      toster: payload => {this.toster_msg = payload.msg; this.toster_success = payload.success;},
      loader: value => {this.loader = value;},
      messageModal: value => {this.messageModal = value;},
      onAlert: payload => {this.alert_msg = payload.msg; this.alert_title = payload.title;},
      socket_error: payload => {this.toster_msg = payload?.msg || this.$t('Connection interrupted'); this.toster_success = false;},
      exchange_status: payload => {if (payload?.status === 'unavailable') {this.toster_msg = `${payload.exchange}: ${payload.message}`; this.toster_success = false;}},
    };
    Object.entries(this.listeners).forEach(([event, handler]) => this.emitter.on(event, handler));
    this.$store.dispatch('tradingPairs/GET', '').then(res => {
      if (res?.data?.success) this.$store.commit('tradingPairs/SET_TRADING_PAIRS', res.data.obj);
    }).catch(() => {});
    this.$connectWebSocket();
  },
  beforeUnmount() {Object.entries(this.listeners).forEach(([event, handler]) => this.emitter.off(event, handler));},
};
</script>
<template>
  <div class="light-mode futures-shell">
    <a class="skip-link" href="#main-content">{{ $t('Skip to content') }}</a>
    <v-nav-menu />
    <div class="workspace-main">
      <header class="workspace-header">
        <span>{{ $t('Futures workspace') }} <span class="header-separator">/</span> OrderBookRecovery</span>
        <div class="header-tools">
          <span class="feed-status"><span class="connection-dot" :class="{online: connected}" aria-hidden="true"></span><span role="status">{{ $t(connected ? 'Market feed connected' : 'Market feed disconnected') }}</span></span>
          <label class="theme-control"><i :class="['fa-solid', $theme.preference === 'system' ? 'fa-desktop' : $theme.resolved === 'dark' ? 'fa-moon' : 'fa-sun']" aria-hidden="true"></i><span>{{ $t('Theme') }}</span><select :value="$theme.preference" @change="$setTheme($event.target.value)" :aria-label="$t('Theme')"><option value="light">{{ $t('Light') }}</option><option value="dark">{{ $t('Dark') }}</option><option value="system">{{ $t('System') }}</option></select></label>
          <select :value="$locale.value" @change="$setLocale($event.target.value)" :aria-label="$t('Language')"><option value="en">EN</option><option value="ru">RU</option></select>
        </div>
      </header>
      <main id="main-content" tabindex="-1">
        <div v-if="['exchanges', 'tradingPairs', 'orderBooks', 'accountOrders'].includes($route.name)" class="workspace-tabs">
          <router-link to="/exchanges">{{ $t('Exchange Connections') }}</router-link><router-link to="/tradingPairs">{{ $t('Markets') }}</router-link><router-link to="/orderBooks">{{ $t('Order books') }}</router-link><router-link to="/accountOrders">{{ $t('Account orders') }}</router-link>
        </div>
        <div v-if="['legacyResearch', 'futures', 'paperTrading'].includes($route.name)" class="workspace-notice">{{ $t('Legacy research: separate strategy and ledger. Candle backtests do not validate an order-book strategy.') }} <router-link to="/research">{{ $t('Back to Research') }}</router-link></div>
        <router-view />
      </main>
      <footer class="workspace-footer">{{ $t('Research is not evidence of profitability.') }} <span>{{ $t('Live activation unavailable in this workspace') }}</span></footer>
    </div>
    <v-message-modal v-if="messageModal" @close="messageModal = false" :message="messageModal" />
    <v-toster v-if="toster_msg" :msg="$t(toster_msg)" :success="toster_success" @close="toster_msg = ''; toster_success = null" />
    <v-loader v-if="loader" />
    <v-alert-block v-if="alert_msg" :title="alert_title" :msg="alert_msg" @close="alert_title = false; alert_msg = false" />
  </div>
</template>
<style src="@/assets/main.css" lang="scss"></style>
<style src="@/assets/workspace.css"></style>
<style src="@/assets/theme.css"></style>
