import { paperTradingApi } from "@/api/paperTrading.js";

const paperTrading = {
    namespaced: true,
    state: {
        STRATEGY_CONFIGS: [],
        SIGNALS: [],
        PAPER_ORDERS: [],
        PAPER_POSITIONS: [],
        RISK_STATUS: null,
    },
    actions: {
        async LOAD({ commit }) {
            const [configs, signals, orders, positions, risk] = await Promise.all([
                paperTradingApi.getStrategyConfigs(),
                paperTradingApi.getSignals(),
                paperTradingApi.getPaperOrders(),
                paperTradingApi.getPaperPositions(),
                paperTradingApi.getRiskStatus(),
            ]);

            if (configs.data.success) commit("SET_STRATEGY_CONFIGS", configs.data.obj);
            if (signals.data.success) commit("SET_SIGNALS", signals.data.obj);
            if (orders.data.success) commit("SET_PAPER_ORDERS", orders.data.obj);
            if (positions.data.success) commit("SET_PAPER_POSITIONS", positions.data.obj);
            if (risk.data.success) commit("SET_RISK_STATUS", risk.data.obj);
        },
        async CREATE_PAPER_SIGNAL(context, body) {
            return paperTradingApi.createPaperSignal(body);
        },
        async CLOSE_POSITION(context, { id, body }) {
            return paperTradingApi.closePaperPosition(id, body);
        },
    },
    mutations: {
        SET_STRATEGY_CONFIGS(state, payload) {
            state.STRATEGY_CONFIGS = payload || [];
        },
        SET_SIGNALS(state, payload) {
            state.SIGNALS = payload || [];
        },
        SET_PAPER_ORDERS(state, payload) {
            state.PAPER_ORDERS = payload || [];
        },
        SET_PAPER_POSITIONS(state, payload) {
            state.PAPER_POSITIONS = payload || [];
        },
        SET_RISK_STATUS(state, payload) {
            state.RISK_STATUS = payload || null;
        },
        UPSERT_SIGNAL(state, payload) {
            state.SIGNALS = [payload, ...state.SIGNALS.filter(item => item.id !== payload.id)];
        },
        UPSERT_PAPER_ORDER(state, payload) {
            state.PAPER_ORDERS = [payload, ...state.PAPER_ORDERS.filter(item => item.id !== payload.id)];
        },
        UPSERT_PAPER_POSITION(state, payload) {
            state.PAPER_POSITIONS = [payload, ...state.PAPER_POSITIONS.filter(item => item.id !== payload.id)];
        },
    },
};

export default paperTrading;
