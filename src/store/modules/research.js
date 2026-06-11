import { researchApi } from "@/api/research.js";

const research = {
    namespaced: true,
    state: {
        BACKTESTS: [],
        ACTIVE_BACKTEST: null,
        CANDIDATES: [],
        HEATMAPS: null,
        LAST_EXPERIMENT: null,
    },
    actions: {
        async LOAD({ commit }) {
            const res = await researchApi.getBacktests();
            if (res.data.success) commit("SET_BACKTESTS", res.data.obj);
        },
        async LOAD_CANDIDATES({ commit }) {
            const [candidates, heatmaps] = await Promise.all([
                researchApi.getCandidates(),
                researchApi.getHeatmaps(),
            ]);
            if (candidates.data.success) commit("SET_CANDIDATES", candidates.data.obj);
            if (heatmaps.data.success) commit("SET_HEATMAPS", heatmaps.data.obj);
        },
        async LOAD_ONE({ commit }, id) {
            const res = await researchApi.getBacktest(id);
            if (res.data.success) commit("SET_ACTIVE_BACKTEST", res.data.obj);
            return res;
        },
        async CREATE({ commit }, body) {
            const res = await researchApi.createBacktest(body);
            if (res.data.success) commit("SET_ACTIVE_BACKTEST", res.data.obj);
            return res;
        },
        async RUN_EXPERIMENT({ commit }, body) {
            const res = await researchApi.runExperiment(body);
            if (res.data.success) commit("SET_LAST_EXPERIMENT", res.data.obj);
            return res;
        },
    },
    mutations: {
        SET_BACKTESTS(state, payload) {
            state.BACKTESTS = payload || [];
        },
        SET_ACTIVE_BACKTEST(state, payload) {
            state.ACTIVE_BACKTEST = payload || null;
        },
        SET_CANDIDATES(state, payload) {
            state.CANDIDATES = payload || [];
        },
        SET_HEATMAPS(state, payload) {
            state.HEATMAPS = payload || null;
        },
        SET_LAST_EXPERIMENT(state, payload) {
            state.LAST_EXPERIMENT = payload || null;
        },
    },
};

export default research;
