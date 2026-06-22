import api from './api';

export const getPortfolio = () => api.get('/portfolio');

export const getTrades = () => api.get('/portfolio/trades');

export const getPortfolioHistory = () => api.get('/portfolio/history');
