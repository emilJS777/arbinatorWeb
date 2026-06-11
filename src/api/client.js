import request from "@/store/request.js";

export const apiClient = {
    get(path) {
        return request(null, path, "GET", {});
    },
    post(path, body) {
        return request(null, path, "POST", body);
    },
    put(path, body) {
        return request(null, path, "PUT", body);
    },
    patch(path, body) {
        return request(null, path, "PATCH", body);
    },
    delete(path) {
        return request(null, path, "DELETE", {});
    },
};
