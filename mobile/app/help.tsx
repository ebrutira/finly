import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../hooks/useColors';
import { submitSupportTicket } from '../services/support';

const TOPICS = [
  { key: 'Teknik Sorun',   icon: 'construct-outline'    },
  { key: 'Hesap Sorunu',   icon: 'person-outline'       },
  { key: 'Öneri',          icon: 'bulb-outline'         },
  { key: 'Diğer',          icon: 'ellipsis-horizontal-outline' },
] as const;

type TopicKey = typeof TOPICS[number]['key'];
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const C = useColors();

  const [topic, setTopic] = useState<TopicKey | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = topic !== null && message.trim().length >= 10 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || !topic) return;
    setLoading(true);
    setError('');
    try {
      await submitSupportTicket(topic, message.trim());
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Bir hata oluştu, tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={C.text2} />
          </TouchableOpacity>
          <Text style={[styles.heading, { color: C.text1 }]}>Yardım & Destek</Text>
          <View style={{ width: 36 }} />
        </View>

        {done ? (
          /* Başarı Ekranı */
          <View style={styles.successWrap}>
            <LinearGradient
              colors={['#3A9BAB', '#B5DDE3']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.successIcon}
            >
              <Ionicons name="checkmark" size={36} color="#071215" />
            </LinearGradient>
            <Text style={[styles.successTitle, { color: C.text1 }]}>Talebiniz Alındı!</Text>
            <Text style={[styles.successDesc, { color: C.textMuted }]}>
              En kısa sürede sana dönüş yapacağız.
            </Text>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: C.primary }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.doneBtnText, { color: C.bg }]}>Tamam</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Konu Seçimi */}
            <Text style={[styles.label, { color: C.text1 }]}>Konu</Text>
            <View style={styles.topicsGrid}>
              {TOPICS.map((t) => {
                const selected = topic === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.topicCard,
                      {
                        backgroundColor: selected ? `${C.primary}18` : C.bgCard,
                        borderColor: selected ? C.primary : C.border,
                      },
                    ]}
                    onPress={() => setTopic(t.key)}
                    activeOpacity={0.75}
                  >
                    <View style={[
                      styles.topicIconWrap,
                      {
                        backgroundColor: selected ? `${C.primary}22` : `${C.text1}08`,
                        borderColor: selected ? `${C.primary}55` : C.borderLight,
                      },
                    ]}>
                      <Ionicons
                        name={t.icon as IoniconsName}
                        size={18}
                        color={selected ? C.primary : C.textMuted}
                      />
                    </View>
                    <Text style={[
                      styles.topicLabel,
                      { color: selected ? C.primary : C.text1 },
                    ]}>
                      {t.key}
                    </Text>
                    {selected && (
                      <View style={[styles.topicCheck, { backgroundColor: C.primary }]}>
                        <Ionicons name="checkmark" size={9} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Mesaj */}
            <Text style={[styles.label, { color: C.text1, marginTop: 24 }]}>Mesajın</Text>
            <View style={[styles.textAreaWrap, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <TextInput
                style={[styles.textArea, { color: C.text1 }]}
                placeholder="Sorunu veya önerini buraya yaz... (en az 10 karakter)"
                placeholderTextColor={C.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                selectionColor={C.primary}
                maxLength={1000}
              />
              <Text style={[styles.charCount, { color: C.textMuted }]}>
                {message.length}/1000
              </Text>
            </View>

            {/* Hata */}
            {error !== '' && (
              <View style={[styles.errorRow, { backgroundColor: `${C.danger}10`, borderColor: `${C.danger}33` }]}>
                <Ionicons name="alert-circle-outline" size={14} color={C.danger} />
                <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
              </View>
            )}

            {/* Gönder */}
            <TouchableOpacity
              style={[styles.submitBtn, { opacity: canSubmit ? 1 : 0.45 }]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#071215" size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={16} color="#071215" />
                  <Text style={styles.submitText}>Gönder</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.hint, { color: C.textMuted }]}>
              Talebiniz güvenli şekilde iletilir. Geri bildiriminiz için teşekkürler.
            </Text>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: 'Syne_800ExtraBold', fontSize: 18 },

  content: { paddingHorizontal: 20, paddingBottom: 40 },

  label: { fontFamily: 'Syne_700Bold', fontSize: 13, marginBottom: 12 },

  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  topicCard: {
    width: '47%', borderWidth: 1, borderRadius: 18,
    padding: 14, gap: 8, position: 'relative',
  },
  topicIconWrap: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  topicLabel: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  topicCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  textAreaWrap: {
    borderWidth: 1, borderRadius: 18, padding: 14,
  },
  textArea: {
    fontFamily: 'DMSans_400Regular', fontSize: 13,
    minHeight: 120, lineHeight: 20,
  },
  charCount: { fontFamily: 'DMSans_400Regular', fontSize: 10, textAlign: 'right', marginTop: 6 },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginTop: 12,
  },
  errorText: { fontFamily: 'DMSans_500Medium', fontSize: 12, flex: 1 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3A9BAB', borderRadius: 18,
    paddingVertical: 15, marginTop: 20,
    shadowColor: '#3A9BAB', shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  submitText: { fontFamily: 'Syne_700Bold', fontSize: 15, color: '#071215' },

  hint: { fontFamily: 'DMSans_400Regular', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  successIcon: {
    width: 80, height: 80, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3A9BAB', shadowOpacity: 0.4, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  successTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 22, textAlign: 'center' },
  successDesc: { fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    width: '100%', borderRadius: 18, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  doneBtnText: { fontFamily: 'Syne_700Bold', fontSize: 15 },
});
