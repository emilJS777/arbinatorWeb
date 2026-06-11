import orderBookRecoveryApi from "@/api/orderBookRecovery.js";

export default {
    namespaced: true,
    state: {
        CONFIG: null,
        STATE: null,
        TRADES: [],
        METRICS: null,
        DEBUG: null,
        SHOW_ARCHIVED: false,
    },
    actions: {
        async LOAD({ commit, state }) {
            const [config, stateResponse, trades, metrics, debug] = await Promise.all([
                orderBookRecoveryApi.getConfig(),
                orderBookRecoveryApi.getState(),
                orderBookRecoveryApi.getTrades(state.SHOW_ARCHIVED),
                orderBookRecoveryApi.getMetrics(),
                orderBookRecoveryApi.getDebug(),
            ]);
            if (config.data.success) commit("SET_CONFIG", config.data.obj);
            if (stateResponse.data.success) commit("SET_STATE", stateResponse.data.obj);
            if (trades.data.success) commit("SET_TRADES", trades.data.obj);
            if (metrics.data.success) commit("SET_METRICS", metrics.data.obj);
            if (debug.data.success) commit("SET_DEBUG", debug.data.obj);
            return stateResponse;
        },
        async LOAD_DEBUG({ commit, state }) {
            const [stateResponse, trades, metrics, debug] = await Promise.all([
                orderBookRecoveryApi.getState(),
                orderBookRecoveryApi.getTrades(state.SHOW_ARCHIVED),
                orderBookRecoveryApi.getMetrics(),
                orderBookRecoveryApi.getDebug(),
            ]);
            if (stateResponse.data.success) commit("SET_STATE", stateResponse.data.obj);
            if (trades.data.success) commit("SET_TRADES", trades.data.obj);
            if (metrics.data.success) commit("SET_METRICS", metrics.data.obj);
            if (debug.data.success) commit("SET_DEBUG", debug.data.obj);
            return debug;
        },
        async SAVE_CONFIG({ commit }, body) {
            const res = await orderBookRecoveryApi.updateConfig(body);
            if (res.data.success) commit("SET_CONFIG", res.data.obj);
            return res;
        },
        async START({ dispatch }) {
            const res = await orderBookRecoveryApi.startPaper();
            await dispatch("LOAD");
            return res;
        },
        async STOP({ dispatch }) {
            const res = await orderBookRecoveryApi.stop();
            await dispatch("LOAD");
            return res;
        },
        async CLOSE_MANUAL({ dispatch }, positionId) {
            const res = await orderBookRecoveryApi.closeManual(positionId);
            await dispatch("LOAD");
            return res;
        },
        async SET_SHOW_ARCHIVED({ commit, dispatch }, value) {
            commit("SET_SHOW_ARCHIVED", value);
            await dispatch("LOAD");
        },
        async ARCHIVE_TRADE({ dispatch }, tradeId) {
            const res = await orderBookRecoveryApi.archiveTrade(tradeId);
            await dispatch("LOAD");
            return res;
        },
        async ARCHIVE_ALL_CLOSED({ dispatch }) {
            const res = await orderBookRecoveryApi.archiveAllClosed();
            await dispatch("LOAD");
            return res;
        },
        async UNARCHIVE_ALL({ dispatch }) {
            const res = await orderBookRecoveryApi.unarchiveAll();
            await dispatch("LOAD");
            return res;
        },
        async LOAD_DECISION_DETAILS(context, tradeId) {
            return orderBookRecoveryApi.getDecisionDetails(tradeId);
        },
        async EXPORT_TRADES(context, payload = {}) {
            return orderBookRecoveryApi.exportTrades(payload.format || "csv", Boolean(payload.includeArchived));
        },
    },
    mutations: {
        SET_CONFIG(state, payload) {
            state.CONFIG = payload;
        },
        SET_STATE(state, payload) {
            state.STATE = payload;
        },
        SET_TRADES(state, payload) {
            state.TRADES = payload || [];
        },
        SET_METRICS(state, payload) {
            state.METRICS = payload;
        },
        SET_DEBUG(state, payload) {
            state.DEBUG = payload;
        },
        SET_SHOW_ARCHIVED(state, payload) {
            state.SHOW_ARCHIVED = Boolean(payload);
        },
    },
};
