import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../hooks/useColors';

const features = [
  { icon: '↗', label: 'Gerçek\nPiyasa' },
  { icon: '◈', label: 'Görev &\nRozet' },
  { icon: '◎', label: 'Arkadaş\nRekabeti' },
];

export default function SplashScreen() {
  const router = useRouter();
  const C = useColors();

  return (
    <LinearGradient
      colors={['#071820', '#0A1E24', '#071215']}
      style={styles.container}
    >
      <SafeAreaView style={styles.inner}>
        <View style={styles.logoWrap}>
          <Text style={[styles.logoFin, { color: C.primaryLight }]}>Fin</Text>
          <Text style={[styles.logoLy, { color: C.primary }]}>ly</Text>
        </View>

        <Text style={[styles.tagline, { color: C.text1 }]}>
          Yatırım Yapmayı{'\n'}Oynayarak Öğren
        </Text>
        <Text style={[styles.sub, { color: C.text3 }]}>
          Sanal portföyünle piyasaları keşfet,{'\n'}görevler tamamla, seviye atla.
        </Text>

        <View style={styles.featuresRow}>
          {features.map((f) => (
            <View
              key={f.label}
              style={[styles.featCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
            >
              <Text style={[styles.featIcon, { color: C.primaryDim }]}>{f.icon}</Text>
              <Text style={[styles.featText, { color: C.text3 }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { color: C.bg, backgroundColor: C.primary }]}>
            Başla →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: C.border }]}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.75}
        >
          <Text style={[styles.secondaryBtnText, { color: C.text2 }]}>
            Hesabım var, giriş yap
          </Text>
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
    paddingHorizontal: 28,
  },
  logoWrap: { flexDirection: 'row', marginBottom: 24 },
  logoFin: { fontFamily: 'Syne_800ExtraBold', fontSize: 40, letterSpacing: -1 },
  logoLy: { fontFamily: 'Syne_800ExtraBold', fontSize: 40, letterSpacing: -1 },
  tagline: {
    fontFamily: 'Syne_800ExtraBold', fontSize: 26,
    textAlign: 'center', lineHeight: 32, marginBottom: 12,
  },
  sub: {
    fontFamily: 'DMSans_400Regular', fontSize: 13,
    textAlign: 'center', lineHeight: 20, marginBottom: 36,
  },
  featuresRow: { flexDirection: 'row', gap: 10, marginBottom: 40, width: '100%' },
  featCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  featIcon: { fontSize: 18, marginBottom: 6 },
  featText: { fontFamily: 'DMSans_400Regular', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  primaryBtn: { width: '100%', borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  primaryBtnText: {
    fontFamily: 'Syne_700Bold', fontSize: 15,
    textAlign: 'center', paddingVertical: 17,
    borderRadius: 18, overflow: 'hidden',
  },
  secondaryBtn: { width: '100%', borderWidth: 1, borderRadius: 18, paddingVertical: 16 },
  secondaryBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 13, textAlign: 'center' },
});
