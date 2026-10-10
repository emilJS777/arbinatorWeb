import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canOfferPaperAbandonment, paperAbandonmentBody} from '../src/utils/paperAbandonment.js';
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
});
