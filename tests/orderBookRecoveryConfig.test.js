import test from 'node:test';
import assert from 'node:assert/strict';
import {buildConfigPayload, pairOptionsForExchange, resolveExchange, resolvePair} from '../src/utils/orderBookRecoveryConfig.js';

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
