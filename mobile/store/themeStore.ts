import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  isDark: boolean;
  hasSetTheme: boolean;
  themeLoaded: boolean;
  setTheme: (isDark: boolean) => void;
  markThemeSet: () => void;
  toggle: () => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: true,
  hasSetTheme: false,
  themeLoaded: false,

  setTheme: (isDark: boolean) => {
    AsyncStorage.setItem('theme', isDark ? 'dark' : 'light');
    set({ isDark });
  },

  markThemeSet: () => {
    AsyncStorage.setItem('hasSetTheme', 'true');
    set({ hasSetTheme: true });
  },

  toggle: () => {
    const next = !get().isDark;
    AsyncStorage.setItem('theme', next ? 'dark' : 'light');
    set({ isDark: next });
  },

  loadTheme: async () => {
    const [saved, hasSet] = await Promise.all([
      AsyncStorage.getItem('theme'),
      AsyncStorage.getItem('hasSetTheme'),
    ]);
    set({
      isDark: saved ? saved === 'dark' : true,
      hasSetTheme: hasSet === 'true',
      themeLoaded: true,
    });
  },
}));
