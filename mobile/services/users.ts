import api from './api';

export const getProfile = () => api.get('/users/me');

export const updateProfile = (name: string) =>
  api.patch('/users/me', { name });

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.patch('/users/password', { currentPassword, newPassword });
