import { tradingPairsApi } from "@/api/tradingPairs.js";
import { normalizeArray } from "@/utils/safePayload.js";

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
            const items = normalizeArray(payload);
            if (items.length) {
                state.TRADING_PAIRS = items.sort((a, b) => {
                    if ((a.exchange?.title || "") < (b.exchange?.title || "")) return -1;
                    if ((a.exchange?.title || "") > (b.exchange?.title || "")) return 1;
                    return 0;
                });
            }
            else
                state.TRADING_PAIRS = [];
        },
        SET_BALANCES(state, payload){
            const events = normalizeArray(payload);
            const tradingPairs = normalizeArray(state.TRADING_PAIRS);
            for (const item of events) {
                if (!item || typeof item !== "object" || !item.balance) continue;
                tradingPairs.forEach((tradingPair, index) => {
                    if(item.exchange === tradingPair?.exchange?.title && !item.pair){
                        state.TRADING_PAIRS[index]['quote_symbol'] = item.symbol
                        state.TRADING_PAIRS[index]['total_quote'] = item.balance.total
                        state.TRADING_PAIRS[index]['used_quote'] = item.balance.used
                        state.TRADING_PAIRS[index]['free_quote'] = item.balance.free
                    }
                    if(tradingPair?.pair === item.pair && item.exchange === tradingPair?.exchange?.title){
                        state.TRADING_PAIRS[index]['base_symbol'] = item.symbol
                        state.TRADING_PAIRS[index]['total_base'] = item.balance.total
                        state.TRADING_PAIRS[index]['used_base'] = item.balance.used
                        state.TRADING_PAIRS[index]['free_base'] = item.balance.free
                    }
                })
            }
        }
    },

    state: {
        TRADING_PAIRS: []
    }
}

export default tradingPairs
