import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import Colors from '../../constants/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>Finly</Text>
      <Text style={styles.subtitle}>Finansal özgürlüğün yolu</Text>

      <TextInput
        style={styles.input}
        placeholder="E-posta"
        placeholderTextColor={Colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        placeholderTextColor={Colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#000" />
          : <Text style={styles.buttonText}>Giriş Yap</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.link}>
          Hesabın yok mu?{' '}
          <Text style={{ color: Colors.primary }}>Kayıt Ol</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.background,
    justifyContent: 'center', padding: 24,
  },
  logo: {
    fontSize: 42, fontWeight: 'bold', color: Colors.primary,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: 48,
  },
  input: {
    backgroundColor: Colors.card, color: Colors.text,
    borderRadius: 12, padding: 16, marginBottom: 12,
    fontSize: 16, borderWidth: 1, borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary, padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  link: { color: Colors.textSecondary, textAlign: 'center' },
});
