/**
 * Logo Component
 * COCONUT STOCK Logo with circular border and coconut design
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Colors from '../theme/colors';

// Logo image
const logoImage = require('../assest/logo-black.png');
const logoBlackImage = require('../assest/logo-black.png');

const Logo = ({ size = 150, showTagline = false, style, variant = 'default' }) => {
  const imageSize = size; // Image size matches container size
  const imageSource = variant === 'black' ? logoBlackImage : logoImage;
  
  return (
    <View style={[styles.logoContainer, style]}>
      <View style={[styles.logoCircle, { width: size, height: size }]}>
        {/* Logo Image */}
        <Image
          source={imageSource}
          style={[styles.logoImage, { width: imageSize, height: imageSize }]}
          resizeMode="contain"
        />
      </View> 
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
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

