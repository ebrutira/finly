import api from './api';

export const getFriends = () => api.get('/friends');

export const getRequests = () => api.get('/friends/requests');

export const sendRequest = (email: string) =>
  api.post('/friends/request', { email });

export const respondToRequest = (friendshipId: number, action: 'accept' | 'decline') =>
  api.patch(`/friends/respond/${friendshipId}`, { action });

export const getLeaderboard = () => api.get('/friends/leaderboard');
