import { apiClient } from "@/api/client.js";
import { runtimeConfig } from "@/config/runtime.js";

const mlDatasetPaths = {
    feature: "feature-snapshots",
    market: "market-snapshots",
    price_history: "price-history",
    exchange_label: "exchange-labels",
};

const buildQuery = (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") search.set(key, value);
    });
    return search.toString();
};

export default {
    getConfig() {
        return apiClient.get("/orderbook-recovery/config");
    },
    getOptions() {
        return apiClient.get("/orderbook-recovery/options");
    },
    updateConfig(body) {
        return apiClient.patch("/orderbook-recovery/config", body);
    },
    startPaper() {
        return apiClient.post("/orderbook-recovery/start-paper", {});
    },
    stop() {
        return apiClient.post("/orderbook-recovery/stop", {});
    },
    getState() {
        return apiClient.get("/orderbook-recovery/state");
    },
    getTrades(includeArchived = false) {
        return apiClient.get(`/orderbook-recovery/trades?include_archived=${includeArchived ? "true" : "false"}`);
    },
    getMetrics() {
        return apiClient.get("/orderbook-recovery/metrics");
    },
    getDebug() {
        return apiClient.get("/orderbook-recovery/debug");
    },
    getMlStats() {
        return apiClient.get("/orderbook-recovery/ml/stats");
    },
    clearDiagnostics() {
        return apiClient.post("/orderbook-recovery/diagnostics/clear", {});
    },
    resetRecovery() {
        return apiClient.post("/orderbook-recovery/recovery/reset", {});
    },
    setCurrentMargin(currentMargin) {
        return apiClient.post("/orderbook-recovery/recovery/set-current-margin", {
            current_margin: currentMargin,
        });
    },
    getScannerDiagnostics() {
        return apiClient.get("/scanner/diagnostics");
    },
    closeManual(positionId) {
        return apiClient.post(`/orderbook-recovery/positions/${positionId}/close-manual`, {
            reason: "manual_close",
        });
    },
    archiveTrade(tradeId) {
        return apiClient.post(`/orderbook-recovery/trades/${tradeId}/archive`, {
            reason: "manual_archive",
        });
    },
    deleteArchivedTrade(tradeId) {
        return apiClient.post(`/orderbook-recovery/trades/${tradeId}/delete-archived`, {});
    },
    deleteAllArchivedTrades() {
        return apiClient.post("/orderbook-recovery/trades/delete-all-archived", {});
    },
    archiveAllClosed() {
        return apiClient.post("/orderbook-recovery/trades/archive-all-closed", {
            reason: "archive_all_closed",
        });
    },
    unarchiveAll() {
        return apiClient.post("/orderbook-recovery/trades/unarchive-all", {});
    },
    getDecisionDetails(tradeId) {
        return apiClient.get(`/orderbook-recovery/trades/${tradeId}/decision-details`);
    },
    exportTrades(format = "csv", includeArchived = false) {
        const params = new URLSearchParams({
            format,
            include_archived: includeArchived ? "true" : "false",
        });
        return fetch(`${runtimeConfig.apiBaseUrl}/orderbook-recovery/trades/export?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
            },
        });
    },
    exportMlDataset(format = "csv") {
        const params = new URLSearchParams({format});
        return fetch(`${runtimeConfig.apiBaseUrl}/orderbook-recovery/ml/dataset/export?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
            },
        });
    },
    exportMlMarketSnapshots(format = "csv") {
        const params = new URLSearchParams({format});
        return fetch(`${runtimeConfig.apiBaseUrl}/orderbook-recovery/ml/market-snapshots/export?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
            },
        });
    },
    exportMlExchangeLabels(format = "csv") {
        const params = new URLSearchParams({format});
        return fetch(`${runtimeConfig.apiBaseUrl}/orderbook-recovery/ml/exchange-labels/export?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
            },
        });
    },
    getMlDataset(dataset, params = {}) {
        const query = buildQuery(params);
        return apiClient.get(`/orderbook-recovery/ml/${mlDatasetPaths[dataset]}${query ? `?${query}` : ""}`);
    },
    getMlDatasetDetail(dataset, id) {
        return apiClient.get(`/orderbook-recovery/ml/${mlDatasetPaths[dataset]}/${id}`);
    },
    exportMlDatasetExplorer(dataset, params = {}) {
        const query = buildQuery(params);
        return fetch(`${runtimeConfig.apiBaseUrl}/orderbook-recovery/ml/${mlDatasetPaths[dataset]}/export?${query}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
            },
        });
    },
};
