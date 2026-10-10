import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyRuntimeStateStatus, inspectRuntimeStateResponse} from '../src/utils/runtimeStateStatus.js';
import {createPollingRuntime, runPollingGroup} from '../src/utils/pollingGuard.js';

const payload = {config: {execution_mode: 'paper'}, recovery_state: {}, enabled: false, open_position: null, paper_exit_diagnostics: null};
test('failed state keeps successful timestamp and incident without accepting replacement', () => {
  const good = inspectRuntimeStateResponse({status: 200, data: {success: true, obj: payload}}, emptyRuntimeStateStatus(), 'first');
  const bad = inspectRuntimeStateResponse({status: 500, data: {success: false, incident_id: 'safe-id'}}, good.status, 'second');
  assert.equal(bad.accepted, false);
  assert.equal(bad.status.stale, true);
  assert.equal(bad.status.lastSuccessfulAt, 'first');
  assert.equal(bad.status.incidentId, 'safe-id');
});
test('old contract is distinguishable from failed request and legitimate null exit diagnostics', () => {
  assert.deepEqual(inspectRuntimeStateResponse({status: 200, data: {success: true, obj: payload}}).status.missingFields, []);
  const old = inspectRuntimeStateResponse({status: 200, data: {success: true, obj: {enabled: false}}});
  assert.equal(old.accepted, true);
  assert.ok(old.status.missingFields.includes('config.execution_mode'));
  assert.ok(old.status.missingFields.includes('paper_exit_diagnostics'));
  for (const obj of [null, [], 'bad', {}]) assert.equal(inspectRuntimeStateResponse({data: {success: true, obj}}).accepted, false);
});
test('polling preserves safe server incident envelope', async () => {
  const result = await runPollingGroup({runtime: createPollingRuntime(), name: 'state', requests: [() => Promise.reject({response: {status: 500, data: {success: false, incident_id: 'incident'}}})]});
  assert.equal(result.responses[0].status, 500);
  assert.equal(result.responses[0].data.incident_id, 'incident');
});
