
const nodes = {
    namespaced: true,
    mutations: {
        SET_ORDER_BOOKS(state, payload){
            if(!payload?.data?.order_book) return;
            const purchases = Array.isArray(payload.data.order_book.purchases) ? payload.data.order_book.purchases : [];
            const sales = Array.isArray(payload.data.order_book.sales) ? payload.data.order_book.sales : [];
            if (!purchases.length || !sales.length) return;

            const purchaseHigh = purchases.reduce((max, current) => {
                return current.price > max.price ? current : max;
            });

            const saleLow = sales.reduce((min, current) => {
                return current.price < min.price ? current : min;
            });

// Гарантируем, что exchange уже существует
            if (!state.ORDER_BOOKS[payload.data.exchange]) {
                state.ORDER_BOOKS[payload.data.exchange] = {};
            }

// Обновляем конкретную пару внутри конкретной биржи
            state.ORDER_BOOKS[payload.data.exchange][payload.data.pair] = {
                pair: payload.data.pair,
                pair_icon_path: payload.data.pair_icon_path,
                exchange: payload.data.exchange,
                exchange_icon_path: payload.data.exchange_icon_path,
                pair_max_purchase_price: payload.data.pair_max_purchase_price,
                purchases,
                sales,
                purchaseHighPrice: purchaseHigh,
                saleLowPrice: saleLow,
            };

        }



    },
    state: {
        ORDER_BOOKS: {},
    }
}

export default nodes
