import api from './api';

export const getNotifications = () => api.get('/notifications');

export const readAll = () => api.patch('/notifications/read-all');

export const readOne = (id: number) => api.patch(`/notifications/${id}/read`);
