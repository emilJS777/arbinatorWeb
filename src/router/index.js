import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: "/",
        name: "home",
        redirect: '/orderbook-recovery',
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
        redirect: '/orderbook-recovery',
    },
    {
        path: "/futures",
        name: "futures",
        component: () => import("@/views/futures/v-futures.vue"),
    },
    {
        path: "/research",
        name: "research",
        component: () => import("@/views/orderBookRecovery/v-order-book-recovery.vue"),
        meta: {workspaceSection: 'research'},
    },
    {
        path: "/orderbook-recovery",
        name: "orderBookRecovery",
        component: () => import("@/views/orderBookRecovery/v-order-book-recovery.vue"),
        meta: {workspaceSection: 'overview'},
    },
    {path: '/positions', name: 'positions', component: () => import('@/views/orderBookRecovery/v-order-book-recovery.vue'), meta: {workspaceSection: 'positions'}},
    {path: '/bot-settings', name: 'botSettings', component: () => import('@/views/orderBookRecovery/v-order-book-recovery.vue'), meta: {workspaceSection: 'settings'}},
    {path: '/research/legacy', name: 'legacyResearch', component: () => import('@/views/research/v-research.vue')},
    {path: '/:pathMatch(.*)*', redirect: '/orderbook-recovery'},
];


const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router
