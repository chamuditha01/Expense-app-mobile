import { supabase } from '@/components/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

interface ChartData {
  label: string;
  amount: number;
  height: number;
}

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'7D' | '30D' | '1Y'>('7D');
  const [data, setData] = useState<ChartData[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState('Rs.'); // Default fallback

useEffect(() => {
    const loadCurrency = async () => {
        try {
            const savedSymbol = await AsyncStorage.getItem('user_currency_symbol');
            if (savedSymbol) {
                setCurrencySymbol(savedSymbol);
            }
        } catch (e) {
            console.error("Failed to load currency", e);
        }
    };

    loadCurrency();
}, []);

  useEffect(() => {
    fetchAnalytics();
  }, [filter]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const accountId = await AsyncStorage.getItem('active_account_id');
      if (!accountId) return;

      let startDate = new Date();
      if (filter === '7D') startDate.setDate(startDate.getDate() - 7);
      else if (filter === '30D') startDate.setDate(startDate.getDate() - 30);
      else if (filter === '1Y') startDate.setFullYear(startDate.getFullYear() - 1);

      const { data: dbData, error } = await supabase
        .from('expenses_duplicate')
        .select('amount, date_time')
        .eq('account_id', accountId)
        .gte('date_time', startDate.toISOString());

      if (error) throw error;
      processData(dbData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function processData(dbData: any[]) {
    const groups: { [key: string]: number } = {};
    let total = 0;

    dbData.forEach(item => {
      const date = new Date(item.date_time);
      let label = "";

      if (filter === '1Y') {
        label = date.toLocaleString('default', { month: 'short' });
      } else {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      }

      groups[label] = (groups[label] || 0) + Number(item.amount);
      total += Number(item.amount);
    });

    const maxVal = Math.max(...Object.values(groups), 1);
    const chartData = Object.entries(groups).map(([label, amount]) => ({
      label,
      amount,
      height: (amount / maxVal) * 100
    }));

    // Ensure order is correct for 7D/30D
    setData(filter === '1Y' ? chartData : chartData);
    setTotalSpent(total);
  }

  const avgSpent = (totalSpent / (filter === '7D' ? 7 : filter === '30D' ? 30 : 365)).toFixed(2);
  const peakSpent = Math.max(...data.map(d => d.amount), 0).toFixed(2);

  if (loading) return <View style={styles.centered}>
              <ActivityIndicator size="large" color="#0F172A" />
          </View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* 1. Header Section */}
      <View style={styles.summarySection}>
        <Text style={styles.periodLabel}>
          {filter === '7D' ? 'This Week' : filter === '30D' ? 'This Month' : 'This Year'}
        </Text>
        <Text style={styles.mainAmount}>{currencySymbol} {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        
        {/* Underline-style Filter Bar */}
        <View style={styles.filterBar}>
          {(['7D', '30D', '1Y'] as const).map((f) => (
            <TouchableOpacity 
              key={f} 
              onPress={() => setFilter(f)}
              style={styles.filterTab}
            >
              <Text style={[styles.filterText, filter === f && styles.activeTabText]}>{f}</Text>
              {filter === f && <View style={styles.activeUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 2. Borderless Chart */}
<View style={styles.chartArea}>
  {data.map((item, i) => (
    <View key={i} style={styles.cleanColumn}>
      {/* Display amount only if it's greater than 0 */}
      {item.amount > 0 && (
        <Text style={styles.barValue}>
          {item.amount >= 1000 
            ? `${(item.amount / 1000).toFixed(1)}k` 
            : Math.round(item.amount)}
        </Text>
      )}
      <View style={[styles.minimalBar, { height: `${Math.max(item.height, 2)}%` }]} />
      <Text style={styles.cleanLabel}>{item.label}</Text>
    </View>
  ))}
</View>

      {/* 3. Magazine-style Data Breakdown */}
      <View style={styles.statsRow}>
        <View style={styles.statDetail}>
          <Text style={styles.statLabel}>Avg. Daily  ({currencySymbol})</Text>
          <Text style={styles.statValue}> {avgSpent}</Text>
        </View>
        <View style={styles.statDetail}>
          <Text style={styles.statLabel}>Peak Spending ({currencySymbol})</Text>
          <Text style={styles.statValue}>{peakSpent}</Text>
        </View>
      </View>

      

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    paddingTop: 75
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8, // Space between number and bar
    textAlign: 'center',
  },
  chartArea: { 
    height: 280, // Slightly increased height to accommodate labels
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, // Adjusted padding for better label clearance
    marginVertical: 40,
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  summarySection: {
    paddingTop: 0,
    paddingBottom: 20,
    alignItems: 'center',
  },
  periodLabel: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#A1A1AA', 
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  mainAmount: { 
    fontSize: 64, 
    fontWeight: '900', 
    color: '#000000',
    marginTop:40,
    letterSpacing: -3 
  },
  filterBar: { 
    flexDirection: 'row', 
    marginTop: 40,
    gap: 40
  },
  filterTab: { 
    alignItems: 'center'
  },
  filterText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#D4D4D8' 
  },
  activeTabText: { 
    color: '#000000'
  },
  activeUnderline: {
    marginTop: 4,
    height: 2,
    width: 20,
    backgroundColor: '#000'
  },
  
  cleanColumn: { 
    alignItems: 'center', 
    flex: 1 
  },
  minimalBar: { 
    width: 4, 
    backgroundColor: '#000000', 
    borderRadius: 2,
  },
  cleanLabel: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#D4D4D8', 
    marginTop: 20,
    textTransform: 'uppercase'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5'
  },
  statDetail: {
    alignItems: 'flex-start',
   borderWidth: 1,
   borderRadius: 8,
   borderColor: '#E4E4E7',
   padding: 20,
   margin: 5,
  },
  statLabel: { 
    fontSize: 12, 
    color: '#A1A1AA', 
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  statValue: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#000000' 
  },
  footerInfo: {
    marginTop: 60,
    paddingHorizontal: 40,
    paddingBottom: 40
  },
  footerText: {
    fontSize: 12,
    color: '#D4D4D8',
    fontWeight: '500',
    lineHeight: 18
  }
});