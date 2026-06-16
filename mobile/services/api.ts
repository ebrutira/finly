import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

// Render/cloud deploy yapıldığında buraya URL'i yaz, '' bırakırsan dev modunda otomatik tespit eder
const PRODUCTION_API_URL = 'https://finly-jfrz.onrender.com';

function getApiUrl(): string {
  if (PRODUCTION_API_URL) return PRODUCTION_API_URL;

  // Expo Go fiziksel telefonda: Metro bundler'ın host IP'sini al
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }

  // Android emülatör fallback
  return 'http://10.0.2.2:3000';
}

export const API_URL = getApiUrl();

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
