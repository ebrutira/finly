import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { register } from '../../services/auth';
import { useColors } from '../../hooks/useColors';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const C = useColors();

  const handleRegister = async () => {
    if (!name || !email || !password)
      return Alert.alert('Hata', 'Tüm alanları doldurun.');
    setLoading(true);
    try {
      await register(name, email, password);
      router.replace({ pathname: '/(auth)/verify-email', params: { email } });
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg2 }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: C.text3 }]}>←</Text>
          </TouchableOpacity>

          <View style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: C.primaryDim }]} />
            <View style={[styles.stepDot, { backgroundColor: C.primary }]} />
            <View style={[styles.stepDot, { backgroundColor: C.border }]} />
          </View>

          <Text style={[styles.heading, { color: C.text1 }]}>Hesap{'\n'}Oluştur</Text>
          <Text style={[styles.sub, { color: C.textMuted }]}>Ücretsiz başla, hemen oyna</Text>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: C.text3 }]}>AD SOYAD</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bgCard, borderColor: C.border, color: C.text1 }]}
              placeholder="Adın Soyadın"
              placeholderTextColor={C.textMuted}
              value={name}
              onChangeText={setName}
              selectionColor={C.primary}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: C.text3 }]}>E-POSTA</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: C.bgCard, borderColor: C.primary, color: C.text1 },
                styles.inputFocused,
              ]}
              placeholder="email@ornek.com"
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor={C.primary}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: C.text3 }]}>ŞİFRE</Text>
            <View style={[styles.passwordWrap, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: C.text1 }]}
                placeholder="En az 8 karakter"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                selectionColor={C.primary}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={[styles.eyeText, { color: C.textMuted }]}>
                  {showPassword ? 'gizle' : 'göster'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: C.primary }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.bg} size="small" />
              : <Text style={[styles.primaryBtnText, { color: C.bg }]}>Devam Et →</Text>
            }
          </TouchableOpacity>

          <Text style={[styles.termsText, { color: C.textMuted }]}>
            Kayıt olarak{' '}
            <Text style={{ color: C.primaryDim }}>Kullanım Koşullarını</Text>
            {' '}kabul etmiş olursun.
          </Text>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: C.textMuted }]}>Hesabın var mı? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.footerLink, { color: C.primaryDim }]}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 24 },
  stepRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  stepDot: { flex: 1, height: 3, borderRadius: 2 },
  heading: {
    fontFamily: 'Syne_800ExtraBold', fontSize: 28,
    lineHeight: 34, marginBottom: 8,
  },
  sub: { fontFamily: 'DMSans_400Regular', fontSize: 13, marginBottom: 28 },
  fieldWrap: { marginBottom: 16 },
  label: {
    fontFamily: 'DMSans_500Medium', fontSize: 10,
    letterSpacing: 1, marginBottom: 8,
  },
  input: {
    borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'DMSans_400Regular', fontSize: 14,
  },
  inputFocused: {
    shadowColor: '#3A9BAB', shadowOpacity: 0.15,
    shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 16,
    paddingLeft: 16, paddingRight: 12,
  },
  passwordInput: {
    flex: 1, fontFamily: 'DMSans_400Regular',
    fontSize: 14, paddingVertical: 14,
  },
  eyeBtn: { padding: 4 },
  eyeText: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  primaryBtn: {
    borderRadius: 18, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#3A9BAB', shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryBtnText: { fontFamily: 'Syne_700Bold', fontSize: 15 },
  termsText: {
    fontFamily: 'DMSans_400Regular', fontSize: 11,
    textAlign: 'center', marginTop: 14, lineHeight: 16,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  footerText: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  footerLink: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
});
