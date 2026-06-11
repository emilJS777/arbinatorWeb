import { apiClient } from "@/api/client.js";

export const paperTradingApi = {
    getStrategyConfigs() {
        return apiClient.get("/strategy-configs");
    },
    createStrategyConfig(body) {
        return apiClient.post("/strategy-configs", body);
    },
    patchStrategyConfig(id, body) {
        return apiClient.patch(`/strategy-configs/${id}`, body);
    },
    getSignals() {
        return apiClient.get("/signals");
    },
    createPaperSignal(body) {
        return apiClient.post("/signals/paper", body);
    },
    getPaperOrders() {
        return apiClient.get("/paper-orders");
    },
    getPaperPositions() {
        return apiClient.get("/paper-positions");
    },
    closePaperPosition(id, body = {}) {
        return apiClient.post(`/paper-positions/${id}/close`, body);
    },
    getRiskStatus() {
        return apiClient.get("/risk/status");
    },
};
