import axios from "axios";
import * as SecureStore from "expo-secure-store";


export const publicAxiosInstance = axios.create({
    baseURL: "http://192.168.1.10:5000/api"
});
export const axiosInstance = axios.create({
    baseURL: "http://192.168.1.10:5000/api"
});

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.log("SecureStore error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);
