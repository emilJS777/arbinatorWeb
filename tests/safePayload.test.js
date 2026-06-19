import test from 'node:test';
import assert from 'node:assert/strict';
import {findArbitrageOpportunities} from '../src/domain/arbitrage/findArbitrageOpportunities.js';
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

test('findArbitrageOpportunities never throws on invalid payloads', () => {
  assert.deepEqual(findArbitrageOpportunities(null, null), []);
  assert.deepEqual(findArbitrageOpportunities(undefined, []), []);
  assert.deepEqual(findArbitrageOpportunities([], []), []);
  assert.deepEqual(findArbitrageOpportunities({Mexc: null}, []), []);
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
