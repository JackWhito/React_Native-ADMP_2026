import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: "http://10.24.124.78:5000/api"
});