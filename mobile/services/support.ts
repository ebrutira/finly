import api from './api';

export const submitSupportTicket = (topic: string, message: string) =>
  api.post('/support/ticket', { topic, message });
