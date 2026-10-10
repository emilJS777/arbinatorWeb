// Synthetic UI states only: every API/WS request is intercepted. No bot or exchange is contacted.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {configDefaults} from '../src/utils/orderBookRecoveryConfig.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.env.SCREENSHOT_DIR || '/private/tmp/arbinator-dashboard-polish-screens';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
const screens = [['/orderbook-recovery','overview'], ['/positions','positions'], ['/bot-settings','settings'], ['/research','research'], ['/exchanges','connections']];
const checks = [], errors = [], writes = [];
try {
  for (const theme of ['light', 'dark']) {
    for (const scenario of ['running', 'pending', 'abandoned', 'empty', 'error']) {
      const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
      await context.addInitScript(value => {localStorage.setItem('arbinator.theme', value); localStorage.setItem('lang', 'en');}, theme);
      const config = {...configDefaults, id: 1, exchange_id: 13, trading_pair_id: 20, exchange: 'Mexc', symbol: 'VELVET/USDT', execution_mode: 'paper', live_kill_switch: true,
        enabled: scenario === 'running' || scenario === 'pending', emergency_entry_block: scenario !== 'running' && scenario !== 'pending', base_margin_usdt: 7, leverage: 1, take_profit_percent_of_margin: 1.8, stop_loss_percent_of_margin: .9,
        max_snapshot_age_seconds: 5, max_daily_loss_usdt: 5, max_total_loss_usdt: 10, max_open_positions: 1, min_valid_exchanges: 2,
        min_confirming_exchanges: 2, min_consensus_ratio: .6, paper_session_id: 5, initial_paper_equity_usdt: 100};
      const stamp = () => new Date().toISOString();
      const history = scenario === 'empty' ? [] : Array.from({length: 45}, (_, i) => ({id: 4027 - i, execution_mode: 'paper', exchange: 'Mexc', symbol: 'VELVET/USDT', side: i % 2 ? 'long' : 'short', recovery_step: 0, margin: 7, notional: 7, leverage: 1, entry_price: .09251, exit_price: .09255, pnl: -.0084, result: 'loss', closed_at: stamp(), opened_at: stamp()}));
      if (scenario === 'abandoned') Object.assign(history[0], {abandoned_at: stamp(), result: 'abandoned', accounting_status: 'abandoned_unverified', pnl: null, closed_at: null, exit_price: null, paper_exit_status: 'abandoned_unverified', live_status: 'paper_abandoned'});
      const open = scenario === 'pending' ? {...history[0], closed_at: null, exit_price: null, pnl: null, result: null, paper_exit_status: 'pending_fixed_latency'} : null;
      await context.route('http://127.0.0.1:5199/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname;
        if (req.method() !== 'GET') writes.push({path, body: req.postDataJSON()});
        if (scenario === 'error') return route.fulfill({status: 503, json: {success: false, obj: {msg: 'Synthetic unavailable', incident_id: 'fixture-only'}}});
        let obj = [];
        const state = {config, status: config.enabled ? 'running' : 'stopped', enabled: config.enabled, recovery_state: {current_step: 0, current_margin: 7, is_stopped: !config.enabled, stop_reason: config.enabled ? null : 'manual_stop'},
          open_position: open, pending_order: scenario === 'pending' ? {id: 5000, pending_entry_expires_at: stamp()} : null,
          paper_exit_diagnostics: open ? {position_id: open.id, exit_block_reason: 'no_new_book_after_latency', pending_age_seconds: 1.5, latency_deadline: stamp(), last_valid_book_age_seconds: 8, worker_heartbeat: stamp()} : null,
          last_order_book_snapshot_time: scenario === 'empty' ? null : stamp(), runtime_diagnostics: {instance: 'fixture-pod-not-a-real-host', process_id: 1, state_contract_version: 'paper-lifecycle-state-v2', build_revision: 'synthetic'},
          reason_if_not_trading: config.enabled ? 'not_enough_valid_exchanges' : 'manual_stop'};
        const stats = {ml_market_snapshots_count: scenario === 'empty' ? 0 : 72000, ml_market_snapshots_pending_count: scenario === 'empty' ? 0 : 200, ml_market_snapshots_labeled_count: scenario === 'empty' ? 0 : 71800, ml_exchange_labels_count: scenario === 'empty' ? 0 : 144000, ml_exchange_labels_pending_count: 0, ml_exchange_labels_labeled_count: scenario === 'empty' ? 0 : 144000, ml_exchange_label_completion_percent: scenario === 'empty' ? 0 : 100};
        if (path.endsWith('/config')) {if (req.method() === 'PATCH') Object.assign(config, req.postDataJSON()); obj = config;}
        else if (path.endsWith('/options')) obj = {exchanges: [{id: 13, title: 'Mexc', pairs: [{id: 20, pair: 'VELVET/USDT', normalized_symbol: 'VELVETUSDT'}]}]};
        else if (path.endsWith('/state')) obj = state;
        else if (path.endsWith('/metrics')) obj = {accounting_scope: 'paper_session', paper_session_id: 5, net_pnl: scenario === 'empty' ? 0 : -.025, total_trades: history.length, win_rate: 45, total_win_pnl: .153, total_loss_pnl: -.178, profit_factor: .86, open_position: open};
        else if (path.endsWith('/debug')) obj = {...stats, reason_if_not_trading: state.reason_if_not_trading, per_exchange_features: scenario === 'empty' ? [] : [{exchange: 'Mexc', symbol: config.symbol, valid: true, imbalance: .72, spread_percent: .01, momentum: -.0001, short_signal: true, long_signal: false, reject_reason: null}], signal_diagnostics_last_100: []};
        else if (path.endsWith('/ml/stats')) obj = stats;
        else if (path.endsWith('/scanner/diagnostics')) obj = scenario === 'empty' ? [] : [{exchange_id: 13, exchange: 'Mexc', symbol: config.symbol, active: true, status: 'active', last_success_at: stamp(), latency_ms: 112}];
        else if (path.endsWith('/trades')) obj = history;
        else if (path.endsWith('/decision-details')) {const trade = history.find(t => path.includes(`/${t.id}/`)); obj = {trade, summary: trade, per_exchange_features: []};}
        else if (path.includes('/ml/')) obj = {items: scenario === 'empty' ? [] : [{id: 1, timestamp: stamp(), exchange: 'Mexc', symbol: config.symbol, reference_price: .09251, label_status: 'pending', final_side: 'short'}], page: 1, page_size: 50, total: scenario === 'empty' ? 0 : 72000, total_pages: scenario === 'empty' ? 0 : 1440};
        else if (path.includes('/exchange')) obj = scenario === 'empty' ? [] : [{id: 13, title: 'Mexc', enabled: true, has_api_key: true, has_secret: true}, {id: 14, title: 'Bybit', enabled: true, has_api_key: false, has_secret: false}];
        await route.fulfill({status: 200, json: {success: true, obj}});
      });
      await context.routeWebSocket('**/ws', () => {});
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      for (const [route, name] of screens) {
        await page.goto(`http://127.0.0.1:5188${route}`);
        await page.getByRole('heading', {level: 1}).waitFor();
        await page.waitForTimeout(200);
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        if (scenario === 'running' && name === 'overview') {
          assert.equal(await page.locator('#start-block-reasons .workspace-notice').count(), 0);
          assert.equal(await page.locator('.runtime-diagnostics').getAttribute('open'), null);
        }
        if (scenario === 'running' && name === 'settings') {
          await page.getByLabel('Base margin · USDT', {exact: true}).fill('7.5');
          assert.equal(await page.locator('.settings-save-bar').count(), 1);
          await page.evaluate(() => scrollTo(0, 0));
          const bar = await page.locator('.settings-save-bar').boundingBox();
          assert.ok(bar.y >= 0 && bar.y + bar.height <= 1000, 'review bar is visible while editing: ' + JSON.stringify({bar, ancestors: await page.locator('.settings-save-bar').evaluate(el => {let rows=[];for(;el;el=el.parentElement){let s=getComputedStyle(el);rows.push({tag:el.tagName,cl:el.className,overflow:s.overflow,position:s.position,bottom:s.bottom});}return rows;})}));
          await page.screenshot({path: `${out}/settings-${theme}-unsaved-desktop.png`});
          await page.setViewportSize({width:390,height:844});
          await page.evaluate(() => scrollTo(0, 0));
          const mobileBar = await page.locator('.settings-save-bar').boundingBox();
          assert.ok(mobileBar.y >= 0 && mobileBar.y + mobileBar.height <= 844, 'review bar visible on mobile');
          await page.screenshot({path: `${out}/settings-${theme}-unsaved-mobile.png`});
          await page.setViewportSize({width:1440,height:1000});
          await page.getByRole('button', {name: 'Review changes', exact: true}).click();
          await page.getByRole('button', {name: 'Save changes', exact: true}).click();
          await page.waitForTimeout(200);
          assert.equal(config.base_margin_usdt, 7.5);
          assert.equal(config.take_profit_percent_of_margin, 1.8);
          assert.equal(config.stop_loss_percent_of_margin, .9);
          assert.equal(config.live_kill_switch, true);
        }
        for (const [size, viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
          await page.setViewportSize(viewport);
          await page.evaluate(() => scrollTo(0, 0));
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}/${theme}/${scenario}/${size}`);
          await page.screenshot({path: `${out}/${name}-${theme}-${scenario}-${size}.png`});
          checks.push({name, theme, scenario, size});
        }
        await page.setViewportSize({width: 1440, height: 1000});
        if (scenario === 'abandoned' && name === 'positions') {
          await page.getByRole('button', {name: 'View Details', exact: true}).first().click();
          await page.getByRole('dialog').waitFor();
          await page.screenshot({path: `${out}/abandoned-drawer-${theme}.png`});
          await page.keyboard.press('Escape');
        }
        if (scenario === 'running' && name === 'positions') {
          const history = page.locator('.recovery-table').filter({has: page.locator('.recovery-row--trades')});
          await history.scrollIntoViewIfNeeded();
          await page.screenshot({path: `${out}/trades-${theme}-desktop.png`});
          await history.evaluate(el => {el.scrollLeft = el.scrollWidth;});
          await page.screenshot({path: `${out}/trades-actions-${theme}-desktop.png`});
          await page.setViewportSize({width:390,height:844});
          await history.scrollIntoViewIfNeeded();
          await page.screenshot({path: `${out}/trades-${theme}-mobile.png`});
          await page.setViewportSize({width:1440,height:1000});
        }
      }
      if (scenario === 'running') {
        await page.goto('http://127.0.0.1:5188/positions');
        await page.waitForTimeout(250);
        await page.getByRole('combobox', {name: 'Language', exact: true}).selectOption('ru');
        assert.equal(await page.getByText('Показать архив', {exact:true}).count(), 1);
        await page.screenshot({path:`${out}/positions-${theme}-ru.png`});
        const checkbox = await page.getByLabel('Показать архив').evaluate(el => getComputedStyle(el.parentElement).backgroundColor);
        assert.notEqual(checkbox, 'rgb(255, 255, 255)');
      }
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  assert.equal(writes.some(write => !write.path.endsWith('/config')), false, 'no orders/start/stop or history writes');
  await writeFile(`${out}/verification.json`, JSON.stringify({syntheticFixtures:true,checks,errors,writes,realBackendRequests:0},null,2));
  console.log(JSON.stringify({checks:checks.length,errors,writes:writes.length,screenshots:out,realBackendRequests:0}));
} finally {await browser.close();}
