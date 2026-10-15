import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeConfigForm, buildConfigPayload} from '../src/utils/orderBookRecoveryConfig.js';

test('trend candidate is opt-in and preserves TP/SL and paper mode', () => {
  assert.equal(normalizeConfigForm({}).strategy_version, 'baseline');
  const config = normalizeConfigForm({strategy_version:'adaptive_trend_v3', execution_mode:'paper', take_profit_percent_of_margin:1.8, stop_loss_percent_of_margin:.9});
  const payload = buildConfigPayload(config);
  assert.equal(payload.strategy_version, 'adaptive_trend_v3');
  assert.equal(payload.take_profit_percent_of_margin, 1.8);
  assert.equal(payload.stop_loss_percent_of_margin, .9);
  assert.equal(payload.execution_mode, 'paper');
  const view = readFileSync(new URL('../src/views/orderBookRecovery/v-order-book-recovery.vue', import.meta.url),'utf8');
  assert.ok(view.includes('value="adaptive_trend_v3"'));
  assert.ok(view.includes('Missing history blocks entry'));
});
