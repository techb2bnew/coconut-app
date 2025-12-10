/**
 * Create Order Screen
 * Form to create a new order with product type, quantity, addons, and logo upload
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  Alert,
  PermissionsAndroid,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import { fontFamily } from '../theme/fonts';
import Dropdown from '../components/Dropdown';
import supabase from '../config/supabase';

const CreateOrderScreen = ({ navigation }) => {
  const [productType, setProductType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [openerKit, setOpenerKit] = useState(false);
  const [specialEvent, setSpecialEvent] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [customerDeliveryAddress, setCustomerDeliveryAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Product type options
  const productTypeOptions = [
    { label: 'Case (9 pieces or 9 units)', value: 'case' },
  ];

  // Parse delivery addresses and get selected/default address
  const getSelectedAddressFromArray = (deliveryAddress) => {
    if (!deliveryAddress) return null;
    try {
      let addresses = [];
      
      // If it's a string, try to parse it
      if (typeof deliveryAddress === 'string') {
        try {
          const parsed = JSON.parse(deliveryAddress);
          // If it's an object with "address" key (old format)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.address) {
            return parsed.address;
          }
          // If it's already an array
          if (Array.isArray(parsed)) {
            addresses = parsed;
          }
        } catch {
          // If parsing fails, treat as plain string
          return deliveryAddress;
        }
      } else if (Array.isArray(deliveryAddress)) {
        addresses = deliveryAddress;
      } else if (typeof deliveryAddress === 'object' && deliveryAddress.address) {
        return deliveryAddress.address;
      }

      // Find selected address or return first one
      if (addresses.length > 0) {
        const selected = addresses.find(a => a.isSelected === true);
        if (selected) {
          // Format address
          const parts = [
            selected.street,
            selected.city,
            selected.state,
            selected.zipCode,
          ].filter(Boolean);
          return parts.join(', ');
        }
        // If no selected, use first address
        const first = addresses[0];
        if (first.street) {
          const parts = [
            first.street,
            first.city,
            first.state,
            first.zipCode,
          ].filter(Boolean);
          return parts.join(', ');
        }
      }
      return null;
    } catch (error) {
      console.error('Error parsing addresses:', error);
      // Fallback to string if it exists
      return typeof deliveryAddress === 'string' ? deliveryAddress : null;
    }
  };

  // Fetch customer ID and delivery address
  const fetchCustomerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        return { customerId: null, deliveryAddress: null };
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, delivery_address')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        return { customerId: null, deliveryAddress: null };
      }

      // Get selected/default address from array
      const selectedAddress = getSelectedAddressFromArray(customer?.delivery_address);

      return {
        customerId: customer?.id || null,
        deliveryAddress: selectedAddress,
      };
    } catch (error) {
      console.error('Error in fetchCustomerData:', error);
      return { customerId: null, deliveryAddress: null };
    }
  };

  // Calculate estimated delivery date (7 days from now)
  useEffect(() => {
    const calculateDeliveryDate = () => {
      const today = new Date();
      const deliveryDate = new Date(today);
      deliveryDate.setDate(deliveryDate.getDate() + 7);
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const dayName = days[deliveryDate.getDay()];
      const monthName = months[deliveryDate.getMonth()];
      const day = deliveryDate.getDate();
      const year = deliveryDate.getFullYear();
      
      setEstimatedDeliveryDate(`${dayName}, ${monthName} ${day}, ${year}`);
    };

    calculateDeliveryDate();
    
    // Fetch customer ID and delivery address
    const loadCustomerData = async () => {
      const { customerId: id, deliveryAddress } = await fetchCustomerData();
      setCustomerId(id);
      setCustomerDeliveryAddress(deliveryAddress || '');
    };
    loadCustomerData();
  }, []);

  // Request image picker permissions
  const requestImagePickerPermissions = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 33) {
        // Android 13+ - request READ_MEDIA_IMAGES
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Image Picker Permission',
            message: 'This app needs access to your photos to upload logo.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Android 12 and below - request READ_EXTERNAL_STORAGE
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Image Picker Permission',
            message: 'This app needs access to your photos to upload logo.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  };

  // Handle logo upload
  const handleLogoUpload = async () => {
    const hasPermission = await requestImagePickerPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant permission to access photos.');
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: true,
      maxWidth: 2048,
      maxHeight: 2048,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorMessage) {
        console.error('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setLogoFile(asset);
        setLogoPreview(asset.uri);
      }
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!productType) {
      newErrors.productType = 'Product Type is required';
    }

    if (!quantity || quantity.trim() === '') {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(quantity) || parseInt(quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a valid positive number';
    }

    if (specialEvent && !logoFile) {
      newErrors.logo = 'Logo is required for Special Event';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate order name
  const generateOrderName = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `ORD-${timestamp}-${random}`;
  };

  // Handle create order
  const handleCreateOrder = async () => {
    if (!validateForm()) {
      return;
    }

    if (!customerId) {
      Alert.alert('Error', 'Customer information not found. Please login again.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload logo if Special Event is enabled
      let logoUrl = null;
      if (specialEvent && logoFile) {
        try {
          const timestamp = Date.now();
          const filenameSafe = logoFile.fileName || `logo-${timestamp}.jpg`;
          const path = `order-logos/${timestamp}-${filenameSafe}`;
          const bucketName = 'logos';
          const fileExt = filenameSafe.split('.').pop() || 'jpg';
          const contentType = logoFile.type || `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

          if (logoFile.base64) {
            const base64Data = logoFile.base64;
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const fileData = bytes.buffer;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(path, fileData, {
                upsert: true,
                contentType: contentType,
                cacheControl: '3600',
              });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
              logoUrl = urlData.publicUrl;
            }
          } else if (logoFile.uri) {
            try {
              const response = await fetch(logoFile.uri);
              if (response.ok) {
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from(bucketName)
                  .upload(path, arrayBuffer, {
                    upsert: true,
                    contentType: contentType,
                    cacheControl: '3600',
                  });

                if (!uploadError && uploadData) {
                  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
                  logoUrl = urlData.publicUrl;
                }
              }
            } catch (uriError) {
              console.error('Error reading file from URI:', uriError);
            }
          }
        } catch (err) {
          console.error('Logo upload error:', err);
        }
      }

      // Step 2: Calculate delivery date (7 days from now)
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);
      deliveryDate.setHours(0, 0, 0, 0);

      // Step 3: Create order in database
      const orderData = {
        order_name: generateOrderName(),
        customer_id: customerId,
        quantity: parseInt(quantity),
        po_number: poNumber.trim() || null,
        delivery_address: customerDeliveryAddress || null,
        special_instructions: orderNotes.trim() || null,
        special_event_logo: (specialEvent && logoUrl) ? logoUrl : null,
        special_event_amount: specialEvent ? 150 : null,
        order_date: new Date().toISOString(),
        delivery_date: deliveryDate.toISOString(),
        status: 'Processing',
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        Alert.alert('Error', orderError.message || 'Failed to create order. Please try again.');
        setLoading(false);
        return;
      }

      Alert.alert('Success', 'Order created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation) {
              navigation.navigate('OrdersList');
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error in handleCreateOrder:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel? All changes will be lost.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: handleBack,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.cardBackground} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          
          {/* Product Type */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Product Type</Text>
            <Dropdown
              placeholder="Select product type"
              value={productType}
              onSelect={setProductType}
              options={productTypeOptions}
              errorMessage={errors.productType}
            />
          </View>

          {/* Quantity */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                placeholderTextColor={Colors.textSecondary}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            {errors.quantity && (
              <Text style={styles.errorText}>{errors.quantity}</Text>
            )}
          </View>

          {/* Coconut Opener Kit */}
          <View style={styles.formCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>Coconut Opener Kit</Text>
                <Text style={styles.toggleSubtitle}>Add opener kit (+$15.00)</Text>
              </View>
              <Switch
                value={openerKit}
                onValueChange={setOpenerKit}
                trackColor={{ false: '#E0E0E0', true: Colors.primaryPink }}
                thumbColor={Colors.cardBackground}
              />
            </View>
          </View>

          {/* Special Event - New Logo */}
          <View style={[styles.formCard, specialEvent && styles.specialEventCard]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>Special Event - New Logo</Text>
                <Text style={styles.toggleSubtitle}>For events with different branding</Text>
                <Text style={styles.toggleSubtitle}>One-time setup fee (+$150.00)</Text>
              </View>
              <Switch
                value={specialEvent}
                onValueChange={setSpecialEvent}
                trackColor={{ false: '#E0E0E0', true: Colors.primaryPink }}
                thumbColor={Colors.cardBackground}
              />
            </View>

            {specialEvent && (
              <View style={styles.logoUploadSection}>
                <Text style={styles.logoUploadTitle}>Upload New Logo</Text>
                
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Preferred: Vector files (SVG, AI, EPS) for best quality
                  </Text>
                  <Text style={styles.infoText}>
                    Also accepted: PNG, JPG, PDF (Max 5MB)
                  </Text>
                </View>

                <View style={styles.warningBox}>
                  <Icon name="warning-outline" size={20} color={Colors.error} />
                  <Text style={styles.warningText}>Screenshots not accepted</Text>
                </View>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleLogoUpload}
                  activeOpacity={0.8}>
                  {logoPreview ? (
                    <Image source={{ uri: logoPreview }} style={styles.logoPreview} />
                  ) : (
                    <>
                      <Icon name="cloud-upload-outline" size={32} color={Colors.primaryPink} />
                      <Text style={styles.uploadText}>Click to upload logo file</Text>
                    </>
                  )}
                </TouchableOpacity>
                {errors.logo && (
                  <Text style={styles.errorText}>{errors.logo}</Text>
                )}
              </View>
            )}
          </View>

          {/* PO Number */}
          <View style={styles.formCard}>
            <Text style={styles.label}>PO Number (Optional)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter PO number"
                placeholderTextColor={Colors.textSecondary}
                value={poNumber}
                onChangeText={setPoNumber}
              />
            </View>
          </View>

          {/* Order Notes */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Order Notes (Optional)</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any special instructions or notes for this order..."
                placeholderTextColor={Colors.textSecondary}
                value={orderNotes}
                onChangeText={setOrderNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Estimated Delivery Date */}
          <View style={styles.deliveryDateCard}>
            <Icon name="calendar-outline" size={24} color={Colors.success} />
            <View style={styles.deliveryDateContent}>
              <Text style={styles.deliveryDateLabel}>Estimated Delivery Date</Text>
              <Text style={styles.deliveryDateValue}>{estimatedDeliveryDate}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleCreateOrder}
            activeOpacity={0.8}
            disabled={loading}>
            <Text style={styles.confirmButtonText}>
              {loading ? 'Creating...' : 'Confirm Order'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primaryPink,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontFamily: fontFamily,
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  formCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  specialEventCard: {
    backgroundColor: Colors.lightPink,
    borderWidth: 1,
    borderColor: Colors.primaryPink,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 50,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  textAreaContainer: {
    minHeight: 100,
  },
  textArea: {
    paddingVertical: 12,
    minHeight: 100,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleContent: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 13,
    fontFamily: fontFamily,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoUploadSection: {
    marginTop: 16,
  },
  logoUploadTitle: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    fontFamily: fontFamily,
    color: '#1976D2',
    marginBottom: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    fontFamily: fontFamily,
    color: Colors.error,
    marginLeft: 8,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: Colors.primaryPink,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  logoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  uploadText: {
    fontSize: 14,
    fontFamily: fontFamily,
    color: Colors.primaryPink,
    marginTop: 8,
    fontWeight: '500',
  },
  deliveryDateCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveryDateContent: {
    marginLeft: 12,
    flex: 1,
  },
  deliveryDateLabel: {
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  deliveryDateValue: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: Colors.success,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fontFamily,
    color: Colors.error,
    marginTop: 4,
  },
  footer: {
    backgroundColor: Colors.primaryPink,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: Colors.cardBackground,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fontFamily,
    fontWeight: '600',
    color: Colors.primaryPink,
  },
});

export default CreateOrderScreen;

