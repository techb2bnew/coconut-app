/**
 * Common Text Styles
 * Reusable text styles throughout the app
 */

import { StyleSheet } from 'react-native';
import Colors from './colors';
import { fontFamily } from './fonts';

export const TextStyles = StyleSheet.create({
  // Heading Styles
  headingLarge: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: fontFamily,
    color: Colors.textPink,
    textAlign: 'center',
  },
  headingMedium: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: fontFamily,
    color: Colors.textPink,
    textAlign: 'center',
  },
  headingSmall: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: fontFamily,
    color: Colors.textPink,
  },

  // Body Text Styles
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400',
    fontFamily: fontFamily,
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: fontFamily,
    color: Colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: fontFamily,
    color: Colors.textPrimary,
  },

  // Label Styles
  label: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamily,
    color: Colors.textPrimary,
    marginBottom: 8,
  },

  // Placeholder/Secondary Text
  placeholder: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: fontFamily,
    color: Colors.textSecondary,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: fontFamily,
    color: Colors.textLightPink,
  },

  // Link Styles
  link: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamily,
    color: Colors.textPink,
  },
  linkCenter: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamily,
    color: Colors.textPink,
    textAlign: 'center',
  },

  // Tagline
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: fontFamily,
    color: Colors.pinkAccent,
    textAlign: 'center',
  },
});

export default TextStyles;

