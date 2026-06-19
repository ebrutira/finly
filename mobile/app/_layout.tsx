import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../services/api';
import { setupNotifications } from '../services/notifications';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const { token, isLoading, loadFromStorage, updateUser } = useAuthStore();
  const { themeLoaded, hasSetTheme } = useThemeStore();
  const router = useRouter();
  const segments = useSegments();
  const notificationsSetup = useRef(false);

  useEffect(() => { loadFromStorage(); }, []);

  useEffect(() => {
    if (!themeLoaded || isLoading) return;

    const currentScreen = segments[1] as string | undefined;
    const inAuthGroup = segments[0] === '(auth)';

    // Tema henüz seçilmemiş → tema seçim ekranı (zaten orada değilsek)
    if (!hasSetTheme) {
      if (currentScreen !== 'theme-select') {
        router.replace('/(auth)/theme-select');
      }
      return;
    }

    // Tema seçimi tamamlandı, normal auth akışı
    if (currentScreen === 'theme-select') return;
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/splash');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments, themeLoaded, hasSetTheme]);

  // Token geçerliyken tam profili çek (balance, xp, level dahil)
  useEffect(() => {
    if (!token || isLoading) return;
    api.get('/users/me')
      .then((res) => updateUser(res.data.user))
      .catch(() => {});
    if (!notificationsSetup.current) {
      notificationsSetup.current = true;
      setupNotifications().catch(() => {});
    }
  }, [token]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // Bildirime tiklaninca uygulamayi on plana getir, hic bir sey yapma
    });
    return () => sub.remove();
  }, []);

  const [fontsLoaded] = useFonts({
    Syne_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const { loadTheme } = useThemeStore();
  useEffect(() => { loadTheme(); }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="notifications"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="stock/[symbol]"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
    </>
  );
}
