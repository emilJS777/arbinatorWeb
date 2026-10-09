import test from 'node:test';
import assert from 'node:assert/strict';
import orderBooks from '../src/store/modules/orderBooks.js';
import {isValidMlStats, normalizeArray, normalizeObjectValues} from '../src/utils/safePayload.js';

test('normalizeArray returns only arrays', () => {
  assert.deepEqual(normalizeArray(null), []);
  assert.deepEqual(normalizeArray(undefined), []);
  assert.deepEqual(normalizeArray({a: 1}), []);
  assert.deepEqual(normalizeArray([1, 2]), [1, 2]);
});

test('normalizeObjectValues accepts arrays and object maps', () => {
  assert.deepEqual(normalizeObjectValues(null), []);
  assert.deepEqual(normalizeObjectValues([1]), [1]);
  assert.deepEqual(normalizeObjectValues({a: 1, b: 2}), [1, 2]);
});

test('shared order books safely ignore invalid payloads without arbitrage calculation', () => {
  const state = {ORDER_BOOKS: {}};
  for (const payload of [null, undefined, [], {data: {order_book: {}}}]) orderBooks.mutations.SET_ORDER_BOOKS(state, payload);
  assert.deepEqual(state.ORDER_BOOKS, {});
});

test('isValidMlStats validates numeric stat fields', () => {
  assert.equal(isValidMlStats(null), false);
  assert.equal(isValidMlStats({}), false);
  assert.equal(isValidMlStats({
    ml_market_snapshots_count: 1,
    ml_market_snapshots_pending_count: 0,
    ml_market_snapshots_labeled_count: 1,
    ml_exchange_labels_count: 2,
    ml_exchange_labels_pending_count: 0,
    ml_exchange_labels_labeled_count: 2,
  }), true);
});
