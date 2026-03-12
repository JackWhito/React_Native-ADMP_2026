import axios from "axios";
import { useAuth } from "@clerk/expo"
import { useEffect } from "react";

const API_URL = "http://192.168.1.3:5000/api";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

export const useApi = () => {
    const {getToken} = useAuth()

    useEffect(() => {
        const requestInterceptor = api.interceptors.request.use(async (config) => {
            try {
                const token = await getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error("Failed to get auth token:", error);
            }
            return config;
        });
        return () => {
            api.interceptors.request.eject(requestInterceptor);
        }
    },[getToken])
    return api;
}