import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Switch, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useColors } from '../../hooks/useColors';
import { getFriends } from '../../services/friends';
import { getQuests } from '../../services/quests';
import { updateProfile, changePassword } from '../../services/users';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();

  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [badgeCount, setBadgeCount] = useState<number | null>(null);

  // Profil düzenleme modal
  const [editVisible, setEditVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name ?? '');
  const [editLoading, setEditLoading] = useState(false);

  // Şifre değiştirme modal
  const [pwVisible, setPwVisible] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    getFriends()
      .then((res) => setFriendCount(res.data.friends.length))
      .catch(() => setFriendCount(0));

    getQuests()
      .then((res) => {
        const done = res.data.quests.filter((q: any) => q.done).length;
        setBadgeCount(done);
      })
      .catch(() => setBadgeCount(0));
  }, []);

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap', style: 'destructive',
        onPress: () => { logout(); router.replace('/(auth)/splash'); },
      },
    ]);
  };

  const handleEditProfile = async () => {
    if (!newName.trim()) return;
    setEditLoading(true);
    try {
      const res = await updateProfile(newName.trim());
      updateUser({ name: res.data.user.name });
      setEditVisible(false);
      Alert.alert('Başarılı', 'Profilin güncellendi.');
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'Güncelleme başarısız.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return Alert.alert('Hata', 'Tüm alanları doldurun.');
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwVisible(false);
      setCurrentPw(''); setNewPw('');
      Alert.alert('Başarılı', 'Şifren değiştirildi.');
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'Şifre değiştirilemedi.');
    } finally {
      setPwLoading(false);
    }
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const balance = user?.balance ?? 0;
  const xp = user?.xp ?? 0;
  const level = user?.level ?? 1;

  const stats = [
    { val: String(level), label: 'Seviye' },
    { val: String(xp), label: 'XP' },
    { val: badgeCount !== null ? String(badgeCount) : '—', label: 'Rozet' },
    { val: friendCount !== null ? String(friendCount) : '—', label: 'Arkadaş' },
  ];

  const SETTINGS: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    type: 'chevron' | 'toggle' | 'value';
    value?: string;
    onPress?: () => void;
  }[] = [
    { icon: 'person-circle-outline', label: 'Profili Düzenle', type: 'chevron', onPress: () => { setNewName(user?.name ?? ''); setEditVisible(true); } },
    { icon: 'moon-outline', label: 'Karanlık Mod', type: 'toggle' },
    { icon: 'lock-closed-outline', label: 'Şifre Değiştir', type: 'chevron', onPress: () => setPwVisible(true) },
    { icon: 'wallet-outline', label: 'Sanal Bakiye', type: 'value', value: `$${balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
    { icon: 'help-circle-outline', label: 'Yardım & Destek', type: 'chevron' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        <View style={[styles.profileTop, { backgroundColor: C.heroTop, borderBottomColor: C.border }]}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { borderColor: `${C.primary}66` }]}>
              <Text style={[styles.avatarText, { color: C.bg }]}>{initial}</Text>
            </View>
            <TouchableOpacity
              style={[styles.editBadge, { backgroundColor: C.primary, borderColor: C.bg2 }]}
              onPress={() => { setNewName(user?.name ?? ''); setEditVisible(true); }}
            >
              <Ionicons name="pencil" size={9} color={C.bg} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: C.text1 }]}>{user?.name ?? 'Kullanıcı'}</Text>
          <Text style={[styles.profileEmail, { color: C.textMuted }]}>{user?.email ?? ''}</Text>

          <View style={styles.statsRow}>
            {stats.map((s, idx) => (
              <View
                key={s.label}
                style={[styles.statItem, idx < stats.length - 1 && { borderRightWidth: 1, borderRightColor: C.border }]}
              >
                <Text style={[styles.statVal, { color: C.text1 }]}>{s.val}</Text>
                <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.settingsGroup}>
          {SETTINGS.map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.settingRow, { borderBottomColor: `${C.border}88` }]}
              onPress={s.onPress}
              activeOpacity={s.onPress ? 0.7 : 1}
            >
              <View style={[styles.settingIcon, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <Ionicons name={s.icon} size={15} color={C.text3} />
              </View>
              <Text style={[styles.settingLabel, { color: C.text1 }]}>{s.label}</Text>

              {s.label === 'Karanlık Mod' ? (
                <Switch value={isDark} onValueChange={toggle} trackColor={{ false: C.border, true: C.primary }} thumbColor="white" />
              ) : s.type === 'value' ? (
                <>
                  <Text style={[styles.settingVal, { color: C.textMuted }]}>{s.value}</Text>
                  <Text style={[styles.chevron, { color: C.textMuted }]}>›</Text>
                </>
              ) : s.type === 'chevron' ? (
                <Text style={[styles.chevron, { color: C.textMuted }]}>›</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: C.dangerBg, borderColor: `${C.danger}33` }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={[styles.logoutText, { color: C.danger }]}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Profil Düzenleme Modal */}
      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text1 }]}>Profili Düzenle</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.bg2, borderColor: C.border, color: C.text1 }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Ad Soyad"
              placeholderTextColor={C.textMuted}
              selectionColor={C.primary}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: C.border }]} onPress={() => setEditVisible(false)}>
                <Text style={[styles.modalCancelText, { color: C.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: C.primary }]} onPress={handleEditProfile} disabled={editLoading}>
                {editLoading ? <ActivityIndicator color={C.bg} size="small" /> : <Text style={[styles.modalConfirmText, { color: C.bg }]}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Şifre Değiştirme Modal */}
      <Modal visible={pwVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text1 }]}>Şifre Değiştir</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.bg2, borderColor: C.border, color: C.text1 }]}
              value={currentPw}
              onChangeText={setCurrentPw}
              placeholder="Mevcut Şifre"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              selectionColor={C.primary}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.bg2, borderColor: C.border, color: C.text1, marginTop: 10 }]}
              value={newPw}
              onChangeText={setNewPw}
              placeholder="Yeni Şifre (en az 8 karakter)"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              selectionColor={C.primary}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: C.border }]} onPress={() => { setPwVisible(false); setCurrentPw(''); setNewPw(''); }}>
                <Text style={[styles.modalCancelText, { color: C.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: C.primary }]} onPress={handleChangePassword} disabled={pwLoading}>
                {pwLoading ? <ActivityIndicator color={C.bg} size="small" /> : <Text style={[styles.modalConfirmText, { color: C.bg }]}>Değiştir</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  profileTop: { borderBottomWidth: 1, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12, alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#3A9BAB', alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  avatarText: { fontFamily: 'Syne_800ExtraBold', fontSize: 30 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontFamily: 'Syne_800ExtraBold', fontSize: 20, marginBottom: 4 },
  profileEmail: { fontFamily: 'DMSans_400Regular', fontSize: 12, marginBottom: 20 },
  statsRow: { flexDirection: 'row', width: '100%' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statVal: { fontFamily: 'Syne_800ExtraBold', fontSize: 18 },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  settingsGroup: { paddingTop: 6 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  settingVal: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  chevron: { fontSize: 18, lineHeight: 20 },
  logoutBtn: { margin: 16, borderWidth: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontFamily: 'Syne_700Bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24 },
  modalTitle: { fontFamily: 'Syne_700Bold', fontSize: 18, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  modalConfirmBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalConfirmText: { fontFamily: 'Syne_700Bold', fontSize: 14 },
});
