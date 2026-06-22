import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useColors } from '../../hooks/useColors';

type TabKey = 'Hisseler' | 'Kripto' | 'ETF' | 'Döviz';

interface MarketItem {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  category: string;
  loading: boolean;
  displaySymbol?: string;
}

interface CurrencyItem {
  from: string;
  to: string;
  name: string;
  routeSymbol: string;
  rate: number | null;
  change: number | null;
  loading: boolean;
}

const STOCKS: Omit<MarketItem, 'price' | 'loading'>[] = [
  // Teknoloji
  { symbol: 'AAPL',  name: 'Apple Inc.',        change: null, category: 'Teknoloji'    },
  { symbol: 'MSFT',  name: 'Microsoft',          change: null, category: 'Teknoloji'    },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',      change: null, category: 'Teknoloji'    },
  { symbol: 'META',  name: 'Meta Platforms',     change: null, category: 'Teknoloji'    },
  { symbol: 'NVDA',  name: 'Nvidia Corp.',       change: null, category: 'Yari Iletken' },
  { symbol: 'AMZN',  name: 'Amazon',             change: null, category: 'Teknoloji'    },
  { symbol: 'TSLA',  name: 'Tesla Inc.',         change: null, category: 'Otomotiv'     },
  { symbol: 'NFLX',  name: 'Netflix',            change: null, category: 'Medya'        },
  { symbol: 'AMD',   name: 'AMD',                change: null, category: 'Yari Iletken' },
  { symbol: 'ADBE',  name: 'Adobe Inc.',         change: null, category: 'Teknoloji'    },
  { symbol: 'CRM',   name: 'Salesforce',         change: null, category: 'Teknoloji'    },
  { symbol: 'ORCL',  name: 'Oracle Corp.',       change: null, category: 'Teknoloji'    },
  // Finans
  { symbol: 'JPM',   name: 'JPMorgan Chase',     change: null, category: 'Finans'       },
  { symbol: 'V',     name: 'Visa Inc.',          change: null, category: 'Finans'       },
  { symbol: 'MA',    name: 'Mastercard',         change: null, category: 'Finans'       },
  { symbol: 'BAC',   name: 'Bank of America',    change: null, category: 'Finans'       },
  // Saglik
  { symbol: 'JNJ',   name: 'Johnson & Johnson',  change: null, category: 'Saglik'       },
  { symbol: 'PFE',   name: 'Pfizer Inc.',        change: null, category: 'Saglik'       },
  { symbol: 'UNH',   name: 'UnitedHealth',       change: null, category: 'Saglik'       },
  // Enerji
  { symbol: 'XOM',   name: 'ExxonMobil',         change: null, category: 'Enerji'       },
  { symbol: 'CVX',   name: 'Chevron Corp.',      change: null, category: 'Enerji'       },
  // Tuketim
  { symbol: 'WMT',   name: 'Walmart',            change: null, category: 'Perakende'    },
  { symbol: 'COST',  name: 'Costco',             change: null, category: 'Perakende'    },
  { symbol: 'MCD',   name: "McDonald's",         change: null, category: 'Gida'         },
  { symbol: 'KO',    name: 'Coca-Cola',          change: null, category: 'Gida'         },
];

const CRYPTOS: Omit<MarketItem, 'price' | 'loading'>[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin',   change: null, category: 'Kripto' },
  { symbol: 'ETHUSDT', name: 'Ethereum',  change: null, category: 'Kripto' },
  { symbol: 'SOLUSDT', name: 'Solana',    change: null, category: 'Kripto' },
  { symbol: 'BNBUSDT', name: 'BNB',       change: null, category: 'Kripto' },
];

const ETFS: Omit<MarketItem, 'price' | 'loading'>[] = [
  { symbol: 'SPY',  name: 'S&P 500 ETF',       change: null, category: 'ETF' },
  { symbol: 'QQQ',  name: 'Nasdaq 100 ETF',    change: null, category: 'ETF' },
  { symbol: 'VTI',  name: 'Total Market ETF',  change: null, category: 'ETF' },
  { symbol: 'IVV',  name: 'iShares S&P 500',   change: null, category: 'ETF' },
];

const CURRENCY_PAIRS = [
  { from: 'USD', to: 'TRY', name: 'Dolar / Türk Lirası',  routeSymbol: 'USDTRY' },
  { from: 'EUR', to: 'TRY', name: 'Euro / Türk Lirası',   routeSymbol: 'EURTRY' },
  { from: 'EUR', to: 'USD', name: 'Euro / Dolar',          routeSymbol: 'EURUSD' },
  { from: 'GBP', to: 'USD', name: 'Sterlin / Dolar',       routeSymbol: 'GBPUSD' },
  { from: 'JPY', to: 'USD', name: 'Yen / Dolar',           routeSymbol: 'JPYUSD' },
];

export default function MarketScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('Hisseler');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<MarketItem[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [ownedMap, setOwnedMap] = useState<Record<string, number>>({});
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useColors();

  useFocusEffect(useCallback(() => {
    api.get('/portfolio')
      .then((res) => {
        const map: Record<string, number> = {};
        res.data.portfolio.forEach((item: { symbol: string; amount: number }) => {
          map[item.symbol] = Number(item.amount);
        });
        setOwnedMap(map);
      })
      .catch(() => {});
  }, []));

  const loadItems = async (tab: TabKey) => {
    if (tab === 'Döviz') {
      setCurrencies(CURRENCY_PAIRS.map((p) => ({ ...p, rate: null, change: null, loading: true })));

      const fetched = await Promise.all(
        CURRENCY_PAIRS.map(async (p) => {
          try {
            const res = await api.get(`/market/forex/${p.routeSymbol}`);
            return { ...p, rate: res.data.price, change: res.data.change ?? null, loading: false };
          } catch {
            return { ...p, rate: null, change: null, loading: false };
          }
        })
      );
      setCurrencies(fetched);
      return;
    }

    const sources =
      tab === 'Kripto' ? CRYPTOS :
      tab === 'ETF'    ? ETFS    :
      STOCKS;

    setItems(sources.map((s) => ({ ...s, price: null, loading: true })));

    const fetched = await Promise.all(
      sources.map(async (s) => {
        try {
          const endpoint =
            tab === 'Kripto'
              ? `/market/crypto/${s.symbol}`
              : `/market/stock/${s.symbol}`;
          const res = await api.get(endpoint);
          const price = Number(res.data.price);
          const change = res.data.change != null ? Number(res.data.change) : null;
          return { ...s, price, change, loading: false };
        } catch {
          return { ...s, price: null, change: null, loading: false };
        }
      })
    );
    setItems(fetched);
  };

  useEffect(() => {
    setSearch('');
    loadItems(activeTab);
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        loadItems(activeTab);
      }, 60000);
      return () => clearInterval(interval);
    }, [activeTab])
  );

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCurrencies = currencies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.from.toLowerCase().includes(q) ||
      c.to.toLowerCase().includes(q) ||
      c.routeSymbol.toLowerCase().includes(q)
    );
  });

  const tabs: TabKey[] = ['Hisseler', 'Kripto', 'ETF', 'Döviz'];

  return (
    <View style={[styles.screen, { backgroundColor: C.bg2, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: C.text1 }]}>Market</Text>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
          onPress={() => loadItems(activeTab)}
        >
          <Ionicons name="refresh-outline" size={18} color={C.text2} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: C.bgCard, borderColor: C.border }]}>
        <Ionicons name="search-outline" size={16} color={C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text1 }]}
          placeholder="Hisse, kripto, döviz ara..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          selectionColor={C.primary}
        />
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tabPill,
              { backgroundColor: C.bgCard, borderColor: C.border },
              activeTab === t && { backgroundColor: C.primary, borderColor: C.primary },
            ]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, { color: activeTab === t ? C.bg : C.textMuted }]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
      >
        {/* Hisseler / Kripto / ETF */}
        {activeTab !== 'Döviz' && filteredItems.map((item) => {
          const isUp = item.change !== null ? item.change >= 0 : true;
          const displaySymbol = item.symbol.replace('USDT', '');
          const ownedAmt = ownedMap[displaySymbol] ?? 0;
          return (
            <TouchableOpacity
              key={item.symbol}
              style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}
              onPress={() => router.push(`/stock/${displaySymbol}` as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.logo, { backgroundColor: C.bg2, borderColor: C.border }]}>
                <Text style={[styles.logoText, { color: C.text3 }]}>
                  {displaySymbol.slice(0, 4)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.itemName, { color: C.text1 }]} numberOfLines={1}>{item.name}</Text>
                <View style={styles.itemSubRow}>
                  <Text style={[styles.itemSub, { color: C.textMuted }]} numberOfLines={1}>
                    {displaySymbol} · {item.category}
                  </Text>
                  {ownedAmt > 0 && (
                    <View style={[styles.ownedChip, { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}33` }]}>
                      <Ionicons name="checkmark-circle" size={9} color={C.primary} />
                      <Text style={[styles.ownedText, { color: C.primaryDim }]}>
                        {Number.isInteger(ownedAmt) ? `${ownedAmt} adet` : ownedAmt.toFixed(4)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.spark}>
                {[40, 60, 80, 70, 100].map((h, i) => (
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
                {item.loading ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <>
                    <Text style={[styles.price, { color: C.text1 }]}>
                      {item.price != null
                        ? `$${item.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                        : '—'}
                    </Text>
                    {item.change !== null && (
                      <View style={[styles.badge, { backgroundColor: isUp ? C.successBg : C.dangerBg }]}>
                        <Text style={[styles.badgeText, { color: isUp ? C.success : C.danger }]}>
                          {isUp ? '+' : ''}{item.change.toFixed(2)}%
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Döviz */}
        {activeTab === 'Döviz' && filteredCurrencies.map((c) => {
          const isUp = c.change !== null ? c.change >= 0 : true;
          const ownedAmt = ownedMap[c.routeSymbol] ?? 0;
          return (
            <TouchableOpacity
              key={`${c.from}${c.to}`}
              style={[styles.card, { backgroundColor: C.bgCard, borderColor: C.border }]}
              onPress={() => router.push(`/stock/${c.routeSymbol}` as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.logo, { backgroundColor: C.bg2, borderColor: C.border }]}>
                <Text style={[styles.logoText, { color: C.text3 }]}>{c.from}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.itemName, { color: C.text1 }]} numberOfLines={1}>{c.name}</Text>
                <View style={styles.itemSubRow}>
                  <Text style={[styles.itemSub, { color: C.textMuted }]}>{c.from}/{c.to}</Text>
                  {ownedAmt > 0 && (
                    <View style={[styles.ownedChip, { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}33` }]}>
                      <Ionicons name="checkmark-circle" size={9} color={C.primary} />
                      <Text style={[styles.ownedText, { color: C.primaryDim }]}>
                        {ownedAmt.toFixed(2)} adet
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.spark}>
                {[40, 60, 80, 70, 100].map((h, i) => (
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
                {c.loading ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <>
                    <Text style={[styles.price, { color: C.text1 }]}>
                      {c.rate != null
                        ? c.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })
                        : '—'}
                    </Text>
                    {c.change !== null && (
                      <View style={[styles.badge, { backgroundColor: isUp ? C.successBg : C.dangerBg }]}>
                        <Text style={[styles.badgeText, { color: isUp ? C.success : C.danger }]}>
                          {isUp ? '+' : ''}{c.change.toFixed(2)}%
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
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
  filterBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 14,
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13 },
  tabsScroll: { flexShrink: 0, flexGrow: 0 },
  tabsContent: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tabPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 10, gap: 12,
  },
  logo: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: 'DMSans_600SemiBold', fontSize: 9, letterSpacing: 0.5 },
  itemName: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  itemSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, flexWrap: 'wrap' },
  itemSub: { fontFamily: 'DMSans_400Regular', fontSize: 10 },
  ownedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  ownedText: { fontFamily: 'DMSans_600SemiBold', fontSize: 9 },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 28, width: 44 },
  sparkBar: { width: 5, borderRadius: 2 },
  price: { fontFamily: 'Syne_700Bold', fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginTop: 3 },
  badgeText: { fontFamily: 'DMSans_600SemiBold', fontSize: 10 },
});
