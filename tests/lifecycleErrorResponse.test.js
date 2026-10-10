import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('request keeps safe 409 evidence and incident metadata for UI', async () => {
  const obj={msg:'legacy_paper_execution_config_review_required',code:'legacy_paper_execution_config_review_required',fields:['paper_latency_ms'],position_id:4027,abandon_allowed:true,incident_id:'safe-id'};
  globalThis.__lifecycleHttp=async()=>{throw {response:{status:409,data:{success:false,obj}}};};
  globalThis.localStorage={getItem:()=>null};
  let source=await readFile(new URL('../src/store/request.js',import.meta.url),'utf8');
  source=source.replace('import Axios from "axios";','const Axios=globalThis.__lifecycleHttp;');
  source=source.replace('import { runtimeConfig } from "@/config/runtime.js";','const runtimeConfig={apiBaseUrl:"http://fixture.invalid/api"};');
  const request=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
  const result=await request(null,'/orderbook-recovery/positions/4027/close-manual','POST',{});
  assert.equal(result.status,409);
  assert.deepEqual(result.data.obj,obj);
  delete globalThis.__lifecycleHttp;
  delete globalThis.localStorage;
});
