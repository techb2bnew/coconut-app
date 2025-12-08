/**
 * Dropdown Component
 * Custom dropdown with options
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';

const Dropdown = ({
  label,
  placeholder,
  value,
  onSelect,
  options = [],
  error,
  errorMessage,
  required = false,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasError = error || errorMessage;
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  const handleSelect = (option) => {
    onSelect(option.value);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={TextStyles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.dropdownContainer,
          hasError && styles.dropdownContainerError,
        ]}
        onPress={() => setIsOpen(true)}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.dropdownText,
            !displayValue && styles.placeholderText,
          ]}>
          {displayValue || placeholder}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>
      {hasError && (
        <Text style={styles.errorText}>{errorMessage || error}</Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}>
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item.value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.optionText,
                      value === item.value && styles.optionTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  dropdownContainerError: {
    borderColor: Colors.error,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  dropdownIcon: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  required: {
    color: Colors.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 8,
    width: '80%',
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionItemSelected: {
    backgroundColor: Colors.lightPink,
  },
  optionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    color: Colors.primaryPink,
    fontWeight: '600',
  },
});

export default Dropdown;

