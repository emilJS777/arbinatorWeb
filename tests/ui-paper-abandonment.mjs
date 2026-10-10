// Real Flask handlers + isolated PostgreSQL; all prices/legacy records are synthetic.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const api='http://127.0.0.1:5587';
const output='/private/tmp/arbinator-ui-paper-abandonment';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errors=[]; let confirm=false; let confirmation;
page.on('pageerror',error=>errors.push(error.message));
page.on('dialog',async dialog=>{confirmation=dialog.message(); await (confirm ? dialog.accept() : dialog.dismiss());});
async function get(path) {
  const response=await context.request.get(api+path); assert.equal(response.status(),200); return (await response.json()).obj;
}
try {
  const identity=await context.request.get(api+'/__fixture__/identity');
  const who=await identity.json();
  assert.equal(who.database,'arbinator_safety_test_ui_lifecycle');
  assert.equal(who.live_hard_disabled,'true');
  const initial=await get('/api/orderbook-recovery/state');
  let id=initial.open_position?.id;
  if (id) {
    assert.equal(initial.open_position.execution_mode,'paper');
    assert.deepEqual(initial.paper_exit_diagnostics.missing_fields,['paper_latency_ms','paper_taker_fee_percent']);
  } else {
    const seeded=await context.request.post(api+'/__fixture__/legacy-position',{data:{missing_execution_evidence:true,entries_enabled:true}});
    assert.equal(seeded.status(),200);
    id=(await seeded.json()).id;
  }
  const rejected=await context.request.post(api+`/api/orderbook-recovery/positions/${id}/close-manual`,{data:{reason:'manual_close'}});
  assert.equal(rejected.status(),409);
  assert.deepEqual((await rejected.json()).obj.fields,['paper_latency_ms','paper_taker_fee_percent']);
  await page.goto('http://127.0.0.1:5186/positions');
  await page.getByRole('heading',{level:1}).waitFor();
  const close=page.getByRole('button',{name:'Close Position',exact:true});
  const abandon=page.getByRole('button',{name:`Abandon legacy paper position #${id}`,exact:true});
  await abandon.waitFor();
  assert.equal(await close.isDisabled(),true);
  if ((await get('/api/orderbook-recovery/state')).enabled) {
    assert.equal(await abandon.isDisabled(),true);
    const paused=page.waitForResponse(r=>r.url().endsWith('/stop') && r.request().method()==='POST');
    await page.getByRole('button',{name:'Pause new entries',exact:true}).click();
    assert.equal((await (await paused).json()).success,true);
  }
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Abandon legacy paper position')&&!b.disabled));
  await page.screenshot({path:output+'/desktop-blocked.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:output+'/mobile-blocked.png',fullPage:true});
  const language=page.locator('select:has(option[value="ru"])');
  await language.selectOption('ru');
  assert.equal(await page.getByRole('button',{name:'Закрыть позицию',exact:true}).isDisabled(),true);
  const russianAction=page.getByRole('button',{name:`Снять legacy paper-позицию с учёта #${id}`,exact:true});
  assert.equal(await russianAction.isEnabled(),true);
  await russianAction.scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:output+'/mobile-controls-ru.png'});
  await language.selectOption('en');
  await abandon.click();
  assert.match(confirmation,new RegExp(`#${id}`));
  assert.equal((await get('/api/orderbook-recovery/state')).open_position.id,id);
  confirm=true;
  const response=page.waitForResponse(r=>r.url().endsWith(`/positions/${id}/abandon-legacy-paper`) && r.request().method()==='POST');
  await abandon.click();
  const applied=await response;
  assert.equal(applied.status(),200);
  const record=(await applied.json()).obj;
  assert.equal(record.pnl,null); assert.equal(record.closed_at,null); assert.equal(record.exit_price,null);
  assert.equal(record.accounting_status,'abandoned_unverified');
  await page.getByText('No open position',{exact:true}).waitFor();
  assert.equal((await get('/api/orderbook-recovery/state')).open_position,null);
  const history=await get('/api/orderbook-recovery/trades');
  assert.equal(history.find(t=>t.id===id).accounting_status,'abandoned_unverified');
  const again=await context.request.post(api+`/api/orderbook-recovery/positions/${id}/abandon-legacy-paper`,{data:{position_id:id,confirm_abandon:true}});
  assert.equal(again.status(),200);
  assert.equal((await again.json()).obj.abandoned_at,record.abandoned_at);
  await page.screenshot({path:output+'/mobile-preserved-history.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await writeFile(output+'/results.json',JSON.stringify({passed:true,fixture:true,identity:who,trade_id:id,record,errors},null,2));
  console.log(JSON.stringify({passed:true,fixture:true,trade_id:id,screenshots:output,errors}));
} finally {await browser.close();}
