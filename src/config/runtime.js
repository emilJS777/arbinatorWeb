const readEnv = (key) => {
    const value = import.meta.env[key];

    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
};

const normalizeBaseUrl = (value, fallbackProtocol) => {
    if (!value) {
        return "";
    }

    try {
        const url = new URL(value);

        if (url.hostname === "0.0.0.0") {
            url.hostname = window.location.hostname || "localhost";
        }

        if (!url.protocol && fallbackProtocol) {
            url.protocol = fallbackProtocol;
        }

        return url.toString().replace(/\/$/, "");
    } catch {
        return "";
    }
};

const apiBaseUrl = normalizeBaseUrl(readEnv("VITE_WEB_API"), "http:");
const socketUrl = normalizeBaseUrl(readEnv("VITE_WEB_SOCKET_URL"), "ws:");

if (!apiBaseUrl) {
    console.warn("Missing or invalid VITE_WEB_API runtime config");
}

if (!socketUrl) {
    console.warn("Missing or invalid VITE_WEB_SOCKET_URL runtime config");
}

export const runtimeConfig = {
    apiBaseUrl,
    socketUrl,
};
