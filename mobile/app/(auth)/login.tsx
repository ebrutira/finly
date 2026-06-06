import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, SafeAreaView, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login, forgotPassword, resetPassword } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../hooks/useColors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const C = useColors();

  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Hata', 'Tüm alanları doldurun.');
    setLoading(true);
    try {
      const res = await login(email, password);
      setAuth(res.data.token, res.data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async () => {
    if (!forgotEmail) return Alert.alert('Hata', 'Email adresi girin.');
    setForgotLoading(true);
    try {
      const res = await forgotPassword(forgotEmail);
      Alert.alert(
        'Kod Gönderildi',
        `Sıfırlama kodunuz: ${res.data.code}\n\n(Gerçek uygulamada bu kod e-postanıza gönderilir.)`,
        [{ text: 'Tamam', onPress: () => setForgotStep(2) }]
      );
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'İstek gönderilemedi.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async () => {
    if (!forgotOtp || !forgotNewPass || !forgotConfirm) {
      return Alert.alert('Hata', 'Tüm alanları doldurun.');
    }
    if (forgotNewPass !== forgotConfirm) {
      return Alert.alert('Hata', 'Şifreler eşleşmiyor.');
    }
    if (forgotNewPass.length < 6) {
      return Alert.alert('Hata', 'Şifre en az 6 karakter olmalı.');
    }
    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail, forgotOtp, forgotNewPass);
      Alert.alert('Başarılı', 'Şifreniz güncellendi. Giriş yapabilirsiniz.', [
        {
          text: 'Tamam',
          onPress: () => {
            setForgotVisible(false);
            setForgotStep(1);
            setForgotEmail('');
            setForgotOtp('');
            setForgotNewPass('');
            setForgotConfirm('');
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'Şifre sıfırlanamadı.');
    } finally {
      setForgotLoading(false);
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

          <View style={styles.topGlow} />

          <Text style={[styles.heading, { color: C.text1 }]}>Tekrar{'\n'}Hoş Geldin</Text>
          <Text style={[styles.sub, { color: C.textMuted }]}>Hesabına giriş yap</Text>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: C.text3 }]}>E-POSTA</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bgCard, borderColor: C.border, color: C.text1 }]}
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
            <View style={[styles.passwordWrap, { backgroundColor: C.bgCard, borderColor: C.primary }]}>
              <TextInput
                style={[styles.passwordInput, { color: C.text1 }]}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                selectionColor={C.primary}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={[styles.eyeText, { color: C.textMuted }]}>
                  {showPassword ? 'gizle' : 'göster'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgot} onPress={() => setForgotVisible(true)}>
            <Text style={[styles.forgotText, { color: C.primaryDim }]}>Şifremi Unuttum?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: C.primary }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.bg} size="small" />
              : <Text style={[styles.primaryBtnText, { color: C.bg }]}>Giriş Yap</Text>
            }
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
            <Text style={[styles.dividerText, { color: C.textMuted }]}>veya</Text>
            <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[styles.socialBtnText, { color: C.text2 }]}>Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[styles.socialBtnText, { color: C.text2 }]}>Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: C.textMuted }]}>Hesabın yok mu? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.footerLink, { color: C.primaryDim }]}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Şifremi Unuttum Modal */}
      <Modal
        visible={forgotVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setForgotVisible(false);
          setForgotStep(1);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text1 }]}>
                {forgotStep === 1 ? 'Şifremi Unuttum' : 'Yeni Şifre Belirle'}
              </Text>
              <TouchableOpacity
                onPress={() => { setForgotVisible(false); setForgotStep(1); }}
              >
                <Text style={[styles.modalClose, { color: C.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {forgotStep === 1 ? (
              <>
                <Text style={[styles.modalDesc, { color: C.textMuted }]}>
                  Kayıtlı e-posta adresinizi girin. Size bir sıfırlama kodu göndereceğiz.
                </Text>
                <Text style={[styles.label, { color: C.text3 }]}>E-POSTA</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg2, borderColor: C.border, color: C.text1 }]}
                  placeholder="email@ornek.com"
                  placeholderTextColor={C.textMuted}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  selectionColor={C.primary}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: C.primary, opacity: forgotLoading ? 0.7 : 1 }]}
                  onPress={handleForgotRequest}
                  disabled={forgotLoading}
                >
                  {forgotLoading
                    ? <ActivityIndicator color={C.bg} size="small" />
                    : <Text style={[styles.primaryBtnText, { color: C.bg }]}>Kod Gönder</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.modalDesc, { color: C.textMuted }]}>
                  E-postanıza gelen 6 haneli kodu ve yeni şifrenizi girin.
                </Text>
                <Text style={[styles.label, { color: C.text3 }]}>DOĞRULAMA KODU</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg2, borderColor: C.border, color: C.text1, marginBottom: 12 }]}
                  placeholder="123456"
                  placeholderTextColor={C.textMuted}
                  value={forgotOtp}
                  onChangeText={setForgotOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectionColor={C.primary}
                />
                <Text style={[styles.label, { color: C.text3 }]}>YENİ ŞİFRE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg2, borderColor: C.border, color: C.text1, marginBottom: 12 }]}
                  placeholder="••••••••"
                  placeholderTextColor={C.textMuted}
                  value={forgotNewPass}
                  onChangeText={setForgotNewPass}
                  secureTextEntry
                  selectionColor={C.primary}
                />
                <Text style={[styles.label, { color: C.text3 }]}>ŞİFRE TEKRAR</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg2, borderColor: C.border, color: C.text1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={C.textMuted}
                  value={forgotConfirm}
                  onChangeText={setForgotConfirm}
                  secureTextEntry
                  selectionColor={C.primary}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: C.primary, marginTop: 16, opacity: forgotLoading ? 0.7 : 1 }]}
                  onPress={handleForgotReset}
                  disabled={forgotLoading}
                >
                  {forgotLoading
                    ? <ActivityIndicator color={C.bg} size="small" />
                    : <Text style={[styles.primaryBtnText, { color: C.bg }]}>Şifremi Sıfırla</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ alignItems: 'center', marginTop: 12 }}
                  onPress={() => setForgotStep(1)}
                >
                  <Text style={[styles.forgotText, { color: C.primaryDim }]}>← Kodu tekrar gönder</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 24 },
  topGlow: {
    position: 'absolute', top: -80, left: '50%',
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(58,155,171,0.06)',
    transform: [{ translateX: -150 }],
  },
  heading: {
    fontFamily: 'Syne_800ExtraBold', fontSize: 28,
    lineHeight: 34, marginBottom: 8, marginTop: 8,
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
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 16,
    paddingLeft: 16, paddingRight: 12,
    shadowColor: '#3A9BAB', shadowOpacity: 0.15,
    shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  passwordInput: {
    flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14,
    paddingVertical: 14,
  },
  eyeBtn: { padding: 4 },
  eyeText: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  forgot: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontFamily: 'DMSans_500Medium', fontSize: 12 },
  primaryBtn: {
    borderRadius: 18, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#3A9BAB', shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryBtnText: { fontFamily: 'Syne_700Bold', fontSize: 15 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  socialBtn: {
    flex: 1, borderWidth: 1, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  socialBtnText: { fontFamily: 'Syne_600SemiBold', fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  footerLink: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, padding: 24, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  modalTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 20 },
  modalClose: { fontFamily: 'DMSans_400Regular', fontSize: 18, padding: 4 },
  modalDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, marginBottom: 20, lineHeight: 18 },
});
