/**
 * Back Arrow Icon Component
 * Using react-native-vector-icons
 */

import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';

const BackArrowIcon = ({ 
  size = 24, 
  color = Colors.cardBackground, 
  style,
  name = 'arrow-back' 
}) => {
  return (
    <Icon 
      name={name} 
      size={size} 
      color={color} 
      style={style}
    />
  );
};

export default BackArrowIcon;
