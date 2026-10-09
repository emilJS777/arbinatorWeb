# Futures workspace UI

## Scope

Frontend-only refactor. Backend endpoints, trading decisions, execution, risk calculations,
TP/SL, recovery, ML capture and production data are unchanged. No live orders were sent.
No environment files or production configuration were edited.

## Navigation

- `/orderbook-recovery`: Overview, entries, exposure, freshness, entry blocks, protection,
  reconciliation and cross-exchange confirmation. Detailed diagnostics are collapsible.
- `/positions`: current position, paper/live history, provenance of PnL, trade inspector,
  archive/delete/export actions. History filter is client-side over the existing returned
  trade list; exports retain the existing backend scope (all non-archived closed trades).
- `/bot-settings`: basic execution/risk settings and advanced signal/consensus/feedback/ML
  settings. All 69 existing config bindings are retained. Changes require review before Save.
- `/research`: existing dataset browser, statistics, signal diagnostics, and explicit limits
  of the HTTP research interface. Collection/depth replay remain CLI workflows.
- `/exchanges`: connections and masked credential-presence indicators. Shared market,
  scanner and account-order screens remain accessible in the connection tabs.

The old arbitrage page, fixed opportunities widget, frontend detection algorithm and
arbitrage-specific API/store modules were removed. `/arbitrage` redirects to Overview.
Backend arbitrage data and exchange integrations were not removed. Historical FuturesTrend
research remains at `/research/legacy`; `/futures` and `/paper-trading` remain available.
They are explicitly separate from OrderBookRecovery and are not evidence of its performance.

## Safety and data presentation

- Live activation is locked in this UI. Only a saved paper config with no emergency entry
  block can use Start. This is a UI guard, not a replacement for server-side safety.
- Start does not silently save the draft. Pause calls the existing Stop endpoint; position
  close is separate and warns explicitly when closing an existing live position.
- PnL is labelled simulated, unrealized, estimated, costs-unverified, or exchange-reconciled.
  Verified fills require reconciled funding and known entry/exit fees. Zero fees are valid;
  absent fees are not treated as zero. Aggregate backend metrics can mix paper/live and are
  labelled as an unverified ledger, not confirmed profit.
- Protection is displayed as verified only for active, unexpired protection checked within
  30 seconds. This is a display freshness bound, not an execution parameter.
- Missing dataset statistics are not presented as confirmed zero counts before first success.
- Saved credentials are never shown. Blank credential edits preserve existing values.
- Existing `localStorage.lang` is honored (EN/RU). Technical reason codes, dataset column
  identifiers and raw exchange responses remain unmodified for traceability. Legacy pages
  retain some older English strings.

## Verification

```
npm test
npm run build
```

22 Node tests cover existing behavior plus paper-only start eligibility, PnL provenance,
protection freshness, settings validation without mutation and safe credential editing.

`tests/visual-workspace.mjs` uses Playwright with intercepted fixture API traffic only.
Start Vite with `VITE_WEB_API=http://127.0.0.1:5199/api` and
`VITE_WEB_SOCKET_URL=ws://127.0.0.1:5199/ws` on port 5178. Run the script with Playwright
installed or `PLAYWRIGHT_MODULE` pointing to its `index.mjs`. `CHROME_PATH` may select a
local Chrome executable. It checks five screens at 1440px/390px, Russian settings at
320px, config review/save payload, a sparse historical inspector, Escape dismissal and
503 handling. API writes are intercepted, never sent to a server.

## Remaining limitations

- No API for collection jobs or depth-replay reports exists. The UI does not invent one or
  claim data collection/strategy validation. Use the frozen research protocol and CLI tools.
- Visual tests use fixtures, not a live backend. Authentication and real exchange operations
  were not exercised, deliberately.
- Existing large vendor bundles still generate the Vite size warning; splitting/removing
  the overlapping UI/chart libraries is a separate dependency-performance task.
- The server still owns trade history limits, aggregate metric scope and reconciliation.
  UI guards do not prevent direct API calls from other clients.
