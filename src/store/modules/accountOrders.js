import { ordersApi } from "@/api/orders.js";

const accountOrders = {
    namespaced: true,
    actions: {
        async POST(context, body){
            return ordersApi.create(body);
        },
        async DELETE(context, query){
            return ordersApi.remove(query);
        },
    },
    mutations: {
        SET_ACCOUNT_ACTIVE_ORDERS(state, payload){
            if (!state.ACCOUNT_ACTIVE_ORDERS[payload.data.exchange]) {
                state.ACCOUNT_ACTIVE_ORDERS[payload.data.exchange] = {};
            }

            state.ACCOUNT_ACTIVE_ORDERS[payload.data.exchange][payload.data.pair] = payload.data.orders.map(data => {
                data['exchange_icon_path'] = payload.data.exchange_icon_path;
                data['exchange'] = payload.data.exchange;
                data['exchange_id'] = payload.data.exchange_id;
                data['pair'] = payload.data.pair;
                return data;
            });
        }
    },
    state: {
        ACCOUNT_ACTIVE_ORDERS: {}
    }
}

export default accountOrders
