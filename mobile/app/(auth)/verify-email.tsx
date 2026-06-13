import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyEmail, resendVerification } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../hooks/useColors';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const refs = useRef<(TextInput | null)[]>([]);
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const C = useColors();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('6 haneli kodu eksiksiz gir.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await verifyEmail(email!, code);
      setAuth(res.data.token, res.data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Doğrulama başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      await resendVerification(email!);
      setCooldown(60);
    } catch {}
    setResendLoading(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg2 }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={[styles.iconWrap, { backgroundColor: `${C.primary}20`, borderColor: `${C.primary}40` }]}>
            <Text style={styles.iconText}>✉</Text>
          </View>

          <Text style={[styles.heading, { color: C.text1 }]}>E-postanı{'\n'}Doğrula</Text>
          <Text style={[styles.sub, { color: C.textMuted }]}>
            <Text style={{ color: C.primaryDim }}>{email}</Text>
            {'\n'}adresine gönderilen 6 haneli kodu gir
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { refs.current[i] = r; }}
                style={[
                  styles.otpBox,
                  { backgroundColor: C.bgCard, borderColor: digit ? C.primary : C.border, color: C.text1 },
                ]}
                value={digit}
                onChangeText={(v) => handleChange(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                selectionColor={C.primary}
              />
            ))}
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: C.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.bg} size="small" />
              : <Text style={[styles.btnText, { color: C.bg }]}>Doğrula</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResend}
            disabled={resendLoading || cooldown > 0}
          >
            {resendLoading ? (
              <ActivityIndicator color={C.primaryDim} size="small" />
            ) : (
              <Text style={[styles.resendText, { color: cooldown > 0 ? C.textMuted : C.primaryDim }]}>
                {cooldown > 0 ? `Tekrar gönder (${cooldown}s)` : 'Kodu tekrar gönder'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1, paddingHorizontal: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 22, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  iconText: { fontSize: 28 },
  heading: {
    fontFamily: 'Syne_800ExtraBold', fontSize: 28,
    textAlign: 'center', lineHeight: 34, marginBottom: 12,
  },
  sub: {
    fontFamily: 'DMSans_400Regular', fontSize: 13,
    textAlign: 'center', lineHeight: 20, marginBottom: 32,
  },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpBox: {
    width: 46, height: 56, borderWidth: 1.5, borderRadius: 14,
    textAlign: 'center', fontFamily: 'Syne_800ExtraBold', fontSize: 22,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, marginBottom: 12,
  },
  btn: {
    width: '100%', borderRadius: 18, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#3A9BAB', shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  btnText: { fontFamily: 'Syne_700Bold', fontSize: 15 },
  resendBtn: { marginTop: 20, paddingVertical: 8 },
  resendText: { fontFamily: 'DMSans_500Medium', fontSize: 13 },
});
