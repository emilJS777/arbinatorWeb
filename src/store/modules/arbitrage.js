import { arbitrageApi } from "@/api/arbitrage.js";

const arbitrage = {
    namespaced: true,
    state: {
        CONFIG: null,
        OPPORTUNITIES: [],
        SIGNALS: [],
    },
    actions: {
        async LOAD({ commit }) {
            const [config, opportunities, signals] = await Promise.all([
                arbitrageApi.getConfig(),
                arbitrageApi.getOpportunities(),
                arbitrageApi.getSignals(),
            ]);

            if (config.data.success) commit("SET_CONFIG", config.data.obj);
            if (opportunities.data.success) commit("SET_OPPORTUNITIES", opportunities.data.obj);
            if (signals.data.success) commit("SET_SIGNALS", signals.data.obj);
        },
        async PATCH_CONFIG(context, body) {
            return arbitrageApi.patchConfig(body);
        },
        async RUN_ONCE(context) {
            return arbitrageApi.runOnce();
        },
    },
    mutations: {
        SET_CONFIG(state, payload) {
            state.CONFIG = payload || null;
        },
        SET_OPPORTUNITIES(state, payload) {
            state.OPPORTUNITIES = payload || [];
        },
        SET_SIGNALS(state, payload) {
            state.SIGNALS = payload || [];
        },
        UPSERT_OPPORTUNITY(state, payload) {
            state.OPPORTUNITIES = [payload, ...state.OPPORTUNITIES.filter(item => item.id !== payload.id)];
        },
        UPSERT_SIGNAL(state, payload) {
            state.SIGNALS = [payload, ...state.SIGNALS.filter(item => item.id !== payload.id)];
        },
    },
};

export default arbitrage;
