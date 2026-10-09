import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {applyChartPalette} from '../src/utils/chartTheme.js';

const script = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
function boot(saved, dark = false, brokenStorage = false) {
  const handlers = {}, media = {matches: dark, addEventListener: (event, cb) => {media.change = cb;}};
  const root = {dataset: {}, style: {}}, storage = {value: saved, getItem() {if (brokenStorage) throw Error('blocked'); return this.value;}, setItem(key, value) {if (brokenStorage) throw Error('blocked'); this.value = value;}};
  const window = {localStorage: storage, matchMedia: () => media, dispatchEvent: () => {}, addEventListener: (event, cb) => {handlers[event] = cb;}};
  runInNewContext(script, {window, document: {documentElement: root}, CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options.detail;}}});
  return {controller: window.ArbinatorTheme, root, storage, media, handlers};
}
test('theme defaults to system and resolves before app rendering', () => {
  const dark = boot(null, true);
  assert.equal(dark.controller.preference, 'system');
  assert.equal(dark.root.dataset.theme, 'dark');
  assert.equal(dark.root.style.colorScheme, 'dark');
  assert.equal(boot(null, false).root.dataset.theme, 'light');
});
test('saved explicit theme wins and persists changes', () => {
  const state = boot('light', true);
  assert.equal(state.root.dataset.theme, 'light');
  state.controller.set('dark');
  assert.equal(state.storage.value, 'dark');
  state.media.matches = false; state.media.change();
  assert.equal(state.root.dataset.theme, 'dark');
  state.controller.set('system');
  assert.equal(state.root.dataset.theme, 'light');
  state.media.matches = true; state.media.change();
  assert.equal(state.root.dataset.theme, 'dark');
});
test('invalid or inaccessible storage does not crash startup', () => {
  assert.equal(boot('invalid', true).controller.preference, 'system');
  const state = boot('light', true, true);
  assert.equal(state.root.dataset.theme, 'dark');
  state.controller.set('light');
  assert.equal(state.root.dataset.theme, 'light');
});
test('theme synchronizes across tabs and storage reset returns to system', () => {
  const state = boot('dark', false);
  state.handlers.storage({key: 'arbinator.theme', newValue: 'light'});
  assert.equal(state.root.dataset.theme, 'light');
  state.handlers.storage({key: 'other', newValue: 'dark'});
  assert.equal(state.root.dataset.theme, 'light');
  state.handlers.storage({key: null, newValue: null});
  assert.equal(state.controller.preference, 'system');
});
test('bootstrap is blocking and appears before the app entry point', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('<script src="/theme-init.js"></script>') < html.indexOf('<body>'));
  assert.ok(html.indexOf('/theme-tokens.css') < html.indexOf('/src/main.js'));
});
test('chart recoloring preserves all trading values', () => {
  const values = [10, 13, 9], chart = {data: {datasets: [{data: values}]}, options: {plugins: {title: {text: 'Trading Price'}}}, update(mode) {assert.equal(mode, 'none');}};
  applyChartPalette(chart, {line: '#78d6c2', fill: '#78d6c226', grid: '#343b46', label: '#bcc4d1', surface: '#22262c', text: '#edf0f5', border: '#596576'});
  assert.equal(chart.data.datasets[0].data, values);
  assert.equal(chart.options.plugins.title.text, 'Trading Price');
  assert.equal(chart.options.plugins.tooltip.bodyColor, '#edf0f5');
});
