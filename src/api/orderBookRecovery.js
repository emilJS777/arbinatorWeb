import { apiClient } from "@/api/client.js";
import { runtimeConfig } from "@/config/runtime.js";

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
};
