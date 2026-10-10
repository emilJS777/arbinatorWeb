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
  assert.ok(Math.abs(preview.netTp + .007) < 1e-12);
  assert.ok(Math.abs(preview.netSl + .021) < 1e-12);
  assert.equal(preview.breakEvenWinRate, null);
  assert.equal(JSON.stringify(config), before);
  assert.equal(executionPreview({}), null);
});

test('break-even estimate and capital warnings do not modify settings', () => {
  const config = {execution_mode: 'paper', base_margin_usdt: 10, leverage: 1,
    take_profit_percent_of_margin: 1, stop_loss_percent_of_margin: 1,
    paper_taker_fee_percent: .1, paper_equity_usdt: 10, max_daily_loss_usdt: 20};
  const result = executionPreview(config);
  assert.ok(Math.abs(result.breakEvenWinRate - 60) < 1e-10);
  assert.equal(result.lossLimitsExceedEquity, true);
  assert.equal(config.max_daily_loss_usdt, 20);
});
