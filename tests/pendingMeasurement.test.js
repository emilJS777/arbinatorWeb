import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('pending evidence and shadow quotes remain separate from accounting', () => {
  const view = readFileSync(new URL('../src/views/orderBookRecovery/v-order-book-recovery.vue', import.meta.url), 'utf8');
  const locale = readFileSync(new URL('../src/plugins/locale.js', import.meta.url), 'utf8');
  for (const key of ['pending_revalidation', 'pending_cancellation', 'paper_shadow_prices']) assert.ok(view.includes(key));
  assert.ok(view.includes('not fills, net PnL or profit forecasts'));
  assert.ok(locale.includes('Пропуски не заполняются'));
});
