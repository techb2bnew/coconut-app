/**
 * Font Family Configuration
 * Centralized font family definition for the entire app
 */

import { Platform } from 'react-native';

// Garamond Pro - Used for titles, headings, and headlines
// iOS uses PostScript name: "GaramondPro"
// Android uses filename: "garamondPro"
export const fontFamilyHeading = Platform.OS === 'ios' ? 'GaramondPro' : 'garamondPro';

// Quicksand - Used for body text (clean and modern)
// iOS uses PostScript name: "Quicksand"
// Android uses filename: "quickSand"
export const fontFamilyBody = Platform.OS === 'ios' ? 'Quicksand' : 'quickSand';

// Default font (for backward compatibility, using Quicksand for body text)
export const fontFamily = fontFamilyBody;

export default fontFamily;