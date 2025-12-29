/**
 * Add Address Modal Component
 * Modal for adding new delivery address
 */

import React, { useState } from 'react';
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
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import Input from '../components/Input';
import Button from '../components/Button';
import { validateRequired } from '../utils/validation';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';

const AddAddressModal = ({ visible, onClose, onSave }) => {
  const [addressLabel, setAddressLabel] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
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

    const zipError = validateRequired(zipCode, 'ZIP Code');
    if (zipError) {
      newErrors.zipCode = zipError;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

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

      // Reset form
      setAddressLabel('');
      setStreetAddress('');
      setCity('');
      setState('');
      setZipCode('');
      setDeliveryNotes('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setAddressLabel('');
    setStreetAddress('');
    setCity('');
    setState('');
    setZipCode('');
    setDeliveryNotes('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Add New Address</Text>
                <Text style={styles.modalSubtitle}>Enter the details for your new delivery address.</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled">
              {/* Address Label */}
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

              {/* Street Address */}
              <Input
                label="Street Address"
                placeholder="Enter street address"
                value={streetAddress}
                onChangeText={(text) => {
                  setStreetAddress(text);
                  updateError('streetAddress', '');
                }}
                errorMessage={errors.streetAddress}
                required
                inputStyle={styles.inputField}
              />

              {/* City and State in Row */}
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

              {/* ZIP Code */}
              <Input
                label="ZIP Code"
                placeholder="ZIP Code"
                value={zipCode}
                onChangeText={(text) => {
                  setZipCode(text);
                  updateError('zipCode', '');
                }}
                keyboardType="numeric"
                errorMessage={errors.zipCode}
                required
                inputStyle={styles.inputField}
              />

              {/* Delivery Notes (Optional) */}
              <Input
                label="Delivery Notes (Optional)"
                placeholder="e.g., Use side entrance"
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
                multiline
                inputStyle={[styles.inputField, styles.notesInput]}
              />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={handleClose}
                variant="outline"
                style={styles.button}
              />
              <Button
                title={loading ? 'Adding...' : 'Add Address'}
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
    maxHeight: 500,
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
});

export default AddAddressModal;

