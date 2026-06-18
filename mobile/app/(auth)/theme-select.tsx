import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';

const { width } = Dimensions.get('window');
const CARD_W = (width - 60) / 2;
const TEAL = '#3A9BAB';

export default function ThemeSelectScreen() {
  const { setTheme, markThemeSet, isDark } = useThemeStore();
  const router = useRouter();

  const [selectedDark, setSelectedDark] = useState(isDark);

  const handleContinue = () => {
    setTheme(selectedDark);
    markThemeSet();
    router.replace('/(auth)/splash');
  };

  return (
    <LinearGradient
      colors={selectedDark ? ['#071820', '#0A1E24', '#071215'] : ['#EEF9FA', '#F4FAFB', '#E8F5F7']}
      style={styles.container}
    >
      <SafeAreaView style={styles.inner}>
        <View style={styles.logoRow}>
          <Text style={[styles.logoFin, { color: '#B5DDE3' }]}>Fin</Text>
          <Text style={[styles.logoLy, { color: TEAL }]}>Ly</Text>
        </View>

        <Text style={[styles.title, { color: selectedDark ? '#E8F6F8' : '#0D2226' }]}>
          Temanı Seç
        </Text>
        <Text style={[styles.sub, { color: selectedDark ? '#6A9AA2' : '#3A7A84' }]}>
          Daha sonra ayarlardan değiştirebilirsin
        </Text>

        <View style={styles.cardsRow}>
          <TouchableOpacity
            style={[
              styles.themeCard,
              { borderColor: selectedDark ? TEAL : 'transparent', borderWidth: 2 },
            ]}
            onPress={() => setSelectedDark(true)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#0E2228', '#071215']} style={styles.cardGrad}>
              <View style={styles.cardMiniBar}>
                {[40, 60, 80, 100].map((h, i) => (
                  <View
                    key={i}
                    style={[styles.miniBar, { height: h * 0.4, backgroundColor: TEAL, opacity: 0.4 + i * 0.2 }]}
                  />
                ))}
              </View>
              <Text style={[styles.cardLabel, { color: '#E8F6F8' }]}>Koyu</Text>
            </LinearGradient>
            {selectedDark && (
              <View style={[styles.checkBadge, { backgroundColor: TEAL }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeCard,
              { borderColor: !selectedDark ? TEAL : 'transparent', borderWidth: 2 },
            ]}
            onPress={() => setSelectedDark(false)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#EBF6F8', '#F4FAFB']} style={styles.cardGrad}>
              <View style={styles.cardMiniBar}>
                {[40, 60, 80, 100].map((h, i) => (
                  <View
                    key={i}
                    style={[styles.miniBar, { height: h * 0.4, backgroundColor: TEAL, opacity: 0.4 + i * 0.2 }]}
                  />
                ))}
              </View>
              <Text style={[styles.cardLabel, { color: '#0D2226' }]}>Açık</Text>
            </LinearGradient>
            {!selectedDark && (
              <View style={[styles.checkBadge, { backgroundColor: TEAL }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: TEAL }]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Devam Et →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoRow: { flexDirection: 'row', marginBottom: 28 },
  logoFin: { fontFamily: 'Syne_800ExtraBold', fontSize: 36, letterSpacing: -1 },
  logoLy:  { fontFamily: 'Syne_800ExtraBold', fontSize: 36, letterSpacing: -1 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 22, marginBottom: 6 },
  sub: { fontFamily: 'DMSans_400Regular', fontSize: 13, marginBottom: 32 },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 48, width: '100%' },
  themeCard: {
    width: CARD_W,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGrad: { padding: 16, alignItems: 'center', borderRadius: 18 },
  cardMiniBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 60,
    marginBottom: 14,
  },
  miniBar: { width: 12, borderRadius: 4 },
  cardLabel: { fontFamily: 'Syne_700Bold', fontSize: 14 },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
  },
  btnText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: '#fff' },
});
