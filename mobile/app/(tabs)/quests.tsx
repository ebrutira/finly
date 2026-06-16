import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions,
  TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';
import { getQuests } from '../../services/quests';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const QUEST_ICONS: Record<string, IoniconsName> = {
  // Başlangıç
  first_buy:        'cart-outline',
  first_sell:       'cash-outline',
  daily_login:      'sunny-outline',
  daily_trade:      'swap-horizontal-outline',
  watchlist_add:    'bookmark-outline',
  // Çeşitlilik
  crypto_buy:       'logo-bitcoin',
  etf_buy:          'layers-outline',
  forex_buy:        'globe-outline',
  // Portföy
  five_assets:      'briefcase-outline',
  portfolio_10:     'briefcase',
  portfolio_20:     'albums-outline',
  // Alım hacmi
  ten_trades:       'repeat-outline',
  buy_10:           'trending-up-outline',
  buy_50:           'trending-up',
  buy_100:          'flash-outline',
  // Kâr
  profit_trade:     'diamond-outline',
  profit_5:         'stats-chart-outline',
  profit_10:        'stats-chart',
  // Seri
  streak_3:         'flame-outline',
  streak_7:         'flame',
  streak_30:        'bonfire-outline',
  // Sosyal
  friend_add:       'people-outline',
  leaderboard_top3: 'trophy-outline',
};

const DEFAULT_QUEST_ICON: IoniconsName = 'star-outline';

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
  completed_at: string | null;
}

const LEVEL_TITLES: Record<number, string> = {
  1: 'Acemi', 2: 'Öğrenci', 3: 'Analist', 4: 'Tüccar',
  5: 'Uzman', 6: 'Yatırımcı', 7: 'Usta', 8: 'Profesyonel',
  9: 'Guru', 10: 'Efsane',
};

type CardType = 'active' | 'done' | 'locked';

function QuestCard({ q, type, C }: { q: Quest; type: CardType; C: ReturnType<typeof useColors> }) {
  const isDone = type === 'done';
  const isLocked = type === 'locked';
  const pct = q.total > 0 ? Math.round((q.progress / q.total) * 100) : 0;

  return (
    <View style={[
      styles.questCard,
      {
        backgroundColor: isDone ? `${C.primary}10` : C.bgCard,
        borderColor: isDone ? `${C.primary}40` : isLocked ? C.borderLight : C.border,
        opacity: isLocked ? 0.55 : 1,
      },
    ]}>
      {/* Icon */}
      <View style={[
        styles.questIconWrap,
        {
          backgroundColor: isDone ? `${C.primary}22` : isLocked ? `${C.text1}0A` : `${C.primary}1A`,
          borderColor: isDone ? `${C.primary}55` : isLocked ? `${C.text1}14` : `${C.primary}33`,
        },
      ]}>
        <Ionicons
          name={QUEST_ICONS[q.key] ?? DEFAULT_QUEST_ICON}
          size={18}
          color={isDone ? C.primary : isLocked ? C.textMuted : C.primaryDim}
        />
        <View style={[
          styles.statusBadge,
          { backgroundColor: isDone ? C.primary : isLocked ? C.textMuted : 'transparent' },
        ]}>
          {isDone && <Ionicons name="checkmark" size={8} color="#fff" />}
          {isLocked && <Ionicons name="lock-closed" size={7} color="#fff" />}
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={styles.questNameRow}>
          <Text style={[styles.questName, { color: isLocked ? C.textMuted : C.text1 }]} numberOfLines={1}>
            {q.name}
          </Text>
          {isDone && (
            <View style={[styles.donePill, { backgroundColor: `${C.primary}20`, borderColor: `${C.primary}44` }]}>
              <Text style={[styles.donePillText, { color: C.primary }]}>Tamam</Text>
            </View>
          )}
        </View>
        <Text style={[styles.questDesc, { color: C.textMuted }]}>{q.description}</Text>

        {/* Progress */}
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: isDone ? `${C.primary}20` : C.border }]}>
            <LinearGradient
              colors={isDone ? ['#3A9BAB', '#C4E4E9'] : isLocked ? [C.border, C.border] : ['#3A9BAB', '#C4E4E9']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: isDone ? C.primaryDim : C.textMuted }]}>
            {isDone ? `${q.total}/${q.total}` : `${q.progress}/${q.total}`}
          </Text>
          <Text style={[styles.progressPct, { color: isDone ? C.primary : isLocked ? C.textMuted : C.primaryDim }]}>
            {isDone ? '100%' : `${pct}%`}
          </Text>
        </View>
      </View>

      {/* XP */}
      <View style={[
        styles.xpPill,
        {
          backgroundColor: isDone ? `${C.primary}18` : isLocked ? `${C.text1}08` : `${C.primary}18`,
          borderColor: isDone ? `${C.primary}44` : isLocked ? `${C.text1}12` : `${C.primary}33`,
        },
      ]}>
        <Text style={[styles.xpPillText, { color: isDone ? C.primaryDim : isLocked ? C.textMuted : C.primaryDim }]}>
          +{q.xp_reward}
        </Text>
        <Text style={[styles.xpLabel, { color: isDone ? C.primaryDim : isLocked ? C.textMuted : C.primaryDim }]}>XP</Text>
      </View>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const BADGE_COL = 3;
// container 32px + card padding 32px = 64px; 30px for 2 inter-column gaps (~15px each)
const BADGE_SIZE = Math.floor((SCREEN_WIDTH - 64 - 30) / BADGE_COL);

function BadgesGrid({ quests, C }: { quests: Quest[]; C: ReturnType<typeof useColors> }) {
  const earned = quests.filter((q) => q.done).length;
  const [collapsed, setCollapsed] = useState(false);

  // Kazanılanlar önce (en son tamamlanan en üstte), sonra kilitliler
  const sorted = [
    ...quests
      .filter((q) => q.done)
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
    ...quests.filter((q) => !q.done),
  ];

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed((v) => !v);
  };

  return (
    <View style={[styles.badgesCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      {/* Header — tıklanabilir */}
      <TouchableOpacity style={styles.badgesCardHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.badgesCardTitle, { color: C.text1 }]}>Rozetler</Text>
          <Text style={[styles.badgesCardSub, { color: C.textMuted }]}>
            {earned} / {quests.length} kazanıldı
          </Text>
        </View>
        <View style={[styles.badgesEarnedPill, { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}40` }]}>
          <Ionicons name="ribbon-outline" size={12} color={C.primary} />
          <Text style={[styles.badgesEarnedText, { color: C.primary }]}>{earned}</Text>
        </View>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={C.textMuted}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {/* Grid — gizlenebilir */}
      {!collapsed && <View style={[styles.badgesGrid, styles.badgesGridWrap]}>
        {sorted.map((q) => {
          const isEarned = q.done;
          return (
            <View key={q.id} style={[styles.badgeCell, { width: BADGE_SIZE }]}>
              <View style={styles.badgeCircleWrap}>
                {isEarned ? (
                  <LinearGradient
                    colors={['#3A9BAB', '#B5DDE3']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.badgeCircle}
                  >
                    <Ionicons name={QUEST_ICONS[q.key] ?? DEFAULT_QUEST_ICON} size={20} color="#071215" />
                  </LinearGradient>
                ) : (
                  <View style={[styles.badgeCircle, styles.badgeCircleLocked, { backgroundColor: `${C.text1}0C`, borderColor: C.borderLight }]}>
                    <Ionicons name={QUEST_ICONS[q.key] ?? DEFAULT_QUEST_ICON} size={20} color={C.textMuted} />
                    <View style={[styles.badgeLockDot, { backgroundColor: C.bg2, borderColor: C.borderLight }]}>
                      <Ionicons name="lock-closed" size={7} color={C.textMuted} />
                    </View>
                  </View>
                )}
              </View>
              <Text style={[styles.badgeName, { color: isEarned ? C.primaryDim : C.textMuted }]} numberOfLines={2}>
                {q.name}
              </Text>
              {!isEarned && (
                <Text style={[styles.badgeHint, { color: C.textMuted }]} numberOfLines={1}>
                  {q.description}
                </Text>
              )}
            </View>
          );
        })}
        {/* Son satır eksik öğeyi tamamla */}
        {sorted.length % BADGE_COL !== 0 &&
          Array.from({ length: BADGE_COL - (sorted.length % BADGE_COL) }).map((_, i) => (
            <View key={`filler-${i}`} style={{ width: BADGE_SIZE }} />
          ))
        }
      </View>}
    </View>
  );
}

function SectionHeader({ icon, label, count, color, collapsed, onPress }: {
  icon: IoniconsName; label: string; count: number; color: string;
  collapsed: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
      <View style={[styles.countBubble, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.countText, { color }]}>{count}</Text>
      </View>
      <Ionicons
        name={collapsed ? 'chevron-down' : 'chevron-up'}
        size={14}
        color={color}
        style={{ opacity: 0.6 }}
      />
    </TouchableOpacity>
  );
}

export default function QuestsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { user } = useAuthStore();

  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCollapsed,  setActiveCollapsed]  = useState(false);
  const [doneCollapsed,    setDoneCollapsed]    = useState(false);
  const [lockedCollapsed,  setLockedCollapsed]  = useState(true);

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((v) => !v);
  };

  const xp = user?.xp ?? 0;
  const level = user?.level ?? 1;
  const xpInLevel = xp % 100;
  const levelTitle = LEVEL_TITLES[level] ?? `Seviye ${level}`;

  useFocusEffect(useCallback(() => {
    setLoading(true);
    getQuests()
      .then((res) => setQuests(res.data.quests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []));

  const doneQuests   = quests
    .filter((q) => q.done)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
  const activeQuests = quests.filter((q) => !q.done && q.progress > 0);
  const lockedQuests = quests.filter((q) => !q.done && q.progress === 0);

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
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
          <View style={styles.xpSummary}>
            <Text style={[styles.xpTotal, { color: C.primary }]}>{xp}</Text>
            <Text style={[styles.xpTotalLabel, { color: C.textMuted }]}>toplam XP</Text>
          </View>
        </View>

        {/* Rozetler */}
        {!loading && quests.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 4 }}>
            <BadgesGrid quests={quests} C={C} />
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Devam Eden */}
            {activeQuests.length > 0 && (
              <>
                <SectionHeader
                  icon="time-outline"
                  label="Devam Eden"
                  count={activeQuests.length}
                  color={C.primaryDim}
                  collapsed={activeCollapsed}
                  onPress={() => toggleSection(setActiveCollapsed)}
                />
                {!activeCollapsed && activeQuests.map((q) => (
                  <QuestCard key={q.id} q={q} type="active" C={C} />
                ))}
              </>
            )}

            {/* Tamamlandı */}
            {doneQuests.length > 0 && (
              <>
                <SectionHeader
                  icon="checkmark-circle-outline"
                  label="Tamamlandı"
                  count={doneQuests.length}
                  color={C.primary}
                  collapsed={doneCollapsed}
                  onPress={() => toggleSection(setDoneCollapsed)}
                />
                {!doneCollapsed && doneQuests.map((q) => (
                  <QuestCard key={q.id} q={q} type="done" C={C} />
                ))}
              </>
            )}

            {/* Başlanmadı */}
            {lockedQuests.length > 0 && (
              <>
                <SectionHeader
                  icon="lock-closed-outline"
                  label="Başlanmadı"
                  count={lockedQuests.length}
                  color={C.textMuted}
                  collapsed={lockedCollapsed}
                  onPress={() => toggleSection(setLockedCollapsed)}
                />
                {!lockedCollapsed && lockedQuests.map((q) => (
                  <QuestCard key={q.id} q={q} type="locked" C={C} />
                ))}
              </>
            )}

            {/* Hepsi bitti */}
            {quests.length > 0 && lockedQuests.length === 0 && activeQuests.length === 0 && (
              <View style={styles.allDoneWrap}>
                <LinearGradient
                  colors={['#3A9BAB', '#B5DDE3']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.allDoneIcon}
                >
                  <Ionicons name="trophy" size={28} color="#071215" />
                </LinearGradient>
                <Text style={[styles.allDoneTitle, { color: C.text1 }]}>Tüm Görevler Tamam!</Text>
                <Text style={[styles.allDoneDesc, { color: C.textMuted }]}>Bu haftaki tüm görevleri tamamladın.</Text>
              </View>
            )}
          </>
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
  xpSummary: { alignItems: 'center' },
  xpTotal: { fontFamily: 'Syne_700Bold', fontSize: 18 },
  xpTotalLabel: { fontFamily: 'DMSans_400Regular', fontSize: 9, marginTop: 1 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  sectionLabel: { fontFamily: 'Syne_700Bold', fontSize: 13, flex: 1 },
  countBubble: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },

  questCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderRadius: 18, padding: 14, gap: 12,
  },
  questIconWrap: {
    width: 44, height: 44, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  questNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  questName: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, flex: 1 },
  questDesc: { fontFamily: 'DMSans_400Regular', fontSize: 10, marginBottom: 8 },
  donePill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  donePillText: { fontFamily: 'DMSans_600SemiBold', fontSize: 9 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTrack: { flex: 1, borderRadius: 5, height: 7, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressLabel: { fontFamily: 'DMSans_400Regular', fontSize: 9 },
  progressPct: { fontFamily: 'DMSans_600SemiBold', fontSize: 10, minWidth: 30, textAlign: 'right' },

  xpPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center' },
  xpPillText: { fontFamily: 'Syne_700Bold', fontSize: 12 },
  xpLabel: { fontFamily: 'DMSans_400Regular', fontSize: 8 },

  allDoneWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  allDoneIcon: {
    width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3A9BAB', shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  allDoneTitle: { fontFamily: 'Syne_700Bold', fontSize: 18 },
  allDoneDesc: { fontFamily: 'DMSans_400Regular', fontSize: 13 },

  badgesCard: {
    borderWidth: 1, borderRadius: 22, padding: 16,
  },
  badgesCardHeader: {
    flexDirection: 'row', alignItems: 'center',
  },
  badgesGridWrap: { marginTop: 16 },
  badgesCardTitle: { fontFamily: 'Syne_700Bold', fontSize: 15 },
  badgesCardSub: { fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
  badgesEarnedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
  },
  badgesEarnedText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },

  badgesGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', rowGap: 16,
  },
  badgeCell: {
    alignItems: 'center', gap: 5,
  },
  badgeCircleWrap: {
    shadowColor: '#3A9BAB', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  badgeCircle: {
    width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeCircleLocked: {
    borderWidth: 1,
    opacity: 0.6,
  },
  badgeLockDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeName: { fontFamily: 'DMSans_500Medium', fontSize: 9, textAlign: 'center', lineHeight: 12 },
  badgeHint: { fontFamily: 'DMSans_400Regular', fontSize: 8, textAlign: 'center', opacity: 0.7 },
});
