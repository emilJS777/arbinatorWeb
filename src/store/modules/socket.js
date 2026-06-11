import { createStore } from 'vuex';

const socket = {
    namespaced: true,
    state: {
        IS_CONNECTED: false,  // Add a state property for connection status
        // other state properties
    },
    mutations: {
        SOCKET_CONNECT(state) {
            state.IS_CONNECTED = true;
        },
        SOCKET_DISCONNECT(state) {
            state.IS_CONNECTED = false;
        },
    },
};

export default socket;
