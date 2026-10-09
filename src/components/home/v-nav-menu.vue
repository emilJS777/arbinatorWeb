<script>
export default {
  data: () => ({items: [
    ['/orderbook-recovery', 'Overview', 'fa-chart-line'],
    ['/positions', 'Positions & History', 'fa-layer-group'],
    ['/bot-settings', 'Bot Settings', 'fa-sliders'],
    ['/research', 'Research', 'fa-flask'],
    ['/exchanges', 'Exchange Connections', 'fa-plug'],
  ]}),
  methods: {logout() {if (window.confirm(this.$t('Sign out?'))) {localStorage.removeItem('access_token'); location.reload();}}},
};
</script>
<template>
  <aside class="workspace-sidebar">
    <router-link class="workspace-brand" to="/orderbook-recovery"><span class="brand-mark"><i class="fa-solid fa-wave-square" aria-hidden="true"></i></span> ArbiNator<span class="brand-sub">FUTURES</span></router-link>
    <p class="nav-caption">{{ $t('Workspace') }}</p>
    <nav :aria-label="$t('Main navigation')"><router-link v-for="[path, label, icon] in items" :key="path" :to="path" :class="{'section-active': path === '/exchanges' && ['tradingPairs','orderBooks','accountOrders'].includes($route.name)}"><i :class="['fa-solid', icon]" aria-hidden="true"></i><span>{{ $t(label) }}</span></router-link></nav>
    <div class="sidebar-bottom"><div class="safety-note"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><div><strong>{{ $t('Safety first') }}</strong><small>{{ $t('Live activation locked') }}</small></div></div><button class="quiet-button" @click="logout"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>{{ $t('Sign out') }}</button></div>
  </aside>
</template>
