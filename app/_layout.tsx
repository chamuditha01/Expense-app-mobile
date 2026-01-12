import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; // Import this 
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  
  // 1. Add state to track user presence
  const [hasUser, setHasUser] = useState<boolean | null>(null);

  useEffect(() => {
    checkUser();
  }, [pathname]); // Re-check on navigation to stay in sync

  const checkUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      setHasUser(!!userId); // Sets true if exists, false if null
    } catch (e) {
      setHasUser(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Page Content */}
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />

      {/* 2. Persistent Navbar - Only shows if hasUser is true */}
      {hasUser && (
        <SafeAreaView style={styles.navBar}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => router.push('/dashboard')}
          >
            <Ionicons 
              name={pathname === '/dashboard' ? "home" : "home-outline"} 
              size={24} 
              color={pathname === '/dashboard' ? "#000" : "#888"} 
            />
            <Text style={[styles.navText, pathname === '/dashboard' && styles.activeText]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => router.push('/profile')}
          >
            <Ionicons 
              name={pathname === '/profile' ? "person" : "person-outline"} 
              size={24} 
              color={pathname === '/profile' ? "#000" : "#888"} 
            />
            <Text style={[styles.navText, pathname === '/profile' && styles.activeText]}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => router.push('/add-expense')}
          >
            <View style={styles.addCircle}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => router.push('/settings')}
          >
            <Ionicons 
              name={pathname === '/settings' ? "settings" : "settings-outline"} 
              size={24} 
              color={pathname === '/settings' ? "#000" : "#888"} 
            />
            <Text style={[styles.navText, pathname === '/settings' && styles.activeText]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => router.push('/analytics')}
          >
            <Ionicons 
              name={pathname === '/analytics' ? "analytics" : "analytics-outline"} 
              size={24} 
              color={pathname === '/analytics' ? "#000" : "#888"} 
            />
            <Text style={[styles.navText, pathname === '/analytics' && styles.activeText]}>Analytics</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    height: 80,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 15,
    // Ensure the navbar sits on top if needed
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginTop: 4,
  },
  activeText: {
    color: '#000',
  },
  addCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  }
});