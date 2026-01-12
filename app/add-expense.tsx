import { supabase } from '@/components/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator, Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';

export default function AddExpenseScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*', 
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
      }
    } catch (error) {
      Alert.alert("System Error", "The file picker is currently unavailable.");
    }
  };

  const handleUploadAndSave = async () => {
    setLoading(true);
    try {
      const accountId = await AsyncStorage.getItem('active_account_id');
      let billUrl = '';

      if (imageUri) {
        const data = new FormData();
        data.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'upload.jpg',
        } as any);
        data.append('upload_preset', 'expense_app'); 
        data.append('cloud_name', 'dxizf0lc5'); 

        const response = await fetch(
          'https://api.cloudinary.com/v1_1/dxizf0lc5/image/upload',
          { method: 'post', body: data }
        );

        const result = await response.json();
        if (result.error) throw new Error(result.error.message);
        billUrl = result.secure_url;
      }

      const { error: dbError } = await supabase.from('expenses').insert([{
        account_id: accountId,
        amount: parseFloat(amount),
        description: description,
        bill: billUrl 
      }]);

      if (dbError) throw dbError;
      router.replace('/dashboard');
    } catch (error: any) {
      Alert.alert('Upload Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>How much?</Text>
            <View style={styles.amountWrapper}>
                <Text style={styles.currencyPrefix}>Rs. </Text>
                <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
                />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>For what?</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Coffee, Rent, Groceries..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              autoFocus
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Attach receipt</Text>
            {imageUri ? (
              <View style={styles.previewCard}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeBadge}>
                   <Ionicons name="close-circle" size={24} color="#EF4444" />
                   <Text style={styles.removeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
                <TouchableOpacity style={styles.uploadCard} onPress={pickImage}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="camera" size={32} color="#0F172A" />
                  </View>
                  <Text style={styles.uploadTitle}>Snap or Upload</Text>
                  <Text style={styles.uploadSubtext}>Keep your records organized</Text>
                </TouchableOpacity>
            )}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* Header with Back Button and Progress */}
        {/* Header with Back Button and Progress */}
<View style={styles.header}>
    <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
        <Ionicons name="arrow-back" size={24} color="#0F172A" />
    </TouchableOpacity>
    
    <View style={styles.segmentedProgressContainer}>
        {[1, 2, 3].map((i) => (
            <View 
                key={i} 
                style={[
                    styles.progressSegment, 
                    step >= i ? styles.activeSegment : styles.inactiveSegment
                ]} 
            />
        ))}
    </View>
    
    <View style={{ width: 24 }} /> {/* Balancer for the back button */}
</View>

        {renderStep()}

        <View style={styles.footer}>
            {step < 3 ? (
            <TouchableOpacity 
                style={[styles.primaryButton, !amount && step === 1 && styles.disabledButton]} 
                onPress={() => setStep(step + 1)}
                disabled={!amount && step === 1}
            >
                <Text style={styles.buttonText}>Continue</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
            ) : (
            <TouchableOpacity 
                style={[styles.saveButton, loading && styles.disabledButton]} 
                onPress={handleUploadAndSave} 
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Expense</Text>}
            </TouchableOpacity>
            )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
 
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 75,
    paddingBottom: 10,
  },
  segmentedProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.6, // Adjust this to make segments wider or narrower
    gap: 8,    // Space between the segments
  },
  progressSegment: {
    height: 6,
    flex: 1, // Makes each part equal width
    borderRadius: 3,
  },
  activeSegment: {
    backgroundColor: '#0F172A',
  },
  inactiveSegment: {
    backgroundColor: '#F1F5F9',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    flex: 0.6,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 2,
  },
  stepContent: { 
    flex: 1, 
    paddingHorizontal: 30, 
    paddingTop: 60 
  },
  label: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: '#0F172A', 
    letterSpacing: -1,
    marginBottom: 40 
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 40,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 5,
  },
  amountInput: { 
    fontSize: 72, 
    fontWeight: '900', 
    color: '#0F172A',
    letterSpacing: -2,
  },
  descriptionInput: { 
    fontSize: 24, 
    fontWeight: '600',
    color: '#0F172A',
    borderBottomWidth: 2,
    borderColor: '#F1F5F9',
    paddingVertical: 15,
  },
  uploadCard: { 
    width: '100%', 
    height: 220, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed'
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  uploadTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  uploadSubtext: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  previewCard: { width: '100%', borderRadius: 24, overflow: 'hidden', elevation: 2 },
  previewImage: { width: '100%', height: 350, backgroundColor: '#F1F5F9' },
  removeBadge: { 
    position: 'absolute', 
    top: 15, 
    right: 15, 
    backgroundColor: '#FFF', 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  removeText: { marginLeft: 5, fontWeight: '700', color: '#EF4444' },
  footer: { padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  primaryButton: { 
    backgroundColor: '#0F172A', 
    height: 64, 
    borderRadius: 20, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  saveButton: { 
    backgroundColor: '#0F172A', 
    height: 64, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  disabledButton: { backgroundColor: '#E2E8F0' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800', marginRight: 8 }
});