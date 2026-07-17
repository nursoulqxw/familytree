import axios from 'axios';
import API_BASE_URL from '../config';
import { useAuthStore } from '../store/authStore';

const client = axios.create({
    baseURL: API_BASE_URL,
});

client.interceptors.request.use(config => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default client;