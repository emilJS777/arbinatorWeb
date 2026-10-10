# Futures dashboard presentation

This is a frontend-only change. API paths, payloads, settings values, store actions,
execution, session accounting and live activation gates are unchanged.

## Screens

- Overview: entry status, wait reason, snapshot freshness, exposure and accounting scope.
- Positions: primary summary, bounded loaded-history pages, inspection drawers and archive tools.
- Settings: execution/risk/paper/exit groups, cost estimates and sticky draft review.
- Research: server-paginated datasets; filters, raw JSON and signal diagnostics expand on demand.
- Connections: configuration, credentials and scanner availability are distinct states.

History pagination only partitions the rows already returned by the existing API.
It does not claim to retrieve additional historical records. ML pagination remains
server-side. Connection freshness means a scanner success within five seconds,
not verified futures compatibility or confirmed execution readiness.

## Verify

```bash
cd /Users/emilhambardzumyan/WebstormProjects/arbinator
npm test
npm run build
VITE_WEB_API=http://127.0.0.1:5199/api \
VITE_WEB_SOCKET_URL=ws://127.0.0.1:5199/ws \
npm run dev -- --host 127.0.0.1 --port 5188 --strictPort
```

In a separate terminal, with Playwright available:

```bash
node tests/visual-dashboard-polish.mjs
```

Optional `PLAYWRIGHT_MODULE`, `CHROME_PATH`, and `SCREENSHOT_DIR` select an existing
runtime/browser and output path. The test intercepts all API/WebSocket requests.
It never contacts a real backend or sends orders. All displayed records, prices,
statistics and states are synthetic fixtures, not hosted observations.

The browser test covers five screens, two themes, desktop/mobile and running,
pending, abandoned, empty and unavailable states. It also verifies RU archive
controls, draft review visibility, unchanged TP/SL in a simulated Save, safe live
defaults, no page errors and no horizontal page overflow.

Default screenshots: `/private/tmp/arbinator-dashboard-polish-screens`.
`verification.json` contains the matrix and intercepted requests.

Deploy only the frontend via the existing manual push/redeploy workflow.
No backend migration is required by this change.
