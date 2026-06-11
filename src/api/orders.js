import { apiClient } from "@/api/client.js";

export const ordersApi = {
    create(body) {
        return apiClient.post("/order", body);
    },
    remove(query = "") {
        return apiClient.delete(`/order${query}`);
    },
};
