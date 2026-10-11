export const sectionTitle = section => ({overview: 'Overview', positions: 'Positions & History', settings: 'Bot Settings', research: 'Research'}[section] || 'Overview');

// Presentation only. Missing fees/funding or fallback fills are never confirmed profit.
export function pnlEvidence(trade = {}) {
  if (trade.abandoned_at || trade.accounting_status === 'abandoned_unverified') return 'Abandoned / unverified; excluded from accounting';
  if ((trade.execution_mode || 'paper') !== 'live') return 'Simulated PnL';
  if (!trade.closed_at) return 'Unrealized estimate';
  if (trade.exit_price_fallback_used || trade.entry_price_fallback_used || trade.pnl_source === 'fallback_market_price') return 'Estimated PnL';
  if (trade.live_entry_fee == null || trade.live_exit_fee == null || trade.funding_status !== 'reconciled') return 'Unverified costs';
  return ['exchange_realized_pnl', 'order_history', 'verified_fills_with_funding'].includes(trade.pnl_source) ? 'Exchange-reconciled PnL' : 'Estimated PnL';
}

export function utcTime(value) {
  if (!value) return NaN;
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
  // Flask emits RFC 1123/GMT; only naive ISO timestamps need a UTC suffix.
  const naiveISO = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
  return Date.parse(naiveISO.test(value) ? `${value.replace(' ', 'T')}Z` : value);
}
export function snapshotAge(value, now = Date.now()) {
  const time = utcTime(value);
  return Number.isFinite(time) ? Math.max(0, (now - time) / 1000) : null;
}
export function protectionLabel(trade, now = Date.now()) {
  if (!trade || (trade.execution_mode || 'paper') !== 'live' || trade.closed_at) return 'Not required';
  if (trade.tp_sl_protected) {
    const age = snapshotAge(trade.protection_checked_at, now);
    return trade.protection_status === 'active' && age !== null && age <= 30 && utcTime(trade.protection_expires_at) > now ? 'Protected' : 'Needs verification';
  }
  if (trade.tp_sl_error || trade.live_status === 'tp_sl_unprotected') return 'Unprotected';
  if (trade.live_status === 'open_failed') return 'Not created';
  return 'Pending';
}

export function validateSettings(form, exchanges = []) {
  const errors = [];
  const exchange = exchanges.find(item => Number(item.id) === Number(form.exchange_id));
  if (!exchange) errors.push('Select exchange');
  if (!exchange?.pairs?.some(pair => Number(pair.id) === Number(form.trading_pair_id))) errors.push('Select trading pair');
  if (form.execution_mode === 'live' && (!form.live_kill_switch || form.live_enabled_confirmation || form.enabled)) errors.push('Live activation locked');
  for (const key of ['base_margin_usdt', 'leverage', 'max_position_margin_usdt', 'max_open_positions', 'take_profit_percent_of_margin', 'stop_loss_percent_of_margin']) {
    if (!Number.isFinite(Number(form[key])) || Number(form[key]) <= 0) errors.push(`${key}: > 0`);
  }
  if (Number(form.leverage) > Number(form.max_leverage)) errors.push('Leverage exceeds maximum');
  if (Number(form.confirmation_delay_seconds) > Number(form.confirmation_max_wait_seconds)) errors.push('Confirmation delay exceeds maximum wait');
  for (const key of ['min_consensus_ratio', 'ml_snapshot_sample_rate']) if (Number(form[key]) < 0 || Number(form[key]) > 1) errors.push(`${key}: 0..1`);
  return errors;
}

export function settingsChanges(before = {}, after = {}) {
  return Object.keys(after).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map(key => ({key, before: before[key], after: after[key]}));
}

export const canStartPaper = config => Boolean(config && config.execution_mode === 'paper' && config.exchange_id && config.trading_pair_id && !config.emergency_entry_block);

export function startBlockReasons({config, runtime, dirty = false, loading = false} = {}) {
  const reasons = [];
  if (loading) reasons.push('Start request in progress');
  if (!config) reasons.push('Saved configuration not loaded; refresh and check the API');
  else {
    if (config.execution_mode === 'live') reasons.push('Saved mode is LIVE; live activation is intentionally locked in this UI');
    else if (config.execution_mode !== 'paper') reasons.push('Saved execution mode missing or unsupported; check frontend/backend versions');
    if (!config.exchange_id) reasons.push('Saved exchange is missing; select and save an exchange');
    if (!config.trading_pair_id) reasons.push('Saved trading pair is missing; select and save a pair');
    if (config.emergency_entry_block) reasons.push('Emergency entry block is enabled in saved settings');
  }
  if (dirty) reasons.push('Unsaved settings; review and save before starting');
  if (runtime?.enabled) reasons.push('Entries already enabled; Start is not required');
  if (config && runtime?.config && ['execution_mode', 'exchange_id', 'trading_pair_id', 'emergency_entry_block'].some(key => config[key] !== runtime.config[key])) {
    reasons.push('Saved config and last runtime state disagree; refresh before starting');
  }
  return reasons;
}
