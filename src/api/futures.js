import { apiClient } from "@/api/client.js";

export const futuresApi = {
    getMetrics() {
        return apiClient.get("/futures/metrics");
    },
    getEquity() {
        return apiClient.get("/futures/equity");
    },
    getSignals() {
        return apiClient.get("/futures/signals");
    },
    getPositions() {
        return apiClient.get("/futures/positions");
    },
    getTrades() {
        return apiClient.get("/futures/trades");
    },
};
