/**
 * Login Screen
 * First screen shown to users - matches design screenshot
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
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import Logo from '../components/Logo';
import Input from '../components/Input';
import Button from '../components/Button';
import { validateEmail, validatePassword } from '../utils/validation';
import supabase from '../config/supabase';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setErrors({
      email: emailError,
      password: passwordError,
    });

    return !emailError && !passwordError;
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (errors.email) {
      setErrors({ ...errors, email: validateEmail(text) });
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (errors.password) {
      setErrors({ ...errors, password: validatePassword(text) });
    }
  };

  const handleLogin = async () => {
   
  if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      console.log('datasssss', data);
      if (error) {
        Alert.alert('Login Error', error.message || 'Failed to login. Please try again.');
        console.error('Login error:', error);
      } else if (data) {
        // Login successful
        console.log('Login successful:', data);

        // Save FCM token after login
        const { saveFCMTokenAfterLogin } = require('../services/firebaseMessaging');
        saveFCMTokenAfterLogin().catch(err => {
          console.error('Error saving FCM token after login:', err);
        });

        // Show lovely success toast instead of alert
        Toast.show({
          type: 'success',
          text1: 'Welcome back 👋',
          text2: 'Logged in successfully!',
          position: 'top',
          visibilityTime: 2500,
        });

        // Navigate to main tabs
        if (navigation) {
          navigation.navigate('MainTabs');
        }
      }
    } catch (error) {
      console.error('Unexpected error during login:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (navigation) {
      navigation.navigate('ForgotPassword');
    }
  };

  const handleCreateAccount = () => {
    if (navigation) {
      navigation.navigate('CreateAccount');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.lightPink, '#FFF5F8', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Main Card Container */}
          <View style={styles.cardContainer}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Logo size={100} />
               
            </View>

            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={[TextStyles.headingMedium, styles.welcomeText]}>
                Welcome Back
              </Text>
              <Text style={[TextStyles.secondaryText, styles.subtitleText]}>
                Sign in to your account
              </Text>
            </View>

            {/* Login Form - White Panel */}
            <View style={styles.formContainer}>
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                errorMessage={errors.email}
                icon={
                  <Icon name="mail-outline" size={20} color={Colors.textSecondary} />
                }
                iconPosition="right"
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry
                errorMessage={errors.password}
              />

              <Button
                title="Login"
                onPress={handleLogin}
                variant="primary"
                style={styles.loginButton}
                loading={loading}
                disabled={loading}
              />

              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordContainer}>
                <Text style={[TextStyles.link, styles.forgotPasswordText]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Create Account Section */}
            <View style={styles.createAccountSection}>
              <Text style={[TextStyles.secondaryText, styles.subtitleText, styles.createAccountPrompt]}>
                Don't have an account?
              </Text>
              <Button
                title="Create New Account"
                onPress={handleCreateAccount}
                variant="outline"
                style={styles.createAccountButton}
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
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cardContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tagline: {
    marginTop: 8,
    fontSize: 12,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#000000',
  },
  formContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  createAccountSection: {
    alignItems: 'center',
  },
  createAccountPrompt: {
    marginBottom: 16,
    fontSize: 14,
  },
  createAccountButton: {
    width: '100%',
  },
});

export default LoginScreen;

