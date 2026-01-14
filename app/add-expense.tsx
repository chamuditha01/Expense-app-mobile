import { supabase } from '@/components/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera';
// Import ImagePicker
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';

// --- CONFIGURATION ---
const OPENAI_API_KEY = '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'; 
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dxizf0lc5/image/upload';
const UPLOAD_PRESET = 'expense_app';

interface Account {
  id: string;
  name: string;
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();

  const [cloudinaryUrl, setCloudinaryUrl] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [shopName, setShopName] = useState('');
  const [listItems, setListItems] = useState([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (step === 3) fetchUserAccounts();
  }, [step]);

  async function fetchUserAccounts() {
    try {
      const profileId = await AsyncStorage.getItem('user_id');
      const { data, error } = await supabase.from('accounts').select('id, name').eq('profile_id', profileId);
      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0) setSelectedAccountId(data[0].id);
    } catch (e) { console.error(e); }
  }

  const handleSave = async () => {
    if (!selectedAccountId) return Alert.alert("Error", "Please select an account.");
    if (!amount || isNaN(parseFloat(amount))) return Alert.alert("Error", "Please enter a valid amount.");
    
    setLoading(true);
    try {
      const { error } = await supabase.from('expenses_duplicate').insert([{
        account_id: selectedAccountId,
        amount: parseFloat(amount),
        description: description || "No description",
        shop_name: shopName || (isManual ? "Manual Entry" : "Unknown Store"),
        bill: cloudinaryUrl,
        list_items: listItems,
        date_time: new Date().toISOString()
      }]);
      if (error) throw error;
      Alert.alert("Success", "Expense saved successfully!");
      router.replace('/dashboard');
    } catch (e: any) { 
      Alert.alert("Error", e.message); 
    } finally { setLoading(false); }
  };

  const handleStartCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permission Required", "We need camera access to scan receipts.");
        return;
      }
    }
    setShowCamera(true);
  };

  // --- NEW GALLERY SELECT FUNCTION ---
  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setIsManual(false);
      processWithAI(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        setShowCamera(false);
        if (photo) {
          setIsManual(false);
          processWithAI(photo.uri);
        }
      } catch (e) { Alert.alert("Error", "Failed to capture photo."); }
    }
  };

const processWithAI = async (uri: string) => {
  setLoading(true);
  try {
    // 1. Upload to Cloudinary (Keep your existing logic)
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type: 'image/jpeg',
      name: 'document.jpg',
    } as any);
    formData.append('upload_preset', UPLOAD_PRESET);

    const uploadRes = await axios.post(CLOUDINARY_URL, formData, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
    const uploadedUrl = uploadRes.data.secure_url;
    setCloudinaryUrl(uploadedUrl);

    // 2. Enhanced AI Prompt for all financial documents
    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a financial data extraction expert. You analyze receipts, bank transfer slips, and utility bills."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Extract data from this image (could be a receipt, bank slip, or bill). 
                Rules:
                1. 'shop_name': Use the merchant name, bank name, or biller name.
                2. 'total_amount': Find the final transaction amount.
                3. 'items': For receipts, list items. For bank slips, create one item describing the transfer.
                Return ONLY JSON: { "shop_name": "string", "total_amount": number, "items": [{ "name": "string", "price": number }] }` 
              },
              { type: "image_url", image_url: { url: uploadedUrl } }
            ],
          },
        ],
        response_format: { type: "json_object" }
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    const data = JSON.parse(aiRes.data.choices[0].message.content);
    
    // Fallback logic for missing data
    setAmount(data.total_amount?.toString() || '');
    setShopName(data.shop_name || 'Unknown Document');
    setListItems(data.items || []);
    setStep(2);
    
  } catch (error) {
    console.error("AI Error Details:", error);
    Alert.alert("Analysis Failed", "We couldn't read the document clearly. Please enter details manually.");
    setIsManual(true);
    setStep(2);
  } finally {
    setLoading(false);
  }
};

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.closeCamera} onPress={() => setShowCamera(false)}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <View style={styles.captureButtonContainer}>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  const renderStep = () => {
    if (loading) return (
      <View style={styles.center}><ActivityIndicator size="large" color="#0F172A" /><Text style={styles.loadingText}>Processing...</Text></View>
    );

    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Add Expense</Text>
            
            <View style={styles.uploadRow}>
              <TouchableOpacity style={[styles.uploadCard, { flex: 1 }]} onPress={handleStartCamera}>
                <View style={styles.iconCircle}><Ionicons name="camera" size={32} color="#0F172A" /></View>
                <Text style={styles.uploadTitle}>Scan Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.uploadCard, { flex: 1, marginLeft: 15 }]} onPress={pickImageFromGallery}>
                <View style={styles.iconCircle}><Ionicons name="images" size={32} color="#0F172A" /></View>
                <Text style={styles.uploadTitle}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.skipButton} onPress={() => { setIsManual(true); setStep(2); }}>
              <Text style={styles.skipButtonText}>Skip & Enter Manually</Text>
              <Ionicons name="arrow-forward" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Purpose</Text>
            <TextInput style={styles.descriptionInput} placeholder="What was this for?" value={description} onChangeText={setDescription} autoFocus />
          </View>
        );
      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Review</Text>
            <View style={styles.formalReviewContainer}>
              <View style={styles.magazineLabelRow}>
                <Text style={styles.magazineLabel}>Merchant</Text>
                <Text style={styles.magazineLabel}>Total Amount</Text>
              </View>
              <View style={styles.magazineValueRow}>
                <TextInput style={styles.shopInputFormal} value={shopName} onChangeText={setShopName} placeholder="Store" />
                <View style={styles.amountWrapper}>
                   <Text style={styles.currencyPrefix}>Rs.</Text>
                   <TextInput style={styles.amountInputFormal} value={amount} onChangeText={setAmount} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.formalDivider} />
            </View>

            <Text style={styles.sectionTitle}>Select Account</Text>
            <View style={styles.accountRow}>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id} style={[styles.accBtn, selectedAccountId === acc.id && styles.accBtnActive]} onPress={() => setSelectedAccountId(acc.id)}>
                  <Text style={[styles.accBtnText, selectedAccountId === acc.id && {color: '#FFF'}]}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {listItems.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Items Extracted</Text>
                <View style={styles.itemsBox}>
                  {listItems.map((item: any, i) => (
                    <View key={i} style={[styles.lineItem, i === listItems.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>Rs. {item.price}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.segmentedProgress}>
            {[1, 2, 3].map(i => (
              <View key={i} style={[styles.progressSeg, step >= i ? styles.activeSeg : styles.inactiveSeg]} />
            ))}
          </View>
        </View>
        {renderStep()}
        {!loading && step > 1 && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryButton} onPress={step === 3 ? handleSave : () => setStep(step + 1)}>
              <Text style={styles.buttonText}>{step === 3 ? "Save Expense" : "Continue"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60 },
  segmentedProgress: { flexDirection: 'row', flex: 0.6, gap: 8, marginLeft: 'auto' },
  progressSeg: { height: 6, flex: 1, borderRadius: 3 },
  activeSeg: { backgroundColor: '#0F172A' },
  inactiveSeg: { backgroundColor: '#F1F5F9' },
  stepContent: { flex: 1, paddingHorizontal: 30, paddingTop: 40 },
  label: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginBottom: 30 },
  
  // UPDATED UPLOAD LAYOUT
  uploadRow: { flexDirection: 'row', width: '100%' },
  uploadCard: { height: 160, backgroundColor: '#F8FAFC', borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  uploadTitle: { fontWeight: '700', color: '#0F172A', fontSize: 13 },
  skipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25 },
  skipButtonText: { fontSize: 14, fontWeight: '700', color: '#64748B', marginRight: 8 },
  descriptionInput: { fontSize: 24, fontWeight: '600', borderBottomWidth: 2, borderColor: '#F1F5F9', paddingVertical: 15 },
  formalReviewContainer: { marginBottom: 30, marginTop: 10 },
  magazineLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  magazineLabel: { fontSize: 10, fontWeight: '800', color: '#A1A1AA', letterSpacing: 1.5, textTransform: 'uppercase' },
  magazineValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  shopInputFormal: { fontSize: 22, fontWeight: '800', color: '#000', flex: 1, padding: 0 },
  amountWrapper: { flexDirection: 'row', alignItems: 'baseline' },
  currencyPrefix: { fontSize: 16, fontWeight: '700', color: '#000', marginRight: 4 },
  amountInputFormal: { fontSize: 32, fontWeight: '900', color: '#000', textAlign: 'right', letterSpacing: -1, padding: 0, minWidth: 100 },
  formalDivider: { height: 1, backgroundColor: '#F4F4F5', marginTop: 15 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginTop: 25, marginBottom: 15 },
  accountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9' },
  accBtnActive: { backgroundColor: '#0F172A' },
  accBtnText: { fontWeight: '700', color: '#64748B' },
  footer: { padding: 25 },
  primaryButton: { backgroundColor: '#0F172A', height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 20, fontWeight: '600', color: '#64748B' },
  itemsBox: { backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  itemName: { fontSize: 15, fontWeight: '500', color: '#334155', flex: 1, paddingRight: 10 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#0F172A', fontVariant: ['tabular-nums'] },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', padding: 40 },
  closeCamera: { alignSelf: 'flex-start', marginTop: 20 },
  captureButtonContainer: { alignSelf: 'center', marginBottom: 20 },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', borderWidth: 5, borderColor: '#ccc' },
});