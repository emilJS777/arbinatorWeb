import orderBookRecoveryApi from "@/api/orderBookRecovery.js";
import {normalizeConfigForm} from "@/utils/orderBookRecoveryConfig.js";
import {createPollingRuntime, runPollingGroup} from "@/utils/pollingGuard.js";
import {isValidMlStats, normalizeArray} from "@/utils/safePayload.js";

const safeRequest = promise => promise.catch(() => ({data: {success: false, obj: null}}));
const pollRuntime = createPollingRuntime();
const runStorePollingGroup = (context, name, requests) => runPollingGroup({
    runtime: pollRuntime,
    name,
    requests,
    onUnavailableChange: value => context.commit("SET_BACKEND_TEMPORARILY_UNAVAILABLE", value),
});

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
        BACKEND_STATUS: {
            temporarilyUnavailable: false,
            warning: "",
        },
        SHOW_ARCHIVED: false,
    },
    actions: {
        async LOAD({ commit, state }) {
            const settled = await Promise.allSettled([
                safeRequest(orderBookRecoveryApi.getConfig()),
                safeRequest(orderBookRecoveryApi.getOptions()),
                safeRequest(orderBookRecoveryApi.getState()),
                safeRequest(orderBookRecoveryApi.getTrades(state.SHOW_ARCHIVED)),
                safeRequest(orderBookRecoveryApi.getMetrics()),
                safeRequest(orderBookRecoveryApi.getDebug()),
                safeRequest(orderBookRecoveryApi.getScannerDiagnostics()),
                safeRequest(orderBookRecoveryApi.getMlStats()),
            ]);
            const [config, options, stateResponse, trades, metrics, debug, diagnostics, mlStats] = settled.map(result =>
                result.status === "fulfilled" ? result.value : {data: {success: false, obj: null}, status: 0}
            );
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
        async LOAD_STATUS(context) {
            const {commit} = context;
            const {responses, skipped} = await runStorePollingGroup(context, "status", [
                () => orderBookRecoveryApi.getState(),
                () => orderBookRecoveryApi.getMetrics(),
            ]);
            if (skipped) return {skipped: true};
            const [stateResponse, metrics] = responses;
            if (stateResponse?.data?.success) commit("SET_STATE", stateResponse.data.obj);
            if (metrics?.data?.success) commit("SET_METRICS", metrics.data.obj);
            return stateResponse;
        },
        async LOAD_TRADES(context) {
            const {commit, state} = context;
            const {responses, skipped} = await runStorePollingGroup(context, "trades", [
                () => orderBookRecoveryApi.getTrades(state.SHOW_ARCHIVED),
            ]);
            if (skipped) return {skipped: true};
            const [trades] = responses;
            if (trades?.data?.success) commit("SET_TRADES", trades.data.obj);
            return trades;
        },
        async LOAD_ML_STATS(context) {
            const {commit} = context;
            commit("SET_ML_STATS_LOADING", true);
            const {responses, skipped} = await runStorePollingGroup(context, "mlStats", [
                () => orderBookRecoveryApi.getMlStats(),
            ]);
            if (skipped) {
                commit("SET_ML_STATS_LOADING", false);
                return {skipped: true};
            }
            const [mlStats] = responses;
            if (mlStats?.data?.success) commit("SET_ML_STATS", mlStats.data.obj);
            if (!mlStats?.data?.success) commit("SET_ML_STATS_ERROR", "ML stats request failed");
            commit("SET_ML_STATS_LOADING", false);
            return mlStats;
        },
        async LOAD_DIAGNOSTICS(context) {
            const {commit} = context;
            const {responses, skipped} = await runStorePollingGroup(context, "diagnostics", [
                () => orderBookRecoveryApi.getDebug(),
                () => orderBookRecoveryApi.getScannerDiagnostics(),
            ]);
            if (skipped) return {skipped: true};
            const [debug, diagnostics] = responses;
            if (debug?.data?.success) commit("SET_DEBUG", debug.data.obj);
            if (diagnostics?.data?.success) commit("SET_SCANNER_DIAGNOSTICS", diagnostics.data.obj);
            return debug;
        },
        async LOAD_DEBUG({ dispatch }) {
            if (pollRuntime.loadDebugInFlight) return {skipped: true};
            pollRuntime.loadDebugInFlight = true;
            try {
                const results = await Promise.allSettled([
                    dispatch("LOAD_STATUS"),
                    dispatch("LOAD_TRADES"),
                    dispatch("LOAD_ML_STATS"),
                    dispatch("LOAD_DIAGNOSTICS"),
                ]);
                return {success: true, results};
            } finally {
                pollRuntime.loadDebugInFlight = false;
            }
        },
        async SAVE_CONFIG({ commit }, body) {
            const res = await orderBookRecoveryApi.updateConfig(body);
            if (res.data.success) commit("SET_CONFIG", res.data.obj);
            return res;
        },
        async START({ dispatch }) {
            const res = await orderBookRecoveryApi.startPaper();
            await Promise.allSettled([
                dispatch("LOAD_STATUS"),
                dispatch("LOAD_DIAGNOSTICS"),
            ]);
            return res;
        },
        async STOP({ dispatch }) {
            const res = await orderBookRecoveryApi.stop();
            await Promise.allSettled([
                dispatch("LOAD_STATUS"),
                dispatch("LOAD_DIAGNOSTICS"),
            ]);
            return res;
        },
        async CLEAR_DIAGNOSTICS({ dispatch }) {
            const res = await orderBookRecoveryApi.clearDiagnostics();
            await dispatch("LOAD_DEBUG");
            return res;
        },
        async RESET_RECOVERY({ dispatch }) {
            const res = await orderBookRecoveryApi.resetRecovery();
            await dispatch("LOAD_STATUS");
            return res;
        },
        async SET_CURRENT_MARGIN({ dispatch }, currentMargin) {
            const res = await orderBookRecoveryApi.setCurrentMargin(currentMargin);
            await dispatch("LOAD_STATUS");
            return res;
        },
        async CLOSE_MANUAL({ dispatch }, positionId) {
            const res = await orderBookRecoveryApi.closeManual(positionId);
            await Promise.allSettled([
                dispatch("LOAD_STATUS"),
                dispatch("LOAD_TRADES"),
            ]);
            return res;
        },
        async SET_SHOW_ARCHIVED({ commit, dispatch }, value) {
            commit("SET_SHOW_ARCHIVED", value);
            await dispatch("LOAD_TRADES");
        },
        async ARCHIVE_TRADE({ dispatch }, tradeId) {
            const res = await orderBookRecoveryApi.archiveTrade(tradeId);
            await Promise.allSettled([
                dispatch("LOAD_STATUS"),
                dispatch("LOAD_TRADES"),
            ]);
            return res;
        },
        async DELETE_ARCHIVED_TRADE({ dispatch }, tradeId) {
            const res = await orderBookRecoveryApi.deleteArchivedTrade(tradeId);
            await Promise.allSettled([
                dispatch("LOAD_STATUS"),
                dispatch("LOAD_TRADES"),
            ]);
            return res;
        },
        async DELETE_ALL_ARCHIVED_TRADES({ dispatch }) {
            const res = await orderBookRecoveryApi.deleteAllArchivedTrades();
            await Promise.allSettled([
                dispatch("LOAD_STATUS"),
                dispatch("LOAD_TRADES"),
            ]);
            return res;
        },
        async ARCHIVE_ALL_CLOSED({ dispatch }) {
            const res = await orderBookRecoveryApi.archiveAllClosed();
            await Promise.allSettled([
                dispatch("LOAD_STATUS"),
                dispatch("LOAD_TRADES"),
            ]);
            return res;
        },
        async UNARCHIVE_ALL({ dispatch }) {
            const res = await orderBookRecoveryApi.unarchiveAll();
            await Promise.allSettled([
                dispatch("LOAD_STATUS"),
                dispatch("LOAD_TRADES"),
            ]);
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
        async CLEAR_ML_DATASET({ dispatch }) {
            const res = await orderBookRecoveryApi.clearMlDataset();
            await Promise.allSettled([
                dispatch("LOAD_ML_STATS"),
                dispatch("LOAD_DIAGNOSTICS"),
            ]);
            return res;
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
        SET_BACKEND_TEMPORARILY_UNAVAILABLE(state, payload) {
            state.BACKEND_STATUS = {
                ...state.BACKEND_STATUS,
                temporarilyUnavailable: Boolean(payload),
                warning: payload ? "Backend temporarily unavailable. Showing last successful data." : "",
            };
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
