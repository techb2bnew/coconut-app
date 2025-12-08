/**
 * Common Button Component
 * Reusable button with different variants
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Colors from '../theme/colors';

const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary' or 'outline'
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const buttonStyles = [
    styles.button,
    variant === 'primary' ? styles.primaryButton : styles.outlineButton,
    disabled && styles.disabledButton,
    style,
  ];

  const textStyles = [
    variant === 'primary' ? styles.primaryText : styles.outlineText,
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.cardBackground : Colors.primaryPink}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: Colors.primaryPink,
  },
  outlineButton: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.borderPink,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.cardBackground,
  },
  outlineText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPink,
  },
  disabledText: {
    opacity: 0.6,
  },
});

export default Button;

