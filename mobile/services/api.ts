import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Fiziksel cihazda test icin makinenizin yerel IP adresini yazin (ornek: http://192.168.1.x:3000)
// Android emulator icin: http://10.0.2.2:3000
export const API_URL = 'http://10.0.2.2:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
