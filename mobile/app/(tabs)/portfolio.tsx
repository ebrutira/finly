import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../services/api';
import { getPortfolio, getTrades, getPortfolioHistory } from '../../services/portfolio';
import { useColors } from '../../hooks/useColors';
import { useAuthStore } from '../../store/authStore';

const STARTING_BALANCE = 10000;

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'ADA']);
const FOREX_PAIRS = new Set(['USDTRY', 'EURTRY', 'EURUSD', 'GBPUSD', 'JPYUSD']);

interface Holding {
  id: number;
  symbol: string;
  amount: number;
  avg_buy_price: number;
  currentPrice?: number | null;
}

interface Trade {
  id: number;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

interface Snapshot {
  snapshot_date: string;
  total_value: number;
}

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const endpoint = FOREX_PAIRS.has(symbol)
      ? `/market/forex/${symbol}`
      : CRYPTO_SYMBOLS.has(symbol)
      ? `/market/crypto/${symbol}USDT`
      : `/market/stock/${symbol}`;
    const res = await api.get(endpoint);
    return Number(res.data.price ?? res.data.rate);
  } catch {
    return null;
  }
}

function normalizeHeights(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => Math.round(((v - min) / range) * 70 + 20));
}

const PALETTE = ['primary', 'success', 'warning', 'primaryDim', 'danger', 'primaryLight'] as const;

export default function PortfolioScreen() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [peakProfit, setPeakProfit] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { user } = useAuthStore();
  const balance = user?.balance ?? 0;

  const fetchAll = useCallback(async () => {
    try {
      const [portfolioRes, tradesRes, historyRes] = await Promise.all([
        getPortfolio(),
        getTrades(),
        getPortfolioHistory(),
      ]);
      const items: Holding[] = portfolioRes.data.portfolio;
      const prices = await Promise.all(items.map((i) => fetchCurrentPrice(i.symbol)));
      setHoldings((prev) => {
        // Fiyat çekme başarısız olursa (null) son bilinen fiyatı koru
        const prevPriceBySymbol = new Map(prev.map((p) => [p.symbol, p.currentPrice]));
        return items.map((item, idx) => ({
          ...item,
          currentPrice: prices[idx] ?? prevPriceBySymbol.get(item.symbol) ?? null,
        }));
      });
      setTrades(tradesRes.data.trades ?? []);
      setHistory(historyRes.data.history ?? []);
      setPeakProfit(Number(portfolioRes.data.peakProfit ?? 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(fetchAll, 60000);
      return () => clearInterval(interval);
    }, [fetchAll])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg2 }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const enriched = holdings.map((h) => {
    const current = h.currentPrice ?? Number(h.avg_buy_price);
    const cost = Number(h.amount) * Number(h.avg_buy_price);
    const value = Number(h.amount) * current;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    return { ...h, current, cost, value, pnl, pnlPct };
  });

  const totalCost = enriched.reduce((sum, h) => sum + h.cost, 0);
  const totalValue = enriched.reduce((sum, h) => sum + h.value, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isTotalUp = totalPnl >= 0;

  const totalAccountProfit = Number(balance) + totalValue - STARTING_BALANCE;
  const isAccountUp = totalAccountProfit >= 0;
  const isPeakUp = peakProfit >= 0;

  const allocation = [...enriched]
    .sort((a, b) => b.value - a.value)
    .map((h, idx) => ({
      ...h,
      pct: totalValue > 0 ? (h.value / totalValue) * 100 : 0,
      color: C[PALETTE[idx % PALETTE.length]],
    }));

  const historyHeights = normalizeHeights(history.map((h) => Number(h.total_value)));

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.header}>
          <Text style={[styles.heading, { color: C.text1 }]}>Portföyüm</Text>
        </View>

        {enriched.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: C.text1 }]}>Henüz varlık yok</Text>
            <Text style={[styles.emptySubText, { color: C.textMuted }]}>
              Market ekranından alım yaparak portföyünü oluşturabilirsin
            </Text>
          </View>
        ) : (
          <>
            {/* Özet */}
            <View style={[styles.summaryCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Toplam Değer</Text>
                <Text style={[styles.summaryValue, { color: C.text1 }]}>
                  ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Toplam Maliyet</Text>
                <Text style={[styles.summaryValue, { color: C.text2 }]}>
                  ${totalCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Açık Pozisyon K/Z</Text>
                <View style={[styles.badge, { backgroundColor: isTotalUp ? C.successBg : C.dangerBg }]}>
                  <Text style={[styles.badgeText, { color: isTotalUp ? C.success : C.danger }]}>
                    {isTotalUp ? '+' : ''}${totalPnl.toLocaleString('en-US', { maximumFractionDigits: 2 })} ({isTotalUp ? '+' : ''}{totalPnlPct.toFixed(1)}%)
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Toplam Hesap Kârı</Text>
                <View style={[styles.badge, { backgroundColor: isAccountUp ? C.successBg : C.dangerBg }]}>
                  <Text style={[styles.badgeText, { color: isAccountUp ? C.success : C.danger }]}>
                    {isAccountUp ? '+' : ''}${totalAccountProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
              <View style={[styles.summaryRow, { marginBottom: 0 }]}>
                <Text style={[styles.summaryLabel, { color: C.textMuted }]}>En Yüksek Kâr (Tüm Zamanlar)</Text>
                <View style={[styles.badge, { backgroundColor: isPeakUp ? C.successBg : C.dangerBg }]}>
                  <Text style={[styles.badgeText, { color: isPeakUp ? C.success : C.danger }]}>
                    {isPeakUp ? '+' : ''}${peakProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Dağılım */}
            <Text style={[styles.sectionTitle, { color: C.text1 }]}>Dağılım</Text>
            <View style={[styles.allocBarTrack, { backgroundColor: C.bg2, borderColor: C.border }]}>
              {allocation.map((a) => (
                <View key={a.id} style={{ flex: Math.max(a.pct, 0.5), backgroundColor: a.color }} />
              ))}
            </View>
            <View style={styles.legendWrap}>
              {allocation.map((a) => (
                <View key={a.id} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: a.color }]} />
                  <Text style={[styles.legendSymbol, { color: C.text2 }]}>{a.symbol}</Text>
                  <Text style={[styles.legendPct, { color: C.textMuted }]}>{a.pct.toFixed(1)}%</Text>
                </View>
              ))}
            </View>

            {/* Kâr/Zarar Geçmişi */}
            <Text style={[styles.sectionTitle, { color: C.text1 }]}>Kâr/Zarar Geçmişi</Text>
            <View style={[styles.historyCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              {history.length < 2 ? (
                <Text style={[styles.emptyHistoryText, { color: C.textMuted }]}>
                  Geçmiş veri birikiyor — yarından itibaren grafik oluşacak
                </Text>
              ) : (
                <>
                  <View style={styles.historyPlot}>
                    {historyHeights.map((h, i) => (
                      <View
                        key={i}
                        style={[
                          styles.historyBar,
                          {
                            height: `${h}%`,
                            backgroundColor: isTotalUp ? C.primary : C.danger,
                            opacity: 0.5 + (i / historyHeights.length) * 0.5,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.historyDatesRow}>
                    <Text style={[styles.historyDate, { color: C.textMuted }]}>
                      {new Date(history[0].snapshot_date).toLocaleDateString('tr-TR')}
                    </Text>
                    <Text style={[styles.historyDate, { color: C.textMuted }]}>
                      {new Date(history[history.length - 1].snapshot_date).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Varlıklarım (Detaylı) */}
            <Text style={[styles.sectionTitle, { color: C.text1 }]}>Varlıklarım</Text>
            {enriched.map((h) => {
              const isUp = h.pnl >= 0;
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.holdingCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
                  onPress={() => router.push(`/stock/${h.symbol}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={styles.holdingHeaderRow}>
                    <Text style={[styles.holdingSymbol, { color: C.text1 }]}>{h.symbol}</Text>
                    <View style={[styles.badge, { backgroundColor: isUp ? C.successBg : C.dangerBg }]}>
                      <Text style={[styles.badgeText, { color: isUp ? C.success : C.danger }]}>
                        {isUp ? '+' : ''}${h.pnl.toLocaleString('en-US', { maximumFractionDigits: 2 })} ({isUp ? '+' : ''}{h.pnlPct.toFixed(1)}%)
                      </Text>
                    </View>
                  </View>
                  <View style={styles.holdingDetailGrid}>
                    <View style={styles.holdingDetailItem}>
                      <Text style={[styles.holdingDetailLabel, { color: C.textMuted }]}>Adet</Text>
                      <Text style={[styles.holdingDetailValue, { color: C.text2 }]}>
                        {Number.isInteger(Number(h.amount)) ? h.amount : Number(h.amount).toFixed(4)}
                      </Text>
                    </View>
                    <View style={styles.holdingDetailItem}>
                      <Text style={[styles.holdingDetailLabel, { color: C.textMuted }]}>Ort. Alış</Text>
                      <Text style={[styles.holdingDetailValue, { color: C.text2 }]}>
                        ${Number(h.avg_buy_price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.holdingDetailItem}>
                      <Text style={[styles.holdingDetailLabel, { color: C.textMuted }]}>Maliyet</Text>
                      <Text style={[styles.holdingDetailValue, { color: C.text2 }]}>
                        ${h.cost.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.holdingDetailItem}>
                      <Text style={[styles.holdingDetailLabel, { color: C.textMuted }]}>Güncel Değer</Text>
                      <Text style={[styles.holdingDetailValue, { color: C.text1 }]}>
                        ${h.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* İşlem Geçmişi */}
            <Text style={[styles.sectionTitle, { color: C.text1 }]}>İşlem Geçmişi</Text>
            {trades.length === 0 ? (
              <Text style={[styles.emptyHistoryText, { color: C.textMuted, marginHorizontal: 16 }]}>
                Henüz işlem yapılmadı
              </Text>
            ) : (
              trades.map((t) => {
                const isBuy = t.type === 'buy';
                return (
                  <View
                    key={t.id}
                    style={[styles.tradeRow, { backgroundColor: C.bgCard, borderColor: C.border }]}
                  >
                    <View style={[styles.tradeBadge, { backgroundColor: isBuy ? C.successBg : C.dangerBg }]}>
                      <Text style={[styles.tradeBadgeText, { color: isBuy ? C.success : C.danger }]}>
                        {isBuy ? 'Al' : 'Sat'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tradeSymbol, { color: C.text1 }]}>{t.symbol}</Text>
                      <Text style={[styles.tradeSub, { color: C.textMuted }]}>
                        {Number(t.quantity)} adet · ${Number(t.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <Text style={[styles.tradeDate, { color: C.textMuted }]}>
                      {new Date(t.created_at).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  heading: { fontFamily: 'Syne_800ExtraBold', fontSize: 26 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyText: { fontFamily: 'Syne_600SemiBold', fontSize: 16 },
  emptySubText: { fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 8, textAlign: 'center' },
  summaryCard: {
    marginHorizontal: 16, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 18,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  summaryValue: { fontFamily: 'Syne_700Bold', fontSize: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  sectionTitle: {
    fontFamily: 'Syne_700Bold', fontSize: 14,
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8,
  },
  allocBarTrack: {
    flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden',
    marginHorizontal: 16, borderWidth: 1,
  },
  legendWrap: { paddingHorizontal: 16, marginTop: 10, marginBottom: 4, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendSymbol: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, flex: 1 },
  legendPct: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  historyCard: {
    marginHorizontal: 16, borderWidth: 1, borderRadius: 20,
    padding: 16, height: 130, justifyContent: 'center',
  },
  emptyHistoryText: { fontFamily: 'DMSans_400Regular', fontSize: 12, textAlign: 'center' },
  historyPlot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  historyBar: { flex: 1, borderRadius: 3, minHeight: 2 },
  historyDatesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  historyDate: { fontFamily: 'DMSans_400Regular', fontSize: 10 },
  holdingCard: {
    marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderRadius: 20, padding: 14,
  },
  holdingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  holdingSymbol: { fontFamily: 'Syne_700Bold', fontSize: 15 },
  holdingDetailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  holdingDetailItem: { minWidth: '45%' },
  holdingDetailLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, marginBottom: 2 },
  holdingDetailValue: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  tradeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  tradeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tradeBadgeText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  tradeSymbol: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  tradeSub: { fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 1 },
  tradeDate: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
});
