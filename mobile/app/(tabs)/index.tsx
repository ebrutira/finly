import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../hooks/useColors';

interface PortfolioItem {
  id: number;
  symbol: string;
  amount: number;
  avg_buy_price: number;
  currentPrice?: number | null;
  sparkline?: number[];
}

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'ADA']);

const LEVEL_TITLES: Record<number, string> = {
  1: 'Acemi', 2: 'Öğrenci', 3: 'Analist', 4: 'Tüccar',
  5: 'Uzman', 6: 'Yatırımcı', 7: 'Usta', 8: 'Profesyonel',
  9: 'Guru', 10: 'Efsane',
};

function normalizeHeights(closes: number[]): number[] {
  if (closes.length === 0) return [];
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  return closes.map((c) => Math.round(((c - min) / range) * 70 + 20));
}

// Hisseler için: sembol string'inden deterministik ama yön-duyarlı pattern
function deterministicSpark(symbol: string, isUp: boolean): number[] {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = [30, 45, 35, 55, 42, 60, 75];
  const noisy = base.map((v, i) => Math.max(20, Math.min(90, v + ((seed * (i + 1)) % 16) - 8)));
  return isUp ? noisy : noisy.map((v) => 110 - v);
}

async function fetchSparkline(symbol: string, isCrypto: boolean, isUp: boolean): Promise<number[]> {
  if (!isCrypto) return deterministicSpark(symbol, isUp);
  try {
    const res = await api.get(`/market/history/crypto/${symbol}USDT?period=1H`);
    const heights = normalizeHeights(res.data.closes ?? []);
    return heights.length > 0 ? heights : deterministicSpark(symbol, isUp);
  } catch {
    return deterministicSpark(symbol, isUp);
  }
}

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const endpoint = CRYPTO_SYMBOLS.has(symbol)
      ? `/market/crypto/${symbol}USDT`
      : `/market/stock/${symbol}`;
    const res = await api.get(endpoint);
    return Number(res.data.price);
  } catch {
    return null;
  }
}

const QUICK_ACTIONS = [
  { icon: 'trending-up-outline' as const, label: 'Market', route: '/(tabs)/market' },
  { icon: 'people-outline' as const, label: 'Sıralama', route: '/(tabs)/friends' },
  { icon: 'star-outline' as const, label: 'Görevler', route: '/(tabs)/quests' },
  { icon: 'notifications-outline' as const, label: 'Bildirimler', route: '/notifications' },
];

export default function DashboardScreen() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();

  const xp = user?.xp ?? 0;
  const level = user?.level ?? 1;
  const streak = user?.streak ?? 0;
  const xpInLevel = xp % 100;
  const levelTitle = LEVEL_TITLES[level] ?? `Seviye ${level}`;

  const totalCurrentValue = portfolio.reduce(
    (sum, item) => sum + (item.currentPrice ?? Number(item.avg_buy_price)) * Number(item.amount), 0
  );
  const totalCostBasis = portfolio.reduce(
    (sum, item) => sum + Number(item.avg_buy_price) * Number(item.amount), 0
  );
  const totalPnL = totalCurrentValue - totalCostBasis;
  const totalPnLPct = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;
  const isPnLUp = totalPnL >= 0;

  const fetchPortfolio = async () => {
    try {
      const res = await api.get('/portfolio');
      const items: PortfolioItem[] = res.data.portfolio;

      // Anlık fiyat ve sparkline'ı paralel çek
      const [prices, sparks] = await Promise.all([
        Promise.all(items.map((i) => fetchCurrentPrice(i.symbol))),
        Promise.all(items.map((i) => {
          const isCrypto = CRYPTO_SYMBOLS.has(i.symbol);
          const pct = ((Number(i.avg_buy_price)) - Number(i.avg_buy_price)) / Number(i.avg_buy_price);
          return fetchSparkline(i.symbol, isCrypto, pct >= 0);
        })),
      ]);

      const withPrices = items.map((item, idx) => ({ ...item, currentPrice: prices[idx] }));
      // isUp'ı gerçek fiyatla yeniden hesapla, sparkline'ı güncelle
      const final = withPrices.map((item, idx) => {
        const current = item.currentPrice ?? Number(item.avg_buy_price);
        const isUp = current >= Number(item.avg_buy_price);
        const isCrypto = CRYPTO_SYMBOLS.has(item.symbol);
        return {
          ...item,
          sparkline: isCrypto ? sparks[idx] : deterministicSpark(item.symbol, isUp),
        };
      });
      setPortfolio(final);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Token AsyncStorage'dan yüklenince çalışır (ilk açılış)
  useEffect(() => { if (user) fetchPortfolio(); }, [user?.id]);

  // Tab'a her dönüşte yeniler
  useFocusEffect(useCallback(() => { if (user) fetchPortfolio(); }, [user?.id]));

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg2 }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Kullanıcı';

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPortfolio(); }}
            tintColor={C.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: C.text3 }]}>Hoş geldin</Text>
            <Text style={[styles.userName, { color: C.text1 }]}>{firstName}</Text>
          </View>
          <View style={styles.headerRight}>
            {streak > 0 && (
              <View style={[styles.streakPill, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <Ionicons name="flame" size={14} color="#FF8A3D" />
                <Text style={[styles.streakText, { color: C.text2 }]}>{streak}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.notifBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={18} color={C.text2} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Portfolio Hero */}
        <LinearGradient
          colors={['#3A9BAB', '#7DCFDA', '#B5DDE3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroDecoTop} />
          <View style={styles.heroDecoBottom} />
          <Text style={styles.heroLabel}>Toplam Portföy</Text>
          <Text style={styles.heroValue}>
            ${totalCurrentValue > 0
              ? totalCurrentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })
              : '0'}
          </Text>
          <View style={styles.heroChangeRow}>
            <Text style={styles.heroChangeTxt}>Kar/Zarar</Text>
            {totalCostBasis > 0 && (
              <View style={styles.heroChangePill}>
                <Text style={styles.heroChangePillTxt}>
                  {isPnLUp ? '+' : ''}${totalPnL.toFixed(0)} · {isPnLUp ? '+' : ''}{totalPnLPct.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
          <View>
            <View style={styles.xpRow}>
              <Text style={styles.xpLabel}>Seviye {level} — {levelTitle}</Text>
              <Text style={styles.xpLabel}>{xpInLevel} / 100 XP</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${xpInLevel}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.qaRow}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.qaBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
              activeOpacity={0.7}
              onPress={() => router.push(a.route as any)}
            >
              <Ionicons name={a.icon} size={20} color={C.primaryDim} />
              <Text style={[styles.qaLabel, { color: C.text3 }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Assets */}
        <Text style={[styles.sectionTitle, { color: C.text1 }]}>Varlıklarım</Text>

        {portfolio.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: C.text1 }]}>Henüz varlık yok</Text>
            <Text style={[styles.emptySubText, { color: C.textMuted }]}>
              Market ekranından alım yapabilirsin
            </Text>
          </View>
        ) : (
          portfolio.map((item) => {
            const current = item.currentPrice ?? Number(item.avg_buy_price);
            const pct = ((current - Number(item.avg_buy_price)) / Number(item.avg_buy_price)) * 100;
            const isUp = pct >= 0;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.assetRow}
                onPress={() => router.push(`/stock/${item.symbol}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.assetIcon, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                  <Text style={[styles.assetIconText, { color: C.text3 }]}>
                    {item.symbol.slice(0, 4)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetName, { color: C.text1 }]}>{item.symbol}</Text>
                  <Text style={[styles.assetSub, { color: C.textMuted }]}>
                    {Number(item.amount)} adet
                  </Text>
                </View>
                <View style={styles.spark}>
                  {(item.sparkline ?? [50, 65, 80, 70, 100]).map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.sparkBar,
                        { height: `${h}%`, backgroundColor: isUp ? C.primary : C.danger, opacity: isUp ? 1 : 0.7 },
                      ]}
                    />
                  ))}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.assetPrice, { color: C.text1 }]}>
                    ${current.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: isUp ? C.successBg : C.dangerBg }]}>
                    <Text style={[styles.badgeText, { color: isUp ? C.success : C.danger }]}>
                      {isUp ? '+' : ''}{pct.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  greeting: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  userName: { fontFamily: 'Syne_800ExtraBold', fontSize: 22 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    height: 38, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1,
  },
  streakText: { fontFamily: 'Syne_700Bold', fontSize: 13 },
  notifBtn: {
    width: 38, height: 38, borderRadius: 13,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 6, right: 7,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#FF5C7A', borderWidth: 1.5, borderColor: 'transparent',
  },
  hero: { margin: 16, borderRadius: 24, padding: 22, overflow: 'hidden' },
  heroDecoTop: {
    position: 'absolute', top: -40, right: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroDecoBottom: {
    position: 'absolute', bottom: -20, left: -10,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 11,
    color: 'rgba(255,255,255,0.65)', letterSpacing: 1, textTransform: 'uppercase',
  },
  heroValue: {
    fontFamily: 'Syne_800ExtraBold', fontSize: 34,
    color: 'white', marginTop: 4, marginBottom: 2,
  },
  heroChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  heroChangeTxt: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  heroChangePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2,
  },
  heroChangePillTxt: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: 'white' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  xpLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  xpTrack: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 4, height: 5, overflow: 'hidden',
  },
  xpFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 4 },
  qaRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 4 },
  qaBtn: {
    flex: 1, borderWidth: 1, borderRadius: 16,
    paddingVertical: 12, alignItems: 'center', gap: 4,
  },
  qaLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10 },
  sectionTitle: {
    fontFamily: 'Syne_700Bold', fontSize: 14,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8,
  },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyText: { fontFamily: 'Syne_600SemiBold', fontSize: 16 },
  emptySubText: { fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 8, textAlign: 'center' },
  assetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, gap: 12,
  },
  assetIcon: {
    width: 42, height: 42, borderRadius: 14,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  assetIconText: { fontFamily: 'DMSans_600SemiBold', fontSize: 9, letterSpacing: 0.5 },
  assetName: { fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  assetSub: { fontFamily: 'DMSans_400Regular', fontSize: 10, marginTop: 1 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 28, width: 55 },
  sparkBar: { width: 5, borderRadius: 2 },
  assetPrice: { fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginTop: 3 },
  badgeText: { fontFamily: 'DMSans_600SemiBold', fontSize: 10 },
});
