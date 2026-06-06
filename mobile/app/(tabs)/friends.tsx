import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import {
  getFriends, getRequests, sendRequest, respondToRequest, getLeaderboard,
} from '../../services/friends';

type FriendTab = 'Arkadaşlar' | 'Sıralama' | 'İstekler';

interface Friend { id: number; name: string; email: string; xp: number; level: number; }
interface Request { friendship_id: number; user: Friend; }
interface LeaderEntry { id: number; name: string; xp: number; level: number; rank: number; isMe: boolean; }

export default function FriendsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<FriendTab>(
    (params.tab as FriendTab) ?? 'Arkadaşlar'
  );
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { user } = useAuthStore();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [addVisible, setAddVisible] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fr, req, lb] = await Promise.all([
        getFriends(), getRequests(), getLeaderboard(),
      ]);
      setFriends(fr.data.friends);
      setRequests(req.data.requests);
      setLeaderboard(lb.data.leaderboard);
    } catch {
      // sessizce geç
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleSendRequest = async () => {
    if (!addEmail.trim()) return;
    setAddLoading(true);
    try {
      const res = await sendRequest(addEmail.trim());
      Alert.alert('Başarılı', res.data.message);
      setAddVisible(false);
      setAddEmail('');
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'İstek gönderilemedi.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRespond = async (friendshipId: number, action: 'accept' | 'decline') => {
    try {
      await respondToRequest(friendshipId, action);
      setRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
      if (action === 'accept') load(); // arkadaş listesini yenile
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.error || 'İşlem başarısız.');
    }
  };

  const tabs: FriendTab[] = ['Arkadaşlar', 'Sıralama', 'İstekler'];
  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: C.text1 }]}>Arkadaşlar</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: `${C.primary}26`, borderColor: `${C.primary}4D` }]}
          onPress={() => setAddVisible(true)}
        >
          <Text style={[styles.addBtnText, { color: C.primaryDim }]}>+ Ekle</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: C.bgCard, borderColor: C.border }]}>
        <Text style={[{ fontSize: 14, color: C.textMuted }]}>⊘</Text>
        <TextInput
          style={[styles.searchInput, { color: C.text1 }]}
          placeholder="Arkadaş ara..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          selectionColor={C.primary}
        />
      </View>

      <View style={[styles.tabSwitcher, { backgroundColor: C.bgCard, borderColor: C.border }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.fTab, activeTab === t && { backgroundColor: C.primary }]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.75}
          >
            <Text style={[styles.fTabText, { color: activeTab === t ? C.bg : C.textMuted }]}>
              {t}{t === 'İstekler' && requests.length > 0 ? ` ${requests.length}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

          {activeTab === 'Arkadaşlar' && (
            filteredFriends.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>
                  {friends.length === 0 ? 'Henüz arkadaşın yok' : 'Sonuç bulunamadı'}
                </Text>
              </View>
            ) : (
              filteredFriends.map((f) => (
                <View key={f.id} style={styles.friendRow}>
                  <View style={[styles.avatar, { backgroundColor: C.primary }]}>
                    <Text style={[styles.avatarText, { color: C.bg }]}>{f.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.friendName, { color: C.text1 }]}>{f.name}</Text>
                    <Text style={[styles.friendSub, { color: C.textMuted }]}>Seviye {f.level} · {f.xp} XP</Text>
                  </View>
                </View>
              ))
            )
          )}

          {activeTab === 'Sıralama' && (
            leaderboard.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>Sıralama için arkadaş ekle</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: C.text1 }]}>Haftalık Liderlik</Text>
                {leaderboard.map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.friendRow,
                      entry.isMe && { backgroundColor: `${C.primary}0D` },
                    ]}
                  >
                    <Text style={[styles.rankBig, { color: C.primaryDim }]}>#{entry.rank}</Text>
                    <View style={[styles.avatar, { backgroundColor: entry.isMe ? C.primary : C.bgCard, borderWidth: entry.isMe ? 0 : 1, borderColor: C.border }]}>
                      <Text style={[styles.avatarText, { color: entry.isMe ? C.bg : C.text3 }]}>
                        {entry.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.friendName, { color: C.text1 }]}>
                        {entry.name}{entry.isMe ? ' (Sen)' : ''}
                      </Text>
                      <Text style={[styles.friendSub, { color: C.textMuted }]}>{entry.xp} XP</Text>
                    </View>
                    {entry.rank === 1 && <Text style={{ fontSize: 20 }}>🏆</Text>}
                  </View>
                ))}
              </>
            )
          )}

          {activeTab === 'İstekler' && (
            requests.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: C.textMuted }]}>Bekleyen istek yok</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: C.text1 }]}>
                  Bekleyen İstekler
                  <Text style={{ color: C.danger }}> {requests.length}</Text>
                </Text>
                <View style={[styles.pendingCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                  {requests.map((r, idx) => (
                    <View key={r.friendship_id}>
                      <View style={styles.pendingRow}>
                        <View style={[styles.avatar, styles.avatarSm, { backgroundColor: C.primary }]}>
                          <Text style={[styles.avatarText, { fontSize: 13, color: C.bg }]}>
                            {r.user?.name?.charAt(0).toUpperCase() ?? '?'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pendingName, { color: C.text1 }]}>{r.user?.name}</Text>
                          <Text style={[styles.pendingSub, { color: C.textMuted }]}>Seviye {r.user?.level}</Text>
                        </View>
                        <View style={styles.pendingBtns}>
                          <TouchableOpacity
                            style={[styles.acceptBtn, { backgroundColor: C.successBg, borderColor: `${C.success}40` }]}
                            onPress={() => handleRespond(r.friendship_id, 'accept')}
                          >
                            <Text style={[styles.acceptText, { color: C.success }]}>✓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.declineBtn, { backgroundColor: C.dangerBg, borderColor: `${C.danger}33` }]}
                            onPress={() => handleRespond(r.friendship_id, 'decline')}
                          >
                            <Text style={[styles.declineText, { color: C.danger }]}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {idx < requests.length - 1 && <View style={[styles.separator, { backgroundColor: C.border }]} />}
                    </View>
                  ))}
                </View>
              </>
            )
          )}
        </ScrollView>
      )}

      {/* Arkadaş Ekleme Modal */}
      <Modal visible={addVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text1 }]}>Arkadaş Ekle</Text>
            <Text style={[styles.modalSub, { color: C.textMuted }]}>
              Arkadaşının e-posta adresini gir
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.bg2, borderColor: C.border, color: C.text1 }]}
              value={addEmail}
              onChangeText={setAddEmail}
              placeholder="email@ornek.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor={C.primary}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: C.border }]}
                onPress={() => { setAddVisible(false); setAddEmail(''); }}
              >
                <Text style={[styles.modalCancelText, { color: C.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: C.primary }]}
                onPress={handleSendRequest}
                disabled={addLoading}
              >
                {addLoading
                  ? <ActivityIndicator color={C.bg} size="small" />
                  : <Text style={[styles.modalConfirmText, { color: C.bg }]}>Gönder</Text>
                }
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  heading: { fontFamily: 'Syne_800ExtraBold', fontSize: 26 },
  addBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13 },
  tabSwitcher: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, borderWidth: 1, borderRadius: 16, padding: 3 },
  fTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  fTabText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontFamily: 'DMSans_400Regular', fontSize: 14 },
  sectionTitle: { fontFamily: 'Syne_700Bold', fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { fontFamily: 'Syne_800ExtraBold', fontSize: 16 },
  friendName: { fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  friendSub: { fontFamily: 'DMSans_400Regular', fontSize: 10, marginTop: 2 },
  rankBig: { fontFamily: 'Syne_800ExtraBold', fontSize: 16, width: 28 },
  pendingCard: { marginHorizontal: 16, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  pendingName: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  pendingSub: { fontFamily: 'DMSans_400Regular', fontSize: 10, marginTop: 1 },
  pendingBtns: { flexDirection: 'row', gap: 6 },
  acceptBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  acceptText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
  declineBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  declineText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
  separator: { height: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24 },
  modalTitle: { fontFamily: 'Syne_700Bold', fontSize: 18, marginBottom: 4 },
  modalSub: { fontFamily: 'DMSans_400Regular', fontSize: 13, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  modalConfirmBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalConfirmText: { fontFamily: 'Syne_700Bold', fontSize: 14 },
});
