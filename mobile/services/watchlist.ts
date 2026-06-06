import api from './api';

export const getWatchlist = () => api.get('/watchlist');

export const addToWatchlist = (symbol: string) =>
  api.post('/watchlist', { symbol });

export const removeFromWatchlist = (symbol: string) =>
  api.delete(`/watchlist/${symbol}`);
