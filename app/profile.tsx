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

export default function ProfileScreen() {
    const router = useRouter();
    const [email, setEmail] = useState<string | null>('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfileData();
    }, []);

    async function fetchProfileData() {
    try {
        setLoading(true);
        
        // 1. Get the stored user_id (UUID) and current active account ID
        const storedUserId = await AsyncStorage.getItem('user_id');
        const currentActiveId = await AsyncStorage.getItem('active_account_id');
        
        if (!storedUserId) throw new Error("No user ID found in storage");

        setActiveAccountId(currentActiveId);

        // 2. Fetch Email from 'profiles' table using the user_id
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', storedUserId) // assuming 'id' is the primary key in your profiles table
            .single();

        if (profileError) throw profileError;
        setEmail(profileData?.email || 'No email found');

        // 3. Fetch all accounts belonging to this user
        // We filter by 'profile_id' to ensure users only see their own accounts
        const { data: accountsData, error: accountsError } = await supabase
            .from('accounts')
            .select('*')
            .eq('profile_id', storedUserId) 
            .order('name', { ascending: true });

        if (accountsError) throw accountsError;
        setAccounts(accountsData || []);

    } catch (error: any) {
        console.error('Error loading profile:', error.message);
        Alert.alert("Error", "Failed to load profile information.");
    } finally {
        setLoading(false);
    }
}

    const handleAccountSelect = async (accountId: string) => {
        try {
            // Update AsyncStorage
            await AsyncStorage.setItem('active_account_id', accountId);
            // Update local state to show the checkmark immediately
            setActiveAccountId(accountId);
            
            Alert.alert("Account Switched", "Your active account has been updated.");
            
            // Navigate to History to view transactions for this account
            router.push('/history');
        } catch (error) {
            console.error('Error switching account:', error);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Logout", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Logout", 
                style: "destructive", 
                onPress: async () => {
                    await supabase.auth.signOut();
                    await AsyncStorage.clear();
                    router.replace('/'); // Redirect to your Auth/Index screen
                }
            }
        ]);
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0F172A" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* User Info Header */}
                <View style={styles.header}>
                    
                    <Text style={styles.emailText}>{email || 'User'}</Text>
                    <View style={styles.badge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.badgeText}> Verified Account</Text>
                    </View>
                </View>

                {/* Accounts Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Accounts</Text>
                    {accounts.length > 0 ? (
                        accounts.map((acc) => {
                            const isActive = activeAccountId === acc.id.toString();
                            return (
                                <TouchableOpacity 
                                    key={acc.id} 
                                    style={[styles.accountCard, isActive && styles.activeCard]}
                                    onPress={() => handleAccountSelect(acc.id.toString())}
                                >
                                    <View style={styles.accountInfo}>
                                        <View style={[
                                            styles.typeIndicator, 
                                            { backgroundColor: acc.type === 'business' ? '#0F172A' : '#94A3B8' }
                                        ]} />
                                        <View>
                                            <Text style={styles.accountName}>{acc.name}</Text>
                                            <Text style={styles.accountType}>{acc.type}</Text>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.actionArea}>
                                        {isActive ? (
                                            <View style={styles.activeBadge}>
                                                <Text style={styles.activeText}>Active</Text>
                                                <Ionicons name="checkmark" size={16} color="#10B981" />
                                            </View>
                                        ) : (
                                            <Ionicons name="eye-outline" size={20} color="#CBD5E1" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <Text style={styles.emptyText}>No accounts linked.</Text>
                    )}
                </View>

                {/* Settings & Logout */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    
                    <TouchableOpacity style={styles.menuItem}>
                        <Ionicons name="notifications-outline" size={22} color="#0F172A" />
                        <Text style={styles.menuText}>Notifications</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem}>
                        <Ionicons name="shield-checkmark-outline" size={22} color="#0F172A" />
                        <Text style={styles.menuText}>Privacy & Security</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.menuItem, styles.logoutItem]} 
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                        <Text style={[styles.menuText, styles.logoutText]}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.versionText}>NanoTrack v1.0.2</Text>
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
    scrollContent: { paddingBottom: 40 },
    
    // Header
    header: { alignItems: 'center', paddingTop: 40, marginBottom: 40 },
    avatarPlaceholder: { 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        backgroundColor: '#F1F5F9', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    avatarText: { fontSize: 32, fontWeight: '900', color: '#0F172A' },
    emailText: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    badge: { 
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9', 
        paddingHorizontal: 12, 
        paddingVertical: 4, 
        borderRadius: 20, 
        marginTop: 8 
    },
    badgeText: { fontSize: 12, fontWeight: '600', color: '#64748B' },

    // Sections
    section: { paddingHorizontal: 25, marginBottom: 35 },
    sectionTitle: { 
        fontSize: 13, 
        fontWeight: '800', 
        color: '#94A3B8', 
        textTransform: 'uppercase', 
        letterSpacing: 1.2, 
        marginBottom: 15 
    },
    
    // Account Cards
    accountCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backgroundColor: '#F8FAFC', 
        padding: 16, 
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    activeCard: {
        borderColor: '#0F172A',
        backgroundColor: '#FFFFFF',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    accountInfo: { flexDirection: 'row', alignItems: 'center' },
    typeIndicator: { width: 4, height: 24, borderRadius: 2, marginRight: 15 },
    accountName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    accountType: { fontSize: 12, color: '#94A3B8', textTransform: 'capitalize' },
    
    actionArea: { flexDirection: 'row', alignItems: 'center' },
    activeBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F0FDF4', 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 8 
    },
    activeText: { fontSize: 12, fontWeight: '700', color: '#10B981', marginRight: 4 },

    // Menu Items
    menuItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 18, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9' 
    },
    menuText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B', marginLeft: 15 },
    logoutItem: { borderBottomWidth: 0, marginTop: 10 },
    logoutText: { color: '#EF4444' },
    
    emptyText: { color: '#94A3B8', fontStyle: 'italic' },
    versionText: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, fontWeight: '600', marginTop: 10 }
});