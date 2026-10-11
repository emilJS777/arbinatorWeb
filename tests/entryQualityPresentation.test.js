import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('entry measurements distinguish missing observations from losses and fills', () => {
  const view = readFileSync(new URL('../src/views/orderBookRecovery/v-order-book-recovery.vue', import.meta.url), 'utf8');
  const locale = readFileSync(new URL('../src/plugins/locale.js', import.meta.url), 'utf8');
  assert.ok(view.includes("detail('trade.execution_mode', null) === 'paper'"));
  assert.ok(view.includes('=== \'observed\''));
  assert.ok(view.includes('No observation, not a loss'));
  assert.ok(view.includes('funding excluded. Not fills or expected profit'));
  assert.ok(locale.includes('Нет наблюдения, не означает убыток'));
});
