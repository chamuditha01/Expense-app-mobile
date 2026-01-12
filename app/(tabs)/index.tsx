import { supabase } from '@/components/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 1. Import AsyncStorage
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const clearSession = async () => {
      try {
        await AsyncStorage.removeItem('user_id');
        await AsyncStorage.removeItem('active_account_id');
        // Optional: Sign out from Supabase as well
        await supabase.auth.signOut();
        console.log('✅ Local session cleared');
      } catch (e) {
        console.error('❌ Error clearing session', e);
      }
    };

    clearSession();
  }, []);

  // Helper to save user_id locally
  const saveUserIdLocally = async (userId: string) => {
    try {
      await AsyncStorage.setItem('user_id', userId);
      console.log('✅ User ID saved to AsyncStorage');
    } catch (e) {
      console.error('❌ Failed to save user_id to storage', e);
    }
  };

  async function handleEmailAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const userId = authData.user.id;

          // Save ID locally even on Signup
          await saveUserIdLocally(userId);

          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: userId, email: email }]);

          if (profileError) throw profileError;

          const { error: accountsError } = await supabase
            .from('accounts')
            .insert([
              { profile_id: userId, name: 'Personal', type: 'personal' },
              { profile_id: userId, name: 'Business 1', type: 'business' }
            ]);

          if (accountsError) throw accountsError;

          Alert.alert('Success', 'Account created! Please check your email for verification.');
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // 2. Save user_id to AsyncStorage on successful login
        if (signInData.user) {
          await saveUserIdLocally(signInData.user.id);
        }

        router.replace('/dashboard'); 
      }
    } catch (error: any) {
      console.error("Auth Task Error:", error);
      Alert.alert('Auth Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.logo}>💰 NanoTrack</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleEmailAuth} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setIsSignUp(!isSignUp)} 
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  innerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  logo: { fontSize: 36, fontWeight: '800', color: '#000', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
  inputContainer: { width: '100%', marginBottom: 20 },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: { 
    backgroundColor: '#000', 
    paddingVertical: 18, 
    width: '100%', 
    borderRadius: 12, 
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  switchButton: { marginTop: 25 },
  switchText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
});