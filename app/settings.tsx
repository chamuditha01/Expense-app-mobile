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
    TextInput,
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
    const [currency, setCurrency] = useState<string>('LKR');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New states for adding members
    const [inviteEmail, setInviteEmail] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

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

            // 1. Fetch Profile Email
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', storedUserId)
                .single();
            
            if (profileError) throw profileError;
            setEmail(profile?.email || 'No email found');

            // 2. Fetch Accounts
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

    const handleAddTeamMember = async (account: any) => {
        if (account.type !== 'business') {
            Alert.alert("Action Not Allowed", "Team members can only be added to Business accounts.");
            return;
        }

        const cleanEmail = inviteEmail.trim().toLowerCase();
        
        // 2. Updated Validation Logic
        if (!cleanEmail) {
            Alert.alert("Error", "Please enter an email address.");
            return;
        }

        if (!isValidEmail(cleanEmail)) {
            Alert.alert(
                "Invalid Email", 
                "Please enter a valid email address (e.g., name@example.com)."
            );
            return;
        }

        if (cleanEmail === email.toLowerCase()) {
            Alert.alert("Invalid Action", "You are already the owner of this account.");
            return;
        }

        try {
            setIsProcessing(account.id);

            // 1. Find the profile ID for the given email
            const { data: targetProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id, email')
                .eq('email', cleanEmail)
                .single();

            if (profileError || !targetProfile) {
                Alert.alert(
                    "User Not Found", 
                    "No user found with this email. Ask them to sign up for NanoTrack first."
                );
                return;
            }

            // 2. Prepare the members JSON
            const currentMembers = Array.isArray(account.members) ? account.members : [];
            
            if (currentMembers.some((m: any) => m.id === targetProfile.id)) {
                Alert.alert("Already Added", "This user is already a member of this account.");
                return;
            }

            const updatedMembers = [...currentMembers, { id: targetProfile.id, email: targetProfile.email }];

            // 3. Update the account record
            const { error: updateError } = await supabase
                .from('accounts')
                .update({ members: updatedMembers })
                .eq('id', account.id);

            if (updateError) throw updateError;

            Alert.alert("Success", `${cleanEmail} added to team!`);
            setInviteEmail('');
            fetchSettingsData(); 

        } catch (error: any) {
            console.error("Add Member Error:", error.message);
            Alert.alert("Error", "Could not add team member.");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleCurrencyChange = async (selectedItem: typeof CURRENCIES[0]) => {
        try {
            setCurrency(selectedItem.code);
            await AsyncStorage.setItem('user_currency', selectedItem.code);
            await AsyncStorage.setItem('user_currency_symbol', selectedItem.symbol);

            Alert.alert("Currency Updated", `App set to ${selectedItem.code}`);
        } catch (error) {
            console.error("Failed to save currency", error);
        }
    };

    const deleteAccount = async (accountId: string, accountName: string) => {
        Alert.alert(
            "Delete Account",
            `Are you sure you want to delete "${accountName}"?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        const { error } = await supabase.from('accounts').delete().eq('id', accountId);
                        if (!error) {
                            setAccounts(accounts.filter(a => a.id !== accountId));
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} /> 
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                
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
                                    <Text style={[styles.currencySymbol, isActive && styles.textWhite]}>{item.symbol}</Text>
                                    <Text style={[styles.currencyCode, isActive && styles.textWhite]}>{item.code}</Text>
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

                {/* Account Management & Team Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Manage Data & Team</Text>
                    {accounts.length > 0 ? accounts.map((acc, index) => (
                        <View key={acc.id} style={styles.accountManageCard}>
                            <View style={styles.deleteRow}>
                                <View>
                                    <Text style={styles.accName}>{acc.name}</Text>
                                    <View style={styles.badgeRow}>
                                        <Text style={[styles.accMeta, { textTransform: 'capitalize' }]}>{acc.type}</Text>
                                        {acc.type === 'business' && (
                                            <View style={styles.businessBadge}>
                                                <Ionicons name="people" size={10} color="#0F172A" />
                                                <Text style={styles.businessBadgeText}>Shared</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => deleteAccount(acc.id, acc.name)}
                                    style={styles.trashBtn}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>

                            {/* CONDITIONAL RENDERING: Only show for business accounts */}
                            {acc.type === 'business' && (
                                <>
                                    <View style={styles.divider} />
                                    <Text style={styles.smallLabel}>Add Team Member</Text>
                                    <View style={styles.inviteRow}>
                                        <TextInput 
                                            style={styles.inviteInput}
                                            placeholder="Member Email"
                                            placeholderTextColor="#94A3B8"
                                            value={inviteEmail}
                                            onChangeText={setInviteEmail}
                                            autoCapitalize="none"
                                        />
                                        <TouchableOpacity 
                                            style={styles.addMemberBtn}
                                            onPress={() => handleAddTeamMember(acc)}
                                            disabled={isProcessing === acc.id}
                                        >
                                            {isProcessing === acc.id ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Ionicons name="person-add" size={18} color="#FFF" />
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {acc.members && acc.members.length > 0 && (
                                        <Text style={styles.memberCount}>
                                            {acc.members.length} team member(s) joined
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>
                    )) : (
                        <View style={styles.card}>
                            <Text style={styles.emptyText}>No accounts found.</Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { width: 40, height: 40, backgroundColor: '#F8FAFC', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    section: { paddingHorizontal: 20, marginTop: 25 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    card: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoTextContainer: { marginLeft: 12 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 },
    businessBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#E2E8F0', 
        paddingHorizontal: 6, 
        paddingVertical: 2, 
        borderRadius: 6, 
        gap: 4 
    },
    businessBadgeText: { fontSize: 10, fontWeight: '700', color: '#0F172A' },
    infoTitle: { fontSize: 12, color: '#64748B', fontWeight: '600' },
    infoValue: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 2 },
    currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    currencyCard: { width: '48%', backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', position: 'relative' },
    currencyActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
    currencySymbol: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
    currencyCode: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    textWhite: { color: '#FFFFFF' },
    activeCheck: { position: 'absolute', top: 10, right: 10 },
    
    // Account Manage Card
    accountManageCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 15 },
    deleteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    accName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    accMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    trashBtn: { padding: 10, backgroundColor: '#FEF2F2', borderRadius: 12 },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 15 },
    smallLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
    inviteRow: { flexDirection: 'row', gap: 10 },
    inviteInput: { flex: 1, height: 45, backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E8F0' },
    addMemberBtn: { width: 45, height: 45, backgroundColor: '#0F172A', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    memberCount: { fontSize: 12, color: '#64748B', marginTop: 10, fontWeight: '600' },
    emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 14, paddingVertical: 10 }
});