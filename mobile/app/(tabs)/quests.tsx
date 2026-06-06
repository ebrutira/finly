import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import { getQuests } from '../../services/quests';

interface Quest {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  total: number;
  xp_reward: number;
  progress: number;
  done: boolean;
}

const LEVEL_TITLES: Record<number, string> = {
  1: 'Acemi', 2: 'Öğrenci', 3: 'Analist', 4: 'Tüccar',
  5: 'Uzman', 6: 'Yatırımcı', 7: 'Usta', 8: 'Profesyonel',
  9: 'Guru', 10: 'Efsane',
};

export default function QuestsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { user } = useAuthStore();

  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  const xp = user?.xp ?? 0;
  const level = user?.level ?? 1;
  const xpInLevel = xp % 100;
  const levelTitle = LEVEL_TITLES[level] ?? `Seviye ${level}`;

  useEffect(() => {
    getQuests()
      .then((res) => setQuests(res.data.quests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completedQuests = quests.filter((q) => q.done);
  const activeQuests = quests.filter((q) => !q.done);

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        <View style={styles.header}>
          <Text style={[styles.heading, { color: C.text1 }]}>Görevler</Text>
          <View style={[styles.weekPill, { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}33` }]}>
            <Text style={[styles.weekText, { color: C.primaryDim }]}>Bu Hafta</Text>
          </View>
        </View>

        {/* Level Hero */}
        <View style={[styles.levelHero, { backgroundColor: C.heroTop, borderColor: C.borderLight }]}>
          <LinearGradient
            colors={['#3A9BAB', '#B5DDE3']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.levelBadge}
          >
            <Text style={styles.levelNum}>{level}</Text>
            <Text style={styles.levelWord}>LVL</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.levelTitle, { color: C.text1 }]}>{levelTitle}</Text>
            <Text style={[styles.levelXP, { color: C.primaryDim }]}>
              {xpInLevel} / 100 XP — {100 - xpInLevel} XP kaldı
            </Text>
            <View style={[styles.xpTrack, { backgroundColor: `${C.text1}14` }]}>
              <LinearGradient
                colors={['#3A9BAB', '#C4E4E9']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.xpFill, { width: `${xpInLevel}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Rozetler — tamamlanan görevlerden */}
        {completedQuests.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: C.text1 }]}>Rozetler</Text>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
              {completedQuests.map((q) => (
                <View key={q.id} style={styles.badgeItem}>
                  <View style={[styles.badgeCircle, { backgroundColor: `${C.primary}26`, borderColor: C.primary }]}>
                    <Text style={[styles.badgeIcon, { color: C.primaryDim }]}>{q.icon}</Text>
                  </View>
                  <Text style={[styles.badgeName, { color: C.primaryDim }]} numberOfLines={2}>
                    {q.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Aktif Görevler */}
        <Text style={[styles.sectionTitle, { color: C.text1 }]}>Aktif Görevler</Text>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
        ) : activeQuests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <Text style={[styles.emptyText, { color: C.text1 }]}>Tüm görevler tamamlandı!</Text>
          </View>
        ) : (
          activeQuests.map((q) => (
            <TouchableOpacity
              key={q.id}
              style={[styles.questCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
              activeOpacity={0.75}
            >
              <View style={[styles.questIcon, { backgroundColor: `${C.primary}1A`, borderColor: `${C.primary}33` }]}>
                <Text style={[styles.questIconText, { color: C.primaryDim }]}>{q.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.questName, { color: C.text1 }]}>{q.name}</Text>
                <Text style={[styles.questDesc, { color: C.textMuted }]}>{q.description}</Text>
                <View style={styles.questProgressWrap}>
                  <View style={[styles.questTrack, { backgroundColor: C.border }]}>
                    <View style={[styles.questFill, {
                      width: `${(q.progress / q.total) * 100}%`,
                      backgroundColor: C.primary,
                    }]} />
                  </View>
                  <Text style={[styles.questProgressText, { color: C.textMuted }]}>
                    {q.progress}/{q.total}
                  </Text>
                </View>
              </View>
              <View style={[styles.xpPill, { backgroundColor: `${C.primary}1A`, borderColor: `${C.primary}33` }]}>
                <Text style={[styles.xpPillText, { color: C.primaryDim }]}>+{q.xp_reward} XP</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  heading: { fontFamily: 'Syne_800ExtraBold', fontSize: 26 },
  weekPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  weekText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  levelHero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 8,
  },
  levelBadge: {
    width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3A9BAB', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  levelNum: { fontFamily: 'Syne_800ExtraBold', fontSize: 24, color: '#071215', lineHeight: 28 },
  levelWord: { fontFamily: 'DMSans_500Medium', fontSize: 8, color: 'rgba(7,18,21,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  levelTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  levelXP: { fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2, marginBottom: 8 },
  xpTrack: { borderRadius: 4, height: 5, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  sectionTitle: {
    fontFamily: 'Syne_700Bold', fontSize: 14,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
  },
  badgesRow: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  badgeItem: { alignItems: 'center', gap: 6, width: 64 },
  badgeCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  badgeIcon: { fontSize: 20 },
  badgeName: { fontFamily: 'DMSans_400Regular', fontSize: 9, textAlign: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: 'Syne_600SemiBold', fontSize: 16 },
  questCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderRadius: 18, padding: 14, gap: 12,
  },
  questIcon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  questIconText: { fontSize: 16, fontWeight: '700' },
  questName: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  questDesc: { fontFamily: 'DMSans_400Regular', fontSize: 10, marginTop: 2 },
  questProgressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  questTrack: { flex: 1, borderRadius: 3, height: 3, overflow: 'hidden' },
  questFill: { height: '100%', borderRadius: 3 },
  questProgressText: { fontFamily: 'DMSans_400Regular', fontSize: 9 },
  xpPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  xpPillText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
});
