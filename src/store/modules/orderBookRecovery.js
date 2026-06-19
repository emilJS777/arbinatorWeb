import orderBookRecoveryApi from "@/api/orderBookRecovery.js";
import {normalizeConfigForm} from "@/utils/orderBookRecoveryConfig.js";
import {isValidMlStats, normalizeArray} from "@/utils/safePayload.js";

const safeRequest = promise => promise.catch(() => ({data: {success: false, obj: null}}));

export default {
    namespaced: true,
    state: {
        CONFIG: null,
        OPTIONS: {exchanges: []},
        STATE: null,
        TRADES: [],
        METRICS: null,
        DEBUG: null,
        ML_STATS: {
            ml_market_snapshots_count: 0,
            ml_market_snapshots_pending_count: 0,
            ml_market_snapshots_labeled_count: 0,
            ml_exchange_labels_count: 0,
            ml_exchange_labels_pending_count: 0,
            ml_exchange_labels_labeled_count: 0,
            ml_exchange_label_completion_percent: 0,
            loading: false,
            error: "",
        },
        SCANNER_DIAGNOSTICS: [],
        SHOW_ARCHIVED: false,
    },
    actions: {
        async LOAD({ commit, state }) {
            const [config, options, stateResponse, trades, metrics, debug, diagnostics, mlStats] = await Promise.all([
                safeRequest(orderBookRecoveryApi.getConfig()),
                safeRequest(orderBookRecoveryApi.getOptions()),
                safeRequest(orderBookRecoveryApi.getState()),
                safeRequest(orderBookRecoveryApi.getTrades(state.SHOW_ARCHIVED)),
                safeRequest(orderBookRecoveryApi.getMetrics()),
                safeRequest(orderBookRecoveryApi.getDebug()),
                safeRequest(orderBookRecoveryApi.getScannerDiagnostics()),
                safeRequest(orderBookRecoveryApi.getMlStats()),
            ]);
            if (config.data.success) commit("SET_CONFIG", config.data.obj);
            if (options.data.success) commit("SET_OPTIONS", options.data.obj);
            if (stateResponse.data.success) commit("SET_STATE", stateResponse.data.obj);
            if (trades.data.success) commit("SET_TRADES", trades.data.obj);
            if (metrics.data.success) commit("SET_METRICS", metrics.data.obj);
            if (debug.data.success) commit("SET_DEBUG", debug.data.obj);
            if (diagnostics.data.success) commit("SET_SCANNER_DIAGNOSTICS", diagnostics.data.obj);
            if (mlStats.data.success) commit("SET_ML_STATS", mlStats.data.obj);
            return stateResponse;
        },
        async LOAD_DEBUG({ commit, state }) {
            commit("SET_ML_STATS_LOADING", true);
            const [stateResponse, trades, metrics, debug, diagnostics, mlStats] = await Promise.all([
                safeRequest(orderBookRecoveryApi.getState()),
                safeRequest(orderBookRecoveryApi.getTrades(state.SHOW_ARCHIVED)),
                safeRequest(orderBookRecoveryApi.getMetrics()),
                safeRequest(orderBookRecoveryApi.getDebug()),
                safeRequest(orderBookRecoveryApi.getScannerDiagnostics()),
                safeRequest(orderBookRecoveryApi.getMlStats()),
            ]);
            if (stateResponse.data.success) commit("SET_STATE", stateResponse.data.obj);
            if (trades.data.success) commit("SET_TRADES", trades.data.obj);
            if (metrics.data.success) commit("SET_METRICS", metrics.data.obj);
            if (debug.data.success) commit("SET_DEBUG", debug.data.obj);
            if (!debug.data.success) commit("SET_ML_STATS_ERROR", "Debug request failed");
            if (diagnostics.data.success) commit("SET_SCANNER_DIAGNOSTICS", diagnostics.data.obj);
            if (mlStats.data.success) commit("SET_ML_STATS", mlStats.data.obj);
            if (!mlStats.data.success) commit("SET_ML_STATS_ERROR", "ML stats request failed");
            commit("SET_ML_STATS_LOADING", false);
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
        async EXPORT_ML_MARKET_SNAPSHOTS(context, payload = {}) {
            return orderBookRecoveryApi.exportMlMarketSnapshots(payload.format || "csv");
        },
        async EXPORT_ML_EXCHANGE_LABELS(context, payload = {}) {
            return orderBookRecoveryApi.exportMlExchangeLabels(payload.format || "csv");
        },
        async LOAD_ML_DATASET(context, payload = {}) {
            return orderBookRecoveryApi.getMlDataset(payload.dataset, payload.params || {});
        },
        async LOAD_ML_DATASET_DETAIL(context, payload = {}) {
            return orderBookRecoveryApi.getMlDatasetDetail(payload.dataset, payload.id);
        },
        async EXPORT_ML_DATASET_EXPLORER(context, payload = {}) {
            return orderBookRecoveryApi.exportMlDatasetExplorer(payload.dataset, payload.params || {});
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
            state.TRADES = normalizeArray(payload);
        },
        SET_METRICS(state, payload) {
            state.METRICS = payload;
        },
        SET_DEBUG(state, payload) {
            state.DEBUG = payload;
            if (isValidMlStats(payload)) {
                state.ML_STATS = {
                    ...state.ML_STATS,
                    ml_market_snapshots_count: Number(payload.ml_market_snapshots_count),
                    ml_market_snapshots_pending_count: Number(payload.ml_market_snapshots_pending_count),
                    ml_market_snapshots_labeled_count: Number(payload.ml_market_snapshots_labeled_count),
                    ml_exchange_labels_count: Number(payload.ml_exchange_labels_count),
                    ml_exchange_labels_pending_count: Number(payload.ml_exchange_labels_pending_count),
                    ml_exchange_labels_labeled_count: Number(payload.ml_exchange_labels_labeled_count),
                    ml_exchange_label_completion_percent: Number(payload.ml_exchange_label_completion_percent || 0),
                    error: "",
                };
            }
        },
        SET_ML_STATS(state, payload) {
            if (isValidMlStats(payload)) {
                state.ML_STATS = {
                    ...state.ML_STATS,
                    ml_market_snapshots_count: Number(payload.ml_market_snapshots_count),
                    ml_market_snapshots_pending_count: Number(payload.ml_market_snapshots_pending_count),
                    ml_market_snapshots_labeled_count: Number(payload.ml_market_snapshots_labeled_count),
                    ml_exchange_labels_count: Number(payload.ml_exchange_labels_count),
                    ml_exchange_labels_pending_count: Number(payload.ml_exchange_labels_pending_count),
                    ml_exchange_labels_labeled_count: Number(payload.ml_exchange_labels_labeled_count),
                    ml_exchange_label_completion_percent: Number(payload.ml_exchange_label_completion_percent || 0),
                    error: "",
                };
            }
        },
        SET_SCANNER_DIAGNOSTICS(state, payload) {
            state.SCANNER_DIAGNOSTICS = normalizeArray(payload);
        },
        SET_ML_STATS_LOADING(state, payload) {
            state.ML_STATS = {...state.ML_STATS, loading: Boolean(payload)};
        },
        SET_ML_STATS_ERROR(state, payload) {
            state.ML_STATS = {...state.ML_STATS, error: payload || ""};
        },
        SET_SHOW_ARCHIVED(state, payload) {
            state.SHOW_ARCHIVED = Boolean(payload);
        },
    },
};
