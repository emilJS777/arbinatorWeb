import { apiClient } from "@/api/client.js";

export const arbitrageApi = {
    getConfig() {
        return apiClient.get("/arbitrage/config");
    },
    patchConfig(body) {
        return apiClient.patch("/arbitrage/config", body);
    },
    getOpportunities() {
        return apiClient.get("/arbitrage/opportunities");
    },
    getSignals() {
        return apiClient.get("/arbitrage/signals");
    },
    runOnce() {
        return apiClient.post("/arbitrage/run-once", {});
    },
};
