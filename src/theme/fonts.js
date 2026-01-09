/**
 * Font Family Configuration
 * Centralized font family definition for the entire app
 * iOS uses font family names from font files, Android uses filenames
 */

import { Platform } from 'react-native';

// Garamond Pro - Used for titles, headings, and headlines
// iOS: "Garamond Premier Pro" (font family name from font file)
// Android: "garamondPro" (filename without extension)
export const fontFamilyHeading = Platform.OS === 'ios' ? 'Garamond Premier Pro' : 'garamondPro';

// Quicksand - Used for body text (clean and modern)
// iOS: "Quicksand" (font family name from font file)
// Android: "quickSand" (filename without extension)
export const fontFamilyBody = Platform.OS === 'ios' ? 'Quicksand' : 'quickSand';

// Default font (for backward compatibility, using Quicksand for body text)
export const fontFamily = fontFamilyBody;

export default fontFamily;