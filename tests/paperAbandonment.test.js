import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canOfferPaperAbandonment, paperAbandonmentBody, paperCloseBlockReason, paperAbandonmentUnavailableReason} from '../src/utils/paperAbandonment.js';
import {pnlEvidence} from '../src/utils/workspacePresentation.js';

test('action offered only for confirmed legacy paper state, never ambiguous/live/stale', () => {
  const position={id:77,execution_mode:'paper'};
  const runtime={open_position:position,paper_exit_diagnostics:{abandon_allowed:true,exit_block_reason:'legacy_paper_execution_config_review_required'}};
  assert.equal(canOfferPaperAbandonment(position,runtime,{stale:false}),true);
  for (const execution_mode of [null,'live','unknown']) assert.equal(canOfferPaperAbandonment({...position,execution_mode},runtime,{}),false);
  assert.equal(canOfferPaperAbandonment(position,runtime,{stale:true}),false);
  assert.equal(canOfferPaperAbandonment(position,{...runtime,paper_exit_diagnostics:{}},{}),false);
  assert.deepEqual(paperAbandonmentBody(77),{confirm_abandon:true,position_id:77});
  assert.equal(pnlEvidence({...position,abandoned_at:'now'}),'Abandoned / unverified; excluded from accounting');
});
test('UI confirmation includes captured position ID; action uses dedicated endpoint', async () => {
  const ui=await readFile(new URL('../src/views/orderBookRecovery/v-order-book-recovery.vue',import.meta.url),'utf8');
  const api=await readFile(new URL('../src/api/orderBookRecovery.js',import.meta.url),'utf8');
  assert.ok(ui.includes('#${positionId}?'));
  assert.ok(ui.includes('paperAbandonmentBody(positionId)'));
  assert.ok(api.includes('/abandon-legacy-paper'));
  const positionActions = ui.slice(ui.indexOf('<div class="action-row" v-if="openPosition">'));
  assert.ok(positionActions.indexOf('@click="abandonLegacyPaper"') < positionActions.indexOf('Last Trades'));
});

test('legacy close is blocked with explicit compatibility/pause reason; valid delayed exits stay available', () => {
  const position={id:4027,execution_mode:'paper'};
  const runtime={enabled:true,open_position:position,paper_exit_diagnostics:{exit_block_reason:'legacy_paper_execution_config_review_required'}};
  assert.equal(paperCloseBlockReason(position,runtime,{}),'legacy_paper_execution_config_review_required');
  assert.equal(canOfferPaperAbandonment(position,runtime,{}),false);
  assert.equal(paperAbandonmentUnavailableReason(position,runtime,{}),'Abandon action unavailable; update backend and database, then refresh');
  runtime.paper_exit_diagnostics.abandon_allowed=true;
  runtime.paper_exit_diagnostics.abandon_block_reason='pause_entries_before_abandon';
  assert.equal(canOfferPaperAbandonment(position,runtime,{}),true);
  assert.equal(paperAbandonmentUnavailableReason(position,runtime,{}),'pause_entries_before_abandon');
  runtime.paper_exit_diagnostics.exit_block_reason='missing_execution_book';
  assert.equal(paperCloseBlockReason(position,runtime,{}),null);
  assert.equal(paperCloseBlockReason(position,runtime,{stale:true}),'Refresh current position state before closing');
});

test('Close 409 refreshes state despite polling; abandonment refreshes accounting and drops older polling', async () => {
  let release;
  const oldState = new Promise(resolve => { release=resolve; });
  let reads=0;
  const runtime={config:{execution_mode:'paper'},enabled:false,open_position:{id:4027,execution_mode:'paper'},recovery_state:{},paper_exit_diagnostics:{abandon_allowed:true}};
  globalThis.__paperLifecycleApi={
    getState:()=>++reads===1 ? oldState : Promise.resolve({data:{success:true,obj:runtime}}),
    getMetrics:async()=>({data:{success:true,obj:{total_pnl:0,open_position:null}}}),
    getTrades:async()=>({data:{success:true,obj:[{id:4027,accounting_status:'abandoned_unverified',pnl:null}]}}),
    closeManual:async()=>({status:409,data:{success:false,obj:{code:'legacy_paper_execution_config_review_required'}}}),
    abandonLegacyPaper:async(id,body)=>{assert.deepEqual(body,paperAbandonmentBody(4027));runtime.open_position=null;return {data:{success:true,obj:{id,abandoned_at:'now'}}};},
  };
  let source=await readFile(new URL('../src/store/modules/orderBookRecovery.js',import.meta.url),'utf8');
  source=source.replace('import orderBookRecoveryApi from "@/api/orderBookRecovery.js";','const orderBookRecoveryApi=globalThis.__paperLifecycleApi;');
  for (const name of ['orderBookRecoveryConfig','pollingGuard','safePayload','runtimeStateStatus']) source=source.replace(`@/utils/${name}.js`,new URL(`../src/utils/${name}.js`,import.meta.url).href);
  const module=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
  const state=structuredClone(module.state);
  const context={state,commit:(key,value)=>module.mutations[key](state,value)};
  const polling=module.actions.LOAD_STATUS(context);
  assert.equal((await module.actions.CLOSE_MANUAL(context,4027)).status,409);
  assert.equal(state.STATE.open_position.id,4027);
  await module.actions.ABANDON_LEGACY_PAPER(context,{positionId:4027,body:paperAbandonmentBody(4027)});
  release({data:{success:true,obj:{...runtime,open_position:{id:4027}}}});
  await polling;
  assert.equal(state.STATE.open_position,null);
  assert.equal(state.METRICS.total_pnl,0);
  assert.equal(state.TRADES[0].accounting_status,'abandoned_unverified');
  delete globalThis.__paperLifecycleApi;
});
