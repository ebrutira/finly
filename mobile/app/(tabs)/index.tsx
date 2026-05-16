import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, SafeAreaView,
} from 'react-native';
import api from '../../services/api';
import Colors from '../../constants/colors';

interface PortfolioItem {
  id: number;
  symbol: string;
  amount: number;
  avg_buy_price: number;
}

export default function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const res = await api.get('/portfolio');
      setPortfolio(res.data.portfolio);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPortfolio(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Portföyüm</Text>
      {portfolio.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Henüz varlık yok</Text>
          <Text style={{ color: Colors.textSecondary, marginTop: 8, fontSize: 13 }}>
            Market ekranından fiyat bakıp alım yapabilirsin
          </Text>
        </View>
      ) : (
        <FlatList
          data={portfolio}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPortfolio(); }}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.symbolBadge}>
                <Text style={styles.symbolBadgeText}>{item.symbol.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.amount}>{Number(item.amount)} adet</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.price}>
                  ${Number(item.avg_buy_price).toLocaleString()}
                </Text>
                <Text style={styles.label}>ort. alış</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 20, marginTop: 8 },
  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  symbolBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary + '22',
    justifyContent: 'center', alignItems: 'center',
  },
  symbolBadgeText: { color: Colors.primary, fontWeight: 'bold', fontSize: 18 },
  symbol: { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  amount: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  label: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: Colors.text, fontSize: 16, fontWeight: '600' },
});
