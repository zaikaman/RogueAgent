import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors here (e.g., 401, 403, 500)
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const endpoints = {
  health: '/health',
  run: '/run',
  runStatus: '/run-status',
  logs: '/logs',
  signalsHistory: '/signals/history',
  intelHistory: '/intel/history',
  updateTelegram: '/users/telegram',
};

export const updateTelegramUsername = async (walletAddress: string, telegramUsername: string) => {
  return api.post(endpoints.updateTelegram, { walletAddress, telegramUsername });
};
