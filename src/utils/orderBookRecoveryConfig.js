export const normalizeSymbol = (value) => String(value || "")
    .replace(/[\/\-_:\s]/g, "")
    .toUpperCase();

export const resolveExchange = (exchanges = [], form = {}) => {
    const byId = exchanges.find(exchange => Number(exchange.id) === Number(form.exchange_id));
    if (byId) return byId;
    const normalized = String(form.exchange || "").trim().toLowerCase();
    return exchanges.find(exchange => String(exchange.title || "").trim().toLowerCase() === normalized) || null;
};

export const resolvePair = (exchange, form = {}) => {
    if (!exchange) return null;
    const pairs = exchange.pairs || [];
    const byId = pairs.find(pair => Number(pair.id) === Number(form.trading_pair_id));
    if (byId) return byId;
    const normalized = normalizeSymbol(form.symbol);
    return pairs.find(pair => String(pair.normalized_symbol || "").toUpperCase() === normalized) || null;
};

export const pairOptionsForExchange = (exchanges = [], exchangeId) => {
    const exchange = exchanges.find(item => Number(item.id) === Number(exchangeId));
    return exchange?.pairs || [];
};

export const configDefaults = {
    execution_mode: "paper",
    live_enabled_confirmation: false,
    live_kill_switch: true,
    live_max_margin_usdt: 10,
    live_max_daily_loss_usdt: 5,
    live_max_total_loss_usdt: 10,
    live_order_type: "market",
    live_reduce_only_close: true,
    live_open_failed_cooldown_seconds: 60,
};

export const normalizeConfigForm = (form = {}) => ({
    ...configDefaults,
    ...form,
    execution_mode: ["paper", "live"].includes(form.execution_mode) ? form.execution_mode : configDefaults.execution_mode,
    live_enabled_confirmation: Boolean(form.live_enabled_confirmation),
    live_kill_switch: form.live_kill_switch === undefined ? configDefaults.live_kill_switch : Boolean(form.live_kill_switch),
    live_reduce_only_close: form.live_reduce_only_close === undefined ? configDefaults.live_reduce_only_close : Boolean(form.live_reduce_only_close),
    live_max_margin_usdt: Number(form.live_max_margin_usdt ?? configDefaults.live_max_margin_usdt),
    live_max_daily_loss_usdt: Number(form.live_max_daily_loss_usdt ?? configDefaults.live_max_daily_loss_usdt),
    live_max_total_loss_usdt: Number(form.live_max_total_loss_usdt ?? configDefaults.live_max_total_loss_usdt),
    live_order_type: form.live_order_type || configDefaults.live_order_type,
    live_open_failed_cooldown_seconds: Number(form.live_open_failed_cooldown_seconds ?? configDefaults.live_open_failed_cooldown_seconds),
});

export const buildConfigPayload = (form = {}) => ({
    ...normalizeConfigForm(form),
    exchange_id: Number(form.exchange_id),
    trading_pair_id: Number(form.trading_pair_id),
});
