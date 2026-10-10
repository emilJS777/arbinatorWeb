import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConfigForm, buildConfigPayload} from '../src/utils/orderBookRecoveryConfig.js';

test('experiment is opt-in and never rewrites TP/SL or execution mode', () => {
  const form = normalizeConfigForm({take_profit_percent_of_margin: 1.8, stop_loss_percent_of_margin: .9});
  assert.equal(form.strategy_version, 'baseline');
  assert.equal(form.execution_mode, 'paper');
  const next = buildConfigPayload({...form, strategy_version: 'adaptive_book_v1', experiment_settings: {cost_hurdle: 3}});
  assert.equal(next.take_profit_percent_of_margin, 1.8);
  assert.equal(next.stop_loss_percent_of_margin, .9);
  assert.equal(next.experiment_settings.cost_hurdle, 3);
  assert.equal(next.experiment_settings.max_hold_seconds, 120);
  next.experiment_settings.max_hold_seconds = 60;
  assert.equal(form.experiment_settings.max_hold_seconds, 120);
});
