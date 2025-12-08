/**
 * Profile Screen
 * Complete profile view with user info, summary cards, and sections
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import BottomTabNavigation from '../components/BottomTabNavigation';
import AddAddressModal from '../components/AddAddressModal';
import Input from '../components/Input';
import Button from '../components/Button';
import { validateRequired, validatePassword, validatePasswordMatch } from '../utils/validation';
import supabase from '../config/supabase';

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  
  // Inline editing states
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Account edit form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [accountErrors, setAccountErrors] = useState({});
  const [savingAccount, setSavingAccount] = useState(false);
  
  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  // Fetch customer data
  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) {
          setLoading(false);
          return;
        }

        // Fetch customer data
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('email', user.email)
          .single();

        if (customerError) {
          console.error('Error fetching customer:', customerError);
          setLoading(false);
          return;
        }

        setCustomerData(customer);
        
        // Initialize form fields when customer data is loaded
        if (customer) {
          setFirstName(customer.first_name || '');
          setLastName(customer.last_name || '');
          setCompanyName(customer.company_name || '');
        }

        // Fetch orders for stats
        if (customer?.id) {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_id', customer.id);

          if (!ordersError && orders) {
            setStats({
              totalOrders: orders.length,
              activeOrders: orders.filter((o) => o.status === 'Processing' || o.status === 'Pending').length,
            });

            // Get recent orders
            const recent = orders
              .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
              .slice(0, 3);
            setRecentOrders(recent);
          }
        }
      } catch (error) {
        console.error('Error in fetchCustomerData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, []);

  // Get initials for avatar
  const getInitials = () => {
    if (!customerData) return 'JD';
    const first = customerData.first_name?.[0] || '';
    const last = customerData.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'JD';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  // Parse delivery addresses from JSON
  const parseAddresses = () => {
    if (!customerData?.delivery_address) return [];
    try {
      let addresses = [];
      
      // If it's a string, try to parse it
      if (typeof customerData.delivery_address === 'string') {
        const parsed = JSON.parse(customerData.delivery_address);
        // If it's an object with "address" key (old format), convert to array
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.address) {
          addresses = [{
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: 'Main Office',
            street: parsed.address,
            city: '',
            state: '',
            zipCode: '',
            notes: '',
            isSelected: true,
          }];
        } else if (Array.isArray(parsed)) {
          addresses = parsed;
        }
      } else if (Array.isArray(customerData.delivery_address)) {
        // If it's already an array
        addresses = customerData.delivery_address;
      } else if (typeof customerData.delivery_address === 'object' && customerData.delivery_address.address) {
        // If it's an object with address key
        addresses = [{
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          label: 'Main Office',
          street: customerData.delivery_address.address,
          city: '',
          state: '',
          zipCode: '',
          notes: '',
          isSelected: true,
        }];
      }
      
      // Ensure all addresses have IDs
      return addresses.map((addr, index) => {
        if (!addr.id) {
          return {
            ...addr,
            id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          };
        }
        // Ensure ID is a string for consistent comparison
        return {
          ...addr,
          id: addr.id.toString(),
        };
      });
    } catch (error) {
      console.error('Error parsing addresses:', error);
      return [];
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Get selected/default address
  const getSelectedAddress = () => {
    const addresses = parseAddresses();
    const selected = addresses.find(a => a.isSelected === true);
    return selected || addresses[0] || null;
  };

  // Address Management Functions
  const handleAddAddress = async (addressData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Alert.alert('Error', 'User not logged in.');
        return;
      }

      const addresses = parseAddresses();
      // Generate unique ID using timestamp + random number
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newAddress = {
        id: uniqueId,
        label: addressData.label.trim(),
        street: addressData.street.trim(),
        city: addressData.city.trim(),
        state: addressData.state.trim(),
        zipCode: addressData.zipCode.trim(),
        notes: addressData.notes || '',
        isSelected: addresses.length === 0, // First address is auto-selected
      };

      // If this is the first address, make it selected
      // Otherwise, unselect all others if this one should be selected
      // Ensure all existing addresses have IDs before adding new one
      const addressesWithIds = addresses.map((addr, idx) => {
        if (!addr.id) {
          return {
            ...addr,
            id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
          };
        }
        return { ...addr, id: addr.id.toString() };
      });
      const updatedAddresses = [...addressesWithIds, newAddress];

      // Update customer delivery address
      const { error } = await supabase
        .from('customers')
        .update({
          delivery_address: updatedAddresses,
        })
        .eq('email', user.email);

      if (error) {
        console.error('Error updating address:', error);
        Alert.alert('Error', 'Failed to save address. Please try again.');
        return;
      }

      Alert.alert('Success', 'Address added successfully!');
      // Refresh customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .single();
      if (customer) {
        setCustomerData(customer);
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Alert.alert('Error', 'User not logged in.');
        return;
      }

      const addresses = parseAddresses();
      // Ensure all addresses have string IDs for consistent comparison
      const addressesWithIds = addresses.map(addr => ({
        ...addr,
        id: addr.id?.toString() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));
      const updatedAddresses = addressesWithIds.map(addr => ({
        ...addr,
        isSelected: addr.id.toString() === addressId?.toString(),
      }));

      const { error } = await supabase
        .from('customers')
        .update({
          delivery_address: updatedAddresses,
        })
        .eq('email', user.email);

      if (error) {
        console.error('Error updating default address:', error);
        Alert.alert('Error', 'Failed to set default address.');
        return;
      }

      // Refresh customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .single();
      if (customer) {
        setCustomerData(customer);
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user || !user.email) {
                Alert.alert('Error', 'User not logged in.');
                return;
              }

              const addresses = parseAddresses();
              console.log('All addresses before delete:', JSON.stringify(addresses, null, 2));
              console.log('Deleting address with ID:', addressId);
              
              // Filter out the address with matching ID (strict comparison)
              const filteredAddresses = addresses.filter(addr => {
                const addrId = addr.id?.toString();
                const targetId = addressId?.toString();
                const shouldKeep = addrId !== targetId;
                console.log(`Comparing: ${addrId} !== ${targetId} = ${shouldKeep}`);
                return shouldKeep;
              });
              
              console.log('Filtered addresses after delete:', JSON.stringify(filteredAddresses, null, 2));
              
              // Ensure all remaining addresses have IDs (as strings)
              const addressesWithIds = filteredAddresses.map(addr => ({
                ...addr,
                id: addr.id?.toString() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              }));
              
              // If deleted address was selected, select first one
              const deletedAddress = addresses.find(a => {
                const addrId = a.id?.toString();
                const targetId = addressId?.toString();
                return addrId === targetId;
              });
              
              const deletedWasSelected = deletedAddress?.isSelected;
              if (deletedWasSelected && addressesWithIds.length > 0) {
                addressesWithIds[0].isSelected = true;
              }

              const { error } = await supabase
                .from('customers')
                .update({
                  delivery_address: addressesWithIds.length > 0 ? addressesWithIds : null,
                })
                .eq('email', user.email);

              if (error) {
                console.error('Error deleting address:', error);
                Alert.alert('Error', 'Failed to delete address.');
                return;
              }

              // Refresh customer data
              const { data: customer } = await supabase
                .from('customers')
                .select('*')
                .eq('email', user.email)
                .single();
              if (customer) {
                setCustomerData(customer);
              }
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          },
        },
      ]
    );
  };

  // Account Editing Functions
  const handleEditAccount = () => {
    if (customerData) {
      setFirstName(customerData.first_name || '');
      setLastName(customerData.last_name || '');
      setCompanyName(customerData.company_name || '');
    }
    setIsEditingAccount(true);
    setAccountErrors({});
  };

  const handleCancelAccount = () => {
    setIsEditingAccount(false);
    setAccountErrors({});
    if (customerData) {
      setFirstName(customerData.first_name || '');
      setLastName(customerData.last_name || '');
      setCompanyName(customerData.company_name || '');
    }
  };

  const handleSaveAccount = async () => {
    const newErrors = {};
    if (!firstName.trim()) newErrors.firstName = 'First Name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last Name is required';
    if (!companyName.trim()) newErrors.companyName = 'Company is required';

    if (Object.keys(newErrors).length > 0) {
      setAccountErrors(newErrors);
      return;
    }

    setSavingAccount(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Alert.alert('Error', 'User not logged in.');
        setSavingAccount(false);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company_name: companyName.trim(),
        })
        .eq('email', user.email);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to update account.');
        setSavingAccount(false);
        return;
      }

      // Refresh customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (customer) setCustomerData(customer);

      setIsEditingAccount(false);
      Alert.alert('Success', 'Account information updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSavingAccount(false);
    }
  };

  // Password Change Functions
  const handleChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setIsChangingPassword(true);
  };

  const handleCancelPassword = () => {
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
  };

  const handlePhoneCall = async () => {
    // Phone number from button: +1 (555) 123-4567
    // Remove spaces, parentheses, and dashes for tel: protocol
    const phoneNumber = '+15551234567';
    const phoneUrl = `tel:${phoneNumber}`;
    
    try {
      // Directly open phone dialer - tel: protocol is standard
      await Linking.openURL(phoneUrl);
    } catch (error) {
      console.error('Error opening phone dialer:', error);
      // Only show error if it actually fails
      Alert.alert('Error', 'Unable to open phone dialer. Please try again.');
    }
  };

  const handleSavePassword = async () => {
    const newErrors = {};
    if (!currentPassword.trim()) newErrors.currentPassword = 'Current Password is required';
    if (!newPassword.trim()) newErrors.newPassword = 'New Password is required';
    else if (newPassword.length < 6) newErrors.newPassword = 'Password must be at least 6 characters';
    if (!confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return;
    }

    setSavingPassword(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Alert.alert('Error', 'User not logged in.');
        setSavingPassword(false);
        return;
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'Current password is incorrect.');
        setSavingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        Alert.alert('Error', updateError.message || 'Failed to update password.');
        setSavingPassword(false);
        return;
      }

      // Clear form states
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Show success message
      Alert.alert(
        'Password Changed',
        'You have changed your password. Please login again.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Logout user
              await supabase.auth.signOut();
              // Navigate to Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryPink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Icon name="camera" size={16} color={Colors.primaryPink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>
            {customerData ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() : 'John Doe'}
          </Text>
          <View style={styles.companyRow}>
            <Icon name="business-outline" size={14} color={Colors.cardBackground} />
            <Text style={styles.companyName}>
              {customerData?.company_name || 'Beach Resort & Spa'}
            </Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E1BEE7' }]}>
              <Icon name="cube-outline" size={20} color={Colors.cardBackground} />
            </View>
            <Text style={styles.summaryValue}>{stats.totalOrders}</Text>
            <Text style={styles.summaryLabel}>Total Orders</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E1BEE7' }]}>
              <Icon name="trending-up-outline" size={20} color={Colors.cardBackground} />
            </View>
            <Text style={styles.summaryValue}>{stats.activeOrders}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.recentOrdersCard}>
          <View style={styles.sectionHeader}>
            <Icon name="cube-outline" size={18} color={Colors.primaryPink} />
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrdersList')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <View key={order.id} style={styles.orderRow}>
                <View style={[styles.orderIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Icon name="checkmark-circle" size={20} color={Colors.success} />
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>{order.order_name || `ORD-${order.id}`}</Text>
                  <Text style={styles.orderTime}>{formatDate(order.order_date)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: Colors.success }]}>
                  <Text style={styles.statusText}>{order.status || 'Delivered'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noOrdersText}>No recent orders</Text>
          )}
        </View>

        {/* Account Information */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={styles.headerIconContainer}>
              <Icon name="person" size={18} color={Colors.primaryPink} />
            </View>
            <Text style={styles.cardTitle}>Account Information</Text>
            {!isEditingAccount && (
              <TouchableOpacity style={styles.editButton} onPress={handleEditAccount}>
                <Icon name="pencil-outline" size={16} color={Colors.primaryPink} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isEditingAccount ? (
            // View Mode
            <>
              <View style={styles.infoRow}>
                <Icon name="person-outline" size={16} color={Colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Customer Name</Text>
                  <Text style={styles.infoValue}>
                    {customerData ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() : 'John Doe'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="business-outline" size={16} color={Colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Company Name</Text>
                  <Text style={styles.infoValue}>{customerData?.company_name || 'Beach Resort & Spa'}</Text>
                </View>
              </View>
            </>
          ) : (
            // Edit Mode
            <>
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Input
                    label="First Name"
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (accountErrors.firstName) setAccountErrors({ ...accountErrors, firstName: '' });
                    }}
                    errorMessage={accountErrors.firstName}
                    required
                    inputStyle={styles.editInputField}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Input
                    label="Last Name"
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (accountErrors.lastName) setAccountErrors({ ...accountErrors, lastName: '' });
                    }}
                    errorMessage={accountErrors.lastName}
                    required
                    inputStyle={styles.editInputField}
                  />
                </View>
              </View>
              <Input
                label="Company"
                placeholder="Company"
                value={companyName}
                onChangeText={(text) => {
                  setCompanyName(text);
                  if (accountErrors.companyName) setAccountErrors({ ...accountErrors, companyName: '' });
                }}
                errorMessage={accountErrors.companyName}
                required
                inputStyle={styles.editInputField}
              />
              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  onPress={handleCancelAccount}
                  variant="outline"
                  style={styles.inlineButton}
                />
                <Button
                  title={savingAccount ? 'Saving...' : 'Save'}
                  onPress={handleSaveAccount}
                  variant="primary"
                  style={styles.inlineButton}
                  loading={savingAccount}
                  disabled={savingAccount}
                />
              </View>
            </>
          )}
        </View>

        {/* Delivery Addresses */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Icon name="location-outline" size={18} color={Colors.success} />
            <Text style={styles.cardTitle}>Delivery Addresses</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setEditingAddressIndex(null);
                setShowAddAddressModal(true);
              }}>
              <Icon name="add-circle-outline" size={16} color={Colors.primaryPink} />
              <Text style={styles.editButtonText}> Add</Text>
            </TouchableOpacity>
          </View>
          {(() => {
            const addresses = parseAddresses();
            if (addresses.length === 0) {
              return <Text style={styles.noAddressText}>No delivery address added</Text>;
            }
            return addresses.map((address, index) => (
              <View
                key={address.id || index}
                style={[
                  styles.addressRow,
                  index === addresses.length - 1 && styles.addressRowLast,
                ]}>
                <Icon name="home-outline" size={16} color={Colors.textSecondary} />
                <View style={styles.addressContent}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressLabel}>{address.label || 'Address'}</Text>
                    {address.isSelected && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                    {!address.isSelected && (
                      <TouchableOpacity
                        onPress={() => handleSetDefaultAddress(address.id)}
                        style={styles.setDefaultButton}>
                        <Text style={styles.setDefaultText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.addressAction}
                      onPress={() => handleDeleteAddress(address.id)}>
                      <Icon name="trash-outline" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.addressValue}>{formatAddress(address)}</Text>
                  {address.notes && (
                    <Text style={styles.addressNotes}>Notes: {address.notes}</Text>
                  )}
                </View>
              </View>
            ));
          })()}
        </View>

        {/* Security & Password */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.headerIconContainer, { backgroundColor: Colors.lightPink }]}>
              <Icon name="shield" size={18} color={Colors.error} />
            </View>
            <Text style={styles.cardTitle}>Security & Password</Text>
            {!isChangingPassword && (
              <TouchableOpacity style={styles.editButton} onPress={handleChangePassword}>
                <Icon name="pencil-outline" size={16} color={Colors.primaryPink} />
                <Text style={styles.editButtonText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isChangingPassword ? (
            // View Mode
            <View style={styles.infoRow}>
              <Icon name="lock-closed-outline" size={16} color={Colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Password</Text>
                <Text style={styles.infoValue}>••••••••</Text>
              </View>
            </View>
          ) : (
            // Edit Mode
            <>
              <Input
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (passwordErrors.currentPassword) setPasswordErrors({ ...passwordErrors, currentPassword: '' });
                }}
                secureTextEntry
                errorMessage={passwordErrors.currentPassword}
                required
                inputStyle={styles.editInputField}
              />
              <Input
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (passwordErrors.newPassword) setPasswordErrors({ ...passwordErrors, newPassword: '' });
                }}
                secureTextEntry
                errorMessage={passwordErrors.newPassword}
                required
                inputStyle={styles.editInputField}
              />
              <Input
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (passwordErrors.confirmPassword) setPasswordErrors({ ...passwordErrors, confirmPassword: '' });
                }}
                secureTextEntry
                errorMessage={passwordErrors.confirmPassword}
                required
                inputStyle={styles.editInputField}
              />
              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  onPress={handleCancelPassword}
                  variant="outline"
                  style={styles.inlineButton}
                />
                <Button
                  title={savingPassword ? 'Updating...' : 'Update'}
                  onPress={handleSavePassword}
                  variant="primary"
                  style={styles.inlineButton}
                  loading={savingPassword}
                  disabled={savingPassword}
                />
              </View>
            </>
          )}
        </View>

        {/* Quick Links */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Icon name="settings-outline" size={18} color={Colors.pinkAccent} />
            <Text style={styles.cardTitle}>Quick Links</Text>
          </View>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('AllAboutCoconuts')}>
            <View style={[styles.linkIcon, { backgroundColor: '#E0E0E0' }]}>
              <Icon name="play-circle-outline" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.linkText}>All About Coconuts</Text>
            <Icon name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow}>
            <View style={[styles.linkIcon, { backgroundColor: '#E0E0E0' }]}>
              <Icon name="document-text-outline" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.linkText}>Document Center</Text>
            <Icon name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.linkRow}
            onPress={() => navigation.navigate('PrivacyPolicy')}>
            <View style={[styles.linkIcon, { backgroundColor: '#E0E0E0' }]}>
              <Icon name="shield-checkmark-outline" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Icon name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.linkRow}
            onPress={() => navigation.navigate('TermsAndConditions')}>
            <View style={[styles.linkIcon, { backgroundColor: '#E0E0E0' }]}>
              <Icon name="document-text-outline" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.linkText}>Terms & Conditions</Text>
            <Icon name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Contact Section */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>NEED TO MODIFY OR CANCEL AN ORDER?</Text>
          <Text style={styles.contactSubtitle}>Call us if you want to modify or cancel your order</Text>
          <TouchableOpacity 
            style={styles.phoneButton}
            onPress={handlePhoneCall}>
            <Icon name="call-outline" size={20} color={Colors.cardBackground} />
            <Text style={styles.phoneButtonText}>+1 (555) 123-4567</Text>
          </TouchableOpacity>
        </View>

        {/* Connect With Us */}
        <View style={styles.socialCard}>
          <Text style={styles.socialTitle}>Connect With Us</Text>
          <Text style={styles.socialSubtitle}>Follow us on social media for updates, tips, and special offers!</Text>
          <View style={styles.socialIcons}>
            <TouchableOpacity style={styles.socialIcon}>
              <Text style={styles.socialIconText}>f</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Icon name="logo-instagram" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Icon name="logo-twitter" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Icon name="logo-linkedin" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon}>
              <Icon name="logo-youtube" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await supabase.auth.signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }}>
          <Icon name="log-out-outline" size={20} color={Colors.primaryPink} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>CoconutStock Customer App v1.0.0</Text>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomTabNavigation navigation={navigation} activeTab="Profile" />

      {/* Add Address Modal */}
      <AddAddressModal
        visible={showAddAddressModal}
        onClose={() => {
          setShowAddAddressModal(false);
          setEditingAddressIndex(null);
        }}
        onSave={handleAddAddress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    backgroundColor: Colors.primaryPink,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 20,
    alignItems: 'center', 
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.cardBackground,
    borderWidth: 4,
    borderColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primaryPink,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryPink,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.cardBackground,
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyName: {
    fontSize: 14,
    color: Colors.cardBackground,
    opacity: 0.9,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -40,
    marginBottom: 16,
    gap: 12,
    zIndex: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recentOrdersCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primaryPink,
    fontWeight: '500',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  orderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.cardBackground,
  },
  noOrdersText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  infoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: Colors.primaryPink,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  addressRowLast: {
    borderBottomWidth: 0,
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  defaultBadge: {
    backgroundColor: Colors.primaryPink,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.cardBackground,
  },
  addressAction: {
    marginLeft: 'auto',
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addressValue: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  addressNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  setDefaultButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  setDefaultText: {
    fontSize: 11,
    color: Colors.primaryPink,
    fontWeight: '500',
  },
  noAddressText: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingVertical: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  contactCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryPink,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  phoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.cardBackground,
  },
  socialCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  socialSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.primaryPink,
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primaryPink,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 20,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  editInputField: {
    // backgroundColor: Colors.backgroundGray,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  inlineButton: {
    flex: 1,
  },
});

export default ProfileScreen;
