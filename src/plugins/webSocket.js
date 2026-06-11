import emitter from './eventBus'; // Import the shared emitter
import { runtimeConfig } from "@/config/runtime.js";

class WebSocketService {
    constructor(store) {
        this.store = store;
        this.socket = null;
        this.reconnectInterval = 1000; // Reconnect after 1 second if connection closes unexpectedly
        this.emitter = emitter; // Use the shared emitter
        this.reconnectTimeoutId = null;
        this.shouldReconnect = true;
    }

    parseMessage(rawData) {
        if (typeof rawData !== "string") {
            return null;
        }

        try {
            return JSON.parse(rawData);
        } catch {
            try {
                const cleanData = rawData
                    .replace(/\bNone\b/g, "null")
                    .replace(/\bTrue\b/g, "true")
                    .replace(/\bFalse\b/g, "false")
                    .replace(/'/g, '"');

                return JSON.parse(cleanData);
            } catch (error) {
                console.error("Error parsing WebSocket message:", error, rawData);
                this.emitter.emit("socket_error", {
                    msg: "Invalid WebSocket payload received",
                    error,
                });
                return null;
            }
        }
    }

    scheduleReconnect() {
        if (!this.shouldReconnect || this.reconnectTimeoutId) {
            return;
        }

        this.reconnectTimeoutId = setTimeout(() => {
            this.reconnectTimeoutId = null;
            this.initializeWebSocket();
        }, this.reconnectInterval);
    }

    createWebSocketInstance() {
        if (!runtimeConfig.socketUrl) {
            throw new Error("VITE_WEB_SOCKET_URL is not configured");
        }

        const setupWebSocket = () => {
            let wsUrl = runtimeConfig.socketUrl;
            const accessToken = localStorage.getItem("access_token");

            if (accessToken) {
                wsUrl += `?Authorization=${encodeURIComponent(accessToken)}`;
            }

            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.store.commit('socket/SOCKET_CONNECT');
                this.emitter.emit('connected');
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket disconnected:', event.reason);
                this.store.commit('socket/SOCKET_DISCONNECT');
                this.emitter.emit('disconnected', event);

                if (event.code !== 1000) { // if not a normal closure
                    console.error('Attempting to reconnect...');
                    this.scheduleReconnect();
                }
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket encountered error:', error);
                this.emitter.emit('error', error);
                this.socket.close();
            };

            this.socket.onmessage = (event) => {
                const message = this.parseMessage(event.data);

                if (message?.topic) {
                    this.emitter.emit(message.topic, message);
                }
            };
        };
        setupWebSocket();

        return this.socket;
    }

    initializeWebSocket() {
        try {
            this.shouldReconnect = true;

            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                return;
            }

            this.socket = this.createWebSocketInstance();
        } catch (error) {
            console.error('Error creating WebSocket instance:', error);
            if (this.socket) {
                this.socket.close();
            }
            this.scheduleReconnect();
        }
    }

    getWebSocket() {
        return this.socket;
    }

    on(event, handler) {
        this.emitter.on(event, handler);
    }

    off(event, handler) {
        this.emitter.off(event, handler);
    }

    disconnect() {
        this.shouldReconnect = false;

        if (this.reconnectTimeoutId) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = null;
        }

        if (this.socket) {
            this.socket.close(1000, "Manual disconnect");
        }
    }
}

const WebSocketPlugin = {
    install(app, { store }) {
        const webSocketService = new WebSocketService(store);

        app.config.globalProperties.$connectWebSocket = () => webSocketService.initializeWebSocket();
        app.config.globalProperties.$socket = webSocketService.getWebSocket();
        app.config.globalProperties.$socketOn = (event, handler) => webSocketService.on(event, handler);
        app.config.globalProperties.$socketOff = (event, handler) => webSocketService.off(event, handler);

        app.provide('webSocketService', webSocketService);

        // Watch for accessToken changes in the store
        store.watch(
            (state) => state?.auth?.accessToken,
            (newToken) => {
                if (newToken) {
                    console.log(`reconnecting part`);
                    // webSocketService.initializeWebSocket();
                }
            }
        );
    },
};

export default WebSocketPlugin;
