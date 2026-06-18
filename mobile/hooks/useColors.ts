import { useThemeStore } from '../store/themeStore';
import { darkTheme, lightTheme } from '../constants/themes';

export function useColors() {
  const isDark = useThemeStore((s) => s.isDark);
  return isDark ? darkTheme : lightTheme;
}
