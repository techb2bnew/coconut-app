/**
 * Add Address Modal Component
 * Modal for adding/editing delivery address
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Colors from '../theme/colors';
import Input from '../components/Input';
import Button from '../components/Button';
import { validateRequired } from '../utils/validation';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE';

// NEW props: initialValues, isEditing
const AddAddressModal = ({ visible, onClose, onSave, initialValues, isEditing }) => {
  const [addressLabel, setAddressLabel] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isProcessingAddress, setIsProcessingAddress] = useState(false);
  const [errors, setErrors] = useState({
    addressLabel: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const updateError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  // ✅ Prefill when modal opens (Edit mode)
  useEffect(() => {
    if (!visible) return;

    setAddressLabel(initialValues?.label || '');
    setStreetAddress(initialValues?.street || '');
    setCity(initialValues?.city || '');
    setState(initialValues?.state || '');
    setZipCode(initialValues?.zipCode || '');
    setDeliveryNotes(initialValues?.notes || '');

    setErrors({
      addressLabel: '',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
    });

    // prevent list opening on edit load
    setShowAddressSuggestions(false);
    setIsProcessingAddress(false);
  }, [visible, initialValues]);

  // Parse address components from Google Places details
  const parseAddressDetails = (details) => {
    if (!details || !details.address_components) return;

    const addressComponents = details.address_components || [];

    const streetNumber =
      addressComponents.find((c) => c.types.includes('street_number'))?.long_name || '';
    const route =
      addressComponents.find((c) => c.types.includes('route'))?.long_name || '';

    const fullStreet = `${streetNumber} ${route}`.trim();
    if (fullStreet) {
      setStreetAddress(fullStreet);
    } else {
      setStreetAddress(details.formatted_address || details.name || '');
    }

    const cityComponent = addressComponents.find(
      (c) => c.types.includes('locality') || c.types.includes('administrative_area_level_2')
    );
    if (cityComponent) setCity(cityComponent.long_name);

    const stateComponent = addressComponents.find((c) =>
      c.types.includes('administrative_area_level_1')
    );
    if (stateComponent) setState(stateComponent.short_name || stateComponent.long_name);

    const zipComponent = addressComponents.find((c) => c.types.includes('postal_code'));
    if (zipComponent) setZipCode(zipComponent.long_name);
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    const labelError = validateRequired(addressLabel, 'Address Label');
    if (labelError) {
      newErrors.addressLabel = labelError;
      isValid = false;
    }

    const streetError = validateRequired(streetAddress, 'Street Address');
    if (streetError) {
      newErrors.streetAddress = streetError;
      isValid = false;
    }

    const cityError = validateRequired(city, 'City');
    if (cityError) {
      newErrors.city = cityError;
      isValid = false;
    }

    const stateError = validateRequired(state, 'State');
    if (stateError) {
      newErrors.state = stateError;
      isValid = false;
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return isValid;
  };

  const resetForm = () => {
    setAddressLabel('');
    setStreetAddress('');
    setCity('');
    setState('');
    setZipCode('');
    setDeliveryNotes('');
    setErrors({
      addressLabel: '',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
    });
    setShowAddressSuggestions(false);
    setIsProcessingAddress(false);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const addressData = {
        label: addressLabel.trim(),
        street: streetAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        notes: deliveryNotes.trim() || null,
      };

      if (onSave) {
        await onSave(addressData);
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Address' : 'Add New Address'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEditing
                    ? 'Update the details for this delivery address.'
                    : 'Enter the details for your new delivery address.'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Street Address with Google Places Autocomplete */}
            <View style={styles.addressAutocompleteWrapper}>
              <View style={styles.addressAutocompleteContainer}>
                <Text style={styles.inputLabel}>
                  Street Address <Text style={styles.required}>*</Text>
                </Text>

                <GooglePlacesAutocomplete
                  placeholder="Enter street address"
                  onPress={(data, details = null) => {
                    if (isProcessingAddress) return;

                    setIsProcessingAddress(true);

                    const fullAddress =
                      data.description || data.structured_formatting?.main_text || '';

                    if (fullAddress) {
                      setStreetAddress(fullAddress);
                      updateError('streetAddress', '');

                      if (details) parseAddressDetails(details);

                      setShowAddressSuggestions(false);

                      setTimeout(() => setIsProcessingAddress(false), 500);
                    } else {
                      setIsProcessingAddress(false);
                    }
                  }}
                  query={{
                    key: GOOGLE_PLACES_API_KEY,
                    language: 'en',
                    components: 'country:us',
                  }}
                  fetchDetails
                  enablePoweredByContainer={false}
                  debounce={300}
                  listViewDisplayed={showAddressSuggestions ? 'auto' : false}
                  onFocus={() => setShowAddressSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowAddressSuggestions(false), 300);
                  }}
                  textInputProps={{
                    value: streetAddress,
                    onChangeText: (text) => {
                      setStreetAddress(text);
                      updateError('streetAddress', '');
                      if (text.length > 0) setShowAddressSuggestions(true);
                      else setShowAddressSuggestions(false);
                    },
                    placeholder: 'Enter street address',
                    placeholderTextColor: Colors.textSecondary,
                  }}
                  styles={{
                    container: { flex: 0, zIndex: 1000 },
                    textInputContainer: {
                      backgroundColor: Colors.cardBackground,
                      borderRadius: 12,
                      borderWidth: errors.streetAddress ? 1.5 : 1,
                      borderColor: errors.streetAddress ? Colors.error : Colors.borderLight,
                      paddingHorizontal: 0,
                    },
                    textInput: {
                      fontSize: 14,
                      fontFamily: fontFamilyBody,
                      color: Colors.textPrimary,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      minHeight: 36,
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
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 99999,
                      overflow: 'hidden',
                    },
                    row: { backgroundColor: Colors.cardBackground, padding: 12 },
                    separator: { height: 1, backgroundColor: Colors.borderLight },
                  }}
                />

                {errors.streetAddress ? (
                  <Text style={styles.errorText}>{errors.streetAddress}</Text>
                ) : null}
              </View>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <Input
                label="Address Label"
                placeholder="e.g., Home, Office, Warehouse"
                value={addressLabel}
                onChangeText={(text) => {
                  setAddressLabel(text);
                  updateError('addressLabel', '');
                }}
                errorMessage={errors.addressLabel}
                required
                inputStyle={styles.inputField}
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Input
                    label="City"
                    placeholder="City"
                    value={city}
                    onChangeText={(text) => {
                      setCity(text);
                      updateError('city', '');
                    }}
                    errorMessage={errors.city}
                    required
                    inputStyle={styles.inputField}
                  />
                </View>

                <View style={styles.halfInput}>
                  <Input
                    label="State"
                    placeholder="State"
                    value={state}
                    onChangeText={(text) => {
                      setState(text);
                      updateError('state', '');
                    }}
                    errorMessage={errors.state}
                    required
                    inputStyle={styles.inputField}
                  />
                </View>
              </View>

              <Input
                label="ZIP Code (Optional)"
                placeholder="ZIP Code"
                value={zipCode}
                onChangeText={(text) => {
                  setZipCode(text);
                  updateError('zipCode', '');
                }}
                keyboardType="numeric"
                errorMessage={errors.zipCode}
                inputStyle={styles.inputField}
              />

              <Input
                label="Delivery Notes (Optional)"
                placeholder="e.g., Use side entrance"
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
                multiline
                inputStyle={[styles.inputField, styles.notesInput]}
              />
            </ScrollView>

            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={handleClose}
                variant="outline"
                style={styles.button}
              />
              <Button
                title={
                  loading
                    ? (isEditing ? 'Updating...' : 'Adding...')
                    : (isEditing ? 'Update Address' : 'Add Address')
                }
                onPress={handleSave}
                variant="primary"
                style={styles.button}
                loading={loading}
                disabled={loading}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: fontFamilyBody,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 600,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  inputField: {
    backgroundColor: Colors.cardBackground,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  button: {
    flex: 1,
  },
  addressAutocompleteWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 1000,
  },
  addressAutocompleteContainer: {
    position: 'relative',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default AddAddressModal;
