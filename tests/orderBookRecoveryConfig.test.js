import test from 'node:test';
import assert from 'node:assert/strict';
import {buildConfigPayload, normalizeConfigForm, pairOptionsForExchange, resolveExchange, resolvePair} from '../src/utils/orderBookRecoveryConfig.js';

const options = [
  {
    id: 13,
    title: 'Mexc',
    pairs: [
      {id: 101, pair: 'BTC/USDT', normalized_symbol: 'BTCUSDT'},
      {id: 102, pair: 'TON/USDT', normalized_symbol: 'TONUSDT'},
    ],
  },
  {
    id: 14,
    title: 'Binance',
    pairs: [
      {id: 201, pair: 'ETH/USDT', normalized_symbol: 'ETHUSDT'},
    ],
  },
];

test('exchange select loads and resolves options by id/title fallback', () => {
  assert.equal(resolveExchange(options, {exchange_id: 13}).title, 'Mexc');
  assert.equal(resolveExchange(options, {exchange: 'mexc'}).id, 13);
});

test('pair select filters by exchange', () => {
  assert.deepEqual(pairOptionsForExchange(options, 13).map(pair => pair.pair), ['BTC/USDT', 'TON/USDT']);
  assert.deepEqual(pairOptionsForExchange(options, 14).map(pair => pair.pair), ['ETH/USDT']);
});

test('pair resolves by id and normalized symbol fallback', () => {
  const exchange = resolveExchange(options, {exchange_id: 13});
  assert.equal(resolvePair(exchange, {trading_pair_id: 102}).pair, 'TON/USDT');
  assert.equal(resolvePair(exchange, {symbol: 'btc/usdt'}).id, 101);
  assert.equal(resolvePair(exchange, {symbol: 'BTCUSDT'}).id, 101);
});

test('save payload sends exchange_id and trading_pair_id', () => {
  const payload = buildConfigPayload({exchange_id: '13', trading_pair_id: '101', base_margin_usdt: 7});
  assert.equal(payload.exchange_id, 13);
  assert.equal(payload.trading_pair_id, 101);
  assert.equal(payload.base_margin_usdt, 7);
});

test('live config fields have defaults for UI binding', () => {
  const form = normalizeConfigForm({});
  assert.equal(form.execution_mode, 'paper');
  assert.equal(form.live_enabled_confirmation, false);
  assert.equal(form.live_kill_switch, true);
  assert.equal(form.live_max_margin_usdt, 10);
  assert.equal(form.live_max_daily_loss_usdt, 5);
  assert.equal(form.live_max_total_loss_usdt, 10);
  assert.equal(form.live_order_type, 'market');
  assert.equal(form.live_open_failed_cooldown_seconds, 60);
  assert.equal(form.live_fee_filter_enabled, true);
  assert.equal(form.live_fee_filter_taker_fee_percent, 0.1);
  assert.equal(form.momentum_confirmation_enabled, false);
  assert.equal(form.side_quality_filter_enabled, false);
  assert.equal(form.side_quality_lookback_trades, 5);
  assert.equal(form.side_quality_cooldown_seconds, 600);
  assert.equal(form.ml_mode, 'disabled');
});

test('save payload preserves live config fields', () => {
  const payload = buildConfigPayload({
    exchange_id: '13',
    trading_pair_id: '101',
    execution_mode: 'live',
    live_enabled_confirmation: true,
    live_kill_switch: false,
    live_max_margin_usdt: '9',
    live_max_daily_loss_usdt: '4',
    live_max_total_loss_usdt: '8',
    live_order_type: 'market',
    live_open_failed_cooldown_seconds: '45',
    live_fee_filter_enabled: true,
    live_fee_filter_taker_fee_percent: '0.2',
    momentum_confirmation_enabled: true,
    side_quality_filter_enabled: true,
    side_quality_lookback_trades: '4',
    side_quality_cooldown_seconds: '120',
    ml_mode: 'shadow',
  });
  assert.equal(payload.execution_mode, 'live');
  assert.equal(payload.live_enabled_confirmation, true);
  assert.equal(payload.live_kill_switch, false);
  assert.equal(payload.live_max_margin_usdt, 9);
  assert.equal(payload.live_max_daily_loss_usdt, 4);
  assert.equal(payload.live_max_total_loss_usdt, 8);
  assert.equal(payload.live_order_type, 'market');
  assert.equal(payload.live_open_failed_cooldown_seconds, 45);
  assert.equal(payload.live_fee_filter_enabled, true);
  assert.equal(payload.live_fee_filter_taker_fee_percent, 0.2);
  assert.equal(payload.momentum_confirmation_enabled, true);
  assert.equal(payload.side_quality_filter_enabled, true);
  assert.equal(payload.side_quality_lookback_trades, 4);
  assert.equal(payload.side_quality_cooldown_seconds, 120);
  assert.equal(payload.ml_mode, 'shadow');
});
