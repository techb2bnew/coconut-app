/**
 * Reset Password Screen
 * Set new password after OTP verification
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
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import Logo from '../components/Logo';
import Input from '../components/Input';
import Button from '../components/Button';
import BackArrowIcon from '../components/BackArrowIcon';
import { validatePassword, validatePasswordMatch } from '../utils/validation';
import supabase from '../config/supabase';

const ResetPasswordScreen = ({ navigation }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = (text) => {
    setNewPassword(text);
    if (errors.newPassword) {
      setErrors({
        ...errors,
        newPassword: validatePassword(text),
      });
    }
    // Re-validate confirm password if it's already filled
    if (confirmPassword) {
      setErrors({
        ...errors,
        confirmPassword: validatePasswordMatch(text, confirmPassword),
      });
    }
  };

  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    if (errors.confirmPassword) {
      setErrors({
        ...errors,
        confirmPassword: validatePasswordMatch(newPassword, text),
      });
    }
  };

  const validateForm = () => {
    const newPasswordError = validatePassword(newPassword);
    const confirmPasswordError = validatePasswordMatch(newPassword, confirmPassword);

    setErrors({
      newPassword: newPasswordError,
      confirmPassword: confirmPasswordError,
    });

    return !newPasswordError && !confirmPasswordError;
  };

  const handlePasswordReset = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Success',
        'Password reset successful! You can now login with your new password.',
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
    } catch (err) {
      console.error('Password reset error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
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
        {/* Back Button Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <BackArrowIcon size={24} style={styles.backIconStyle} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Logo size={100} />
            </View>

            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={[TextStyles.headingMedium, styles.title]}>Reset Password</Text>
              <Text style={[TextStyles.secondaryText, styles.description]}>
                Enter your new password below
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Input
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={handlePasswordChange}
                secureTextEntry
                errorMessage={errors.newPassword}
                required
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry
                errorMessage={errors.confirmPassword}
                required
                style={styles.confirmPasswordInput}
              />

              <Button
                title="Reset Password"
                onPress={handlePasswordReset}
                variant="primary"
                loading={loading}
                style={styles.resetButton}
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
  backIconStyle: {
    marginRight: 8,
  },
  backText: {
    fontSize: 16,
    color: Colors.cardBackground,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 20,
    color: Colors.textPrimary,
  },
  formCard: {
    backgroundColor: Colors.primaryCardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmPasswordInput: {
    marginTop: 16,
  },
  resetButton: {
    marginTop: 24,
  },
});

export default ResetPasswordScreen;

