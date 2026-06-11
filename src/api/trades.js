import { apiClient } from "@/api/client.js";

export const tradesApi = {
    getAll(query = "") {
        return apiClient.get(`/trade${query}`);
    },
};
