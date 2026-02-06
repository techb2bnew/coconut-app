/**
 * Profile Screen
 * Complete profile view with user info, summary cards, and sections
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import AddAddressModal from '../components/AddAddressModal';
import Input from '../components/Input';
import Button from '../components/Button';
import { validateRequired, validatePassword, validatePasswordMatch } from '../utils/validation';
import supabase from '../config/supabase';
import { performLogoutAndNavigateToLogin } from '../services/customerAuthCheck';

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const [phone, setPhone] = useState('');
  const [accountErrors, setAccountErrors] = useState({});
  const [savingAccount, setSavingAccount] = useState(false);
  
  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  // Helper function to get status color
  const getStatusColor = (status) => {
    if (!status) return '#9E9E9E';
    const statusLower = status.trim().toLowerCase();
    
    if (statusLower === 'completed') return '#4CAF50'; // Green for Completed
    if (statusLower === 'processing') return '#FFE082'; // Yellow/Orange for Processing
    if (statusLower.includes('completed')) return '#4CAF50'; // Green for completed
    if (statusLower.includes('processing')) return '#FFE082'; // Yellow for processing
    if (statusLower.includes('delivered')) return '#4CAF50'; // Green for delivered
    if (statusLower.includes('delivery')) return '#81D4FA'; // Blue for out for delivery
    if (statusLower.includes('in transit')) return '#81D4FA'; // Blue for in transit
    if (statusLower.includes('driver assigned')) return '#FFE082'; // Yellow for driver assigned
    if (statusLower.includes('progress')) return '#FFE082'; // Yellow for in progress
    if (statusLower.includes('pending')) return '#FFCC80'; // Orange for pending
    return '#f2f2f2'; // Default gray
  };

  // Fetch customer data function (extracted to be reusable)
  const fetchCustomerData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (customerError) {
        setLoading(false);
        setRefreshing(false);
        // Customer deleted by admin (no row) → auto logout (expected, not an error)
        if (customerError.code === 'PGRST116' || !customer) {
          await performLogoutAndNavigateToLogin();
          return;
        }
        console.error('Error fetching customer:', customerError);
        return;
      }

      // Customer set inactive by admin → auto logout
      const status = (customer?.status || '').trim().toLowerCase();
      const isInactive = status === 'inactive' || status === 'disabled' || status === 'deactivated';
      if (isInactive) {
        setLoading(false);
        setRefreshing(false);
        await performLogoutAndNavigateToLogin();
        return;
      }

      setCustomerData(customer);
      
      // Initialize form fields when customer data is loaded
      if (customer) {
        setFirstName(customer.first_name || '');
        setLastName(customer.last_name || '');
        setCompanyName(customer.company_name || '');
        setPhone(customer.phone || '');
      }

      // Fetch orders for stats
      if (customer?.id) {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false }); // Sort by created_at to get latest orders first

        if (!ordersError && orders) {
          // Calculate active orders (orders that are NOT completed or delivered)
          const activeOrdersCount = orders.filter((order) => {
            const status = (order.status || '').trim().toLowerCase();
            const deliveryStatus = (order.delivery_status || order.deliveryStatus || '').trim().toLowerCase();
            const statusToCheck = deliveryStatus || status;
            
            // Count orders that are NOT completed or delivered
            const isCompleted = statusToCheck.includes('completed') || statusToCheck.includes('delivered');
            return !isCompleted;
          }).length;

          setStats({
            totalOrders: orders.length,
            activeOrders: activeOrdersCount,
          });

          // Get recent orders (already sorted by created_at desc from query)
          const recent = orders.slice(0, 3);
          setRecentOrders(recent);
        }
      }
    } catch (error) {
      console.error('Error in fetchCustomerData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCustomerData(true);
  }, [fetchCustomerData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Profile screen focused, refreshing data...');
      fetchCustomerData(false);
    }, [fetchCustomerData])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    fetchCustomerData(false);
  }, [fetchCustomerData]);

  // Get initials for avatar (first and last letter of name)
  const getInitials = () => {
    if (!customerData) return 'JD';
    const firstName = customerData.first_name || '';
    const lastName = customerData.last_name || '';
    const firstLetter = firstName.charAt(0).toUpperCase() || '';
    const lastLetter = lastName.charAt(0).toUpperCase() || '';
    return (firstLetter + lastLetter) || 'JD';
  };

  // Get company logo URL
  const getCompanyLogo = () => {
    return customerData?.companyLogo || customerData?.company_logo || null;
  };

  // Get initials for avatar (old function - keeping for reference)
  const getInitialsOld = () => {
    if (!customerData) return 'JD';
    const first = customerData.first_name?.[0] || '';
    const last = customerData.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'JD';
  };

  // Format date - get time ago (same as HomeScreen)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  // Parse delivery addresses from JSON - handles admin-added addresses
  const parseAddresses = () => {
    if (!customerData?.delivery_address) return [];
    try {
      let addresses = [];
      
      // If it's a string, try to parse it as JSON first
      if (typeof customerData.delivery_address === 'string') {
        try {
          const parsed = JSON.parse(customerData.delivery_address);
          // If parsed successfully and it's an array
          if (Array.isArray(parsed)) {
            addresses = parsed;
          } 
          // If it's an object with "address" key (old format)
          else if (parsed && typeof parsed === 'object' && parsed.address) {
            addresses = [{
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              label: parsed.label || 'Main Office',
              street: parsed.address || parsed.street || '',
              city: parsed.city || '',
              state: parsed.state || '',
              zipCode: parsed.zipCode || parsed.zip_code || '',
              notes: parsed.notes || '',
              isSelected: parsed.isSelected !== undefined ? parsed.isSelected : true,
            }];
          }
          // If it's a plain object (admin might have added it this way)
          else if (parsed && typeof parsed === 'object') {
            addresses = [parsed];
          }
        } catch (parseError) {
          // If JSON parsing fails, treat it as a plain string address (admin-added format)
          addresses = [{
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: 'Delivery Address',
            street: customerData.delivery_address,
            city: '',
            state: '',
            zipCode: '',
            notes: '',
            isSelected: true,
          }];
        }
      } 
      // If it's already an array (jsonb array format)
      else if (Array.isArray(customerData.delivery_address)) {
        addresses = customerData.delivery_address;
      } 
      // If it's an object (jsonb object format)
      else if (typeof customerData.delivery_address === 'object') {
        // Check if it has an address property
        if (customerData.delivery_address.address || customerData.delivery_address.street) {
          addresses = [{
            id: customerData.delivery_address.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: customerData.delivery_address.label || 'Main Office',
            street: customerData.delivery_address.address || customerData.delivery_address.street || '',
            city: customerData.delivery_address.city || '',
            state: customerData.delivery_address.state || '',
            zipCode: customerData.delivery_address.zipCode || customerData.delivery_address.zip_code || '',
            notes: customerData.delivery_address.notes || '',
            isSelected: customerData.delivery_address.isSelected !== undefined ? customerData.delivery_address.isSelected : true,
          }];
        } else {
          // If it's an object but doesn't have address/street, treat it as a single address object
          addresses = [customerData.delivery_address];
        }
      }
      
      // Ensure all addresses have IDs and proper structure
      return addresses.map((addr, index) => {
        // If address is just a string, convert it to proper format
        if (typeof addr === 'string') {
          return {
            id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            label: 'Delivery Address',
            street: addr,
            city: '',
            state: '',
            zipCode: '',
            notes: '',
            isSelected: index === 0,
          };
        }
        
        // Ensure all addresses have IDs
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
      // Fallback: if parsing fails completely, try to show the raw value
      if (customerData.delivery_address) {
        return [{
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          label: 'Delivery Address',
          street: typeof customerData.delivery_address === 'string' 
            ? customerData.delivery_address 
            : JSON.stringify(customerData.delivery_address),
          city: '',
          state: '',
          zipCode: '',
          notes: '',
          isSelected: true,
        }];
      }
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
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not logged in.',
          position: 'top',
          visibilityTime: 2500,
        });
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
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to save address. Please try again.',
          position: 'top',
          visibilityTime: 2500,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Address added successfully!',
        position: 'top',
        visibilityTime: 2500,
      });
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
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred.',
        position: 'top',
        visibilityTime: 2500,
      });
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not logged in.',
          position: 'top',
          visibilityTime: 2500,
        });
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
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to set default address.',
          position: 'top',
          visibilityTime: 2500,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Default address updated successfully!',
        position: 'top',
        visibilityTime: 2500,
      });
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
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred.',
        position: 'top',
        visibilityTime: 2500,
      });
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not logged in.',
          position: 'top',
          visibilityTime: 2500,
        });
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
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to delete address.',
          position: 'top',
          visibilityTime: 2500,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Address deleted successfully!',
        position: 'top',
        visibilityTime: 2500,
      });
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
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred.',
        position: 'top',
        visibilityTime: 2500,
      });
    }
  };

  // Account Editing Functions
  const handleEditAccount = () => {
    if (customerData) {
      setFirstName(customerData.first_name || '');
      setLastName(customerData.last_name || '');
      setCompanyName(customerData.company_name || '');
      setPhone(customerData.phone || '');
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
      setPhone(customerData.phone || '');
    }
  };

  const handleSaveAccount = async () => {
    const newErrors = {};
    if (!firstName.trim()) newErrors.firstName = 'First Name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last Name is required';
    if (!phone.trim()) {
      newErrors.phone = 'Phone Number is required';
    } else if (phone.trim().length !== 10) {
      newErrors.phone = 'Phone Number must be exactly 10 digits';
    }
    // Company is read-only, no validation needed

    if (Object.keys(newErrors).length > 0) {
      setAccountErrors(newErrors);
      return;
    }

    setSavingAccount(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not logged in.',
          position: 'top',
          visibilityTime: 2500,
        });
        setSavingAccount(false);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          // Company is read-only, don't update it
        })
        .eq('email', user.email);

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Failed to update account.',
          position: 'top',
          visibilityTime: 2500,
        });
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
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Account information updated successfully!',
        position: 'top',
        visibilityTime: 2500,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred.',
        position: 'top',
        visibilityTime: 2500,
      });
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
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Unable to open phone dialer. Please try again.',
        position: 'top',
        visibilityTime: 2500,
      });
    }
  };

  // Handle social media link opening
  const handleSocialLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Unable to open this link.',
          position: 'top',
          visibilityTime: 2500,
        });
      }
    } catch (error) {
      console.error('Error opening social media link:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Unable to open this link. Please try again.',
        position: 'top',
        visibilityTime: 2500,
      });
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
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not logged in.',
          position: 'top',
          visibilityTime: 2500,
        });
        setSavingPassword(false);
        return;
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Current password is incorrect.',
          position: 'top',
          visibilityTime: 2500,
        });
        setSavingPassword(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: updateError.message || 'Failed to update password.',
          position: 'top',
          visibilityTime: 2500,
        });
        setSavingPassword(false);
        return;
      }

      // Clear form states
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Show success toast and logout after delay
      Toast.show({
        type: 'success',
        text1: 'Password Changed',
        text2: 'You have changed your password. Please login again.',
        position: 'top',
        visibilityTime: 3000,
        onHide: async () => {
          // Logout user
          await supabase.auth.signOut();
          // Navigate to Login screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred.',
        position: 'top',
        visibilityTime: 2500,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryPink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primaryBlue}
            colors={[Colors.primaryBlue]}
          />
        }>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {getCompanyLogo() ? (
                <Image 
                  source={{ uri: getCompanyLogo() }} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{getInitials()}</Text>
              )}
            </View>
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
            <View style={[styles.summaryIcon, { backgroundColor: Colors.primaryPink }]}>
              <Icon name="cube-outline" size={20} color={Colors.cardBackground} />
            </View>
            <Text style={styles.summaryValue}>{stats.totalOrders}</Text>
            <Text style={styles.summaryLabel}>Total Orders</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#9500ff' }]}>
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
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('HomeStack', { screen: 'OrdersList' })}>
              <Icon name="chevron-forward" size={18} color={Colors.primaryPink} />
            </TouchableOpacity>
          </View>
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => {
              const deliveryStatus = order.delivery_status || order.deliveryStatus || order.status || 'Pending';
              const statusColor = getStatusColor(deliveryStatus);
              return (
                <View key={order.id} style={styles.orderRow}>
                  <View style={[styles.orderIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="checkmark-circle" size={20} color={Colors.success} />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>{order.order_name || `ORD-${order.id}`}</Text>
                    <Text style={styles.orderTime}>
                      {formatDate(order.created_at || order.createdAt || order.created_date || order.order_date)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusText}>{deliveryStatus.charAt(0).toUpperCase() + deliveryStatus.slice(1)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noOrdersText}>No recent orders</Text>
          )}
        </View>

        {/* Account Information */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View  >
              <Icon name="person" size={18} color={Colors.primaryPink} />
            </View>
            <Text style={styles.sectionTitle}>Account Information</Text>
            {!isEditingAccount && (
              <TouchableOpacity style={styles.iconButton} onPress={handleEditAccount}>
                <Icon name="pencil-outline" size={14} color={Colors.primaryPink} />
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
                  <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
                    {customerData ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() : 'John Doe'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="mail-outline" size={16} color={Colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{customerData?.email || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="business-outline" size={16} color={Colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Company Name</Text>
                  <Text style={styles.infoValue}>{customerData?.company_name || 'Beach Resort & Spa'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Icon name="call-outline" size={16} color={Colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{customerData?.phone || 'N/A'}</Text>
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
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Input
                    label="Email"
                    placeholder="Email"
                    value={customerData?.email || ''}
                    editable={false}
                    inputStyle={styles.editInputField}
                  />
                </View>
              </View>
              <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                  <Input
                    label="Phone Number"
                    placeholder="Phone Number"
                    value={phone}
                    onChangeText={(text) => {
                      // Only allow numeric input and limit to 10 digits
                      const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
                      setPhone(numericText);
                      if (accountErrors.phone) setAccountErrors({ ...accountErrors, phone: '' });
                    }}
                    errorMessage={accountErrors.phone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    required
                    inputStyle={styles.editInputField}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Input
                    label="Company"
                    placeholder="Company"
                    value={companyName}
                    editable={false}
                    inputStyle={styles.editInputField}
                  />
                </View>
               
              </View>
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
            <Text style={styles.sectionTitle}>Delivery Addresses</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setEditingAddressIndex(null);
                setShowAddAddressModal(true);
              }}>
              <Icon name="add" size={18} color={Colors.primaryPink} />
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
            <View>
              <Icon name="shield" size={18} color={Colors.error} />
            </View>
            <Text style={styles.sectionTitle}>Security & Password</Text>
            {!isChangingPassword && (
              <TouchableOpacity style={styles.iconButton} onPress={handleChangePassword}>
                <Icon name="pencil-outline" size={14} color={Colors.primaryPink} />
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
            <Text style={styles.sectionTitle}>Quick Links</Text>
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
          <TouchableOpacity 
            style={styles.linkRow}
            onPress={() => navigation.navigate('DocumentCenter')}>
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
          <Text style={styles.sectionTitle}>Need to modify or cancel an order?</Text>
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
          <Text style={styles.sectionTitle}>Connect With Us</Text>
          <Text style={styles.socialSubtitle}>Follow us on social media for updates, tips, and special offers!</Text>
          <View style={styles.socialIcons}>
            <TouchableOpacity 
              style={styles.socialIcon}
              onPress={() => handleSocialLink('https://www.facebook.com/coconutstock/')}>
              <Icon name="logo-facebook" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialIcon}
              onPress={() => handleSocialLink('https://www.instagram.com/coconutstock/')}>
              <Icon name="logo-instagram" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialIcon}
              onPress={() => handleSocialLink('https://www.linkedin.com/company/coconut-stock-corp/')}>
              <Icon name="logo-linkedin" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialIcon}
              onPress={() => handleSocialLink('https://tr.pinterest.com/coconutstockcorp/')}>
              <Icon name="logo-pinterest" size={20} color={Colors.textPrimary} />
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
    backgroundColor: Colors.primaryBlue,
    paddingTop: Platform.OS === 'ios' ? 55 : 20,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: fontFamilyBody,
    color: Colors.primaryPink,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyName: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    opacity: 0.9,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? -40 : -40,
    marginBottom: 16,
    gap: Platform.OS === 'ios' ? 12 : 12,
    zIndex: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 2 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.1,
    shadowRadius: Platform.OS === 'ios' ? 4 : 4,
    elevation: Platform.OS === 'android' ? 3 : 0,
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
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fontFamilyHeading,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  recentOrdersCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 1 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.05,
    shadowRadius: Platform.OS === 'ios' ? 4 : 2,
    elevation: Platform.OS === 'android' ? 1 : 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.textPrimary,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
    color: '#000000', 
  },
  noOrdersText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
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
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 1 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.05,
    shadowRadius: Platform.OS === 'ios' ? 4 : 2,
    elevation: Platform.OS === 'android' ? 1 : 0,
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
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.primaryPink,
    fontWeight: '500',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lightPink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryPink,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  addressNotes: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
    color: Colors.primaryPink,
    fontWeight: '500',
  },
  noAddressText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  socialSubtitle: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
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
    fontFamily: fontFamilyBody,
    color: Colors.primaryPink,
  },
  versionText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
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
