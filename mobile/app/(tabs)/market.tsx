import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, SafeAreaView,
} from 'react-native';
import api from '../../services/api';
import Colors from '../../constants/colors';

export default function MarketScreen() {
  const [cryptoSymbol, setCryptoSymbol] = useState('BTCUSDT');
  const [stockSymbol, setStockSymbol] = useState('AAPL');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('TRY');

  const [cryptoData, setCryptoData] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [currencyData, setCurrencyData] = useState<any>(null);

  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingCurrency, setLoadingCurrency] = useState(false);

  const fetchCrypto = async () => {
    setLoadingCrypto(true);
    try {
      const res = await api.get(`/market/crypto/${cryptoSymbol.toUpperCase()}`);
      setCryptoData(res.data);
    } catch {
      setCryptoData({ error: 'Bulunamadı' });
    } finally {
      setLoadingCrypto(false);
    }
  };

  const fetchStock = async () => {
    setLoadingStock(true);
    try {
      const res = await api.get(`/market/stock/${stockSymbol.toUpperCase()}`);
      setStockData(res.data);
    } catch {
      setStockData({ error: 'Bulunamadı' });
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchCurrency = async () => {
    setLoadingCurrency(true);
    try {
      const res = await api.get(`/market/currency/${fromCurrency.toUpperCase()}/${toCurrency.toUpperCase()}`);
      setCurrencyData(res.data);
    } catch {
      setCurrencyData({ error: 'Bulunamadı' });
    } finally {
      setLoadingCurrency(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Market</Text>

        {/* Kripto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kripto Para</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={cryptoSymbol}
              onChangeText={setCryptoSymbol}
              autoCapitalize="characters"
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity style={styles.button} onPress={fetchCrypto}>
              {loadingCrypto
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.buttonText}>Ara</Text>
              }
            </TouchableOpacity>
          </View>
          {cryptoData && (
            <View style={styles.result}>
              {cryptoData.error
                ? <Text style={styles.errorText}>{cryptoData.error}</Text>
                : <>
                    <Text style={styles.resultLabel}>{cryptoData.symbol}</Text>
                    <Text style={styles.resultPrice}>
                      ${Number(cryptoData.price).toLocaleString()}
                    </Text>
                  </>
              }
            </View>
          )}
        </View>

        {/* Hisse */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hisse Senedi</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={stockSymbol}
              onChangeText={setStockSymbol}
              autoCapitalize="characters"
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity style={styles.button} onPress={fetchStock}>
              {loadingStock
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.buttonText}>Ara</Text>
              }
            </TouchableOpacity>
          </View>
          {stockData && (
            <View style={styles.result}>
              {stockData.error
                ? <Text style={styles.errorText}>{stockData.error}</Text>
                : <>
                    <Text style={styles.resultLabel}>{stockData.symbol}</Text>
                    <Text style={styles.resultPrice}>${Number(stockData.price).toLocaleString()}</Text>
                    <Text style={{ color: Colors.textSecondary, marginTop: 4, fontSize: 13 }}>
                      {stockData.change}
                    </Text>
                  </>
              }
            </View>
          )}
        </View>

        {/* Döviz */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Döviz</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={fromCurrency}
              onChangeText={setFromCurrency}
              autoCapitalize="characters"
              placeholderTextColor={Colors.textSecondary}
            />
            <Text style={{ color: Colors.textSecondary, marginHorizontal: 8, fontSize: 18 }}>/</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={toCurrency}
              onChangeText={setToCurrency}
              autoCapitalize="characters"
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity style={styles.button} onPress={fetchCurrency}>
              {loadingCurrency
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.buttonText}>Ara</Text>
              }
            </TouchableOpacity>
          </View>
          {currencyData && (
            <View style={styles.result}>
              {currencyData.error
                ? <Text style={styles.errorText}>{currencyData.error}</Text>
                : <>
                    <Text style={styles.resultLabel}>
                      {currencyData.from} / {currencyData.to}
                    </Text>
                    <Text style={styles.resultPrice}>{currencyData.rate}</Text>
                  </>
              }
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 20, marginTop: 8 },
  section: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: Colors.background, color: Colors.text,
    borderRadius: 10, padding: 12, fontSize: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary, paddingHorizontal: 16,
    paddingVertical: 12, borderRadius: 10,
  },
  buttonText: { color: '#000', fontWeight: 'bold' },
  result: {
    marginTop: 12, padding: 12,
    backgroundColor: Colors.background, borderRadius: 10,
  },
  resultLabel: { color: Colors.textSecondary, fontSize: 13 },
  resultPrice: { color: Colors.primary, fontSize: 26, fontWeight: 'bold', marginTop: 4 },
  errorText: { color: Colors.danger },
});
