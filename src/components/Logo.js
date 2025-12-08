/**
 * Logo Component
 * COCONUT STOCK Logo with circular border and coconut design
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Colors from '../theme/colors';

// Logo image
const logoImage = require('../assest/logo.png');

const Logo = ({ size = 150, showTagline = false }) => {
  const imageSize = size; // Image size matches container size
  
  return (
    <View style={styles.logoContainer}>
      <View style={[styles.logoCircle, { width: size, height: size }]}>
        {/* Logo Image */}
        <Image
          source={logoImage}
          style={[styles.logoImage, { width: imageSize, height: imageSize }]}
          resizeMode="contain"
        />
      </View> 
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: { 
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',   
  }, 
  tagline: {
    marginTop: 8,
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  taglineDot: {
    color: Colors.primaryPink,
  },
});

export default Logo;

