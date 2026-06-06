import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { getNotifications, readAll, readOne } from '../services/notifications';

interface NotifItem {
  id: number;
  icon: string;
  type: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();

  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications()
      .then((res) => setNotifications(res.data.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleReadAll = async () => {
    try {
      await readAll();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* sessizce geç */ }
  };

  const handleReadOne = async (id: number) => {
    try {
      await readOne(id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch { /* sessizce geç */ }
  };

  const getIconStyle = (type: string) => {
    if (type === 'success') return { bg: C.successBg, color: C.success };
    if (type === 'danger') return { bg: C.dangerBg, color: C.danger };
    return { bg: `${C.primary}1A`, color: C.primaryDim };
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={C.text2} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: C.text1 }]}>Bildirimler</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleReadAll}>
            <Text style={[styles.readAll, { color: C.primaryDim }]}>Tümünü Oku</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="notifications-off-outline" size={40} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Henüz bildirim yok</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {notifications.map((n) => {
            const iconStyle = getIconStyle(n.type);
            return (
              <TouchableOpacity
                key={n.id}
                style={[
                  styles.notifItem,
                  { borderBottomColor: C.border },
                  !n.is_read && { backgroundColor: `${C.primary}0A` },
                ]}
                onPress={() => !n.is_read && handleReadOne(n.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.notifIcon, { backgroundColor: iconStyle.bg }]}>
                  <Ionicons name={n.icon as any} size={18} color={iconStyle.color} />
                </View>
                <View style={styles.notifBody}>
                  <Text style={[styles.notifText, { color: C.text1 }]}>{n.text}</Text>
                  <Text style={[styles.notifTime, { color: C.textMuted }]}>
                    {relativeTime(n.created_at)}
                  </Text>
                </View>
                {!n.is_read && (
                  <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: 'Syne_800ExtraBold', fontSize: 22 },
  readAll: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: 'Syne_600SemiBold', fontSize: 16 },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  notifIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifBody: { flex: 1 },
  notifText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  notifTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
});
