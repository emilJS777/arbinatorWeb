import Axios from "axios";
import { runtimeConfig } from "@/config/runtime.js";

export const getResponseData = (response) => response?.data || null;
export const isResponseSuccess = (response) => Boolean(getResponseData(response)?.success);
export const getResponseMessage = (response) =>
    getResponseData(response)?.obj?.msg ||
    response?.message ||
    "Request failed";

const buildErrorResponse = (error) => {
    const serverMessage = error?.response?.data?.obj?.msg;
    const message =
        serverMessage ||
        error?.response?.data?.message ||
        error?.message ||
        "Request failed";

    return {
        data: {
            success: false,
            obj: {
                msg: message,
            },
        },
        message,
        status: error?.response?.status ?? 0,
        rawError: error,
    };
};

const request = async (context, path, method, body, access = true) => {
    if (!runtimeConfig.apiBaseUrl) {
        return buildErrorResponse(new Error("VITE_WEB_API is not configured"));
    }

    try {
        return await Axios({
            url: `${runtimeConfig.apiBaseUrl}${path}`,
            method,
            data: body || {},
            headers: access ? { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` } : {},
            timeout: 15000,
        });
    } catch (error) {
        return buildErrorResponse(error);
    }
};

export default request;
