/**
 * Custom Text Component
 * Applies default font family to all text in the app
 */

import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { fontFamilyBody } from '../theme/fonts';

const Text = ({ style, ...props }) => {
  return (
    <RNText
      style={[styles.defaultText, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: fontFamilyBody,
  },
});

export default Text;

