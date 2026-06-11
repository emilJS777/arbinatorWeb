import { tradesApi } from "@/api/trades.js";

const trades = {
    namespaced: true,
    actions: {
        async GET(context, query) {
            return tradesApi.getAll(query);
        },
    },
};

export default trades;
