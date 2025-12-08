/**
 * Bottom Tab Navigation Component
 * Common bottom navigation bar used across multiple screens
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';

const BottomTabNavigation = ({ navigation, activeTab = 'Orders' }) => {
  const handleTabPress = (tabName) => {
    if (!navigation) return;

    switch (tabName) {
      case 'Orders':
        navigation.navigate('Home');
        break;
      case 'New':
        navigation.navigate('CreateOrder');
        break;
      case 'Notifications':
        navigation.navigate('Notifications');
        break;
      case 'Profile':
        navigation.navigate('Profile');
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('Orders')}
        activeOpacity={0.8}>
        <Icon
          name="home"
          size={24}
          color={activeTab === 'Orders' ? Colors.primaryPink : Colors.textPrimary}
        />
       
        <Text
          style={[
            styles.navLabel,
            activeTab === 'Orders' && styles.navLabelActive,
          ]}>
          Orders
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('New')}
        activeOpacity={0.8}>
        <Icon
          name="add-circle"
          size={24}
          color={activeTab === 'New' ? Colors.primaryPink : Colors.textPrimary}
        />
        <Text
          style={[
            styles.navLabel,
            activeTab === 'New' && styles.navLabelActive,
          ]}>
          New
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('Notifications')}
        activeOpacity={0.8}>
        <Icon
          name="notifications-outline"
          size={24}
          color={activeTab === 'Notifications' ? Colors.primaryPink : Colors.textPrimary}
        />
        <Text
          style={[
            styles.navLabel,
            activeTab === 'Notifications' && styles.navLabelActive,
          ]}>
          Notifications
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('Profile')}
        activeOpacity={0.8}>
        <Icon
          name="person-outline"
          size={24}
          color={activeTab === 'Profile' ? Colors.primaryPink : Colors.textPrimary}
        />
        <Text
          style={[
            styles.navLabel,
            activeTab === 'Profile' && styles.navLabelActive,
          ]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navChevron: {
    marginTop: -4,
  },
  navLabel: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  navLabelActive: {
    color: Colors.primaryPink,
    fontWeight: '600',
  },
});

export default BottomTabNavigation;

