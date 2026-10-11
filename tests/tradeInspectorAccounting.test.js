import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {utcTime, pnlEvidence} from '../src/utils/workspacePresentation.js';

test('paper records without abandonment remain simulated; real abandonment remains excluded', () => {
  assert.equal(pnlEvidence({execution_mode: 'paper', abandoned_at: null}), 'Simulated PnL');
  assert.equal(pnlEvidence({execution_mode: 'paper', abandoned_at: '2026-10-11T00:00:00Z'}), 'Abandoned / unverified; excluded from accounting');
  const view = readFileSync(new URL('../src/views/orderBookRecovery/v-order-book-recovery.vue', import.meta.url), 'utf8');
  assert.ok(view.includes(`v-if="detail('trade.abandoned_at', null)"`));
  assert.ok(!view.includes(`v-if="detail('trade.abandoned_at')"`));
});
test('Flask GMT, ISO UTC and naive ISO dates render the same instant', () => {
  const expected = Date.parse('2026-10-11T12:00:00Z');
  for (const value of ['Sun, 11 Oct 2026 12:00:00 GMT', '2026-10-11T12:00:00', '2026-10-11 12:00:00', '2026-10-11T12:00:00Z']) assert.equal(utcTime(value), expected);
  assert.ok(Number.isNaN(utcTime('-')));
  assert.ok(Number.isNaN(utcTime(null)));
});
