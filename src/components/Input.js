/**
 * Common Input Component
 * Text input with label and icon support
 */

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import { fontFamilyBody } from '../theme/fonts';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  icon,
  iconPosition = 'right', // 'left' or 'right'
  onIconPress,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  errorMessage,
  style,
  inputStyle,
  required = false,
  editable = true,
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const showPasswordToggle = secureTextEntry;
  const displayIcon = icon && !showPasswordToggle;
  const hasError = error || errorMessage;

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={TextStyles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
        ]}>
        {displayIcon && iconPosition === 'left' && (
          <TouchableOpacity
            onPress={onIconPress}
            disabled={!onIconPress}
            style={styles.iconLeft}>
            {icon}
          </TouchableOpacity>
        )}
        <TextInput
          style={[styles.input, inputStyle, !editable && styles.inputDisabled]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.iconRight}>
            <Icon 
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'} 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
        {displayIcon && iconPosition === 'right' && (
          <TouchableOpacity
            onPress={onIconPress}
            disabled={!onIconPress}
            style={styles.iconRight}>
            {icon}
          </TouchableOpacity>
        )}
      </View>
      {hasError && (
        <Text style={styles.errorText}>{errorMessage || error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    minHeight: 45,
  },
  inputContainerFocused: {
    borderColor: Colors.primaryPink,
  },
  inputContainerError: {
    borderColor: Colors.error,
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
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    paddingVertical: 10,
  },
  inputDisabled: { 
    opacity: 0.6,
    color: Colors.textSecondary,
  },
  iconLeft: {
    marginRight: 12,
  },
  iconRight: {
    marginLeft: 12,
  },
});

export default Input;

