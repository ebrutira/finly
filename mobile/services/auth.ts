import api from './api';

export const register = (name: string, email: string, password: string) =>
  api.post('/auth/register', { name, email, password });

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const verifyEmail = (email: string, otp: string) =>
  api.post('/auth/verify-email', { email, otp });

export const resendVerification = (email: string) =>
  api.post('/auth/resend-verification', { email });

export const forgotPassword = (email: string) =>
  api.post('/auth/forgot-password', { email });

export const resetPassword = (email: string, otp: string, newPassword: string) =>
  api.post('/auth/reset-password', { email, otp, newPassword });
