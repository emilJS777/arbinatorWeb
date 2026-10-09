import test from 'node:test';
import assert from 'node:assert/strict';
import {startBlockReasons} from '../src/utils/workspacePresentation.js';

const config = {execution_mode: 'paper', exchange_id: 1, trading_pair_id: 2, emergency_entry_block: false};
test('saved paper allows Start without changing config', () => {
  assert.deepEqual(startBlockReasons({config, runtime: {config, enabled: false}}), []);
});
test('each safety and UI condition has an explicit reason', () => {
  for (const args of [
    {}, {config: {...config, execution_mode: 'live'}},
    {config: {...config, execution_mode: undefined}},
    {config: {...config, exchange_id: null}}, {config: {...config, trading_pair_id: null}},
    {config: {...config, emergency_entry_block: true}}, {config, dirty: true},
    {config, loading: true}, {config, runtime: {enabled: true}},
  ]) assert.ok(startBlockReasons(args).length > 0);
});
test('stale runtime cannot silently override a saved mode', () => {
  const reasons = startBlockReasons({config, runtime: {config: {...config, execution_mode: 'live'}}});
  assert.deepEqual(reasons, ['Saved config and last runtime state disagree; refresh before starting']);
  assert.deepEqual(startBlockReasons({config, runtime: {config}}), []);
});
test('draft paper cannot bypass saved live lock and multiple blockers stay visible', () => {
  const reasons = startBlockReasons({config: {...config, execution_mode: 'live', emergency_entry_block: true}, dirty: true});
  assert.equal(reasons.length, 3);
  assert.ok(reasons.some(reason => reason.includes('LIVE')));
});
