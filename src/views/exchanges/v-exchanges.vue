<script>
import {exchangePayload} from '@/utils/exchangeForm.js';
export default {
  data: () => ({rows: [], loading: false, error: '', form: null, saving: false, deleting: null}),
  mounted() {this.load();},
  methods: {
    async load() {
      this.loading = true; this.error = '';
      try {const res = await this.$store.dispatch('exchanges/GET', ''); if (!res?.data?.success) throw new Error(res?.message || 'Request failed'); this.rows = Array.isArray(res.data.obj) ? res.data.obj : [];}
      catch (error) {this.error = error.message;}
      finally {this.loading = false;}
    },
    edit(row = {}) {this.form = {id: row.id, title: row.title || '', icon_path: row.icon_path || '', index: row.index ?? 1, enabled: row.enabled ?? false, api_key: '', api_secret: '', password: ''};},
    async save() {
      if (this.saving || !this.form?.title.trim()) return;
      this.saving = true;
      try {
        const payload = exchangePayload(this.form, Boolean(this.form.id));
        const res = await this.$store.dispatch(this.form.id ? 'exchanges/PUT' : 'exchanges/POST', this.form.id ? {id: this.form.id, form: payload} : payload);
        if (!res?.data?.success) throw new Error(res?.message || 'Request failed');
        this.form = null; await this.load();
      } catch (error) {this.emitter.emit('toster', {success: false, msg: error.message});}
      finally {this.saving = false;}
    },
    async remove(row) {
      if (!window.confirm(`${this.$t('Delete Exchange')} ${row.title}?`)) return;
      this.deleting = row.id;
      try {const res = await this.$store.dispatch('exchanges/DELETE', row.id); if (!res?.data?.success) throw new Error(res?.message || 'Request failed'); await this.load();}
      catch (error) {this.emitter.emit('toster', {success: false, msg: error.message});}
      finally {this.deleting = null;}
    },
  },
};
</script>
<template>
  <div class="recovery-page">
    <div class="workspace-page-heading"><div><div class="workspace-eyebrow">CONNECTIONS</div><h1>{{ $t('Exchange Connections') }}</h1><p>{{ $t('Execution venues and market-data sources. Enabling a connection does not start the bot.') }}</p></div><div class="action-row"><button :disabled="loading" @click="load"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i>{{ $t('Refresh') }}</button><button class="primary-button" @click="edit()"><i class="fa-solid fa-plus" aria-hidden="true"></i>{{ $t('Add Exchange') }}</button></div></div>
    <div v-if="error" class="workspace-notice" role="alert">{{ error }}</div><div v-if="loading" role="status">{{ $t('Loading connections...') }}</div>
    <div v-if="!loading && !rows.length && !error" class="workspace-notice neutral">{{ $t('No exchange connections yet') }}</div>
    <div class="connection-list">
      <article v-for="row in rows" :key="row.id" class="exchange-row">
        <div class="exchange-identity"><span class="exchange-monogram" aria-hidden="true">{{ row.title?.slice(0, 2).toUpperCase() }}</span><div><h3>{{ row.title }}</h3><small>#{{ row.id }} · {{ $t(row.enabled ? 'Enabled' : 'Disabled') }}</small></div></div>
        <div class="credential-status"><i class="fa-solid fa-key" aria-hidden="true"></i>{{ $t(row.has_api_key && row.has_secret ? 'Credentials saved' : 'Credentials incomplete') }}<small>{{ $t('Connection health is reported by the scanner, not credential presence.') }}</small></div>
        <div class="action-row"><button @click="edit(row)"><i class="fa-solid fa-pen" aria-hidden="true"></i>{{ $t('Edit') }}</button><button class="button-danger" :disabled="deleting === row.id" @click="remove(row)"><i class="fa-solid fa-trash" aria-hidden="true"></i>{{ $t('Delete') }}</button></div>
      </article>
    </div>
    <div v-if="form" class="details-backdrop" @click.self="form = null" @keydown.esc="form = null">
      <form class="details-modal" v-dialog-focus="() => form = null" :aria-label="$t('Exchange Form')" @submit.prevent="save">
        <div class="details-header"><h3>{{ $t('Exchange Form') }}</h3><button type="button" @click="form = null">{{ $t('Cancel') }}</button></div>
        <p class="workspace-notice neutral">{{ $t('Leave credentials blank to keep saved values. Never enable withdrawal permissions.') }}</p>
        <div class="exchange-fields">
          <label>{{ $t('Title') }}<input v-model="form.title" required autocomplete="off" /></label>
          <label>{{ $t('Icon path') }}<input v-model="form.icon_path" /></label>
          <label>{{ $t('Display order') }}<input v-model.number="form.index" type="number" /></label>
          <label v-for="key in ['api_key', 'api_secret', 'password']" :key="key">{{ $t(key) }}<input v-model="form[key]" type="password" autocomplete="new-password" /></label>
          <label class="check-row"><input v-model="form.enabled" type="checkbox" />{{ $t('Enabled') }}</label>
        </div>
        <div class="action-row"><button class="primary-button" type="submit" :disabled="saving || !form.title.trim()">{{ $t(saving ? 'Saving...' : 'Save changes') }}</button></div>
      </form>
    </div>
  </div>
</template>
<style scoped>
.connection-list {border-top: 1px solid #e2e5eb;}
.exchange-row {display: grid; grid-template-columns: minmax(150px,1fr) minmax(220px,1.4fr) auto; gap: 24px; align-items: center; padding: 24px 0; border-bottom: 1px solid #e2e5eb;}
.exchange-identity {display: flex; align-items: center; gap: 14px;}.exchange-identity h3 {margin: 0 0 3px;}
.exchange-monogram {width: 42px; height: 42px; display: grid; place-items: center; border: 1px solid #d7dce5; border-radius: 7px; background: white; color: #536378; font-size: 13px; font-weight: 700;}
small {display: block; color: #68717f; font-size: 12px;}.credential-status {font-size: 13px;}.credential-status svg {color: #7c8596; margin-right: 8px;}.credential-status small {margin-top: 4px;}
.exchange-fields {display: grid; gap: 18px; margin: 24px 0;}.exchange-fields label {display: grid; gap: 7px; font-size: 13px;}.exchange-fields .check-row {display: flex; align-items: center;}
@media(max-width:850px) {.exchange-row {grid-template-columns: 1fr; gap: 14px;}}
</style>
