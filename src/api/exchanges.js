import { apiClient } from "@/api/client.js";

export const exchangesApi = {
    getAll(query = "") {
        return apiClient.get(`/exchange${query}`);
    },
    create(body) {
        return apiClient.post("/exchange", body);
    },
    update(id, body) {
        return apiClient.put(`/exchange?id=${id}`, body);
    },
    remove(id) {
        return apiClient.delete(`/exchange?id=${id}`);
    },
};
