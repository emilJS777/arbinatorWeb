import orderBookRecoveryApi from "@/api/orderBookRecovery.js";
import {normalizeConfigForm} from "@/utils/orderBookRecoveryConfig.js";

export default {
    namespaced: true,
    state: {
        CONFIG: null,
        OPTIONS: {exchanges: []},
        STATE: null,
        TRADES: [],
        METRICS: null,
        DEBUG: null,
        SCANNER_DIAGNOSTICS: [],
        SHOW_ARCHIVED: false,
    },
    actions: {
        async LOAD({ commit, state }) {
            const [config, options, stateResponse, trades, metrics, debug, diagnostics] = await Promise.all([
                orderBookRecoveryApi.getConfig(),
                orderBookRecoveryApi.getOptions(),
                orderBookRecoveryApi.getState(),
                orderBookRecoveryApi.getTrades(state.SHOW_ARCHIVED),
                orderBookRecoveryApi.getMetrics(),
                orderBookRecoveryApi.getDebug(),
                orderBookRecoveryApi.getScannerDiagnostics(),
            ]);
            if (config.data.success) commit("SET_CONFIG", config.data.obj);
            if (options.data.success) commit("SET_OPTIONS", options.data.obj);
            if (stateResponse.data.success) commit("SET_STATE", stateResponse.data.obj);
            if (trades.data.success) commit("SET_TRADES", trades.data.obj);
            if (metrics.data.success) commit("SET_METRICS", metrics.data.obj);
            if (debug.data.success) commit("SET_DEBUG", debug.data.obj);
            if (diagnostics.data.success) commit("SET_SCANNER_DIAGNOSTICS", diagnostics.data.obj);
            return stateResponse;
        },
        async LOAD_DEBUG({ commit, state }) {
            const [stateResponse, trades, metrics, debug, diagnostics] = await Promise.all([
                orderBookRecoveryApi.getState(),
                orderBookRecoveryApi.getTrades(state.SHOW_ARCHIVED),
                orderBookRecoveryApi.getMetrics(),
                orderBookRecoveryApi.getDebug(),
                orderBookRecoveryApi.getScannerDiagnostics(),
            ]);
            if (stateResponse.data.success) commit("SET_STATE", stateResponse.data.obj);
            if (trades.data.success) commit("SET_TRADES", trades.data.obj);
            if (metrics.data.success) commit("SET_METRICS", metrics.data.obj);
            if (debug.data.success) commit("SET_DEBUG", debug.data.obj);
            if (diagnostics.data.success) commit("SET_SCANNER_DIAGNOSTICS", diagnostics.data.obj);
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
        async CLEAR_DIAGNOSTICS({ dispatch }) {
            const res = await orderBookRecoveryApi.clearDiagnostics();
            await dispatch("LOAD_DEBUG");
            return res;
        },
        async RESET_RECOVERY({ dispatch }) {
            const res = await orderBookRecoveryApi.resetRecovery();
            await dispatch("LOAD");
            return res;
        },
        async SET_CURRENT_MARGIN({ dispatch }, currentMargin) {
            const res = await orderBookRecoveryApi.setCurrentMargin(currentMargin);
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
        async DELETE_ARCHIVED_TRADE({ dispatch }, tradeId) {
            const res = await orderBookRecoveryApi.deleteArchivedTrade(tradeId);
            await dispatch("LOAD");
            return res;
        },
        async DELETE_ALL_ARCHIVED_TRADES({ dispatch }) {
            const res = await orderBookRecoveryApi.deleteAllArchivedTrades();
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
        async EXPORT_ML_DATASET(context, payload = {}) {
            return orderBookRecoveryApi.exportMlDataset(payload.format || "csv");
        },
    },
    mutations: {
        SET_CONFIG(state, payload) {
            state.CONFIG = payload ? normalizeConfigForm(payload) : payload;
        },
        SET_OPTIONS(state, payload) {
            state.OPTIONS = payload || {exchanges: []};
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
        SET_SCANNER_DIAGNOSTICS(state, payload) {
            state.SCANNER_DIAGNOSTICS = payload || [];
        },
        SET_SHOW_ARCHIVED(state, payload) {
            state.SHOW_ARCHIVED = Boolean(payload);
        },
    },
};
