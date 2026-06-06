import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

function getApiUrl(): string {
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
