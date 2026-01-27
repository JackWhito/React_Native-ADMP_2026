import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: "http://10.24.124.78:5000/api"
});
axiosInstance.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);