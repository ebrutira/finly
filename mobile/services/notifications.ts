import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

export const getNotifications = () => api.get('/notifications');
export const readAll = () => api.patch('/notifications/read-all');
export const readOne = (id: number) => api.patch(`/notifications/${id}/read`);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('finly', {
      name: 'Finly',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3A9BAB',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }

  if (final !== 'granted') return;

  // Expo Go'da remote push token desteklenmiyor (SDK 53+), sadece dev build/APK'da kaydet
  const isExpoGo = Constants.appOwnership === 'expo';
  if (Device.isDevice && !isExpoGo) {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '3fd73e7b-1f33-4d4a-8d58-fdb03c8c3ac3',
      });
      await api.post('/users/push-token', { token: tokenData.data }).catch(() => {});
    } catch {}
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Finly',
      body: 'Gunluk gorevlerini tamamlamayi unutma!',
      channelId: 'finly',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Streak Tehlikede!',
      body: 'Serini korumak icin bugun giris yapmayi unutma.',
      channelId: 'finly',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}
