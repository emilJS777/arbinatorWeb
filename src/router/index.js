import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: "/",
        name: "home",
        component: () => import("@/views/v-home.vue"),
    },
    {
        path: "/orderBooks",
        name: "orderBooks",
        component: () => import("@/views/orderBooks/v-order-books.vue"),
    },
    {
        path: "/exchanges",
        name: "exchanges",
        component: () => import("@/views/exchanges/v-exchanges.vue"),
    },
    {
        path: "/tradingPairs",
        name: "tradingPairs",
        component: () => import("@/views/tradingPairs/v-trading-pairs.vue"),
    },
    {
        path: "/accountOrders",
        name: "accountOrders",
        component: () => import("@/views/accountOrders/v-account-orders.vue"),
    },
    {
        path: "/paper-trading",
        name: "paperTrading",
        component: () => import("@/views/paperTrading/v-paper-trading.vue"),
    },
    {
        path: "/arbitrage",
        name: "arbitrage",
        component: () => import("@/views/arbitrage/v-arbitrage.vue"),
    },
    {
        path: "/futures",
        name: "futures",
        component: () => import("@/views/futures/v-futures.vue"),
    },
    {
        path: "/research",
        name: "research",
        component: () => import("@/views/research/v-research.vue"),
    },
    {
        path: "/orderbook-recovery",
        name: "orderBookRecovery",
        component: () => import("@/views/orderBookRecovery/v-order-book-recovery.vue"),
    },
];


const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router
