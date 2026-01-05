/**
 * Create Account Screen
 * Multi-step form with multiple sections and validation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import Input from '../components/Input';
import Button from '../components/Button';
import Dropdown from '../components/Dropdown';
import supabase from '../config/supabase';
import {
  validateEmail,
  validateOptionalEmail,
  validateRequired,
  validatePhone,
  validatePasswordMatch,
  validateMinLength,
} from '../utils/validation';

const CreateAccountScreen = ({ navigation }) => {
  // Industry options
  const industryOptions = [
    { label: 'Hotel', value: 'hotel' },
    { label: 'Restaurant', value: 'restaurant' },
    { label: 'Event Planner', value: 'event_planner' },
    { label: 'Catering Service', value: 'catering_service' },
    { label: 'Resort', value: 'resort' },
    { label: 'Bar/Lounge', value: 'bar_lounge' },
    { label: 'Other', value: 'other' },
  ];

  // Form 1: Company Information
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  // Form 2: Primary Contact Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Form 3: Alternate Contact Information
  const [alternateEmail1, setAlternateEmail1] = useState('');
  const [alternateEmail2, setAlternateEmail2] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');

  // Form 4: Delivery Information
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [zoneId, setZoneId] = useState(null); // UUID for zone from address
  const [zoneLoading, setZoneLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(true);

  // Form 5: Account Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form 6: Company Logo
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyLogoFile, setCompanyLogoFile] = useState(null);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Errors
  const [errors, setErrors] = useState({
    companyName: '',
    industry: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternateEmail1: '',
    alternateEmail2: '',
    alternatePhone: '',
    deliveryAddress: '',
    zone: '',
    password: '',
    confirmPassword: '',
  });

  const updateError = (field, value) => {
    setErrors((prev) => ({ ...prev, [field]: value }));
  };

  // Form 1 Validation
  const validateForm1 = () => {
    const companyNameError = validateRequired(companyName, 'Company');
    const industryError = validateRequired(industry, 'Industry');

    setErrors((prev) => ({
      ...prev,
      companyName: companyNameError,
      industry: industryError,
    }));

    return !companyNameError && !industryError;
  };

  // Form 2 Validation
  const validateForm2 = () => {
    const firstNameError = validateRequired(firstName, 'First Name');
    const lastNameError = validateRequired(lastName, 'Last Name');
    const emailError = validateEmail(email);
    const phoneError = validatePhone(phone);

    setErrors((prev) => ({
      ...prev,
      firstName: firstNameError,
      lastName: lastNameError,
      email: emailError,
      phone: phoneError,
    }));

    return !firstNameError && !lastNameError && !emailError && !phoneError;
  };

  // Form 3 Validation (Optional fields)
  const validateForm3 = () => {
    const alternateEmail1Error = validateOptionalEmail(alternateEmail1);
    const alternateEmail2Error = validateOptionalEmail(alternateEmail2);
    const alternatePhoneError = alternatePhone
      ? validatePhone(alternatePhone)
      : '';

    setErrors((prev) => ({
      ...prev,
      alternateEmail1: alternateEmail1Error,
      alternateEmail2: alternateEmail2Error,
      alternatePhone: alternatePhoneError,
    }));

    return !alternateEmail1Error && !alternateEmail2Error && !alternatePhoneError;
  };

  // Form 4 Validation
  const validateForm4 = () => {
    const deliveryAddressError = validateRequired(deliveryAddress, 'Delivery Address');

    setErrors((prev) => ({
      ...prev,
      deliveryAddress: deliveryAddressError,
    }));

    return !deliveryAddressError;
  };

  // Form 5 Validation
  const validateForm5 = () => {
    const passwordError = validateMinLength(password, 8, 'Password');
    const confirmPasswordError = validatePasswordMatch(password, confirmPassword);

    setErrors((prev) => ({
      ...prev,
      password: passwordError || (password.length < 8 ? 'Password must be at least 8 characters' : ''),
      confirmPassword: confirmPasswordError,
    }));

    return !passwordError && !confirmPasswordError;
  };

  // Detect zone from Google Places address details
  const detectZoneFromPlaceDetails = async (placeDetails) => {
    if (!placeDetails) return;

    setZoneLoading(true);
    try {
      // Extract address components from Google Places
      const addressComponents = placeDetails.address_components || [];
      const formattedAddress = placeDetails.formatted_address || '';
      
      // Extract zone information from address components
      // Try to find zone in different address component types
      let zoneInfo = null;

      // Method 1: Try to find zone from sublocality or neighborhood
      const zoneComponent = addressComponents.find(
        (component) => 
          component.types.includes('sublocality') ||
          component.types.includes('sublocality_level_1') ||
          component.types.includes('neighborhood') ||
          component.types.includes('administrative_area_level_3')
      );

      if (zoneComponent) {
        zoneInfo = zoneComponent.long_name;
        console.log('Zone found from address component:', zoneInfo);
      }

      // Method 2: Use postal code as zone identifier
      if (!zoneInfo) {
        const postalCodeComponent = addressComponents.find(
          (component) => component.types.includes('postal_code')
        );
        if (postalCodeComponent) {
          zoneInfo = postalCodeComponent.long_name;
          console.log('Using postal code as zone:', zoneInfo);
        }
      }

      // Method 3: Use city/locality if zone not found
      if (!zoneInfo) {
        const cityComponent = addressComponents.find(
          (component) => 
            component.types.includes('locality') || 
            component.types.includes('administrative_area_level_2')
        );
        if (cityComponent) {
          zoneInfo = cityComponent.long_name;
          console.log('Using city as zone:', zoneInfo);
        }
      }

      // Now query your database to find zone ID based on zoneInfo
      // You can query customers table to find existing zones or use a zone mapping
      if (zoneInfo) {
        // Option 1: Query customers table to find zone_id by zone name/code
        const { data: existingCustomer, error: customerError } = await supabase
          .from('customers')
          .select('delivery_zone')
          .or(`delivery_address.ilike.%${zoneInfo}%`)
          .limit(1)
          .single();

        if (!customerError && existingCustomer?.delivery_zone) {
          setZoneId(existingCustomer.delivery_zone);
          console.log('Zone ID found from existing customer:', existingCustomer.delivery_zone);
          return;
        }

        // Option 2: Call Supabase Edge Function to get zone ID
        // Uncomment and configure if you have an edge function
        /*
        const { data: zoneData, error: zoneError } = await supabase.functions.invoke('get-zone-id', {
          body: { zoneInfo, address: formattedAddress }
        });
        
        if (!zoneError && zoneData?.zoneId) {
          setZoneId(zoneData.zoneId);
          return;
        }
        */

        // Option 3: If you have a zone mapping, use it here
        // For now, we'll store zoneInfo and you can map it later
        console.log('Zone info extracted:', zoneInfo);
        console.log('Note: Implement zone ID mapping logic based on your zone structure');
      }

      // If zone ID not found, set to null
      // User can manually select zone if needed
      setZoneId(null);
    } catch (error) {
      console.error('Error detecting zone:', error);
      setZoneId(null);
    } finally {
      setZoneLoading(false);
    }
  };

  // Request permissions for image picker (Android)
  const requestImagePickerPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const androidVersion = Platform.Version;
        
        // For Android 13+ (API 33+), use READ_MEDIA_IMAGES
        if (androidVersion >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Photo Permission',
              message: 'App needs access to your photos to upload company logo',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // For Android 12 and below, use READ_EXTERNAL_STORAGE
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission',
              message: 'App needs access to your storage to upload company logo',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('Permission error:', err);
        // Try to proceed anyway - image picker might handle it
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  // Handle logo upload
  const handleLogoUpload = async () => {
    // Request permissions first (Android)
    if (Platform.OS === 'android') {
      const hasPermission = await requestImagePickerPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Photo permission is required to upload logo. Please grant permission in app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'OK', onPress: () => {} },
          ]
        );
        return;
      }
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048,
      includeBase64: true, // Enable base64 for easier upload
      selectionLimit: 1,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        let errorMessage = 'Failed to pick image';
        if (response.errorCode === 'permission') {
          errorMessage = 'Permission denied. Please grant photo permission in app settings.';
        } else if (response.errorMessage) {
          errorMessage = response.errorMessage;
        }
        Alert.alert('Error', errorMessage);
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        console.log('Image selected:', {
          uri: asset.uri,
          fileName: asset.fileName,
          type: asset.type,
          fileSize: asset.fileSize,
          hasBase64: !!asset.base64,
          base64Length: asset.base64 ? asset.base64.length : 0,
          allKeys: Object.keys(asset),
        });
        setCompanyLogo(asset.uri);
        setCompanyLogoFile(asset);
      }
    });
  };

  const handleCreateAccount = async () => {
    // Validate all forms
    const isForm1Valid = validateForm1();
    const isForm2Valid = validateForm2();
    const isForm3Valid = validateForm3();
    const isForm4Valid = validateForm4();
    const isForm5Valid = validateForm5();

    if (!isForm1Valid || !isForm2Valid || !isForm3Valid || !isForm4Valid || !isForm5Valid) {
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create user in Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: `${firstName} ${lastName}`,
            role: 'Customer',
            is_temporary_password: false,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        Alert.alert('Signup Error', authError.message || 'Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('Error', 'User account was not created. Please try again.');
        setLoading(false);
        return;
      }

      // Step 2: Upload logo if exists
      let logoUrl = null;
      if (companyLogoFile && authData.user) {
        try {
          console.log('Attempting logo upload...', {
            hasFile: !!companyLogoFile,
            hasBase64: !!companyLogoFile.base64,
            fileName: companyLogoFile.fileName,
            uri: companyLogoFile.uri,
          });

          const timestamp = Date.now();
          const filenameSafe = companyLogoFile.fileName || `logo-${timestamp}.jpg`;
          const path = `customer-logos/${timestamp}-${filenameSafe}`;
          const bucketName = 'logos';
          const fileExt = filenameSafe.split('.').pop() || 'jpg';
          const contentType = companyLogoFile.type || `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

          // Check if base64 is available
          if (companyLogoFile.base64) {
            console.log('Base64 data found, converting to ArrayBuffer...');
            // Convert base64 string to ArrayBuffer
            const base64Data = companyLogoFile.base64;
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const fileData = bytes.buffer;
            console.log('File data prepared, size:', fileData.byteLength, 'bytes');

            // Upload to Supabase Storage
            console.log('Uploading to Supabase Storage...', { bucketName, path });
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(path, fileData, { 
                upsert: true, 
                contentType: contentType,
                cacheControl: '3600',
              });

            if (uploadError) {
              console.error('Logo upload error details:', {
                message: uploadError.message,
                statusCode: uploadError.statusCode,
                error: uploadError,
              });
              // RLS policy error - logo upload failed but account creation will continue
              logoUrl = null;
            } else if (uploadData) {
              console.log('Upload successful, getting public URL...', uploadData);
              const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
              logoUrl = urlData.publicUrl;
              console.log('Logo uploaded successfully! URL:', logoUrl);
            } else {
              console.log('Upload data is null');
              logoUrl = null;
            }
          } else {
            console.log('Base64 data not available in companyLogoFile:', {
              keys: Object.keys(companyLogoFile),
              hasUri: !!companyLogoFile.uri,
            });
            // Try to read from URI as fallback
            if (companyLogoFile.uri) {
              console.log('Attempting to read file from URI:', companyLogoFile.uri);
              try {
                const response = await fetch(companyLogoFile.uri);
                if (response.ok) {
                  const blob = await response.blob();
                  const arrayBuffer = await blob.arrayBuffer();
                  
                  console.log('File read from URI, uploading...');
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
                    console.log('Logo uploaded successfully from URI! URL:', logoUrl);
                  } else {
                    console.error('Upload from URI failed:', uploadError);
                    logoUrl = null;
                  }
                } else {
                  console.log('Failed to read file from URI, status:', response.status);
                  logoUrl = null;
                }
              } catch (uriError) {
                console.error('Error reading file from URI:', uriError);
                logoUrl = null;
              }
            } else {
              logoUrl = null;
            }
          }
        } catch (err) {
          console.error('Logo upload exception:', err);
          logoUrl = null;
        }
      } else {
        console.log('Logo upload skipped:', {
          hasFile: !!companyLogoFile,
          hasUser: !!authData.user,
        });
      }

      // Step 3: Insert customer data into customers table
      const customerData = {
        company_name: companyName,
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        phone: phone,
        delivery_address: deliveryAddress,
        industry: industry,
        delivery_zone: zoneId || null, // Use UUID instead of string
        zoneCity: null, // Can be set if needed
        created_by_email: null, // Mobile app signups don't have admin email
        alternateEmail1: alternateEmail1 || null,
        alternateEmail2: alternateEmail2 || null,
        alternatePhone: alternatePhone || null,
        companyLogo: logoUrl,
        notes: null,
        password: password, // Store password (admin uses temp password, mobile uses user's password)
        status: 'active',
        franchise_id: null, // Mobile app signups don't have franchise_id
      };
      console.log('customerData', customerData);
      const { error: insertError } = await supabase.from('customers').insert(customerData);

      if (insertError) {
        console.error('Error inserting customer:', insertError);
        
        // If customer insert fails, try to delete the auth user
        await supabase.auth.admin.deleteUser(authData.user.id).catch(console.error);
        
        Alert.alert('Error', insertError.message || 'Failed to save customer data. Please try again.');
        setLoading(false);
        return;
      }

      // Success!
      const logoMessage = logoUrl 
        ? 'Account created successfully with logo! You can now login.'
        : companyLogoFile
        ? 'Account created successfully! Note: Logo upload failed (storage permissions issue). You can upload logo later from your profile. You can now login.'
        : 'Account created successfully! You can now login.';
      
      Alert.alert(
        'Success',
        logoMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              if (navigation) {
                navigation.navigate('Login');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Unexpected error during signup:', error);
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          bounces={true}>
          {/* Header Section - Full Width */}
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Create New Account</Text>
            <Text style={styles.headerSubtitle}>
              Enter your customer information to get started
            </Text>
          </View>

          {/* Form 1: Company Information */}
          <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Company Information</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Input
                    label="Company Name"
                    placeholder="Enter company name"
                    value={companyName}
                    onChangeText={(text) => {
                      setCompanyName(text);
                      if (errors.companyName) {
                        updateError('companyName', validateRequired(text, 'Company Name'));
                      }
                    }}
                    errorMessage={errors.companyName}
                    required
                    style={styles.inputRow}
                  />
                </View>
                <View style={[styles.halfWidth]}>
                  <Dropdown
                    label="Industry"
                    placeholder="Select..."
                    value={industry}
                    onSelect={(value) => {
                      setIndustry(value);
                      if (errors.industry) {
                        updateError('industry', validateRequired(value, 'Industry'));
                      }
                    }}
                    options={industryOptions}
                    errorMessage={errors.industry}
                    required
                    style={styles.inputRow}
                  />
                </View>
              </View>
          </View>

          {/* Form 2: Primary Contact Information */}
          <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Primary Contact Information</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Input
                    label="Contact First Name"
                    placeholder="Enter first name"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (errors.firstName) {
                        updateError('firstName', validateRequired(text, 'First Name'));
                      }
                    }}
                    errorMessage={errors.firstName}
                    required
                    style={styles.inputRow}
                  />
                </View>
                <View style={[styles.halfWidth]}>
                  <Input
                    label="Contact Last Name"
                    placeholder="Enter last name"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (errors.lastName) {
                        updateError('lastName', validateRequired(text, 'Last Name'));
                      }
                    }}
                    errorMessage={errors.lastName}
                    required
                    style={styles.inputRow}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Input
                    label="Email"
                    placeholder="email@example.com"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) {
                        updateError('email', validateEmail(text));
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    errorMessage={errors.email}
                    required
                    icon={<Icon name="mail-outline" size={20} color={Colors.textSecondary} />}
                    iconPosition="right"
                    style={styles.inputRow}
                  />
                </View>
                <View style={[styles.halfWidth]}>
                  <Input
                    label="Phone Number"
                    placeholder="+1 (305) 555-0100"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (errors.phone) {
                        updateError('phone', validatePhone(text));
                      }
                    }}
                    keyboardType="phone-pad"
                    errorMessage={errors.phone}
                    required
                    style={styles.inputRow}
                  />
                </View>
              </View>
          </View>

          {/* Form 3: Alternate Contact Information */}
          <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Alternate Contact Information</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Input
                    label="Alternate Email 1"
                    placeholder="alternate1@example.com"
                    value={alternateEmail1}
                    onChangeText={(text) => {
                      setAlternateEmail1(text);
                      if (errors.alternateEmail1) {
                        updateError('alternateEmail1', validateOptionalEmail(text));
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    errorMessage={errors.alternateEmail1}
                    icon={<Icon name="mail-outline" size={20} color={Colors.textSecondary} />}
                    iconPosition="right"
                    style={styles.inputRow}
                  />
                </View>
                <View style={[styles.halfWidth]}>
                  <Input
                    label="Alternate Email 2"
                    placeholder="alternate2@example.com"
                    value={alternateEmail2}
                    onChangeText={(text) => {
                      setAlternateEmail2(text);
                      if (errors.alternateEmail2) {
                        updateError('alternateEmail2', validateOptionalEmail(text));
                      }
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    errorMessage={errors.alternateEmail2}
                    icon={<Icon name="mail-outline" size={20} color={Colors.textSecondary} />}
                    iconPosition="right"
                    style={styles.inputRow}
                  />
                </View>
              </View>

              <Input
                label="Alternate Phone"
                placeholder="+1 (305) 555-0200"
                value={alternatePhone}
                onChangeText={(text) => {
                  setAlternatePhone(text);
                  if (errors.alternatePhone) {
                    updateError('alternatePhone', text ? validatePhone(text) : '');
                  }
                }}
                keyboardType="phone-pad"
                errorMessage={errors.alternatePhone}
              />
          </View>

          {/* Form 4: Delivery Information */}
          <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Delivery Information</Text>

              <View style={styles.inputWrapper}>
                <Text style={[TextStyles.label, styles.label]}>
                  Delivery Address <Text style={styles.required}>*</Text>
                </Text>
                <GooglePlacesAutocomplete
                  placeholder="Enter full address"
                  onPress={(data, details = null) => {
                    console.log('Address selected:', data, details);
                    const fullAddress = data.description || data.structured_formatting?.main_text || '';
                    if (fullAddress) {
                      setDeliveryAddress(fullAddress);
                      
                      // Hide suggestions after a short delay to allow onPress to complete
                      setTimeout(() => {
                        setShowAddressSuggestions(false);
                      }, 100);
                      
                      // Clear error if any
                      if (errors.deliveryAddress) {
                        updateError('deliveryAddress', '');
                      }
                      
                      // Detect zone from place details
                      if (details) {
                        detectZoneFromPlaceDetails(details);
                      } else if (fullAddress) {
                        // If details not provided, still try to detect zone from address
                        setTimeout(() => {
                          detectZoneFromPlaceDetails({ formatted_address: fullAddress });
                        }, 200);
                      }
                    }
                  }}
                  query={{
                    key: 'AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE', // TODO: Replace with your Google Places API key
                    language: 'en',
                    components: 'country:us', // Adjust based on your country
                  }}
                  fetchDetails={true}
                  enablePoweredByContainer={false}
                  debounce={300}
                  listViewDisplayed={showAddressSuggestions ? 'auto' : 'none'}
                  onFocus={() => setShowAddressSuggestions(true)}
                  onBlur={() => {
                    // Delay hiding suggestions to allow onPress to fire
                    setTimeout(() => setShowAddressSuggestions(false), 200);
                  }}
                  flatListProps={{
                    nestedScrollEnabled: true,
                    scrollEnabled: true,
                  }}
                  styles={{
                    container: {
                      flex: 0,
                      zIndex: 1000,
                    },
                    textInputContainer: {
                      backgroundColor: Colors.cardBackground,
                      borderRadius: 12,
                      borderWidth: errors.deliveryAddress ? 1.5 : 1,
                      borderColor: errors.deliveryAddress ? Colors.error : Colors.borderLight,
                      paddingHorizontal: 0,
                    },
                    textInput: {
                      fontSize: 14,
                      fontFamily: fontFamilyBody,
                      color: Colors.textPrimary,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      minHeight: 50,
                    },
                    predefinedPlacesDescription: {
                      color: Colors.textSecondary,
                    },
                    listView: {
                      backgroundColor: Colors.cardBackground,
                      borderRadius: 8,
                      marginTop: 4,
                      elevation: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      maxHeight: 200,
                    },
                    row: {
                      backgroundColor: Colors.cardBackground,
                      padding: 12,
                    },
                    separator: {
                      height: 1,
                      backgroundColor: Colors.borderLight,
                    },
                  }}
                  textInputProps={{
                    value: deliveryAddress,
                    onChangeText: (text) => {
                      setDeliveryAddress(text);
                      setShowAddressSuggestions(true); // Show suggestions when typing
                      if (errors.deliveryAddress) {
                        updateError('deliveryAddress', validateRequired(text, 'Delivery Address'));
                      }
                    },
                    onBlur: () => {
                      // Hide suggestions when input loses focus
                      setTimeout(() => setShowAddressSuggestions(false), 200);
                    },
                  }}
                />
                {errors.deliveryAddress ? (
                  <Text style={styles.errorText}>{errors.deliveryAddress}</Text>
                ) : null}
              </View>

              {/* <View style={styles.inputWrapper}>
                <Text style={[TextStyles.label, styles.label]}>Zone</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={zoneLoading ? "Detecting zone..." : zoneId ? "Zone detected" : "Zone will be auto-detected"}
                    placeholderTextColor={Colors.textSecondary}
                    value={zoneId ? `Zone ID: ${zoneId}` : ''}
                    editable={false}
                  />
                  {zoneLoading && (
                    <Icon name="hourglass" size={16} color={Colors.textSecondary} style={styles.loadingIcon} />
                  )}
                  {zoneId && !zoneLoading && (
                    <Icon name="checkmark-circle" size={20} color={Colors.success || Colors.primaryPink} style={styles.loadingIcon} />
                  )}
                </View>
                <Text style={styles.helperText}>
                  Zone will be auto-detected based on your address
                </Text>
              </View> */}
          </View>

          {/* Form 5: Account Security */}
          <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Account Security</Text>

              <Input
                label="Password"
                placeholder="Enter password (min. 8 characters)"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    const error = validateMinLength(text, 8, 'Password');
                    updateError('password', error || (text.length < 8 ? 'Password must be at least 8 characters' : ''));
                  }
                }}
                secureTextEntry
                errorMessage={errors.password}
                required
              />

              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    updateError('confirmPassword', validatePasswordMatch(password, text));
                  }
                }}
                secureTextEntry
                errorMessage={errors.confirmPassword}
                required
              />
          </View>

          {/* Form 6: Company Logo */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Company Logo (Optional)</Text>

            {/* Information Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Preferred: Vector files (SVG, AI, EPS) for best quality
              </Text>
              <Text style={styles.infoText}>
                Also accepted: PNG, JPG, PDF (Max 5MB)
              </Text>
              <View style={styles.warningRow}>
                <Icon name="warning" size={16} color={Colors.warning} />
                <Text style={styles.warningText}>Screenshots not accepted</Text>
              </View>
            </View>

            {/* Upload Area */}
            <TouchableOpacity 
              style={styles.uploadArea}
              onPress={handleLogoUpload}
              disabled={loading}>
              {companyLogo ? (
                <View style={styles.logoPreview}>
                  <Image source={{ uri: companyLogo }} style={styles.logoImage} />
                  <TouchableOpacity
                    style={styles.removeLogo}
                    onPress={() => {
                      setCompanyLogo(null);
                      setCompanyLogoFile(null);
                    }}
                    disabled={loading}>
                    <Icon name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.uploadIconContainer}>
                    <Icon name="arrow-up" size={48} color={Colors.textSecondary} />
                  </View>
                  <Text style={styles.uploadText}>Upload Company Logo</Text>
                  <Text style={styles.fileTypesText}>SVG, AI, EPS, PNG, JPG, PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Create Account"
              onPress={handleCreateAccount}
              variant="primary"
              style={styles.createButton}
              loading={loading}
              disabled={loading}
            />
            <Button
              title="Back to Login"
              onPress={handleBack}
              variant="outline"
              style={styles.backToLoginButton}
              disabled={loading}
            />
          </View>
        </ScrollView>
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
  scrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  headerSection: {
    backgroundColor: Colors.primaryPink,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center', 
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.cardBackground,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#cccccc',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.textPrimary,
    marginBottom: 16,
  }, 
  halfWidth: {
    flex: 1, 
    marginBottom: 12,

  },
  halfWidthLast: {
    marginRight: 0,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  dropdownIcon: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  inputRow: {
    marginBottom: 0,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  createButton: {
    marginBottom: 16,
  },
  backToLoginButton: {
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoText: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.error,
    marginLeft: 6,
    fontWeight: '500',
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    minHeight: 180,
  },
  uploadIconContainer: {
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: fontFamilyHeading,
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  fileTypesText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  logoPreview: {
    width: '100%',
    height: 150,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    borderRadius: 8,
  },
  removeLogo: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
  },
  zoneDropdown: {
    marginBottom: 0,
  },
  loadingIcon: {
    marginLeft: 8,
  },
});

export default CreateAccountScreen;
