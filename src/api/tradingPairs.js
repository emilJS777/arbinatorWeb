import { apiClient } from "@/api/client.js";

export const tradingPairsApi = {
    getAll(query = "") {
        return apiClient.get(`/tradingPair${query}`);
    },
    create(body) {
        return apiClient.post("/tradingPair", body);
    },
    update(id, body) {
        return apiClient.put(`/tradingPair?id=${id}`, body);
    },
    remove(id) {
        return apiClient.delete(`/tradingPair?id=${id}`);
    },
};
