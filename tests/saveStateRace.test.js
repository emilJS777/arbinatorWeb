import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Save reads post-write state and discards polling started before Save', async () => {
  let release;
  const oldState = new Promise(resolve => { release = resolve; });
  const config = {execution_mode:'paper', exchange_id:1, trading_pair_id:2, emergency_entry_block:false};
  let reads = 0;
  globalThis.__saveRaceApi = {
    getState: () => ++reads === 1 ? oldState : Promise.resolve({data:{success:true,obj:{config,enabled:false}}}),
    getMetrics: async () => ({data:{success:true,obj:{}}}),
    updateConfig: async () => ({data:{success:true,obj:config}}),
  };
  let source = await readFile(new URL('../src/store/modules/orderBookRecovery.js', import.meta.url),'utf8');
  source = source.replace('import orderBookRecoveryApi from "@/api/orderBookRecovery.js";', 'const orderBookRecoveryApi = globalThis.__saveRaceApi;');
  for (const file of ['orderBookRecoveryConfig','pollingGuard','safePayload','runtimeStateStatus']) {
    source = source.replace(`@/utils/${file}.js`, new URL(`../src/utils/${file}.js`,import.meta.url).href);
  }
  const module = (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
  const commits=[];
  const state = structuredClone(module.state);
  const context={commit:(key,value)=>{commits.push([key,value]); module.mutations[key](state,value);}};
  const polling = module.actions.LOAD_STATUS(context);
  await module.actions.SAVE_CONFIG(context, config);
  release({data:{success:true,obj:{enabled:true,config:{execution_mode:'live'}}}});
  await polling;
  assert.equal(reads,2);
  assert.deepEqual(state.STATE, {config,enabled:false});
  assert.equal(commits.filter(([key])=>key==='SET_STATE_RESPONSE').length, 1);
  module.mutations.SET_STATE_RESPONSE(state, {status:500,data:{success:false,obj:{incident_id:'state-incident'}}});
  assert.deepEqual(state.STATE, {config,enabled:false});
  assert.equal(state.STATE_REQUEST.stale,true);
  assert.equal(state.STATE_REQUEST.incidentId,'state-incident');
  delete globalThis.__saveRaceApi;
});
