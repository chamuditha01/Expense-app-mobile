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

const { width, height } = Dimensions.get('window');

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export default function HistoryScreen() {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [selectedExpense, setSelectedExpense] = useState<any | null>(null); // State for the full review popup
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('date_desc');
    const [currencySymbol, setCurrencySymbol] = useState('Rs.');

    useEffect(() => {
        const loadCurrency = async () => {
            try {
                const savedSymbol = await AsyncStorage.getItem('user_currency_symbol');
                if (savedSymbol) setCurrencySymbol(savedSymbol);
            } catch (e) { console.error(e); }
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
                .from('expenses_duplicate')
                .select(`*, accounts ( name, profiles ( email ) )`)
                .eq('account_id', accountId);

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

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

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const renderExpenseItem = ({ item }: { item: any }) => {
        return (
            <TouchableOpacity 
                style={styles.expenseRow} 
                onPress={() => setSelectedExpense(item)} // Open Full Review
            >
                <View style={styles.thumbnailContainer}>
                    {item.bill ? (
                        <Image source={{ uri: item.bill }} style={styles.thumbnail} />
                    ) : (
                        <View style={styles.thumbnailPlaceholder}><Ionicons name="receipt-outline" size={20} color="#CBD5E1" /></View>
                    )}
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.topLine}>
                        <Text style={styles.description} numberOfLines={1}>{item.description || 'General Expense'}</Text>
                        <Text style={styles.amount}>{currencySymbol} {Number(item.amount).toFixed(2)}</Text>
                    </View>
                    <View style={styles.bottomLine}>
                        <Text style={styles.metaText}>{formatDateTime(item.date_time)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.brandName}>Activity</Text></View>

            <View style={styles.toolbar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarScroll}>
                    <SortChip label="Newest" active={sortBy === 'date_desc'} onPress={() => setSortBy('date_desc')} icon="time-outline" />
                    <SortChip label="Highest" active={sortBy === 'amount_desc'} onPress={() => setSortBy('amount_desc')} icon="trending-up-outline" />
                    <SortChip label="Lowest" active={sortBy === 'amount_asc'} onPress={() => setSortBy('amount_asc')} icon="trending-down-outline" />
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator color="#0F172A" size="large" /></View>
            ) : (
                <FlatList
                    data={processedExpenses}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderExpenseItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No transactions</Text></View>}
                />
            )}

            {/* --- FULL REVIEW MODAL --- */}
            <Modal visible={!!selectedExpense} animationType="slide" transparent={true}>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailSheet}>
                        <TouchableOpacity style={styles.sheetClose} onPress={() => setSelectedExpense(null)}>
                            <Ionicons name="chevron-down" size={30} color="#CBD5E1" />
                        </TouchableOpacity>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.detailShop}>{selectedExpense?.shop_name || "Unknown Store"}</Text>
                            <Text style={styles.detailDesc}>{selectedExpense?.description}</Text>
                            
                            <View style={styles.detailAmountContainer}>
                                <Text style={styles.detailCurrency}>{currencySymbol}</Text>
                                <Text style={styles.detailAmount}>{Number(selectedExpense?.amount).toFixed(2)}</Text>
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.sectionTitle}>Bill Breakdown</Text>
                            {selectedExpense?.list_items?.map((item: any, idx: number) => (
                                <View key={idx} style={styles.itemRow}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemPrice}>{currencySymbol}{item.price}</Text>
                                </View>
                            ))}

                            <View style={styles.metaBox}>
                                <DetailMeta icon="calendar" label="Date" value={selectedExpense ? formatDateTime(selectedExpense.date_time) : ''} />
                                <DetailMeta icon="wallet" label="Account" value={selectedExpense?.accounts?.name} />
                            </View>

                            {selectedExpense?.bill && (
                                <TouchableOpacity onPress={() => setSelectedImage(selectedExpense.bill)}>
                                    <Image source={{ uri: selectedExpense.bill }} style={styles.receiptPreview} />
                                    <Text style={styles.viewFullText}>Tap to view full receipt</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Full Image Zoom Modal */}
            <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const SortChip = ({ label, active, onPress, icon }: any) => (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
        <Ionicons name={icon} size={14} color={active ? '#fff' : '#64748B'} style={{ marginRight: 6 }} />
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
);

const DetailMeta = ({ icon, label, value }: any) => (
    <View style={styles.metaRow}>
        <View style={styles.metaLabelCol}>
            <Ionicons name={icon as any} size={14} color="#94A3B8" />
            <Text style={styles.metaLabelText}>{label}</Text>
        </View>
        <Text style={styles.metaValueText}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 50 },
    header: { paddingVertical: 10 },
    brandName: { fontSize: 24, fontWeight: '900', textAlign: 'center', color: '#0F172A' },
    toolbar: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    toolbarScroll: { paddingHorizontal: 20 },
    chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
    chipActive: { backgroundColor: '#0F172A' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    chipTextActive: { color: '#FFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
    expenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    thumbnailContainer: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#F8FAFC', overflow: 'hidden', marginRight: 15 },
    thumbnail: { width: '100%', height: '100%' },
    thumbnailPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    detailsContainer: { flex: 1 },
    topLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    bottomLine: { marginTop: 4 },
    description: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1 },
    amount: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
    metaText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#94A3B8', fontWeight: '600' },

    // Detail Modal Styles
    detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    detailSheet: { backgroundColor: '#FFF', height: height * 0.85, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
    sheetClose: { alignSelf: 'center', marginBottom: 20 },
    detailShop: { fontSize: 14, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center' },
    detailDesc: { fontSize: 24, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginTop: 5 },
    detailAmountContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', marginVertical: 25 },
    detailCurrency: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginRight: 5 },
    detailAmount: { fontSize: 56, fontWeight: '900', color: '#0F172A', letterSpacing: -2 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 15 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    itemName: { color: '#475569', fontWeight: '600', fontSize: 15 },
    itemPrice: { color: '#0F172A', fontWeight: '700' },
    metaBox: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginTop: 20 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    metaLabelCol: { flexDirection: 'row', alignItems: 'center' },
    metaLabelText: { fontSize: 13, color: '#94A3B8', marginLeft: 8, fontWeight: '600' },
    metaValueText: { fontSize: 13, color: '#0F172A', fontWeight: '700' },
    receiptPreview: { width: '100%', height: 200, borderRadius: 20, marginTop: 25, backgroundColor: '#F1F5F9' },
    viewFullText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 10, fontWeight: '600' },

    // Zoom Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closeBtn: { position: 'absolute', top: 50, right: 25, zIndex: 10 },
    fullImage: { width: width * 0.9, height: '80%' }
});