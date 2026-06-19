export const normalizeArray = (value) => Array.isArray(value) ? value : [];

export const normalizeObjectValues = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
    return [];
};

export const isValidMlStats = (value) => {
    if (!value || typeof value !== "object") return false;
    return [
        "ml_market_snapshots_count",
        "ml_market_snapshots_pending_count",
        "ml_market_snapshots_labeled_count",
        "ml_exchange_labels_count",
        "ml_exchange_labels_pending_count",
        "ml_exchange_labels_labeled_count",
    ].every(key => Number.isFinite(Number(value[key])));
};
