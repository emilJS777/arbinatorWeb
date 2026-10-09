# Application themes

The header offers Light, Dark and System in English and Russian. System is the
default. The preference is stored in `localStorage['arbinator.theme']`.

`public/theme-init.js` applies the preference before Vue starts. Its blocking
head script and early `theme-tokens.css` avoid a wrong-theme first paint.
System preference changes and cross-tab storage changes update the theme.
Unavailable storage does not prevent rendering.

Semantic colors live in `public/theme-tokens.css`; `src/assets/theme.css` adapts
existing screens without changing data or trading behavior. Chart.js uses
`src/utils/chartTheme.js` to recolor existing datasets without replacing values.

Verification: `npm test`, `npm run build`. The existing mocked-browser harness
supports `THEME_MATRIX=1 node tests/visual-workspace.mjs` with the
`PLAYWRIGHT_MODULE` and `CHROME_PATH` environment variables. It checks both
themes on desktop/mobile, persistence, system changes, early application,
contrast tokens, drawers and rendered chart pixels. It does not contact a real
backend or place orders.
