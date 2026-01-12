import { supabase } from '@/components/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [activeAccount, setActiveAccount] = useState<any | null>(null);
    const [totalToday, setTotalToday] = useState(0);
    const router = useRouter();

    // --- State for Account Modals ---
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // Distinguish between Create vs Edit
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    
    const [accountName, setAccountName] = useState('');
    const [accountType, setAccountType] = useState('personal');
    const [isSaving, setIsSaving] = useState(false);
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
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (activeAccount) {
            fetchTodayTotal(activeAccount.id);
            AsyncStorage.setItem('active_account_id', activeAccount.id);
        }
    }, [activeAccount]);

    async function fetchInitialData() {
        try {
            setLoading(true);
            const { data: accountsData } = await supabase.from('accounts').select('*');
            setAccounts(accountsData || []);
            if (accountsData && accountsData.length > 0) {
                const savedId = await AsyncStorage.getItem('active_account_id');
                const savedAccount = accountsData.find(a => a.id === savedId);
                setActiveAccount(savedAccount || accountsData[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // --- Create or Update Account ---
    async function handleSaveAccount() {
        if (!accountName.trim()) {
            Alert.alert('Error', 'Please enter an account name');
            return;
        }

        try {
            setIsSaving(true);
            const userId = await AsyncStorage.getItem('user_id');
            
            if (isEditing && editingAccountId) {
                // UPDATE logic
                const { error } = await supabase
                    .from('accounts')
                    .update({ name: accountName, type: accountType })
                    .eq('id', editingAccountId);
                if (error) throw error;
            } else {
                // INSERT logic
                const { error } = await supabase
                    .from('accounts')
                    .insert([{ profile_id: userId, name: accountName, type: accountType }]);
                if (error) throw error;
            }

            setAccountName('');
            setShowAccountModal(false);
            fetchInitialData(); 
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsSaving(false);
        }
    }

    const openEditModal = (acc: any) => {
        setIsEditing(true);
        setEditingAccountId(acc.id);
        setAccountName(acc.name);
        setAccountType(acc.type);
        setShowAccountModal(true);
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setEditingAccountId(null);
        setAccountName('');
        setAccountType('personal');
        setShowAccountModal(true);
    };

    async function fetchTodayTotal(accountId: string) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('expenses')
            .select('amount')
            .eq('account_id', accountId)
            .gte('date_time', `${today}T00:00:00`)
            .lte('date_time', `${today}T23:59:59`);

        if (!error && data) {
            const total = data.reduce((sum, item) => sum + Number(item.amount), 0);
            setTotalToday(total);
        }
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0F172A" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.brandName}>NanoTrack</Text>
                <View style={styles.switcher}>
                    {accounts.map((acc) => (
                        <TouchableOpacity
                            key={acc.id}
                            onPress={() => setActiveAccount(acc)}
                            onLongPress={() => openEditModal(acc)} // TRIGGER EDIT
                            delayLongPress={500}
                            style={[styles.switchTab, activeAccount?.id === acc.id && styles.activeTab]}
                        >
                            <Text style={[styles.tabText, activeAccount?.id === acc.id && styles.activeTabText]}>
                                {acc.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity 
                        style={styles.addAccountIcon}
                        onPress={openCreateModal}
                    >
                        <Ionicons name="add" size={20} color="#888" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.mainFocus}>
                <Text style={styles.todayLabel}>Spent Today</Text>
                <Text style={styles.todayAmount}>{currencySymbol} {totalToday.toFixed(2)}</Text>
                <TouchableOpacity 
                    style={styles.activityButton}
                    onPress={() => router.push('/history')}
                >
                    <Text style={styles.activityButtonText}>View Activity</Text>
                    <Ionicons name="chevron-forward" size={16} color="#888" />
                </TouchableOpacity>
            </View>

            {/* SHARED MODAL FOR CREATE & EDIT */}
            <Modal
                visible={showAccountModal}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {isEditing ? 'Edit Account' : 'New Account'}
                        </Text>
                        
                        <TextInput
                            placeholder="Account Name"
                            style={styles.input}
                            value={accountName}
                            onChangeText={setAccountName}
                            autoFocus
                        />

                        <View style={styles.typeSelector}>
                            {['personal', 'business'].map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeBtn, accountType === type && styles.activeTypeBtn]}
                                    onPress={() => setAccountType(type)}
                                >
                                    <Text style={[styles.typeBtnText, accountType === type && styles.activeTypeBtnText]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.cancelBtn} 
                                onPress={() => setShowAccountModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.saveBtn} 
                                onPress={handleSaveAccount}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>
                                        {isEditing ? 'Save Changes' : 'Create'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 25 },
    brandName: { fontSize: 20, fontWeight: '900', letterSpacing: -1, marginBottom: 20, textAlign: 'center' },
    switcher: { flexDirection: 'row', backgroundColor: '#F1F3F5', borderRadius: 16, padding: 5, alignItems: 'center' },
    switchTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    addAccountIcon: { paddingHorizontal: 15 },
    activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    tabText: { fontSize: 13, color: '#888', fontWeight: '600' },
    activeTabText: { color: '#000', fontWeight: '800' },
    mainFocus: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    todayLabel: { fontSize: 16, color: '#AAA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    todayAmount: { fontSize: 48, fontWeight: '900', color: '#000', letterSpacing: -2, marginVertical: 10 },
    activityButton: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
    activityButtonText: { fontSize: 16, color: '#888', fontWeight: '500', marginRight: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', padding: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
    input: { backgroundColor: '#F1F3F5', padding: 18, borderRadius: 15, fontSize: 16, marginBottom: 20 },
    typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 30 },
    typeBtn: { flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', alignItems: 'center' },
    activeTypeBtn: { backgroundColor: '#000', borderColor: '#000' },
    typeBtnText: { fontWeight: '600', color: '#888' },
    activeTypeBtnText: { color: '#fff' },
    modalActions: { flexDirection: 'row', gap: 15 },
    cancelBtn: { flex: 1, padding: 18, alignItems: 'center' },
    cancelBtnText: { color: '#888', fontWeight: '600' },
    saveBtn: { flex: 2, backgroundColor: '#000', padding: 18, borderRadius: 15, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});