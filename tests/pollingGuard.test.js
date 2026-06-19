import test from 'node:test';
import assert from 'node:assert/strict';
import {backoffDelayForFailures, createPollingRuntime, runPollingGroup} from '../src/utils/pollingGuard.js';

const ok = value => ({data: {success: true, obj: value}, status: 200});
const unavailable = () => ({data: {success: false, obj: {msg: 'unavailable'}}, status: 503});

test('polling group does not run concurrently', async () => {
  const runtime = createPollingRuntime();
  let calls = 0;
  let release;
  const slowRequest = () => new Promise(resolve => {
    calls += 1;
    release = () => resolve(ok({done: true}));
  });

  const first = runPollingGroup({runtime, name: 'debug', requests: [slowRequest]});
  const second = await runPollingGroup({runtime, name: 'debug', requests: [() => ok({skipped: false})]});
  release();
  await first;

  assert.equal(second.skipped, true);
  assert.equal(calls, 1);
});

test('polling group uses allSettled and keeps successful responses', async () => {
  const runtime = createPollingRuntime();
  const result = await runPollingGroup({
    runtime,
    name: 'mixed',
    requests: [
      () => Promise.resolve(ok({state: 'old data survives'})),
      () => Promise.reject(new Error('boom')),
    ],
  });

  assert.equal(result.skipped, false);
  assert.equal(result.responses.length, 2);
  assert.equal(result.responses[0].data.success, true);
  assert.equal(result.responses[1].data.success, false);
});

test('503 response enables backoff and skips next tick', async () => {
  const runtime = createPollingRuntime();
  let unavailableState = false;
  let now = 1000;

  const first = await runPollingGroup({
    runtime,
    name: 'status',
    requests: [() => Promise.resolve(unavailable())],
    onUnavailableChange: value => { unavailableState = value; },
    now: () => now,
  });
  const second = await runPollingGroup({
    runtime,
    name: 'status',
    requests: [() => Promise.resolve(ok({}))],
    now: () => now + 1000,
  });

  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(unavailableState, true);
  assert.equal(runtime.groups.status.nextAllowedAt, 1000 + backoffDelayForFailures(1));
});
