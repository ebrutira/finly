import { useThemeStore, ACCENT_PRESETS } from '../store/themeStore';
import { darkTheme, lightTheme } from '../constants/themes';

export function useColors() {
  const isDark = useThemeStore((s) => s.isDark);
  const accentKey = useThemeStore((s) => s.accentKey);
  const base = isDark ? darkTheme : lightTheme;
  if (accentKey === 'teal') return base;
  const accent = ACCENT_PRESETS.find((a) => a.key === accentKey);
  if (!accent) return base;
  return {
    ...base,
    primary: accent.color,
    primaryDim: accent.dim,
    primaryLight: accent.light,
    primaryPale: accent.light,
  };
}
