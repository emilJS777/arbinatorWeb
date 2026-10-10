import {snapshotAge} from './workspacePresentation.js';

// Display only: never used to authorize an entry, exit or accounting update.
export function overviewStatus(state, request, debug, now = Date.now()) {
  const unverified = !state || request?.stale === true;
  const reason = state?.paper_exit_diagnostics?.exit_block_reason;
  const waiting = state?.open_position && reason && reason !== 'monitoring'
    ? reason : state?.pending_order ? 'Pending paper entry'
      : state?.recovery_state?.stop_reason || state?.reason_if_not_trading || debug?.reason_if_not_trading;
  return {
    status: unverified ? 'Unverified' : state.enabled && !state.recovery_state?.is_stopped ? 'Running' : 'Paused',
    waiting: waiting || (state?.enabled ? 'Waiting for a qualifying signal' : 'New entries paused'),
    age: snapshotAge(state?.last_order_book_snapshot_time || debug?.last_order_book_snapshot_time, now),
    unverified,
  };
}

export function pageRows(rows, page, size = 20) {
  const items = Array.isArray(rows) ? rows : [];
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(pages, Math.max(1, Number(page) || 1));
  return {items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length};
}

export function connectionAvailability(row, diagnostics = [], now = Date.now()) {
  const matches = diagnostics.filter(item => item.exchange_id != null
    ? String(item.exchange_id) === String(row.id)
    : String(item.exchange || '').trim().toLowerCase() === String(row.title || '').trim().toLowerCase());
  if (!matches.length) return {label: 'Data availability unknown', tone: 'neutral', count: 0};
  const fresh = matches.filter(item => item.active !== false && item.disabled !== true && item.status !== 'disabled' && snapshotAge(item.last_success_at, now) !== null && snapshotAge(item.last_success_at, now) <= 5);
  return {label: fresh.length ? 'Recent scanner data' : 'No fresh scanner data', tone: fresh.length ? 'positive' : 'warning', count: fresh.length};
}

export const datasetLabels = {
  id: 'ID', timestamp: 'Timestamp', exchange: 'Exchange', symbol: 'Symbol', proposed_side: 'Proposed', final_side: 'Final', result: 'Result', ml_score: 'ML score',
  reference_price: 'Reference price', label_status: 'Label status', future_return_10s: '10s return', mfe_long_10s: 'Long MFE · 10s', mae_long_10s: 'Long MAE · 10s',
  mid_price: 'Mid price', bid: 'Bid', ask: 'Ask', spread: 'Spread', snapshot_id: 'Snapshot ID',
};

export const settingLabels = {
  exchange: 'Exchange', symbol: 'Symbol', exchange_id: 'Exchange', trading_pair_id: 'Symbol', execution_mode: 'Execution mode',
  base_margin_usdt: 'Base margin · USDT', leverage: 'Leverage', max_leverage: 'Max leverage', risk_per_trade_percent: 'Risk per trade %',
  max_position_margin_usdt: 'Max position margin USDT', max_consecutive_losses: 'Max consecutive losses', emergency_entry_block: 'Block new entries',
  paper_taker_fee_percent: 'Paper taker fee %', paper_latency_ms: 'Fixed paper latency ms', pending_entry_ttl_seconds: 'Pending entry TTL seconds',
  take_profit_percent_of_margin: 'TP % of margin', stop_loss_percent_of_margin: 'SL % of margin', max_daily_loss_usdt: 'Max daily loss',
  max_total_loss_usdt: 'Max total loss', max_open_positions: 'Max open positions', cooldown_after_loss_seconds: 'Cooldown loss sec', cooldown_after_win_seconds: 'Cooldown win sec',
  long_imbalance_threshold: 'Long imbalance', short_imbalance_threshold: 'Short imbalance', max_spread_percent: 'Max spread %', momentum_window_snapshots: 'Momentum window',
  min_valid_exchanges: 'Min valid exchanges', min_confirming_exchanges: 'Min confirming exchanges', min_consensus_ratio: 'Min consensus ratio',
  max_snapshot_age_seconds: 'Max snapshot age sec', imbalance_anomaly_min: 'Anomaly min', imbalance_anomaly_max: 'Anomaly max', entry_mode: 'Entry mode',
  confirmation_delay_seconds: 'Confirmation delay sec', confirmation_max_wait_seconds: 'Confirmation max wait sec', confirmation_min_momentum_delta: 'Min momentum delta',
  confirmation_require_same_direction: 'Require same direction', confirmation_require_momentum_improvement: 'Require momentum improvement',
  confirmation_require_consensus_still_valid: 'Require consensus still valid', cooldown_after_max_recovery_seconds: 'Max recovery cooldown sec',
  feedback_lookback_trades: 'Feedback lookback', side_loss_streak_limit: 'Side loss streak limit', side_cooldown_seconds: 'Side cooldown sec',
  min_side_win_rate: 'Min side win rate', adaptive_consensus_boost: 'Adaptive consensus boost', adaptive_min_valid_exchanges_boost: 'Adaptive valid exchanges boost',
  momentum_confirmation_enabled: 'Profit protection: momentum direction', side_quality_filter_enabled: 'Profit protection: side quality',
  side_quality_lookback_trades: 'Side quality lookback', side_quality_cooldown_seconds: 'Side quality cooldown sec', ml_mode: 'ML mode',
  ml_snapshot_capture_enabled: 'Capture ML market snapshots', ml_snapshot_sample_rate: 'ML snapshot sample rate', ml_max_snapshots_per_hour: 'ML max snapshots / hour',
  signal_diagnostics_max_rows: 'Signal diagnostics max rows', paper_equity_usdt: 'Paper equity', consensus_enabled: 'Consensus enabled',
  use_median_imbalance: 'Use median imbalance', exclude_anomalous_imbalance: 'Exclude imbalance anomalies', feedback_enabled: 'Feedback enabled',
  require_configured_exchange_signal: 'Require configured signal', enabled: 'Enabled', live_enabled_confirmation: 'Live enabled confirmation',
  live_kill_switch: 'Live kill switch', live_max_margin_usdt: 'Live max margin USDT', live_max_daily_loss_usdt: 'Live max daily loss',
  live_max_total_loss_usdt: 'Live max total loss', live_open_failed_cooldown_seconds: 'Live open failed cooldown sec', live_fee_filter_enabled: 'Live fee-aware entry filter',
  live_fee_filter_taker_fee_percent: 'Taker fee % per side', live_order_type: 'Live order type', live_reduce_only_close: 'Reduce-only close',
};
