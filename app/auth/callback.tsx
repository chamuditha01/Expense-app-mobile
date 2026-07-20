import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

// This screen exists only so Expo Router has a matching route for the
// OAuth redirect URL (expenseapp://auth/callback). The actual session
// handling happens in AuthScreen's handleGoogleSignIn, which intercepts
// the same URL via WebBrowser.openAuthSessionAsync and then calls
// router.replace('/dashboard') once the session is set. This screen
// just avoids a flash of the "unmatched route" screen in between.
export default function AuthCallback() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});