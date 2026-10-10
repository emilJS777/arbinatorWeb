import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewStatus, pageRows, connectionAvailability, settingLabels} from '../src/utils/dashboardPresentation.js';
import {readFileSync} from 'node:fs';

test('running is a normal status, failed state is unverified, unresolved exit remains visible', () => {
  const state = {enabled: true, recovery_state: {}, open_position: {id: 1}, paper_exit_diagnostics: {exit_block_reason: 'legacy_paper_execution_config_review_required'}};
  assert.equal(overviewStatus(state, {}).status, 'Running');
  assert.equal(overviewStatus(state, {}).waiting, 'legacy_paper_execution_config_review_required');
  assert.equal(overviewStatus(state, {stale: true}).status, 'Unverified');
});
test('pagination bounds a loaded list without mutating or dropping history', () => {
  const rows = Array.from({length: 42}, (_, id) => ({id}));
  assert.equal(pageRows(rows, 1).items.length, 20);
  assert.equal(pageRows(rows, 99).page, 3);
  assert.equal(pageRows(rows, 3).items[0].id, 40);
  assert.equal(rows.length, 42);
  assert.deepEqual(pageRows(null, -1), {items: [], page: 1, pages: 1, total: 0});
});
test('configured credentials never imply fresh scanner data', () => {
  const row = {id: 13, title: 'Mexc', enabled: true, has_secret: true};
  assert.equal(connectionAvailability(row).label, 'Data availability unknown');
  const now = Date.parse('2026-10-10T00:00:00Z');
  assert.equal(connectionAvailability(row, [{exchange: 'MEXC', last_success_at: '2026-10-09T23:59:59Z'}], now).tone, 'positive');
  assert.equal(connectionAvailability(row, [{exchange_id: 13, last_success_at: '2026-10-09T23:59:00Z'}], now).tone, 'warning');
  assert.equal(connectionAvailability(row, [{exchange_id: 13, active: false, last_success_at: '2026-10-09T23:59:59Z'}], now).tone, 'warning');
});
test('presentation keeps safety and all config bindings, uses collapsible diagnostics and local paging', () => {
  const src = readFileSync(new URL('../src/views/orderBookRecovery/v-order-book-recovery.vue', import.meta.url), 'utf8');
  assert.match(src, /:disabled="!canStart"/);
  assert.match(src, /settings-save-bar/);
  assert.match(src, /v-for="trade in historyPageData.items"/);
  assert.match(src, /research-diagnostics/);
  assert.match(src, /raw-block/);
  assert.match(src, /detail\('trade.exit_price', null\)/);
  assert.match(src, /detail\('trade.live_filled_amount', null\)/);
  for (const field of src.matchAll(/v-model(?:\.number)?="form\.([^"]+)"/g)) assert.ok(settingLabels[field[1]], `friendly review label for ${field[1]}`);
});
