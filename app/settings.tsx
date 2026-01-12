import { supabase } from '@/components/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StatusBar as RNStatusBar,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const CURRENCIES = [
    { label: 'US Dollar', code: 'USD', symbol: '$' },
    { label: 'Sri Lankan Rupee', code: 'LKR', symbol: 'Rs.' },
    { label: 'Euro', code: 'EUR', symbol: '€' },
    { label: 'British Pound', code: 'GBP', symbol: '£' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const [email, setEmail] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettingsData();
    }, []);

    async function fetchSettingsData() {
        try {
            setLoading(true);
            const storedUserId = await AsyncStorage.getItem('user_id');
            const storedCurrency = await AsyncStorage.getItem('user_currency') || 'USD';
            
            setCurrency(storedCurrency);

            if (!storedUserId) return;

            // 1. Fetch Profile Email from Supabase using user_id
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', storedUserId)
                .single();
            
            if (profileError) throw profileError;
            setEmail(profile?.email || 'No email found');

            // 2. Fetch Accounts belonging to this profile
            const { data: accountsData, error: accError } = await supabase
                .from('accounts')
                .select('*')
                .eq('profile_id', storedUserId);
            
            if (accError) throw accError;
            setAccounts(accountsData || []);

        } catch (error: any) {
            console.error('Settings Fetch Error:', error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleCurrencyChange = async (selectedItem: typeof CURRENCIES[0]) => {
        try {
            setCurrency(selectedItem.code);

            // Save both Code and Symbol to AsyncStorage
            await AsyncStorage.setItem('user_currency', selectedItem.code);
            await AsyncStorage.setItem('user_currency_symbol', selectedItem.symbol);

            Alert.alert(
                "Currency Updated", 
                `The app will now display amounts in ${selectedItem.code} (${selectedItem.symbol})`
            );
        } catch (error) {
            console.error("Failed to save currency", error);
        }
    };

    const deleteAccount = async (accountId: string, accountName: string) => {
        Alert.alert(
            "Delete Account",
            `Are you sure you want to delete "${accountName}"? All linked expenses will be permanently removed.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        const { error } = await supabase
                            .from('accounts')
                            .delete()
                            .eq('id', accountId);

                        if (error) {
                            Alert.alert("Error", "Could not delete account. Please try again.");
                        } else {
                            setAccounts(accounts.filter(a => a.id !== accountId));
                            // Optional: If the deleted account was the active one, clear it
                            const activeId = await AsyncStorage.getItem('active_account_id');
                            if (activeId === accountId.toString()) {
                                await AsyncStorage.removeItem('active_account_id');
                            }
                        }
                    }
                }
            ]
        );
    };

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#0F172A" />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} /> 
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                
                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Account Info</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="mail-outline" size={20} color="#64748B" />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoTitle}>Email Address</Text>
                                <Text style={styles.infoValue}>{email}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Currency Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Preferred Currency</Text>
                    <View style={styles.currencyGrid}>
                        {CURRENCIES.map((item) => {
                            const isActive = currency === item.code;
                            return (
                                <TouchableOpacity 
                                    key={item.code} 
                                    style={[styles.currencyCard, isActive && styles.currencyActive]}
                                    onPress={() => handleCurrencyChange(item)}
                                >
                                    <Text style={[styles.currencySymbol, isActive && styles.textWhite]}>
                                        {item.symbol}
                                    </Text>
                                    <Text style={[styles.currencyCode, isActive && styles.textWhite]}>
                                        {item.code}
                                    </Text>
                                    {isActive && (
                                        <View style={styles.activeCheck}>
                                            <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Account Management Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Manage Data</Text>
                    <View style={styles.card}>
                        {accounts.length > 0 ? accounts.map((acc, index) => (
                            <View key={acc.id} style={[styles.deleteRow, index === accounts.length - 1 && { borderBottomWidth: 0 }]}>
                                <View>
                                    <Text style={styles.accName}>{acc.name}</Text>
                                    <Text style={styles.accMeta}>{acc.type} Account</Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => deleteAccount(acc.id, acc.name)}
                                    style={styles.trashBtn}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        )) : (
                            <Text style={styles.emptyText}>No accounts found to manage.</Text>
                        )}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#FFFFFF', 
        paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Header
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 15 
    },
    backBtn: { 
        width: 40, 
        height: 40, 
        backgroundColor: '#F8FAFC', 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

    // General Section Styles
    section: { paddingHorizontal: 20, marginTop: 25 },
    sectionLabel: { 
        fontSize: 12, 
        fontWeight: '800', 
        color: '#94A3B8', 
        textTransform: 'uppercase', 
        letterSpacing: 1, 
        marginBottom: 12,
        marginLeft: 4
    },
    card: { 
        backgroundColor: '#F8FAFC', 
        borderRadius: 20, 
        padding: 16, 
        borderWidth: 1, 
        borderColor: '#F1F5F9' 
    },

    // Info Box
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoTextContainer: { marginLeft: 12 },
    infoTitle: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    infoValue: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 2 },

    // Currency Grid
    currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    currencyCard: { 
        width: '48%', 
        backgroundColor: '#F8FAFC', 
        padding: 20, 
        borderRadius: 20, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        position: 'relative'
    },
    currencyActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
    currencySymbol: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
    currencyCode: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    textWhite: { color: '#FFFFFF' },
    activeCheck: { position: 'absolute', top: 10, right: 10 },

    // Delete Management
    deleteRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: '#E2E8F0' 
    },
    accName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    accMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    trashBtn: { 
        padding: 10, 
        backgroundColor: '#FEF2F2', 
        borderRadius: 12 
    },
    emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 14, paddingVertical: 10 }
});