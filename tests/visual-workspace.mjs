// Isolated UI fixture. All HTTP API traffic is intercepted; never connects to an exchange/backend.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {configDefaults} from '../src/utils/orderBookRecoveryConfig.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
const errors = [], writes = [];
const config = {...configDefaults, id: 1, exchange_id: 1, trading_pair_id: 2, exchange: 'Mexc', symbol: 'BTC/USDT', enabled: false, base_margin_usdt: 10, leverage: 2, max_open_positions: 1, take_profit_percent_of_margin: 4, stop_loss_percent_of_margin: 2, min_valid_exchanges: 2, min_confirming_exchanges: 2, min_consensus_ratio: 0.6, max_snapshot_age_seconds: 5, long_imbalance_threshold: 1.3, short_imbalance_threshold: 0.77, entry_mode: 'instant', max_daily_loss_usdt: 5, max_total_loss_usdt: 10};
const now = new Date().toISOString();
const trade = {id: 42, execution_mode: 'paper', side: 'long', recovery_step: 0, margin: 10, leverage: 2, notional: 20, entry_price: 65000, exit_price: 65100, pnl: 0.025, result: 'win', opened_at: now, closed_at: now};
const state = {config, enabled: false, status: 'stopped', recovery_state: {is_stopped: true, current_margin: 10, current_step: 0, stop_reason: 'manual_stop'}, open_position: null, last_order_book_snapshot_time: now};
const stats = {ml_market_snapshots_count: 120, ml_market_snapshots_pending_count: 20, ml_market_snapshots_labeled_count: 100, ml_exchange_labels_count: 240, ml_exchange_labels_pending_count: 40, ml_exchange_labels_labeled_count: 200, ml_exchange_label_completion_percent: 83.33};
const options = {exchanges: [{id: 1, title: 'Mexc', pairs: [{id: 2, pair: 'BTC/USDT', normalized_symbol: 'BTCUSDT'}]}]};
let fail = false;
await context.route('http://127.0.0.1:5199/api/**', async route => {
  const url = new URL(route.request().url()), path = url.pathname;
  if (route.request().method() !== 'GET') writes.push({path, body: route.request().postDataJSON()});
  if (fail) return route.fulfill({status: 503, json: {success: false, obj: {msg: 'Fixture unavailable'}}});
  let obj = [];
  if (path.endsWith('/config')) {if (route.request().method() === 'PATCH') Object.assign(config, route.request().postDataJSON()); obj = config;}
  else if (path.endsWith('/options')) obj = options;
  else if (path.endsWith('/state')) obj = state;
  else if (path.endsWith('/metrics')) obj = {net_pnl: .025, total_trades: 1, win_rate: 100, profit_factor: null, total_win_pnl: .025, total_loss_pnl: 0};
  else if (path.endsWith('/debug')) obj = {...stats, status: 'stopped', reason_if_not_trading: 'emergency_entry_block', per_exchange_features: [{exchange: 'Mexc', symbol: 'BTC/USDT', valid: true, imbalance: 1.12, spread_percent: .01, momentum: -.0001, long_signal: false, short_signal: false}]};
  else if (path.endsWith('/ml/stats')) obj = stats;
  else if (path.endsWith('/trades')) obj = [trade];
  else if (path.endsWith('/decision-details')) obj = {trade, summary: trade, per_exchange_features: []};
  else if (path.includes('/ml/')) obj = {items: [{id: 1, timestamp: now, exchange: 'Mexc', symbol: 'BTC/USDT', label_status: 'pending'}], page: 1, page_size: 50, total: 1, total_pages: 1};
  else if (path.includes('/exchange')) obj = [{id: 1, title: 'Mexc', enabled: true, has_api_key: true, has_secret: true}];
  await route.fulfill({status: 200, json: {success: true, obj}});
});
await context.routeWebSocket('**/ws', () => {});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
const out = process.env.SCREENSHOT_DIR || '/private/tmp/arbinator-workspace-screens';
await mkdir(out, {recursive: true});
for (const [route, name] of [['/orderbook-recovery','overview'],['/positions','positions'],['/bot-settings','settings'],['/research','research'],['/exchanges','connections']]) {
  await page.goto(`http://127.0.0.1:5178${route}`);
  await page.waitForTimeout(900);
  assert.equal(await page.locator('h1').count(), 1, JSON.stringify({name, errors, body: (await page.locator('body').innerText()).slice(0,1500)}));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, name + ' desktop overflow');
  await page.screenshot({path: `${out}/${name}-desktop.png`, fullPage: false});
  await page.setViewportSize({width: 390, height: 844});
  await page.screenshot({path: `${out}/${name}-mobile.png`, fullPage: true});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, name + ' mobile overflow');
  await page.setViewportSize({width: 1440, height: 1000});
}
await page.goto('http://127.0.0.1:5178/bot-settings');
await page.waitForTimeout(500);
await page.getByLabel('Base margin · USDT', {exact: true}).fill('7');
await page.getByRole('button', {name: 'Review changes', exact: true}).click();
await page.getByRole('button', {name: 'Save changes', exact: true}).click();
await page.waitForTimeout(400);
assert.equal(writes.length, 1);
assert.equal(writes[0].body.base_margin_usdt, 7);
assert.equal(writes[0].body.execution_mode, 'paper');
assert.equal(writes[0].body.live_kill_switch, true);
assert.equal(writes[0].body.ml_mode, 'disabled');
assert.equal(writes.some(write => /start|close|order/.test(write.path.replace('/orderbook-recovery', ''))), false);
await page.goto('http://127.0.0.1:5178/positions');
await page.getByRole('button', {name: 'View Details', exact: true}).click();
await page.waitForTimeout(500);
assert.equal(await page.getByRole('dialog').count(), 1, JSON.stringify({errors, body: (await page.locator('body').innerText()).slice(-2000)}));
await page.screenshot({path: `${out}/trade-inspector-desktop.png`});
await page.keyboard.press('Escape');
assert.equal(await page.getByRole('dialog').count(), 0);
await page.getByRole('combobox', {name: 'Language'}).selectOption('ru');
await page.goto('http://127.0.0.1:5178/bot-settings');
await page.waitForTimeout(500);
await page.setViewportSize({width: 320, height: 800});
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'Russian settings 320px overflow');
await page.screenshot({path: `${out}/settings-ru-mobile.png`, fullPage: true});
await page.getByRole('combobox', {name: 'Язык'}).selectOption('en');
await page.setViewportSize({width: 1440, height: 1000});
if (process.env.THEME_MATRIX) {
  await page.getByRole('combobox', {name: 'Theme', exact: true}).selectOption('system');
  await page.emulateMedia({colorScheme: 'dark'});
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.emulateMedia({colorScheme: 'light'});
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', {name: 'Theme', exact: true}).selectOption(theme);
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
    assert.equal(await page.evaluate(() => localStorage.getItem('arbinator.theme')), theme);
    for (const [route, name] of [['/orderbook-recovery','overview'],['/positions','positions'],['/bot-settings','settings'],['/research','research'],['/exchanges','connections'],['/orderBooks','books'],['/futures','legacy-futures']]) {
      await page.goto(`http://127.0.0.1:5178${route}`);
      await page.waitForTimeout(450);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, name + theme + ' desktop overflow');
      await page.screenshot({path: `${out}/${name}-${theme}-desktop.png`});
      await page.setViewportSize({width: 390, height: 844});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, name + theme + ' mobile overflow');
      await page.screenshot({path: `${out}/${name}-${theme}-mobile.png`});
      await page.setViewportSize({width: 1440, height: 1000});
    }
    await page.goto('http://127.0.0.1:5178/exchanges');
    await page.getByRole('button', {name: 'Edit', exact: true}).click();
    await page.screenshot({path: `${out}/drawer-${theme}-desktop.png`});
    await page.keyboard.press('Escape');
    const ratios = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      const luminance = token => {
        const hex = styles.getPropertyValue(token).trim().slice(1);
        const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i,i+2),16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
        return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
      };
      return [['--text-primary','--surface-panel'],['--text-secondary','--surface-panel'],['--text-muted','--surface-input'],['--success-text','--success-surface'],['--danger-text','--danger-surface'],['--warning-text','--warning-surface'],['--info-text','--info-surface'],['--accent-on-solid','--accent-solid']].map(([fg,bg]) => {
        const a=luminance(fg), b=luminance(bg); return {fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
      });
    });
    for (const row of ratios) assert.ok(row.ratio >= 4.5, `${theme}: ${row.fg} contrast ${row.ratio}`);
    console.log(JSON.stringify({theme,contrast:ratios}));
  }
  await page.getByRole('combobox', {name: 'Language'}).selectOption('ru');
  assert.equal(await page.getByRole('combobox', {name: 'Тема', exact: true}).inputValue(), 'dark');
  await page.setViewportSize({width: 320, height: 800});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await page.screenshot({path: `${out}/selector-ru-dark-mobile.png`});
  await page.getByRole('combobox', {name: 'Язык'}).selectOption('en');
  await page.setViewportSize({width: 1440, height: 1000});
  await page.evaluate(async () => {
    const path = '/src/views/tradingPairs/components/v-trading-chart-block.vue';
    const source = await (await fetch(path)).text();
    const vuePath = source.match(/from ["']([^"']*vue\.js[^"']*)["']/)[1];
    const {createApp} = await import(vuePath);
    const {default: component} = await import(path);
    const host = document.createElement('div'); host.id = 'theme-chart-fixture'; host.style.cssText = 'height:260px;width:600px;max-width:100%;';
    document.querySelector('#main-content').prepend(host);
    window.testChartApp = createApp(component, {trades: [{timestamp: '1000', price: 10}, {timestamp: '2000', price: 12}, {timestamp: '3000', price: 11}]});
    window.testChartApp.mount(host);
  });
  for (const theme of ['light', 'dark']) {
    await page.getByRole('combobox', {name: 'Theme', exact: true}).selectOption(theme);
    await page.waitForTimeout(500);
    const coloredPixels = await page.evaluate(() => {
      const canvas = document.querySelector('#theme-chart-fixture canvas');
      const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const hex = getComputedStyle(document.documentElement).getPropertyValue('--chart-line').trim().slice(1);
      const color = [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
      let count = 0;
      for(let i=0;i<pixels.length;i+=4) if(pixels[i+3]>200 && color.every((v,j)=>Math.abs(v-pixels[i+j])<5)) count++;
      return count;
    });
    assert.ok(coloredPixels > 10, `${theme} chart line uses semantic palette`);
    await page.locator('#theme-chart-fixture').screenshot({path: `${out}/chart-${theme}.png`});
  }
  await page.evaluate(() => {window.testChartApp.unmount(); document.querySelector('#theme-chart-fixture').remove();});
  const early = await browser.newContext({colorScheme: 'light'});
  await early.addInitScript(() => localStorage.setItem('arbinator.theme', 'dark'));
  await early.route(/\/src\/main\.js(?:\?.*)?$/, route => route.abort());
  const earlyPage = await early.newPage();
  await earlyPage.goto('http://127.0.0.1:5178/');
  assert.equal(await earlyPage.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await earlyPage.locator('#app').innerHTML(), '');
  assert.equal(await earlyPage.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(17, 19, 21)');
  await early.close();
}
fail = true;
await page.goto('http://127.0.0.1:5178/orderbook-recovery');
await page.waitForTimeout(600);
assert.ok(await page.getByText('Backend unavailable. Retained data may be out of date.', {exact: true}).count());
await page.screenshot({path: `${out}/disconnected-desktop.png`});
assert.deepEqual(errors, []);
await browser.close();
console.log(JSON.stringify({screenshots: out, pageErrors: errors, interceptedWrites: writes.length, realBackendRequests: 0}));
