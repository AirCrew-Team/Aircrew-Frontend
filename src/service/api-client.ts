import axios from "axios";

const BASE_URL = import.meta.env.VITE_URL_API_BACKEND

if (!BASE_URL) {
  throw new Error('Falta la variable VITE_URL_API_BACKEND en el archivo .env');
}

const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 10_000,
})

export default apiClient;