# ArbiNator Frontend

Frontend dashboard for managing exchanges, trading pairs, live order books, and account orders for the ArbiNator arbitrage scanner.

## Stack

- Vue 3
- Vite
- Vuex
- Vue Router
- Vuetify / Vuestic UI
- Native WebSocket for live updates

## Environment

Create a local `.env` file from `.env.example`.

```env
VITE_WEB_API=http://localhost:5555/api
VITE_WEB_SOCKET_URL=ws://localhost:5555/apphub
```

Notes:

- `VITE_WEB_API` is used for REST requests.
- `VITE_WEB_SOCKET_URL` is used for streaming updates from the backend scanner.
- If `0.0.0.0` is used in env values, the frontend now normalizes it to the current browser hostname.

## Development

```sh
npm install
npm run dev
```

## Production Build

```sh
npm run build
```

## Current Runtime Contract

- REST responses are expected in the shape `{ success, obj }`.
- WebSocket messages are expected in the shape `{ topic, data }`.
- Frontend now tolerates malformed socket payloads better and surfaces transport-level failures as structured errors.

## Next Refactor Targets

- Extract a dedicated API layer from Vuex modules.
- Move arbitrage calculations out of UI-adjacent store mutations.
- Introduce typed runtime validation for REST and socket payloads.
- Add smoke tests for request and socket adapters.
# arbinatorWeb
