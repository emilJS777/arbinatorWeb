/* Blocking head script: resolve saved/system theme before the application can paint. */
(function () {
  'use strict';
  var key = 'arbinator.theme';
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function normalize(value) { return ['light', 'dark', 'system'].indexOf(value) >= 0 ? value : 'system'; }
  var saved;
  try { saved = window.localStorage.getItem(key); } catch (_) { saved = null; }
  var state = {preference: normalize(saved), resolved: 'light'};
  function apply() {
    state.resolved = state.preference === 'system' ? (media.matches ? 'dark' : 'light') : state.preference;
    document.documentElement.dataset.theme = state.resolved;
    document.documentElement.dataset.themePreference = state.preference;
    document.documentElement.style.colorScheme = state.resolved;
    window.dispatchEvent(new CustomEvent('arbinator:theme-change', {detail: {preference: state.preference, resolved: state.resolved}}));
  }
  state.set = function (value) {
    state.preference = normalize(value);
    try { window.localStorage.setItem(key, state.preference); } catch (_) { /* Theme still works without persistence. */ }
    apply();
  };
  if (media.addEventListener) media.addEventListener('change', apply);
  else media.addListener(apply);
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) {state.preference = normalize(event.newValue); apply();}
  });
  window.ArbinatorTheme = state;
  apply();
}());
