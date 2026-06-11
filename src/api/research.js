import { apiClient } from "@/api/client.js";

export const researchApi = {
    getBacktests() {
        return apiClient.get("/research/backtests");
    },
    createBacktest(body) {
        return apiClient.post("/research/backtests", body);
    },
    getBacktest(id) {
        return apiClient.get(`/research/backtests/${id}`);
    },
    getMonteCarlo(id) {
        return apiClient.get(`/research/monte-carlo/${id}`);
    },
    getWalkForward(id) {
        return apiClient.get(`/research/walk-forward/${id}`);
    },
    getOptimization(id) {
        return apiClient.get(`/research/optimization/${id}`);
    },
    runExperiment(body) {
        return apiClient.post("/research/experiments", body);
    },
    getCandidates() {
        return apiClient.get("/research/candidates");
    },
    getHeatmaps() {
        return apiClient.get("/research/heatmaps");
    },
};
