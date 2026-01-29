/**
 * OTP Screen
 * Verify OTP code sent to email
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import Logo from '../components/Logo';
import Button from '../components/Button';
import BackArrowIcon from '../components/BackArrowIcon';
import supabase from '../config/supabase';

const OTPScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Get email from AsyncStorage
    const getEmail = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('reset_password_email');
        if (storedEmail) {
          setEmail(storedEmail);
        } else {
          // If no email found, redirect back to forgot password
          if (navigation) {
            navigation.navigate('ForgotPassword');
          }
        }
      } catch (err) {
        console.error('Error getting email:', err);
        if (navigation) {
          navigation.navigate('ForgotPassword');
        }
      }
    };

    getEmail();
  }, [navigation]);

  const handleOtpChange = (index, value) => {
    // Allow only digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next box if digit entered
    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear error when user types
    if (error) {
      setError('');
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] === '') {
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
          const newOtp = [...otp];
          newOtp[index - 1] = '';
          setOtp(newOtp);
        }
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const validateForm = () => {
    const otpValue = otp.join('');
    if (!otpValue) {
      setError('OTP is required');
      return false;
    } else if (otpValue.length !== 6) {
      setError('OTP must be 6 digits');
      return false;
    }
    setError('');
    return true;
  };

  const handleVerifyOtp = async () => {
    if (!validateForm() || !email) return;

    setLoading(true);
    setError('');

    try {
      const otpValue = otp.join('');
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpValue,
        type: 'email',
      });

      if (error) {
        // Check if error is related to invalid/expired token/OTP
        const errorMessage = error.message || '';
        if (
          errorMessage.includes('token') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('OTP')
        ) {
          setError('Invalid OTP. Please try again.');
        } else {
          setError(errorMessage || 'Invalid OTP. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Success - navigate to reset password screen
      Alert.alert('Success', 'OTP verified successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation) {
              navigation.navigate('ResetPassword');
            }
          },
        },
      ]);
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTPWithRetry = async (retries = 2, delay = 2000) => {
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
            console.log(`Resend retry attempt ${attempt + 1} after ${waitTime}ms`);
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
          console.log(`Resend retry attempt ${attempt + 1} after ${waitTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        return { data: null, error: err };
      }
    }
    return { data: null, error: { message: 'Request failed after multiple attempts' } };
  };

  const handleResendOtp = async () => {
    if (!email) return;

    setIsResending(true);
    setError('');

    try {
      const { data, error } = await resendOTPWithRetry(2, 2000);

      if (error) {
        if (
          error.message?.includes('504') ||
          error.message?.includes('timeout') ||
          error.message?.includes('retry')
        ) {
          setError('Email service is currently slow. The OTP may still be sent. Please check your email in a few moments.');
        } else {
          setError(error.message || 'Failed to resend OTP. Please try again.');
        }
        setIsResending(false);
        return;
      }

      Alert.alert('Success', 'OTP has been resent to your email!');
      setIsResending(false);
    } catch (err) {
      console.error('Resend OTP error:', err);
      if (err.message?.includes('timeout') || err.message?.includes('504')) {
        setError('Email service is currently slow. The OTP may still be sent. Please check your email in a few moments.');
      } else {
        setError('Failed to resend OTP. Please try again.');
      }
      setIsResending(false);
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
              <Text style={[TextStyles.headingMedium, styles.title]}>Enter OTP</Text>
              <Text style={[TextStyles.secondaryText, styles.description]}>
                We've sent a 6-digit OTP to{'\n'}
                <Text style={styles.emailText}>{email}</Text>
              </Text>
            </View>

            {/* OTP Input Section */}
            <View style={styles.formCard}>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      digit && styles.otpInputFilled,
                      error && styles.otpInputError,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(index, value)}
                    onKeyPress={(e) => handleKeyDown(index, e)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Button
                title="Verify OTP"
                onPress={handleVerifyOtp}
                variant="primary"
                loading={loading}
                style={styles.verifyButton}
              />

              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={isResending}
                style={styles.resendButton}>
                <Text style={[styles.resendText, isResending && styles.resendTextDisabled]}>
                  {isResending ? 'Resending...' : "Didn't receive OTP? Resend"}
                </Text>
              </TouchableOpacity>
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
  emailText: {
    fontWeight: '600',
    color: Colors.textPink,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  otpInputFilled: {
    borderColor: Colors.primaryPink,
    backgroundColor: Colors.cardBackground,
  },
  otpInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginBottom: 16,
    marginLeft: 4,
  },
  verifyButton: {
    marginTop: 8,
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: Colors.textPink,
    fontWeight: '500',
  },
  resendTextDisabled: {
    opacity: 0.5,
  },
});

export default OTPScreen;

