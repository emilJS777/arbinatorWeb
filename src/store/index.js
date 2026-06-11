import Vuex from "vuex";
import exchanges from "@/store/modules/exchanges.js"
import socket from "@/store/modules/socket.js";
import orderBooks from "@/store/modules/orderBooks.js";
import tradingPairs from "@/store/modules/tradingPairs.js";
import accountOrders from "@/store/modules/accountOrders.js";
import trades from "@/store/modules/trades.js";
import paperTrading from "@/store/modules/paperTrading.js";
import arbitrage from "@/store/modules/arbitrage.js";
import futures from "@/store/modules/futures.js";
import research from "@/store/modules/research.js";
import orderBookRecovery from "@/store/modules/orderBookRecovery.js";

export default new Vuex.Store({
    namespaced: true,
    modules: {
        exchanges,
        socket,
        orderBooks,
        tradingPairs,
        accountOrders,
        trades,
        paperTrading,
        arbitrage,
        futures,
        research,
        orderBookRecovery,
    }
})
