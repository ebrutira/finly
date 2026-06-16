import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCENT_PRESETS = [
  { key: 'teal',    label: 'Teal',   color: '#3A9BAB', dim: '#5BBFCC', light: '#B5DDE3' },
  { key: 'indigo',  label: 'İndigo', color: '#6366F1', dim: '#818CF8', light: '#C7D2FE' },
  { key: 'emerald', label: 'Zümrüt', color: '#10B981', dim: '#34D399', light: '#A7F3D0' },
  { key: 'rose',    label: 'Gül',    color: '#F43F5E', dim: '#FB7185', light: '#FECDD3' },
  { key: 'amber',   label: 'Amber',  color: '#F59E0B', dim: '#FCD34D', light: '#FDE68A' },
  { key: 'blue',    label: 'Mavi',   color: '#3B82F6', dim: '#60A5FA', light: '#BFDBFE' },
];

interface ThemeState {
  isDark: boolean;
  accentKey: string;
  hasSetTheme: boolean;
  themeLoaded: boolean;
  setTheme: (isDark: boolean) => void;
  setAccentKey: (key: string) => void;
  markThemeSet: () => void;
  toggle: () => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: true,
  accentKey: 'teal',
  hasSetTheme: false,
  themeLoaded: false,

  setTheme: (isDark: boolean) => {
    AsyncStorage.setItem('theme', isDark ? 'dark' : 'light');
    set({ isDark });
  },

  setAccentKey: (key: string) => {
    AsyncStorage.setItem('accentKey', key);
    set({ accentKey: key });
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
    const [saved, savedAccent, hasSet] = await Promise.all([
      AsyncStorage.getItem('theme'),
      AsyncStorage.getItem('accentKey'),
      AsyncStorage.getItem('hasSetTheme'),
    ]);
    set({
      isDark: saved ? saved === 'dark' : true,
      accentKey: savedAccent || 'teal',
      hasSetTheme: hasSet === 'true',
      themeLoaded: true,
    });
  },
}));
