import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../../services/watchlist';
import { useColors } from '../../hooks/useColors';

type TimeTab = '1S' | '1H' | '1G' | '1A' | '1Y';

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'ADA']);
const FOREX_PAIRS = new Set(['USDTRY', 'EURTRY', 'EURUSD', 'GBPUSD', 'JPYUSD']);

function normalizeHeights(closes: number[]): number[] {
  if (closes.length === 0) return [];
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  return closes.map((c) => Math.round(((c - min) / range) * 75 + 20));
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { updateUser, user } = useAuthStore();

  const sym = symbol?.toUpperCase() ?? '';
  const isCrypto = CRYPTO_SYMBOLS.has(sym);
  const isForex = FOREX_PAIRS.has(sym);
  const displayName = isForex ? `${sym.slice(0, 3)}/${sym.slice(3)}` : sym;

  const [price, setPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTime, setActiveTime] = useState<TimeTab>('1G');
  const [trading, setTrading] = useState(false);

  const [chartData, setChartData] = useState<number[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  type ModalType = 'success' | 'error' | 'confirm';
  const [modal, setModal] = useState<{
    visible: boolean;
    type: ModalType;
    title: string;
    message: string;
    xp?: number;
    onConfirm?: () => void;
  }>({ visible: false, type: 'success', title: '', message: '' });

  const closeModal = () => setModal((m) => ({ ...m, visible: false }));

  // Anlık fiyat
  const fetchPrice = useCallback(() => {
    const endpoint = isForex
      ? `/market/forex/${sym}`
      : isCrypto
      ? `/market/crypto/${sym}USDT`
      : `/market/stock/${sym}`;
    return api.get(endpoint)
      .then((res) => setPrice(Number(res.data.price)))
      .catch(() => setPrice(null))
      .finally(() => setPriceLoading(false));
  }, [sym, isForex, isCrypto]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  useEffect(() => {
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  // Watchlist durumu
  useEffect(() => {
    getWatchlist()
      .then((res) => {
        const found = res.data.watchlist.some(
          (w: { symbol: string }) => w.symbol === sym
        );
        setInWatchlist(found);
      })
      .catch(() => {});
  }, [sym]);

  // Tarihsel veri (zaman sekmesine göre)
  const fetchHistory = useCallback(async (period: TimeTab) => {
    setChartLoading(true);
    try {
      const endpoint = isForex
        ? `/market/history/forex/${sym}?period=${period}`
        : isCrypto
        ? `/market/history/crypto/${sym}USDT?period=${period}`
        : `/market/history/stock/${sym}?period=${period}`;
      const res = await api.get(endpoint);
      setChartData(normalizeHeights(res.data.closes ?? []));
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [sym, isCrypto, isForex]);

  useEffect(() => { fetchHistory(activeTime); }, [activeTime]);

  const handleWatchlistToggle = async () => {
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await removeFromWatchlist(sym);
        setInWatchlist(false);
      } else {
        await addToWatchlist(sym);
        setInWatchlist(true);
      }
    } catch (err: any) {
      setModal({ visible: true, type: 'error', title: 'Hata', message: err.response?.data?.error || 'İşlem başarısız.' });
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!price) {
      setModal({ visible: true, type: 'error', title: 'Hata', message: 'Fiyat bilgisi alınamadı.' });
      return;
    }
    setTrading(true);
    try {
      const res = await api.post('/portfolio/buy', { symbol: sym, quantity, price });
      if (res.data.balance !== undefined) {
        updateUser({ balance: res.data.balance, xp: res.data.xp, level: res.data.level });
      }
      setQuantity(1);
      setModal({
        visible: true,
        type: 'success',
        title: 'Alım Başarılı!',
        message: `${quantity} adet ${displayName} portföyüne eklendi.\nToplam: $${(price * quantity).toFixed(2)}`,
        xp: 10,
      });
    } catch (err: any) {
      setModal({ visible: true, type: 'error', title: 'Alım Başarısız', message: err.response?.data?.error || 'Alım işlemi gerçekleştirilemedi.' });
    } finally {
      setTrading(false);
    }
  };

  const executeSell = async () => {
    if (!price) return;
    closeModal();
    setTrading(true);
    try {
      const res = await api.post('/portfolio/sell', { symbol: sym, quantity, price });
      if (res.data.balance !== undefined) {
        updateUser({ balance: res.data.balance, xp: res.data.xp, level: res.data.level });
      }
      setQuantity(1);
      setModal({
        visible: true,
        type: 'success',
        title: 'Satış Başarılı!',
        message: `${quantity} adet ${displayName} portföyünden satıldı.\nToplam: $${(price * quantity).toFixed(2)}`,
        xp: 5,
      });
    } catch (err: any) {
      setModal({ visible: true, type: 'error', title: 'Satış Başarısız', message: err.response?.data?.error || 'Satış işlemi gerçekleştirilemedi.' });
    } finally {
      setTrading(false);
    }
  };

  const handleSell = () => {
    if (!price) {
      setModal({ visible: true, type: 'error', title: 'Hata', message: 'Fiyat bilgisi alınamadı.' });
      return;
    }
    setModal({
      visible: true,
      type: 'confirm',
      title: 'Satışı Onayla',
      message: `${quantity} adet ${displayName} satmak istediğine emin misin?\nToplam: $${(price * quantity).toFixed(2)}`,
      onConfirm: executeSell,
    });
  };

  const timeTabs: TimeTab[] = ['1S', '1G', '1H', '1A', '1Y'];
  const balance = user?.balance ?? 0;
  const totalCostNum = price ? price * quantity : 0;
  const totalCost = price
    ? totalCostNum.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '—';
  const insufficientBalance = price != null && totalCostNum > balance;

  const chartIsUp = chartData.length >= 2
    ? chartData[chartData.length - 1] >= chartData[0]
    : true;

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={C.text2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailName, { color: C.text1 }]}>{displayName}</Text>
            <Text style={[styles.detailTicker, { color: C.textMuted }]}>
              {isForex ? 'Döviz · Forex' : isCrypto ? 'Kripto · Binance' : 'NASDAQ'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.watchlistBtn,
              { borderColor: inWatchlist ? C.primary : C.border },
            ]}
            onPress={handleWatchlistToggle}
            disabled={watchlistLoading}
          >
            {watchlistLoading ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Text style={[
                styles.watchlistText,
                { color: inWatchlist ? C.primaryDim : C.textMuted },
              ]}>
                {inWatchlist ? '★ Takipte' : '☆ Takip'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Price */}
        <View style={styles.priceSection}>
          {priceLoading ? (
            <ActivityIndicator color={C.primary} size="large" />
          ) : (
            <>
              <Text style={[styles.price, { color: C.text1 }]}>
                {price != null
                  ? `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                  : '—'}
              </Text>
              <View style={styles.changeRow}>
                <View style={[styles.badgeUp, { backgroundColor: chartIsUp ? C.successBg : C.dangerBg }]}>
                  <Text style={[styles.badgeUpText, { color: chartIsUp ? C.success : C.danger }]}>
                    {chartIsUp ? '↑' : '↓'} {activeTime}
                  </Text>
                </View>
                <Text style={[styles.changeHint, { color: C.textMuted }]}>seçili dönem</Text>
              </View>
            </>
          )}
        </View>

        {/* Chart */}
        <View style={[styles.chartArea, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          {chartLoading ? (
            <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
          ) : chartData.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={[styles.chartLabel, { color: C.textMuted }]}>Veri yüklenemedi</Text>
            </View>
          ) : (
            <View style={styles.chartPlot}>
              {chartData.map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.chartBar,
                    {
                      height: `${h}%`,
                      backgroundColor: chartIsUp ? C.primary : C.danger,
                      opacity: 0.5 + (i / chartData.length) * 0.5,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Time tabs */}
        <View style={styles.timeTabsRow}>
          {timeTabs.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.timeTab,
                activeTime === t && { backgroundColor: `${C.primary}20` },
              ]}
              onPress={() => setActiveTime(t)}
            >
              <Text style={[
                styles.timeTabText,
                { color: activeTime === t ? C.primaryDim : C.textMuted },
              ]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trade section */}
        <View style={styles.tradeSection}>
          <Text style={[styles.tradeLabel, { color: C.textMuted }]}>ADET</Text>

          <View style={[styles.quantityRow, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: C.bg2, borderColor: C.border }]}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={[styles.qtyBtnText, { color: C.text1 }]}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.qtyValue, { color: C.text1 }]}
              value={quantity.toString()}
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                if (!isNaN(n) && n >= 1) setQuantity(n);
                else if (v === '') setQuantity(1);
              }}
              keyboardType="numeric"
              selectTextOnFocus
              selectionColor={C.primary}
              maxLength={5}
            />
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: C.bg2, borderColor: C.border }]}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={[styles.qtyBtnText, { color: C.text1 }]}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tradeInfoRow}>
            <Text style={[styles.tradeInfo, { color: C.textMuted }]}>
              Toplam:{' '}
              <Text style={[styles.tradeInfoVal, { color: C.text1 }]}>${totalCost}</Text>
            </Text>
            <View style={[styles.balanceChip, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Ionicons name="wallet-outline" size={11} color={C.textMuted} />
              <Text style={[styles.balanceChipText, { color: C.textMuted }]}>
                ${balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          {insufficientBalance && (
            <View style={[styles.warningRow, { backgroundColor: `${C.warning}18`, borderColor: `${C.warning}40` }]}>
              <Ionicons name="warning-outline" size={13} color={C.warning} />
              <Text style={[styles.warningText, { color: C.warning }]}>
                Yetersiz bakiye — ${(totalCostNum - balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} eksik
              </Text>
            </View>
          )}

          <View style={styles.tradeBtns}>
            <TouchableOpacity
              style={[styles.buyBtn, { opacity: (trading || insufficientBalance) ? 0.5 : 1 }]}
              onPress={handleBuy}
              disabled={trading || priceLoading || insufficientBalance}
              activeOpacity={0.85}
            >
              {trading
                ? <ActivityIndicator color={C.bg} size="small" />
                : <Text style={[styles.buyBtnText, { color: C.bg }]}>Al</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sellBtn, { backgroundColor: C.dangerBg, borderColor: `${C.danger}4D`, opacity: trading ? 0.7 : 1 }]}
              onPress={handleSell}
              disabled={trading || priceLoading}
              activeOpacity={0.85}
            >
              <Text style={[styles.sellBtnText, { color: C.danger }]}>Sat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Trade Modal */}
      <Modal visible={modal.visible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: C.bgCard, borderColor: modal.type === 'error' ? `${C.danger}4D` : modal.type === 'confirm' ? C.border : `${C.primary}4D` }]}>

            {/* Icon */}
            <View style={[styles.modalIcon, { backgroundColor: modal.type === 'error' ? C.dangerBg : modal.type === 'confirm' ? `${C.primary}15` : `${C.primary}20` }]}>
              <Ionicons
                name={modal.type === 'error' ? 'close' : modal.type === 'confirm' ? 'alert' : 'checkmark'}
                size={26}
                color={modal.type === 'error' ? C.danger : C.primaryDim}
              />
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, { color: C.text1 }]}>{modal.title}</Text>

            {/* Message */}
            <Text style={[styles.modalMessage, { color: C.textMuted }]}>{modal.message}</Text>

            {/* XP Badge */}
            {modal.xp != null && (
              <View style={[styles.xpBadge, { backgroundColor: `${C.primary}20`, borderColor: `${C.primary}40` }]}>
                <Text style={[styles.xpBadgeText, { color: C.primaryDim }]}>+{modal.xp} XP kazandın!</Text>
              </View>
            )}

            {/* Buttons */}
            {modal.type === 'confirm' ? (
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalBtnSecondary, { borderColor: C.border }]} onPress={closeModal}>
                  <Text style={[styles.modalBtnSecondaryText, { color: C.textMuted }]}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtnDanger, { backgroundColor: C.dangerBg, borderColor: `${C.danger}4D` }]} onPress={modal.onConfirm}>
                  <Text style={[styles.modalBtnDangerText, { color: C.danger }]}>Sat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.modalBtnPrimary, { backgroundColor: C.primary }]} onPress={closeModal}>
                <Text style={[styles.modalBtnPrimaryText, { color: C.bg }]}>
                  {modal.type === 'error' ? 'Tamam' : 'Harika!'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0 },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  detailName: { fontFamily: 'Syne_800ExtraBold', fontSize: 20 },
  detailTicker: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  watchlistBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  watchlistText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
  priceSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  price: { fontFamily: 'Syne_800ExtraBold', fontSize: 36 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  badgeUp: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeUpText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
  changeHint: { fontFamily: 'DMSans_400Regular', fontSize: 11 },
  chartArea: {
    marginHorizontal: 16, marginTop: 16,
    borderWidth: 1, borderRadius: 20,
    padding: 16, height: 120, overflow: 'hidden',
  },
  chartLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  chartPlot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 8 },
  chartBar: { flex: 1, borderRadius: 3, minHeight: 2 },
  timeTabsRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingVertical: 10 },
  timeTab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10 },
  timeTabText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  tradeSection: { paddingHorizontal: 16, paddingTop: 4 },
  tradeLabel: { fontFamily: 'DMSans_500Medium', fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  quantityRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 10,
  },
  qtyBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, lineHeight: 24 },
  qtyValue: { flex: 1, fontFamily: 'Syne_800ExtraBold', fontSize: 22, textAlign: 'center' },
  tradeInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tradeInfo: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
  tradeInfoVal: { fontFamily: 'DMSans_600SemiBold' },
  balanceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  balanceChipText: { fontFamily: 'DMSans_500Medium', fontSize: 11 },
  warningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 10,
  },
  warningText: { fontFamily: 'DMSans_500Medium', fontSize: 12, flex: 1 },
  tradeBtns: { flexDirection: 'row', gap: 12 },
  buyBtn: {
    flex: 1, backgroundColor: '#3A9BAB', borderRadius: 16,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3A9BAB', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  buyBtnText: { fontFamily: 'Syne_700Bold', fontSize: 14 },
  sellBtn: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  sellBtnText: { fontFamily: 'Syne_700Bold', fontSize: 14 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%', borderWidth: 1, borderRadius: 24,
    padding: 28, alignItems: 'center', gap: 12,
  },
  modalIcon: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  modalIconText: { fontSize: 22, fontFamily: 'Syne_800ExtraBold' },
  modalTitle: { fontFamily: 'Syne_800ExtraBold', fontSize: 20, textAlign: 'center' },
  modalMessage: { fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  xpBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginTop: 2 },
  xpBadgeText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  modalBtnSecondary: {
    flex: 1, borderWidth: 1, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  modalBtnSecondaryText: { fontFamily: 'Syne_700Bold', fontSize: 14 },
  modalBtnDanger: {
    flex: 1, borderWidth: 1, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  modalBtnDangerText: { fontFamily: 'Syne_700Bold', fontSize: 14 },
  modalBtnPrimary: {
    width: '100%', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  modalBtnPrimaryText: { fontFamily: 'Syne_700Bold', fontSize: 14 },
});
