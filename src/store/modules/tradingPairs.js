import { tradingPairsApi } from "@/api/tradingPairs.js";

const tradingPairs = {
    namespaced: true,
    actions: {
        async GET(context, query){
            return tradingPairsApi.getAll(query);
        },
        async POST(context, body){
            return tradingPairsApi.create(body);
        },
        async PUT(context, body){
            return tradingPairsApi.update(body.id, body.form);
        },
        async DELETE(context, id){
            return tradingPairsApi.remove(id);
        },
    },

    mutations: {
        SET_TRADING_PAIRS(state, payload){
            if (payload) { // Проверяем, что payload не равен null и не undefined
                state.TRADING_PAIRS = payload.sort((a, b) => {
                    if (a.exchange.title < b.exchange.title) return -1;
                    if (a.exchange.title > b.exchange.title) return 1;
                    return 0;
                });
            }
            else
                state.TRADING_PAIRS = payload;
        },
        SET_BALANCES(state, payload){
            if(!payload.balance) return;
            state.TRADING_PAIRS.map((tradingPair, index) => {
                if(payload.exchange === tradingPair.exchange.title && !payload.pair){
                    state.TRADING_PAIRS[index]['quote_symbol'] = payload.symbol
                    state.TRADING_PAIRS[index]['total_quote'] = payload.balance.total
                    state.TRADING_PAIRS[index]['used_quote'] = payload.balance.used
                    state.TRADING_PAIRS[index]['free_quote'] = payload.balance.free
                }
                if(tradingPair.pair === payload.pair && payload.exchange === tradingPair.exchange.title){
                    state.TRADING_PAIRS[index]['base_symbol'] = payload.symbol
                    state.TRADING_PAIRS[index]['total_base'] = payload.balance.total
                    state.TRADING_PAIRS[index]['used_base'] = payload.balance.used
                    state.TRADING_PAIRS[index]['free_base'] = payload.balance.free
                }
            })
        }
    },

    state: {
        TRADING_PAIRS: []
    }
}

export default tradingPairs
