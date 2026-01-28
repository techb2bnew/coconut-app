/**
 * Forgot Password Screen
 * Reset password screen with back button
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import Logo from '../components/Logo';
import Input from '../components/Input';
import Button from '../components/Button';
import BackArrowIcon from '../components/BackArrowIcon';
import { validateEmail } from '../utils/validation';
import supabase from '../config/supabase';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (text) => {
    setEmail(text);
    if (error) {
      setError(validateEmail(text));
    }
  };

  const sendOTPWithRetry = async (retries = 2, delay = 2000) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 15000);
        });

        const otpPromise = supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: false,
          },
        });

        const { data, error } = await Promise.race([otpPromise, timeoutPromise]);

        if (error) {
          if (
            (error.message?.includes('504') ||
              error.message?.includes('timeout') ||
              error.message?.includes('retry') ||
              error.message?.includes('network')) &&
            attempt < retries
          ) {
            const waitTime = delay * Math.pow(2, attempt);
            console.log(`Retry attempt ${attempt + 1} after ${waitTime}ms`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          return { data, error };
        }

        return { data, error: null };
      } catch (err) {
        if (
          (err.message?.includes('timeout') || err.message?.includes('504')) &&
          attempt < retries
        ) {
          const waitTime = delay * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1} after ${waitTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        return { data: null, error: err };
      }
    }
    return { data: null, error: { message: 'Request failed after multiple attempts' } };
  };

  const handleSendOTP = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await sendOTPWithRetry(2, 2000);

      if (error) {
        console.error('Send OTP error:', error);

        if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
          setError('Too many requests. Please wait a few minutes and try again.');
        } else if (
          error.message?.includes('not found') ||
          error.message?.includes('user') ||
          error.message?.includes('email')
        ) {
          setError('No account found with this email address.');
        } else if (
          error.message?.includes('504') ||
          error.message?.includes('timeout') ||
          error.message?.includes('retry') ||
          error.message?.includes('Gateway')
        ) {
          setError(
            'Email service timeout. Please check your SMTP settings. The OTP may still be sent - check your email.'
          );
        } else if (
          error.message?.includes('SMTP') ||
          error.message?.includes('smtp') ||
          error.message?.includes('mail')
        ) {
          setError('SMTP configuration error. Please check your SMTP settings in Supabase dashboard.');
        } else {
          setError(error.message || 'Failed to send OTP. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Store email in AsyncStorage for OTP screen
      await AsyncStorage.setItem('reset_password_email', email.trim());

      // Success - navigate to OTP screen
      Alert.alert('Success', 'OTP has been sent to your email!', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation) {
              navigation.navigate('OTP');
            }
          },
        },
      ]);
    } catch (err) {
      console.error('Forgot password error:', err);
      if (err.message?.includes('timeout') || err.message?.includes('504')) {
        setError('Email service timeout. Please check your SMTP settings and try again.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
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
              <Text style={[TextStyles.headingMedium, styles.title]}>
                Reset Password
              </Text>
              <Text style={[TextStyles.secondaryText, styles.description]}>
                Enter your email address and we'll send you an OTP to reset your
                password
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                errorMessage={error}
                icon={
                  <Text style={styles.envelopeIcon}>📧</Text>
                }
                iconPosition="right"
              />

              <Button
                title="Send OTP"
                onPress={handleSendOTP}
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryBlue,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
  envelopeIcon: {
    fontSize: 18,
  },
  resetButton: {
    marginTop: 8,
  },
});

export default ForgotPasswordScreen;

