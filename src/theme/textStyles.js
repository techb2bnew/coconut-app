/**
 * Common Text Styles
 * Reusable text styles throughout the app
 */

import { StyleSheet } from 'react-native';
import Colors from './colors';
import { fontFamilyHeading, fontFamilyBody } from './fonts';

export const TextStyles = StyleSheet.create({
  // Heading Styles - Using Garamond Pro
  headingLarge: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: fontFamilyHeading,
    color: Colors.textPink,
    textAlign: 'center',
  },
  headingMedium: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.textPink,
    textAlign: 'center',
  },
  headingSmall: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.textPink,
  },

  // Body Text Styles - Using Quicksand
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400',
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
  },

  // Label Styles - Using Quicksand
  label: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginBottom: 8,
  },

  // Placeholder/Secondary Text - Using Quicksand
  placeholder: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: fontFamilyBody,
    color: Colors.textLightPink,
  },

  // Link Styles - Using Quicksand
  link: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamilyBody,
    color: Colors.textPink,
  },
  linkCenter: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamilyBody,
    color: Colors.textPink,
    textAlign: 'center',
  },

  // Tagline - Using Quicksand
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: fontFamilyBody,
    color: Colors.pinkAccent,
    textAlign: 'center',
  },
});

export default TextStyles;

