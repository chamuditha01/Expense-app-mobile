import { supabase } from '@/components/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
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
    const [closingAccountId, setClosingAccountId] = useState<string | null>(null);

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

    const buildClosureReportHtml = (accountName: string, expenses: any[]) => {
        const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const rows = expenses.map((e) => `
            <tr>
                <td>${new Date(e.date_time).toLocaleDateString()}</td>
                <td>${e.shop_name || '-'}</td>
                <td>${e.description || '-'}</td>
                <td class="amount">${Number(e.amount).toFixed(2)}</td>
            </tr>
        `).join('');

        return `
            <html>
                <head>
                    <meta charset="utf-8" />
                    <style>
                        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
                        h1 { font-size: 22px; margin-bottom: 4px; }
                        .meta { color: #64748B; font-size: 12px; margin-bottom: 20px; }
                        .summary { display: flex; gap: 24px; margin-bottom: 24px; }
                        .summary div { background: #F8FAFC; border-radius: 12px; padding: 12px 16px; }
                        .summary .label { font-size: 10px; text-transform: uppercase; color: #94A3B8; font-weight: 700; }
                        .summary .value { font-size: 18px; font-weight: 900; margin-top: 4px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #94A3B8; border-bottom: 2px solid #E2E8F0; padding: 8px 6px; }
                        td { font-size: 12px; padding: 8px 6px; border-bottom: 1px solid #F1F5F9; }
                        td.amount { text-align: right; font-weight: 700; }
                    </style>
                </head>
                <body>
                    <h1>Account Closure Summary</h1>
                    <div class="meta">${accountName} &middot; Closed on ${new Date().toLocaleString()}</div>
                    <div class="summary">
                        <div><div class="label">Total Spent</div><div class="value">${total.toFixed(2)}</div></div>
                        <div><div class="label">Transactions</div><div class="value">${expenses.length}</div></div>
                    </div>
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Merchant</th><th>Description</th><th>Amount</th></tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="4">No expenses recorded for this account.</td></tr>'}
                        </tbody>
                    </table>
                </body>
            </html>
        `;
    };

    const sendClosureReportEmail = async (accountId: string, accountName: string) => {
        // 1. Pull every expense recorded against this account
        const { data: expenses, error: expensesError } = await supabase
            .from('expenses_duplicate')
            .select('shop_name, description, amount, date_time')
            .eq('account_id', accountId);

        if (expensesError) throw expensesError;

        // 2. Render the summary as a PDF
        const html = buildClosureReportHtml(accountName, expenses || []);
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const base64Pdf = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });

        // 3. Email it via the Supabase Edge Function (Resend), which attaches the PDF
        const { data, error } = await supabase.functions.invoke('send-closure-report', {
            body: {
                accountName,
                closedDate: new Date().toLocaleString(),
                pdfBase64: base64Pdf,
                filename: `${accountName.replace(/\s+/g, '_')}_closure_report.pdf`,
            },
        });

        if (error) {
            // supabase-js only puts a generic message on `error`; the real
            // reason the function returned is in the response body.
            let detail = error.message;
            try {
                const body = await error.context?.json();
                if (body) detail = JSON.stringify(body);
            } catch {
                try {
                    const text = await error.context?.text();
                    if (text) detail = text;
                } catch {
                    // fall back to error.message
                }
            }
            throw new Error(detail);
        }
        if (data?.error) throw new Error(JSON.stringify(data.error));
    };

    const removeAccountAndExpenses = async (accountId: string) => {
        // Expenses reference the account via a foreign key, so they must be
        // cleared first or the account delete fails with a constraint error.
        const { error: expensesDeleteError } = await supabase
            .from('expenses_duplicate')
            .delete()
            .eq('account_id', accountId);

        if (expensesDeleteError) throw expensesDeleteError;

        const { error: accountDeleteError } = await supabase
            .from('accounts')
            .delete()
            .eq('id', accountId);

        if (accountDeleteError) throw accountDeleteError;

        setAccounts(prev => prev.filter(a => a.id !== accountId));
    };

    const deleteAccount = async (accountId: string, accountName: string) => {
        Alert.alert(
            "Delete Account",
            `Are you sure you want to delete "${accountName}"? A summary report will be emailed before it's removed.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setClosingAccountId(accountId);
                        try {
                            await sendClosureReportEmail(accountId, accountName);
                        } catch (e: any) {
                            const detail = e.message || String(e);
                            console.error('Closure report email failed:', detail);
                            Alert.alert(
                                "Report Not Sent",
                                `We couldn't email the closure summary (${detail}). You can still delete the account. Delete anyway?`,
                                [
                                    { text: "Cancel", style: "cancel", onPress: () => setClosingAccountId(null) },
                                    {
                                        text: "Delete Anyway",
                                        style: "destructive",
                                        onPress: async () => {
                                            try {
                                                await removeAccountAndExpenses(accountId);
                                            } catch (delErr: any) {
                                                console.error('Account delete failed:', delErr.message);
                                                Alert.alert("Error", `Could not delete account: ${delErr.message}`);
                                            }
                                            setClosingAccountId(null);
                                        }
                                    }
                                ]
                            );
                            return;
                        }

                        try {
                            await removeAccountAndExpenses(accountId);
                        } catch (delErr: any) {
                            console.error('Account delete failed:', delErr.message);
                            Alert.alert("Error", `Report was emailed, but the account could not be deleted: ${delErr.message}`);
                        }
                        setClosingAccountId(null);
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
                                    disabled={closingAccountId === acc.id}
                                >
                                    {closingAccountId === acc.id ? (
                                        <ActivityIndicator size="small" color="#EF4444" />
                                    ) : (
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    )}
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