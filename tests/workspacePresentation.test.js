import test from 'node:test';
import assert from 'node:assert/strict';
import {canStartPaper, pnlEvidence, protectionLabel, settingsChanges, snapshotAge, validateSettings} from '../src/utils/workspacePresentation.js';
import {exchangePayload} from '../src/utils/exchangeForm.js';

test('live activation stays unavailable and emergency entry block is respected', () => {
  const config = {execution_mode: 'paper', exchange_id: 1, trading_pair_id: 2, emergency_entry_block: false};
  assert.equal(canStartPaper(config), true);
  assert.equal(canStartPaper({...config, execution_mode: 'live'}), false);
  assert.equal(canStartPaper({...config, emergency_entry_block: true}), false);
  assert.equal(canStartPaper(null), false);
});
test('PnL provenance distinguishes simulation, missing costs and verified fills', () => {
  assert.equal(pnlEvidence({pnl: 200}), 'Simulated PnL');
  const trade = {execution_mode: 'live', closed_at: '2026-10-08T12:00:00Z', live_entry_fee: 0, live_exit_fee: 0, funding_status: 'reconciled', pnl_source: 'verified_fills_with_funding'};
  assert.equal(pnlEvidence(trade), 'Exchange-reconciled PnL');
  assert.equal(pnlEvidence({...trade, exit_price_fallback_used: true}), 'Estimated PnL');
  assert.equal(pnlEvidence({...trade, live_entry_fee: null}), 'Unverified costs');
  assert.equal(pnlEvidence({...trade, funding_status: 'pending'}), 'Unverified costs');
  assert.equal(pnlEvidence({...trade, closed_at: null}), 'Unrealized estimate');
});
test('stale protection is not displayed as confirmed protected', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const trade = {execution_mode: 'live', tp_sl_protected: true, protection_status: 'active', protection_checked_at: '2026-10-08T11:59:55', protection_expires_at: '2026-10-09T00:00:00'};
  assert.equal(protectionLabel(trade, now), 'Protected');
  assert.equal(protectionLabel({...trade, protection_checked_at: null}, now), 'Needs verification');
  assert.equal(protectionLabel(trade, now + 60000), 'Needs verification');
  assert.equal(snapshotAge('2026-10-08T11:59:55', now), 5);
  assert.equal(snapshotAge(null, now), null);
});
test('review and validation do not silently change strategy values', () => {
  const form = {execution_mode: 'paper', exchange_id: 1, trading_pair_id: 2, base_margin_usdt: 10, leverage: 2, max_leverage: 2, max_position_margin_usdt: 10, max_open_positions: 1, take_profit_percent_of_margin: 4, stop_loss_percent_of_margin: 2};
  const before = structuredClone(form);
  assert.deepEqual(validateSettings(form, [{id: 1, pairs: [{id: 2}]}]), []);
  assert.deepEqual(form, before);
  assert.deepEqual(settingsChanges(form, {...form, base_margin_usdt: 7}), [{key: 'base_margin_usdt', before: 10, after: 7}]);
  assert.ok(validateSettings({...form, trading_pair_id: 3}, [{id: 1, pairs: [{id: 2}]}]).includes('Select trading pair'));
  assert.ok(validateSettings({...form, execution_mode: 'live', live_kill_switch: false}, []).includes('Live activation locked'));
});
test('editing connections never sends empty replacements for saved credentials', () => {
  const payload = exchangePayload({title: 'Mexc', enabled: true, api_key: '', api_secret: '', password: ''}, true);
  assert.equal(Object.hasOwn(payload, 'api_key'), false);
  assert.equal(Object.hasOwn(payload, 'api_secret'), false);
  assert.equal(exchangePayload({title: 'Mexc', api_key: 'new-test-key'}, true).api_key, 'new-test-key');
});
