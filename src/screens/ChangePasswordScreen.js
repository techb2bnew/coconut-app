/**
 * Change Password Screen
 * Update user password (Current Password, New Password, Confirm New Password)
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import Input from '../components/Input';
import Button from '../components/Button';
import BackArrowIcon from '../components/BackArrowIcon';
import { validateRequired, validatePassword, validatePasswordMatch } from '../utils/validation';
import supabase from '../config/supabase';

const ChangePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    const currentPasswordError = validateRequired(currentPassword, 'Current Password');
    if (currentPasswordError) {
      newErrors.currentPassword = currentPasswordError;
      isValid = false;
    }

    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) {
      newErrors.newPassword = newPasswordError;
      isValid = false;
    }

    const confirmPasswordError = validatePasswordMatch(newPassword, confirmPassword);
    if (confirmPasswordError) {
      newErrors.confirmPassword = confirmPasswordError;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleUpdatePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // First, verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Alert.alert('Error', 'User not logged in. Please log in again.');
        setLoading(false);
        return;
      }

      // Try to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect.');
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        Alert.alert('Error', updateError.message || 'Failed to update password.');
        setLoading(false);
        return;
      }

      Alert.alert('Success', 'Password updated successfully!', [
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
      <View style={styles.header}>
        <BackArrowIcon onPress={() => navigation.goBack()} color={Colors.cardBackground} />
        <Text style={styles.headerTitle}>Change Password</Text>
      </View>

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
                <Icon name="shield" size={18} color={Colors.error} />
              </View>
              <Text style={styles.cardTitle}>Security & Password</Text>
            </View>

            {/* Current Password */}
            <Input
              label="Current Password"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                updateError('currentPassword', '');
              }}
              secureTextEntry
              errorMessage={errors.currentPassword}
              required
              inputStyle={styles.inputField}
            />

            {/* New Password */}
            <Input
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                updateError('newPassword', '');
              }}
              secureTextEntry
              errorMessage={errors.newPassword}
              required
              inputStyle={styles.inputField}
            />

            {/* Confirm New Password */}
            <Input
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                updateError('confirmPassword', '');
              }}
              secureTextEntry
              errorMessage={errors.confirmPassword}
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
                title={loading ? 'Updating...' : 'Update Password'}
                onPress={handleUpdatePassword}
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
    backgroundColor: Colors.primaryPink,
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
    borderRadius: 18,
    backgroundColor: Colors.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  inputField: {
    backgroundColor: Colors.backgroundGray,
    marginBottom: 16,
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

export default ChangePasswordScreen;

