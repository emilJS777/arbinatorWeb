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

export const buildConfigPayload = (form = {}) => ({
    ...form,
    exchange_id: Number(form.exchange_id),
    trading_pair_id: Number(form.trading_pair_id),
});
