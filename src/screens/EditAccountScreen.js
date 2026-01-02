/**
 * Edit Account Screen
 * Edit customer account information (First Name, Last Name, Company)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import Input from '../components/Input';
import Button from '../components/Button';
import BackArrowIcon from '../components/BackArrowIcon';
import { validateRequired } from '../utils/validation';
import supabase from '../config/supabase';

const EditAccountScreen = ({ navigation, route }) => {
  const customerData = route?.params?.customerData || null;
  
  const [firstName, setFirstName] = useState(customerData?.first_name || '');
  const [lastName, setLastName] = useState(customerData?.last_name || '');
  const [companyName, setCompanyName] = useState(customerData?.company_name || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
  });

  useEffect(() => {
    if (customerData) {
      setFirstName(customerData.first_name || '');
      setLastName(customerData.last_name || '');
      setCompanyName(customerData.company_name || '');
    }
  }, [customerData]);

  const updateError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    const firstNameError = validateRequired(firstName, 'First Name');
    if (firstNameError) {
      newErrors.firstName = firstNameError;
      isValid = false;
    }

    const lastNameError = validateRequired(lastName, 'Last Name');
    if (lastNameError) {
      newErrors.lastName = lastNameError;
      isValid = false;
    }

    const companyError = validateRequired(companyName, 'Company');
    if (companyError) {
      newErrors.companyName = companyError;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Alert.alert('Error', 'User not logged in. Please log in again.');
        setLoading(false);
        return;
      }

      // Update customer data
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company_name: companyName.trim(),
        })
        .eq('email', user.email);

      if (updateError) {
        console.error('Error updating customer:', updateError);
        Alert.alert('Error', updateError.message || 'Failed to update account information.');
        setLoading(false);
        return;
      }

      Alert.alert('Success', 'Account information updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}>
        <BackArrowIcon onPress={() => navigation.goBack()} color={Colors.cardBackground} />
        <Text style={styles.headerTitle}>Edit Account</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.headerIconContainer}>
                <Icon name="person" size={20} color={Colors.primaryPink} />
              </View>
              <Text style={styles.cardTitle}>Account Information</Text>
            </View>

            {/* First Name and Last Name in Row */}
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Input
                  label="First Name"
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    updateError('firstName', '');
                  }}
                  errorMessage={errors.firstName}
                  required
                  inputStyle={styles.inputField}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Last Name"
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    updateError('lastName', '');
                  }}
                  errorMessage={errors.lastName}
                  required
                  inputStyle={styles.inputField}
                />
              </View>
            </View>

            {/* Company Name */}
            <Input
              label="Company"
              placeholder="Company"
              value={companyName}
              onChangeText={(text) => {
                setCompanyName(text);
                updateError('companyName', '');
              }}
              errorMessage={errors.companyName}
              required
              inputStyle={styles.inputField}
            />

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <Button
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.button}
              />
              <Button
                title={loading ? 'Saving...' : 'Save Changes'}
                onPress={handleSave}
                variant="primary"
                style={styles.button}
                loading={loading}
                disabled={loading}
              />
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  headerTitle: {
    ...TextStyles.headingMedium,
    color: Colors.cardBackground,
    marginLeft: 10,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  formCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputField: {
    backgroundColor: Colors.backgroundGray,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
});

export default EditAccountScreen;

