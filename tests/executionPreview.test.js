import test from 'node:test';
import assert from 'node:assert/strict';
import {executionPreview} from '../src/utils/executionPreview.js';

test('preview uses percentage of margin and charges two notional-based fees', () => {
  const config = {execution_mode: 'paper', base_margin_usdt: 7, leverage: 1, take_profit_percent_of_margin: .1, stop_loss_percent_of_margin: .1, paper_taker_fee_percent: .1};
  const before = JSON.stringify(config);
  const preview = executionPreview(config);
  assert.equal(preview.notional, 7);
  assert.ok(Math.abs(preview.tp - .007) < 1e-12);
  assert.ok(Math.abs(preview.sl - .007) < 1e-12);
  assert.ok(Math.abs(preview.fees - .014) < 1e-12);
  assert.equal(preview.belowCosts, true);
  assert.equal(JSON.stringify(config), before);
  assert.equal(executionPreview({}), null);
});
