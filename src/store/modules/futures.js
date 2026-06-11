import { futuresApi } from "@/api/futures.js";

const futures = {
    namespaced: true,
    state: {
        METRICS: null,
        EQUITY: [],
        SIGNALS: [],
        POSITIONS: [],
        TRADES: [],
    },
    actions: {
        async LOAD({ commit }) {
            const [metrics, equity, signals, positions, trades] = await Promise.all([
                futuresApi.getMetrics(),
                futuresApi.getEquity(),
                futuresApi.getSignals(),
                futuresApi.getPositions(),
                futuresApi.getTrades(),
            ]);
            if (metrics.data.success) commit("SET_METRICS", metrics.data.obj);
            if (equity.data.success) commit("SET_EQUITY", equity.data.obj);
            if (signals.data.success) commit("SET_SIGNALS", signals.data.obj);
            if (positions.data.success) commit("SET_POSITIONS", positions.data.obj);
            if (trades.data.success) commit("SET_TRADES", trades.data.obj);
        },
    },
    mutations: {
        SET_METRICS(state, payload) {
            state.METRICS = payload || null;
        },
        SET_EQUITY(state, payload) {
            state.EQUITY = payload || [];
        },
        SET_SIGNALS(state, payload) {
            state.SIGNALS = payload || [];
        },
        SET_POSITIONS(state, payload) {
            state.POSITIONS = payload || [];
        },
        SET_TRADES(state, payload) {
            state.TRADES = payload || [];
        },
    },
};

export default futures;
