import { supabase } from '@/components/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export default function HistoryScreen() {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('date_desc');
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
        fetchHistory();
    }, []);

    async function fetchHistory() {
        try {
            setLoading(true);
            const accountId = await AsyncStorage.getItem('active_account_id');
            
            const { data, error } = await supabase
                .from('expenses')
                .select(`
                    *,
                    accounts (
                        profiles (
                            email
                        )
                    )
                `) 
                .eq('account_id', accountId);

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    }

    // --- Sorting Logic ---
    const processedExpenses = useMemo(() => {
        let result = [...expenses];
        result.sort((a, b) => {
            if (sortBy === 'date_desc') return new Date(b.date_time).getTime() - new Date(a.date_time).getTime();
            if (sortBy === 'date_asc') return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
            if (sortBy === 'amount_desc') return b.amount - a.amount;
            if (sortBy === 'amount_asc') return a.amount - b.amount;
            return 0;
        });
        return result;
    }, [expenses, sortBy]);

    // --- Date Formatting Helper ---
    // --- Date Formatting Helper ---
const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    
    // Format: "Jan 9, 2026"
    const dateStrFormatted = date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });

    // Format: "04:47 PM"
    const timeStr = date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });

    // Returns: "Jan 9, 2026 • 04:47 PM"
    return `${dateStrFormatted} • ${timeStr}`;
};

    const renderExpenseItem = ({ item }: { item: any }) => {
        const imageUrl = item.bill;
        const userEmail = item.accounts?.profiles?.email || "User";

        return (
            <View style={styles.expenseRow}>
                {/* 1. Receipt Thumbnail */}
                <TouchableOpacity 
                    onPress={() => imageUrl && setSelectedImage(imageUrl)}
                    style={styles.thumbnailContainer}
                >
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
                    ) : (
                        <View style={styles.thumbnailPlaceholder}>
                            <Ionicons name="receipt-outline" size={20} color="#CBD5E1" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* 2. Details Column */}
                <View style={styles.detailsContainer}>
                    <View style={styles.topLine}>
                        <Text style={styles.description} numberOfLines={1}>
                            {item.description || 'General Expense'}
                        </Text>
                        <Text style={styles.amount}>
                            {currencySymbol} {Number(item.amount).toFixed(2)}
                        </Text>
                    </View>

                    <View style={styles.bottomLine}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                            <Text style={styles.metaText}>{formatDateTime(item.date_time)}</Text>
                        </View>
                        <Text style={styles.bullet}>•</Text>
                        
                    </View>
                    <View style={styles.metaItem}>
                            <Ionicons name="person-outline" size={12} color="#94A3B8" />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {userEmail.split('@')[0]}
                            </Text>
                        </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.brandName}>Activity</Text>
            </View>

            {/* Sorting Toolbar */}
            <View style={styles.toolbar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarScroll}>
                    <SortChip label="Newest" active={sortBy === 'date_desc'} onPress={() => setSortBy('date_desc')} icon="time-outline" />
                    <SortChip label="Highest" active={sortBy === 'amount_desc'} onPress={() => setSortBy('amount_desc')} icon="trending-up-outline" />
                    <SortChip label="Lowest" active={sortBy === 'amount_asc'} onPress={() => setSortBy('amount_asc')} icon="trending-down-outline" />
                    <SortChip label="Oldest" active={sortBy === 'date_asc'} onPress={() => setSortBy('date_asc')} icon="hourglass-outline" />
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color="#0F172A" size="large" />
                </View>
            ) : (
                <FlatList
                    data={processedExpenses}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderExpenseItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={48} color="#E2E8F0" />
                            <Text style={styles.emptyText}>No transactions found</Text>
                        </View>
                    }
                />
            )}

            {/* Image Preview Modal */}
            <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// --- Internal Components ---
const SortChip = ({ label, active, onPress, icon }: any) => (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
        <Ionicons name={icon} size={14} color={active ? '#fff' : '#64748B'} style={{ marginRight: 6 }} />
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 50 },
    header: { paddingTop: 25, paddingBottom: 10 },
    brandName: { fontSize: 24, fontWeight: '900', textAlign: 'center', color: '#0F172A', letterSpacing: -0.5 },
    
    // Toolbar
    toolbar: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    toolbarScroll: { paddingHorizontal: 20 },
    chip: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F1F5F9', 
        paddingHorizontal: 14, 
        paddingVertical: 8, 
        borderRadius: 20, 
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    chipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    chipTextActive: { color: '#FFF' },

    // List & Rows
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9', 
    },
    thumbnailContainer: {
        width: 52, height: 52, borderRadius: 14, backgroundColor: '#F8FAFC',
        overflow: 'hidden', marginRight: 15, borderWidth: 1, borderColor: '#F1F5F9'
    },
    thumbnail: { width: '100%', height: '100%' },
    thumbnailPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    
    detailsContainer: { flex: 1 },
    topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    description: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 10 },
    amount: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
    
    bottomLine: { flexDirection: 'row', alignItems: 'center' },
    metaItem: { flexDirection: 'row', alignItems: 'center' },
    metaText: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginLeft: 4 },
    bullet: { color: '#E2E8F0', marginHorizontal: 8, fontSize: 14 },

    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#94A3B8', marginTop: 10, fontWeight: '600', fontSize: 16 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center' },
    closeBtn: { position: 'absolute', top: 50, right: 25, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 50 },
    fullImage: { width: width * 0.9, height: '80%' }
});