/**
 * Create Order Screen
 * Form to create a new order with product type, quantity, addons, and logo upload
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  Alert,
  PermissionsAndroid,
  Platform,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Colors from '../theme/colors';
import TextStyles from '../theme/textStyles';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import supabase from '../config/supabase';
import { performLogoutAndNavigateToLogin } from '../services/customerAuthCheck';
import Dropdown from '../components/Dropdown';

const { width, height } = Dimensions.get('window');

// Banner image
const orderBannerImage = require('../assest/coconut1.png');
const BANNER_HEIGHT = height * 0.6; // 60% of screen height

const CreateOrderScreen = ({ navigation, route }) => {
  const reorderData = route?.params?.reorderData || null;
  
  const [productType, setProductType] = useState('case');
  const [quantity, setQuantity] = useState('');
  const [openerKit, setOpenerKit] = useState(false);
  const [specialEvent, setSpecialEvent] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [customerDeliveryAddress, setCustomerDeliveryAddress] = useState('');
  const [deliveryAddresses, setDeliveryAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [franchiseId, setFranchiseId] = useState(null);
  const [deliveryZone, setDeliveryZone] = useState(null);
  const [zoneCity, setZoneCity] = useState(null);
  const [calculatedDeliveryDate, setCalculatedDeliveryDate] = useState(null);
  const [deliveryDayText, setDeliveryDayText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedOrderDate, setSelectedOrderDate] = useState(new Date());
  const [orderDateText, setOrderDateText] = useState('');
  
  // Bottom sheet ref and snap points
  const bottomSheetRef = useRef(null);
  const scrollViewRef = useRef(null);
  const notesInputRef = useRef(null);
  const notesContainerRef = useRef(null);
  const quantityInputRef = useRef(null);
  const quantityContainerRef = useRef(null);
  const poNumberInputRef = useRef(null);
  const poNumberContainerRef = useRef(null);
  const quantityCardRef = useRef(null);
  const poNumberCardRef = useRef(null);
  const notesCardRef = useRef(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);

  // Handle sheet position changes to ensure it doesn't go beyond 80%
  const handleSheetChange = useCallback((index) => {
    // Ensure sheet doesn't go beyond 80% snap point
    if (index >= snapPoints.length) {
      bottomSheetRef.current?.snapToIndex(snapPoints.length - 1);
    }
  }, [snapPoints]);
  
  // Animation for banner
  const bannerAnim = useRef(new Animated.Value(0)).current;

  // Product type options
  const productTypeOptions = [
    { label: 'Case (9 pieces or 9 units)', value: 'case' },
  ];

  // Parse delivery addresses and get selected/default address
  const getSelectedAddressFromArray = (deliveryAddress) => {
    if (!deliveryAddress) return null;
    try {
      let addresses = [];
      
      // If it's a string, try to parse it
      if (typeof deliveryAddress === 'string') {
        try {
          const parsed = JSON.parse(deliveryAddress);
          // If it's an object with "address" key (old format)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.address) {
            return parsed.address;
          }
          // If it's already an array
          if (Array.isArray(parsed)) {
            addresses = parsed;
          }
        } catch {
          // If parsing fails, treat as plain string
          return deliveryAddress;
        }
      } else if (Array.isArray(deliveryAddress)) {
        addresses = deliveryAddress;
      } else if (typeof deliveryAddress === 'object' && deliveryAddress.address) {
        return deliveryAddress.address;
      }

      // Find selected address or return first one
      if (addresses.length > 0) {
        const selected = addresses.find(a => a.isSelected === true);
        if (selected) {
          // Format address
          const parts = [
            selected.street,
            selected.city,
            selected.state,
            selected.zipCode,
          ].filter(Boolean);
          return parts.join(', ');
        }
        // If no selected, use first address
        const first = addresses[0];
        if (first.street) {
          const parts = [
            first.street,
            first.city,
            first.state,
            first.zipCode,
          ].filter(Boolean);
          return parts.join(', ');
        }
      }
      return null;
    } catch (error) {
      console.error('Error parsing addresses:', error);
      // Fallback to string if it exists
      return typeof deliveryAddress === 'string' ? deliveryAddress : null;
    }
  };

  // Parse delivery addresses from customer data
  const parseDeliveryAddresses = (deliveryAddress) => {
    if (!deliveryAddress) return [];
    try {
      let addresses = [];
      
      if (typeof deliveryAddress === 'string') {
        try {
          const parsed = JSON.parse(deliveryAddress);
          if (Array.isArray(parsed)) {
            addresses = parsed;
          } else if (parsed && typeof parsed === 'object' && parsed.address) {
            addresses = [{
              id: '1',
              label: 'Main Office',
              street: parsed.address,
              city: '',
              state: '',
              zipCode: '',
              isSelected: true,
            }];
          }
        } catch {
          return [];
        }
      } else if (Array.isArray(deliveryAddress)) {
        addresses = deliveryAddress;
      }
      
      // Ensure all addresses have IDs
      return addresses.map((addr, index) => ({
        ...addr,
        id: addr.id || `${index + 1}`,
        label: addr.label || `Address ${index + 1}`,
      }));
    } catch (error) {
      console.error('Error parsing addresses:', error);
      return [];
    }
  };

  // Fetch customer ID and delivery addresses
  const fetchCustomerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        return { customerId: null, deliveryAddresses: [], selectedAddress: null, franchiseId: null, deliveryZone: null, zoneCity: null };
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, delivery_address, franchise_id, delivery_zone, zoneCity, status')
        .eq('email', user.email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          await performLogoutAndNavigateToLogin();
          return { customerId: null, deliveryAddresses: [], selectedAddress: null, franchiseId: null, deliveryZone: null, zoneCity: null };
        }
        console.error('Error fetching customer:', error);
        return { customerId: null, deliveryAddresses: [], selectedAddress: null, franchiseId: null, deliveryZone: null, zoneCity: null };
      }

      const status = (customer?.status || '').trim().toLowerCase();
      const isInactive = status === 'inactive' || status === 'disabled' || status === 'deactivated';
      if (isInactive) {
        await performLogoutAndNavigateToLogin();
        return { customerId: null, deliveryAddresses: [], selectedAddress: null, franchiseId: null, deliveryZone: null, zoneCity: null };
      }

      // Parse all addresses
      const addresses = parseDeliveryAddresses(customer?.delivery_address);
      
      // Find selected address or use first one
      const selected = addresses.find(addr => addr.isSelected) || addresses[0];

      return {
        customerId: customer?.id || null,
        deliveryAddresses: addresses,
        selectedAddress: selected,
        franchiseId: customer?.franchise_id || null,
        deliveryZone: customer?.delivery_zone || null,
        zoneCity: customer?.zoneCity || null,
      };
    } catch (error) {
      console.error('Error in fetchCustomerData:', error);
      return { customerId: null, deliveryAddresses: [], selectedAddress: null, franchiseId: null, deliveryZone: null, zoneCity: null };
    }
  };

  // Fetch delivery rules and calculate delivery date
  // Returns: { deliveryDate: Date, deliveryDayText: string } or null
  const fetchDeliveryRulesAndCalculate = async (franchiseId, orderQuantity, orderTime, customerZone, zoneCityName) => {
    console.log('🔄 Starting delivery date calculation:', {
      franchiseId,
      orderQuantity,
      orderTime,
      customerZone,
      zoneCityName
    });

    if (!franchiseId) {
      console.log('❌ No franchise ID, using fallback - delivery_day_date will be blank');
      const defaultDate = new Date();
      defaultDate.setHours(0, 0, 0, 0);
      setCalculatedDeliveryDate(defaultDate);
      setDeliveryDayText(''); // Empty for fallback case
      return { deliveryDate: defaultDate, deliveryDayText: null, isFallback: true };
    }

    // Parse order quantity
    const orderQty = parseInt(orderQuantity) || 0; 

    try {
      // PRIORITY 1: Fetch quantity-based rules first (exactly like warehouse code)
      const { data: quantityRules, error: qError } = await supabase
        .from('quantity_delivery_rules')
        .select('*')
        .eq('franchise_id', franchiseId)
        .eq('status', 'Active')
        .order('min_quantity', { ascending: true });

     

      let quantityRuleMatched = false;

      if (!qError && quantityRules && quantityRules.length > 0) {
       
        
        // Find ALL matching quantity rules first, then select the best match
        // Handle null max_quantity properly - if null, don't use Infinity, skip that rule
        const matchingRules = quantityRules.filter(rule => {
          const min = parseInt(rule.min_quantity);
          const max = rule.max_quantity !== null && rule.max_quantity !== undefined 
            ? parseInt(rule.max_quantity) 
            : null;
          
          // If max is null or invalid, skip this rule
          if (max === null || isNaN(min) || isNaN(max)) {
            console.log(`⚠️ Skipping invalid rule: min=${rule.min_quantity} (${typeof rule.min_quantity}), max=${rule.max_quantity} (${typeof rule.max_quantity})`);
            return false;
          }
          
          // Check if order quantity falls within range
          const matches = orderQty >= min && orderQty <= max;
          const range = max - min;
          console.log(`🔍 Checking quantity rule: min=${min}, max=${max}, range=${range}, orderQty=${orderQty}, matches=${matches}, delivery_offset=${rule.delivery_offset} (${typeof rule.delivery_offset})`);
          return matches;
        });
        
        
        
        // If multiple rules match, select the one with the smallest range (most specific)
        // This handles overlapping ranges correctly
        let matchingRule = null;
        if (matchingRules.length > 0) {
          if (matchingRules.length === 1) {
            matchingRule = matchingRules[0];
          } else {
            // Multiple matches - find the one with smallest range (most specific)
            matchingRule = matchingRules.reduce((best, current) => {
              const bestRange = parseInt(best.max_quantity) - parseInt(best.min_quantity);
              const currentRange = parseInt(current.max_quantity) - parseInt(current.min_quantity);
              return currentRange < bestRange ? current : best;
            });
           
          }
        }

        if (matchingRule) {
        
          
          // delivery_offset can be number (0, 1, 2) or text ("Same Day", "1 day", "2 day")
          let deliveryOffset = 0;
          const offsetValue = matchingRule.delivery_offset;
           
          
          if (offsetValue === null || offsetValue === undefined) {
            deliveryOffset = 0;
          } else if (typeof offsetValue === 'string') {
            // Handle text format: "Same Day", "1 day", "2 day", "2 days", etc.
            const offsetLower = String(offsetValue).toLowerCase().trim();
            if (offsetLower.includes('same') || offsetLower === '0' || offsetLower === 'same day') {
              deliveryOffset = 0;
            } else if (offsetLower.includes('1 day') || offsetLower === '1' || offsetLower.startsWith('1')) {
              deliveryOffset = 1;
            } else if (offsetLower.includes('2 day') || offsetLower === '2' || offsetLower.startsWith('2')) {
              deliveryOffset = 2;
            } else {
              // Try to extract number from string
              const numMatch = String(offsetValue).match(/\d+/);
              if (numMatch) {
                deliveryOffset = parseInt(numMatch[0]);
              } else {
                console.warn('⚠️ Could not parse delivery_offset from string:', offsetValue);
                deliveryOffset = 0;
              }
            }
          } else {
            // Handle numeric format
            deliveryOffset = parseInt(offsetValue) || 0;
          }
          
          // Validate delivery_offset
          if (isNaN(deliveryOffset)) {
            console.warn('⚠️ Invalid delivery_offset after parsing, defaulting to Same Day. Original value:', offsetValue);
            const deliveryDate = new Date();
            deliveryDate.setHours(0, 0, 0, 0);
            setCalculatedDeliveryDate(deliveryDate);
            setDeliveryDayText('Same Day');
            return deliveryDate;
          }
          
           
          const deliveryDate = new Date();
          
          if (deliveryOffset === 0) {
            deliveryDate.setHours(0, 0, 0, 0);
            setDeliveryDayText('Same Day');
          } else if (deliveryOffset === 1) {
            deliveryDate.setDate(deliveryDate.getDate() + 1);
            deliveryDate.setHours(0, 0, 0, 0);
            setDeliveryDayText('1 day');
          } else if (deliveryOffset === 2) {
            deliveryDate.setDate(deliveryDate.getDate() + 2);
            deliveryDate.setHours(0, 0, 0, 0);
            setDeliveryDayText('2 days');
          } else {
            // Fallback for any other value
            deliveryDate.setDate(deliveryDate.getDate() + deliveryOffset);
            deliveryDate.setHours(0, 0, 0, 0);
            setDeliveryDayText(`${deliveryOffset} ${deliveryOffset === 1 ? 'day' : 'days'}`);
          }
          
          const dayText = deliveryOffset === 0 ? 'Same Day' : deliveryOffset === 1 ? '1 day' : '2 days';
         
          setCalculatedDeliveryDate(deliveryDate);
          setDeliveryDayText(dayText);
          console.log('🛑 Quantity rule matched - RETURNING EARLY, zone rules will NOT be checked');
          return { deliveryDate, deliveryDayText: dayText };
        } else {
          console.log('❌ No matching quantity rule found for order quantity:', orderQty, 'Available rules:', quantityRules.map(r => `${r.min_quantity}-${r.max_quantity}`));
        }
      } else {
        console.log('❌ No quantity rules found or error:', qError);
      } 
      
      if (customerZone || zoneCityName) { 
        
        let zoneRules = null;
        let zError = null;

        // First try with zone_id (UUID) - convert to string for comparison
        if (customerZone) {
          const customerZoneStr = String(customerZone);
          const result = await supabase
            .from('zone_delivery_rules')
            .select('*')
            .eq('franchise_id', franchiseId)
            .eq('status', 'Active');
          
          // Try to match by zone_id
          const { data: allZoneRules } = await result;
          if (allZoneRules && allZoneRules.length > 0) {
            zoneRules = allZoneRules.find(rule => String(rule.zone_id) === customerZoneStr);
            if (!zoneRules) {
              zError = { message: 'Zone rule not found' };
            }
          } else {
            zError = { message: 'No zone rules found' };
          }
        }

        // If not found with zone_id, try with zone name
        if ((zError || !zoneRules) && zoneCityName) {
          console.log('🔍 Trying to find zone by name:', zoneCityName);
          // Fetch zone by name from delivery_zones table
          const { data: zoneData } = await supabase
            .from('delivery_zones')
            .select('id, name')
            .ilike('name', `%${zoneCityName}%`)
            .limit(1)
            .maybeSingle();

          if (zoneData?.id) {
            const zoneIdStr = String(zoneData.id);
            const result = await supabase
              .from('zone_delivery_rules')
              .select('*')
              .eq('franchise_id', franchiseId)
              .eq('status', 'Active');
            
            const { data: allZoneRules } = await result;
            if (allZoneRules && allZoneRules.length > 0) {
              zoneRules = allZoneRules.find(rule => String(rule.zone_id) === zoneIdStr);
            }
          }
        }

        if (zoneRules && zoneRules.cutoff_time) { 
          
          // Use next_day_offset (before cutoff) and after_cutoff_offset (after cutoff) - exactly like warehouse code
          const cutoffTime = zoneRules.cutoff_time; // Format: "HH:MM:SS" or "HH:MM"
          // Parse offsets - handle 0 as valid value (don't use || fallback for 0)
          // Use Number() instead of parseInt() to handle both integers and ensure 0 is preserved
          const nextDayOffsetParsed = zoneRules.next_day_offset != null ? Number(zoneRules.next_day_offset) : null;
          const afterCutoffOffsetParsed = zoneRules.after_cutoff_offset != null ? Number(zoneRules.after_cutoff_offset) : null;
          const nextDayOffset = (nextDayOffsetParsed != null && !isNaN(nextDayOffsetParsed)) ? nextDayOffsetParsed : 1; // Before cutoff offset
          const afterCutoffOffset = (afterCutoffOffsetParsed != null && !isNaN(afterCutoffOffsetParsed)) ? afterCutoffOffsetParsed : 2; // After cutoff offset
          
         

          // Parse cutoff time (format: "HH:MM:SS" or "HH:MM")
          const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number);
          
          // Get order time in local timezone (convert from UTC if needed)
          let orderTimeLocal;
          const orderDateStr = orderTime ? orderTime.toISOString() : new Date().toISOString();
          
          // If order_date is in ISO format without timezone, treat as UTC
          if (orderDateStr.includes('T') && !orderDateStr.includes('Z') && !orderDateStr.includes('+') && !orderDateStr.match(/-\d{2}:\d{2}$/)) {
            orderTimeLocal = new Date(orderDateStr + 'Z');
          } else {
            orderTimeLocal = new Date(orderDateStr);
          }
          
          // Get local time hours and minutes
          const orderHours = orderTimeLocal.getHours();
          const orderMinutes = orderTimeLocal.getMinutes();
          
          // Compare order time with cutoff time (using LOCAL time)
          const orderTimeMinutes = orderHours * 60 + orderMinutes;
          const cutoffTimeMinutes = cutoffHours * 60 + cutoffMinutes;
          
          // Zone-based rule logic (exactly like warehouse code):
          // - If order time is BEFORE cutoff time → use next_day_offset
          // - If order time is AFTER or EQUAL to cutoff time → use after_cutoff_offset
          const isAfterCutoff = orderTimeMinutes >= cutoffTimeMinutes;
          const deliveryOffset = isAfterCutoff ? afterCutoffOffset : nextDayOffset;
          
          

          const deliveryDate = new Date();
          
          if (deliveryOffset === 0) {
            deliveryDate.setHours(0, 0, 0, 0);
            setDeliveryDayText('Same Day');
          } else if (deliveryOffset === 1) {
            deliveryDate.setDate(deliveryDate.getDate() + 1);
            deliveryDate.setHours(0, 0, 0, 0);
            setDeliveryDayText('1 day');
          } else if (deliveryOffset === 2) {
            deliveryDate.setDate(deliveryDate.getDate() + 2);
            deliveryDate.setHours(0, 0, 0, 0);
            setDeliveryDayText('2 days');
          } else {
            deliveryDate.setDate(deliveryDate.getDate() + deliveryOffset);
            deliveryDate.setHours(0, 0, 0, 0);
            setDeliveryDayText(`${deliveryOffset} ${deliveryOffset === 1 ? 'day' : 'days'}`);
          }

          const dayText = deliveryOffset === 0 ? 'Same Day' : deliveryOffset === 1 ? '1 day' : '2 days';
          console.log('✅ Calculated delivery date from zone rule:', deliveryDate, 'Text:', dayText);
          setCalculatedDeliveryDate(deliveryDate);
          setDeliveryDayText(dayText);
          return { deliveryDate, deliveryDayText: dayText };
        } else {
          console.log('❌ No zone rule found or no cutoff_time');
        }
      }

      // Default fallback (only if no rules matched) 
      const defaultDate = new Date();
      defaultDate.setHours(0, 0, 0, 0);
      setCalculatedDeliveryDate(defaultDate);
      setDeliveryDayText(''); // Empty for fallback case
      return { deliveryDate: defaultDate, deliveryDayText: null, isFallback: true };
    } catch (error) {
      console.error('Error calculating delivery date:', error);
      // Default fallback
      const defaultDate = new Date();
      defaultDate.setHours(0, 0, 0, 0);
      setCalculatedDeliveryDate(defaultDate);
      setDeliveryDayText(''); // Empty for fallback case
      return { deliveryDate: defaultDate, deliveryDayText: null, isFallback: true };
    }
  };

  // Use ref to track the latest calculation call to prevent race conditions
  const calculationRef = useRef(0);
  // Use ref to store debounce timeout
  const debounceTimeoutRef = useRef(null);

  // Calculate estimated delivery date based on rules with debouncing
  useEffect(() => {
    // Clear previous timeout if user is still typing
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Don't calculate if quantity is empty - clear immediately
    if (!quantity || quantity.trim() === '') {
      setEstimatedDeliveryDate('');
      setDeliveryDayText('');
      return;
    }

    // Debounce: Wait 500ms after user stops typing before calculating
    debounceTimeoutRef.current = setTimeout(async () => {
      const calculateDeliveryDate = async () => {
        // Increment call counter to track latest call
        const callId = ++calculationRef.current;
        console.log(`🔄 [Call ${callId}] Starting calculation for quantity:`, quantity);
        
        // If no franchise, show default Same Day
        if (!franchiseId) {
      const today = new Date();
      const deliveryDate = new Date(today);
          deliveryDate.setHours(0, 0, 0, 0);
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const dayName = days[deliveryDate.getDay()];
      const monthName = months[deliveryDate.getMonth()];
      const day = deliveryDate.getDate();
      const year = deliveryDate.getFullYear();
      
      setEstimatedDeliveryDate(`${dayName}, ${monthName} ${day}, ${year}`);
          setDeliveryDayText('Same Day');
          return;
        }

        // Calculate based on rules - trim and parse quantity
        const quantityValue = quantity ? quantity.trim() : '';
        
        
        const result = await fetchDeliveryRulesAndCalculate(
          franchiseId,
          quantityValue,
          new Date(),
          deliveryZone,
          zoneCity
        );

        // Check if this is still the latest call (prevent race condition)
        if (callId !== calculationRef.current) {
          console.log(`⏭️ [Call ${callId}] Skipping state update - newer call (${calculationRef.current}) is in progress`);
          return;
        }

        if (result && result.deliveryDate) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          
          const dayName = days[result.deliveryDate.getDay()];
          const monthName = months[result.deliveryDate.getMonth()];
          const day = result.deliveryDate.getDate();
          const year = result.deliveryDate.getFullYear();
          
          setEstimatedDeliveryDate(`${dayName}, ${monthName} ${day}, ${year}`);
          // Set deliveryDayText from the returned result (not from state)
          // If isFallback is true, deliveryDayText will be null and message will show
          setDeliveryDayText(result.deliveryDayText || '');
         
        } else {
          console.log(`⚠️ [Call ${callId}] No delivery date returned from fetchDeliveryRulesAndCalculate`);
        }
    };

    calculateDeliveryDate();
    }, 500); // 500ms debounce delay

    // Cleanup: Clear timeout on unmount or when dependencies change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
    // Recalculate when quantity, franchiseId, or zone data changes
    // But quantity rules take priority - if they match, zone rules won't override
  }, [franchiseId, quantity, deliveryZone, zoneCity]);

  // Fetch customer data on mount
  useEffect(() => {
    // Auto-select first product type option
    if (productTypeOptions.length > 0 && !productType) {
      setProductType(productTypeOptions[0].value);
    }
    
    // Fetch customer ID and delivery addresses
    const loadCustomerData = async () => {
      const { customerId: id, deliveryAddresses: addresses, selectedAddress, franchiseId: fid, deliveryZone: zone, zoneCity: zCity } = await fetchCustomerData();
      setCustomerId(id);
      setDeliveryAddresses(addresses);
      setFranchiseId(fid);
      setDeliveryZone(zone);
      setZoneCity(zCity);
      if (selectedAddress) {
        setSelectedAddressId(selectedAddress.id);
        const addressStr = [
          selectedAddress.street,
          selectedAddress.city,
          selectedAddress.state,
          selectedAddress.zipCode,
        ].filter(Boolean).join(', ');
        setCustomerDeliveryAddress(addressStr);
      }
    };
    loadCustomerData();
    
    // Animate banner on mount
    Animated.timing(bannerAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle reorder data - pre-fill form when reordering
  useEffect(() => {
    if (reorderData) {
      console.log('🔄 Pre-filling form with reorder data:', reorderData);
      
      // Pre-fill form fields
      if (reorderData.quantity) {
        setQuantity(String(reorderData.quantity));
      }
      if (reorderData.poNumber) {
        setPoNumber(reorderData.poNumber);
      }
      if (reorderData.orderNotes) {
        setOrderNotes(reorderData.orderNotes);
      }
      if (reorderData.openerKit !== undefined) {
        setOpenerKit(reorderData.openerKit);
      }
      
      // Handle Special Event toggle - set this first
      if (reorderData.specialEvent !== undefined) {
        setSpecialEvent(reorderData.specialEvent);
      }
      
      // Handle logo if available - set after specialEvent is set
      if (reorderData.specialEventLogo) {
        setLogoPreview(reorderData.specialEventLogo);
        // Create a dummy file object to satisfy validation
        // This allows the form to pass validation when reordering with existing logo
        setLogoFile({
          uri: reorderData.specialEventLogo,
          type: 'image/jpeg',
          fileName: 'reorder-logo.jpg',
          isReorderLogo: true, // Flag to identify reorder logo
        });
      }
      
      // Handle delivery address
      if (reorderData.deliveryAddress) {
        const addresses = parseDeliveryAddresses(reorderData.deliveryAddress);
        setDeliveryAddresses(addresses);
        const selected = addresses.find(addr => addr.isSelected) || addresses[0];
        if (selected) {
          setSelectedAddressId(selected.id);
          const addressStr = [
            selected.street,
            selected.city,
            selected.state,
            selected.zipCode,
          ].filter(Boolean).join(', ');
          setCustomerDeliveryAddress(addressStr);
        }
      }
    }
  }, [reorderData]);

  // Request image picker permissions
  const requestImagePickerPermissions = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version;
      
      if (apiLevel >= 33) {
        // Android 13+ - request READ_MEDIA_IMAGES
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Image Picker Permission',
            message: 'This app needs access to your photos to upload logo.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        // Android 12 and below - request READ_EXTERNAL_STORAGE
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Image Picker Permission',
            message: 'This app needs access to your photos to upload logo.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  };

  // Handle logo upload
  const handleLogoUpload = async () => {
    const hasPermission = await requestImagePickerPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant permission to access photos.');
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: true,
      maxWidth: 2048,
      maxHeight: 2048,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorMessage) {
        console.error('ImagePicker Error: ', response.errorMessage);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setLogoFile(asset);
        setLogoPreview(asset.uri);
      }
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!quantity || quantity.trim() === '') {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(quantity) || parseInt(quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a valid positive number';
    }

    // Check for logo - either logoFile (new upload) or logoPreview (from reorder)
    if (specialEvent && !logoFile && !logoPreview) {
      newErrors.logo = 'Logo is required for Special Event';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate order name
  const generateOrderName = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `ORD-${timestamp}-${random}`;
  };

  // Handle confirm order button click - show modal
  const handleConfirmOrderClick = () => {
    if (!validateForm()) {
      return;
    }

    if (!customerId) {
      Alert.alert('Error', 'Customer information not found. Please login again.');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  // Handle create order (called after confirmation)
  const handleCreateOrder = async () => {
    // Close modal
    setShowConfirmModal(false);
    setLoading(true);

    try {
      // Step 1: Handle logo if Special Event is enabled
      let logoUrl = null;
      
      // If special event is enabled and we have a logo
      if (specialEvent) {
        // Check if it's a reorder logo (existing URL) or new upload
        if (logoFile?.isReorderLogo && logoPreview) {
          // Use existing logo URL from reorder
          logoUrl = logoPreview;
          console.log('Using existing logo URL from reorder:', logoUrl);
        } else if (logoFile && !logoFile.isReorderLogo) {
          // New logo upload required
          try {
          const timestamp = Date.now();
          const filenameSafe = logoFile.fileName || `logo-${timestamp}.jpg`;
          const path = `order-logos/${timestamp}-${filenameSafe}`;
          const bucketName = 'logos';
          const fileExt = filenameSafe.split('.').pop() || 'jpg';
          const contentType = logoFile.type || `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

          console.log('Starting logo upload...', { filenameSafe, path, bucketName, contentType });
          console.log('logoFile:', { hasBase64: !!logoFile.base64, hasUri: !!logoFile.uri, type: logoFile.type });

          if (logoFile.base64) {
            console.log('Uploading from base64...');
            const base64Data = logoFile.base64;
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const fileData = bytes.buffer;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(path, fileData, {
                upsert: true,
                contentType: contentType,
                cacheControl: '3600',
              });

            console.log('Upload result (base64):', { uploadData, uploadError });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              Alert.alert('Upload Error', `Failed to upload logo: ${uploadError.message}`);
              setLoading(false);
              return;
            }

            if (uploadData) {
              const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
              logoUrl = urlData.publicUrl;
              console.log('Logo URL generated:', logoUrl);
            }
          } else if (logoFile.uri) {
            console.log('Uploading from URI...');
            try {
              const response = await fetch(logoFile.uri);
              if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
              }
              const blob = await response.blob();
              const arrayBuffer = await blob.arrayBuffer();

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(path, arrayBuffer, {
                  upsert: true,
                  contentType: contentType,
                  cacheControl: '3600',
                });

              console.log('Upload result (URI):', { uploadData, uploadError });

              if (uploadError) {
                console.error('Upload error:', uploadError);
                Alert.alert('Upload Error', `Failed to upload logo: ${uploadError.message}`);
                setLoading(false);
                return;
              }

              if (uploadData) {
                const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
                logoUrl = urlData.publicUrl;
                console.log('Logo URL generated:', logoUrl);
              }
            } catch (uriError) {
              console.error('Error reading file from URI:', uriError);
              Alert.alert('Upload Error', `Failed to read logo file: ${uriError.message}`);
              setLoading(false);
              return;
            }
          } else {
            console.error('No base64 or URI found in logoFile');
            Alert.alert('Upload Error', 'Logo file data is missing. Please select the logo again.');
            setLoading(false);
            return;
          }

          if (!logoUrl) {
            console.error('Logo URL is null after upload attempt');
            Alert.alert('Upload Error', 'Failed to generate logo URL. Please try again.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Logo upload error:', err);
          Alert.alert('Upload Error', `Failed to upload logo: ${err.message || 'Unknown error'}`);
          setLoading(false);
          return;
          }
        } else if (specialEvent && !logoFile && !logoPreview) {
          // Special event enabled but no logo provided
          Alert.alert('Logo Required', 'Please upload a logo for Special Event or disable Special Event.');
          setLoading(false);
          return;
        }
      }

      // Step 2: Calculate delivery date based on franchise rules
      const orderTime = new Date();
      const calculationResult = await fetchDeliveryRulesAndCalculate(
        franchiseId,
        quantity,
        orderTime,
        deliveryZone,
        zoneCity
      );

      // Extract deliveryDate and deliveryDayText from result object (now returns { deliveryDate, deliveryDayText, isFallback })
      let deliveryDate = calculationResult?.deliveryDate;
      let deliveryDayText = calculationResult?.deliveryDayText || null;
      const isFallback = calculationResult?.isFallback || false;
      
      // Ensure deliveryDate is a valid Date object
      if (!deliveryDate || !(deliveryDate instanceof Date) || isNaN(deliveryDate.getTime())) {
        console.warn('Invalid deliveryDate from calculation, using fallback');
        deliveryDate = new Date();
      deliveryDate.setHours(0, 0, 0, 0);
        deliveryDayText = null; // Blank for fallback
      }
      
      // If fallback, set delivery_day_date to null
      if (isFallback) {
        deliveryDayText = null;
      }

      // Step 3: Create order in database
      const orderData = {
        order_name: generateOrderName(),
        customer_id: customerId,
        franchise_id: franchiseId || null, // Add franchise_id to payload
        product_type: 'Case (9 pieces or 9 units)',
        quantity: parseInt(quantity),
        po_number: poNumber.trim() || null,
        delivery_address: customerDeliveryAddress || null,
        special_instructions: orderNotes.trim() || null,
        special_event_logo: logoUrl || null,
        special_event_amount: specialEvent ? 150 : null,
        openerKit: openerKit || false,
        order_date: orderDateText ? selectedOrderDate.toISOString() : new Date().toISOString(), // Use selected date or today
        delivery_date: deliveryDate.toISOString(),
        delivery_day_date: deliveryDayText || null, // Text value: "Same Day", "1 day", "2 days", or null for fallback
        status: 'pending',
        deliveryStatus: 'pending', // Set initial delivery status to pending
      };
      console.log('orderData', orderData);
      console.log('special_event_logo value:', orderData.special_event_logo);
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        Alert.alert('Error', orderError.message || 'Failed to create order. Please try again.');
        setLoading(false);
        return;
      }

      // Show lovely success toast instead of alert
      Toast.show({
        type: 'success',
        text1: 'Order Created! 🎉',
        text2: 'Your order has been created successfully!',
        position: 'top',
        visibilityTime: 2500,
      });

      // Reset form except product type
      setQuantity('');
      setOpenerKit(false);
      setSpecialEvent(false);
      setPoNumber('');
      setOrderNotes('');
      setLogoFile(null);
      setLogoPreview(null);
      setSelectedOrderDate(new Date());
      setOrderDateText('');
      setErrors({});

      // Small delay to ensure database commit, then navigate
      setTimeout(() => {
        if (navigation) {
          navigation.navigate('HomeStack', { screen: 'OrdersList' });
        }
      }, 500);
    } catch (error) {
      console.error('Error in handleCreateOrder:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    // Reset all form fields
    setQuantity('');
    setOpenerKit(false);
    setSpecialEvent(false);
    setPoNumber('');
    setOrderNotes('');
    setLogoFile(null);
    setLogoPreview(null);
    setSelectedOrderDate(new Date());
    setOrderDateText('');
    setErrors({});
    setProductType('case');
    
    Toast.show({
      type: 'info',
      text1: 'Order Cancelled',
      text2: 'All changes have been discarded',
      position: 'top',
      visibilityTime: 2000,
    });
    
    handleBack();
  };

  // Handle address selection
  const handleAddressSelect = (addressId) => {
    const selected = deliveryAddresses.find(addr => addr.id === addressId);
    if (selected) {
      setSelectedAddressId(addressId);
      const addressStr = [
        selected.street,
        selected.city,
        selected.state,
        selected.zipCode,
      ].filter(Boolean).join(', ');
      setCustomerDeliveryAddress(addressStr);
    }
  };

  // Format address for dropdown display
  const formatAddressForDropdown = (address) => {
    if (!address) return '';
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : (address.label || 'Address');
  };

  // Date picker functions
  const formatDateForDisplay = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${monthName} ${day}, ${year}`;
  };

  const handleDateChange = (date) => {
    setSelectedOrderDate(date);
    setOrderDateText(formatDateForDisplay(date));
  };

  const handleDatePickerConfirm = () => {
    setShowDatePicker(false);
  };

  const handleDatePickerCancel = () => {
    setShowDatePicker(false);
    setSelectedOrderDate(new Date());
    setOrderDateText('');
  };

  // Prepare dropdown options for addresses
  const addressOptions = deliveryAddresses.map(addr => ({
    label: `${addr.label || 'Address'}: ${formatAddressForDropdown(addr)}`,
    value: addr.id,
  }));

  return (
    <>
      {/* Banner Section with Animation */}
      <Animated.View
        style={[
          styles.bannerContainer,
          {
            opacity: bannerAnim,
            transform: [
              {
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              },
            ],
          },
        ]}>
        {/* Background Image with Blur Effect */}
        <View style={styles.bannerImageBackground}>
          <Image
            source={orderBannerImage}
            style={styles.bannerBackgroundImage}
            resizeMode="cover"
            blurRadius={3}
          />
          {/* Dark Overlay */}
          <View style={styles.bannerOverlay} />
        </View>
        
        {/* Content Overlay */}
        <View style={styles.bannerContentWrapper}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.cardBackground} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          
          <View style={styles.bannerContent}>
            <View style={styles.bannerTitleRow}>
              <Text style={styles.bannerSparkleIcon}>✨</Text>
              <Text style={styles.bannerTitle}>Create New Order</Text>
            </View>
            <Text style={styles.bannerSubtitle}>Fresh coconuts delivered to your door</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom Sheet for Form */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        enableOverDrag={false}
        maxDynamicContentSize={height * 0.8}
        onChange={handleSheetChange}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        animateOnMount={true}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.bottomSheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          nestedScrollEnabled={true}> 

          {/* Product Type */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Product Type</Text>
            <View style={[styles.inputContainer, styles.readOnlyInputContainer]}>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value="Case (9 pieces or 9 units)"
                editable={false}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>

          {/* Order Date Picker */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Order Date (Optional)</Text>
            <TouchableOpacity
              style={[styles.inputContainer, styles.datePickerInput]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}>
              <View style={styles.datePickerContent}>
                <Icon name="calendar-outline" size={20} color={Colors.primaryPink} />
                <Text style={[styles.input, styles.datePickerText, { flex: 1 }]}>
                  {orderDateText || 'Select order date'}
                </Text>
                <Icon name="chevron-down" size={16} color={Colors.textSecondary} />
              </View>
            </TouchableOpacity>
            <Text style={styles.helperText}>Leave empty to use today's date</Text>
          </View>

          {/* Quantity */}
          <View 
            ref={quantityCardRef}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              // Store Y position relative to scroll content
              quantityCardRef.current._yPosition = y;
            }}
            style={styles.formCard}>
            <Text style={styles.label}>Quantity</Text>
            <View 
              ref={quantityContainerRef}
              style={styles.inputContainer}>
              <BottomSheetTextInput
                ref={quantityInputRef}
                style={styles.input}
                placeholder="Enter quantity"
                placeholderTextColor={Colors.textSecondary}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            {errors.quantity && (
              <Text style={styles.errorText}>{errors.quantity}</Text>
            )}
          </View>

          {/* Delivery Date Card */}
          {quantity && estimatedDeliveryDate && (
            <View style={styles.deliveryDateCard}>
              <Icon name="calendar-outline" size={24} color={Colors.success} />
              <View style={styles.deliveryDateContent}>
                <Text style={styles.deliveryDateLabel}>Estimated Delivery</Text>
                <Text style={styles.deliveryDateValue}>{estimatedDeliveryDate}</Text>
                {deliveryDayText && deliveryDayText.trim() !== '' ? (
                  <Text style={[styles.deliveryDateLabel, { fontSize: 12, marginTop: 4 }]}>
                    ({deliveryDayText})
                  </Text>
                ) : (
                  <Text style={[styles.deliveryDateLabel, { fontSize: 12, marginTop: 4, fontStyle: 'italic', color: Colors.textSecondary }]}>
                    Delivery updates will be sent to your email soon.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Coconut Opener Kit */}
          <View style={styles.formCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>Coconut Opener Kit</Text>
                <Text style={styles.toggleSubtitle}>Add opener kit (+$15.00)</Text>
              </View>
              <Switch
                value={openerKit}
                onValueChange={setOpenerKit}
                trackColor={{ false: '#E0E0E0', true: Colors.primaryPink }}
                thumbColor={Colors.cardBackground}
              />
            </View>
          </View>

          {/* Special Event - New Logo */}
          <View style={[styles.formCard, specialEvent && styles.specialEventCard]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>Special Event - New Logo</Text>
                <Text style={styles.toggleSubtitle}>For events with different branding</Text>
                <Text style={styles.toggleSubtitle}>One-time setup fee (+$150.00)</Text>
              </View>
              <Switch
                value={specialEvent}
                onValueChange={setSpecialEvent}
                trackColor={{ false: '#E0E0E0', true: Colors.primaryPink }}
                thumbColor={Colors.cardBackground}
              />
            </View>

            {specialEvent && (
              <View style={styles.logoUploadSection}>
                <Text style={styles.logoUploadTitle}>Upload New Logo</Text>
                
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Preferred: Vector files (SVG, AI, EPS) for best quality
                  </Text>
                  <Text style={styles.infoText}>
                    Also accepted: PNG, JPG, PDF (Max 5MB)
                  </Text>
                </View>

                <View style={styles.warningBox}>
                  <Icon name="warning-outline" size={20} color={Colors.error} />
                  <Text style={styles.warningText}>Screenshots not accepted</Text>
                </View>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleLogoUpload}
                  activeOpacity={0.8}>
                  {logoPreview ? (
                    <Image source={{ uri: logoPreview }} style={styles.logoPreview} />
                  ) : (
                    <>
                      <Icon name="cloud-upload-outline" size={32} color={Colors.primaryPink} />
                      <Text style={styles.uploadText}>Click to upload logo file</Text>
                    </>
                  )}
                </TouchableOpacity>
                {errors.logo && (
                  <Text style={styles.errorText}>{errors.logo}</Text>
                )}
              </View>
            )}
          </View>

              {/* Delivery Address Dropdown */}
              {deliveryAddresses.length > 0 && (
            <View style={styles.formCard}>
              <Text style={styles.label}>Delivery Address</Text>
              <Dropdown
                placeholder="Select delivery address"
                value={selectedAddressId}
                onSelect={handleAddressSelect}
                options={addressOptions}
                errorMessage={errors.deliveryAddress}
              />
            </View>
          )}

          {/* PO Number */}
          <View 
            ref={poNumberCardRef}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              poNumberCardRef.current._yPosition = y;
            }}
            style={styles.formCard}>
            <Text style={styles.label}>PO Number (Optional)</Text>
            <View 
              ref={poNumberContainerRef}
              style={styles.inputContainer}>
              <BottomSheetTextInput
                ref={poNumberInputRef}
                style={styles.input}
                placeholder="Enter PO number"
                placeholderTextColor={Colors.textSecondary}
                value={poNumber}
                onChangeText={setPoNumber}
              />
            </View>
          </View>

          {/* Order Notes */}
          <View 
            ref={notesCardRef}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              notesCardRef.current._yPosition = y;
            }}
            style={styles.formCard}>
            <Text style={styles.label}>Order Notes (Optional)</Text>
            <View 
              ref={notesContainerRef}
              style={[styles.inputContainer, styles.textAreaContainer]}>
              <BottomSheetTextInput
                ref={notesInputRef}
                style={[styles.input, styles.textArea]}
                placeholder="Add any special instructions or notes for this order..."
                placeholderTextColor={Colors.textSecondary}
                value={orderNotes}
                onChangeText={setOrderNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => {
                  // iOS: ensure sheet is expanded and scroll to bottom so notes field stays above keyboard
                  bottomSheetRef.current?.snapToIndex(1);
                  if (Platform.OS === 'ios') {
                    setTimeout(() => {
                      if (scrollViewRef.current) {
                        scrollViewRef.current.scrollToEnd({ animated: true });
                      }
                    }, 250);
                  }
                }}
              />
            </View>
          </View>

        </BottomSheetScrollView>
        
        {/* Footer Buttons - Fixed at bottom */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmOrderClick}
            activeOpacity={0.8}
            disabled={loading}>
            <Text style={styles.confirmButtonText}>
              {loading ? 'Creating...' : 'Confirm Order'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Icon */}
              <View style={styles.modalIconContainer}>
                <Icon name="help-circle" size={64} color={Colors.primaryPink} />
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>Confirm Order</Text>

              {/* Message */}
              <Text style={styles.modalMessage}>
                Do you want to create this order?
              </Text>

              {/* Order Summary */}
              <View style={styles.orderSummaryContainer}>
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Quantity:</Text>
                  <Text style={styles.orderSummaryValue}>{quantity} Cases</Text>
                </View>
                {orderDateText && (
                  <View style={styles.orderSummaryRow}>
                    <Text style={styles.orderSummaryLabel}>Order Date:</Text>
                    <Text style={styles.orderSummaryValue}>{orderDateText}</Text>
                  </View>
                )}
                {estimatedDeliveryDate && (
                  <View style={styles.orderSummaryRow}>
                    <Text style={styles.orderSummaryLabel}>Delivery:</Text>
                    <Text style={styles.orderSummaryValue}>
                      {estimatedDeliveryDate}
                      {deliveryDayText && ` (${deliveryDayText})`}
                    </Text>
                  </View>
                )}
                {specialEvent && (
                  <View style={styles.orderSummaryRow}>
                    <Text style={styles.orderSummaryLabel}>Special Event:</Text>
                    <Text style={styles.orderSummaryValue}>Yes (+$150.00)</Text>
                  </View>
                )}
                {openerKit && (
                  <View style={styles.orderSummaryRow}>
                    <Text style={styles.orderSummaryLabel}>Opener Kit:</Text>
                    <Text style={styles.orderSummaryValue}>Yes (+$15.00)</Text>
                  </View>
                )}
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonNo]}
                  onPress={() => setShowConfirmModal(false)}
                  activeOpacity={0.8}>
                  <Text style={styles.modalButtonNoText}>No</Text>
                </TouchableOpacity>
                <View style={{ width: 12 }} />
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonYes]}
                  onPress={handleCreateOrder}
                  activeOpacity={0.8}
                  disabled={loading}>
                  <Text style={styles.modalButtonYesText}>
                    {loading ? 'Creating...' : 'Yes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleDatePickerCancel}>
        <View style={styles.datePickerModalOverlay}>
          <View style={styles.datePickerModalContainer}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={handleDatePickerCancel}
                activeOpacity={0.8}>
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select Order Date</Text>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={handleDatePickerConfirm}
                activeOpacity={0.8}>
                <Text style={styles.datePickerConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
            <DatePicker
              date={selectedOrderDate}
              onDateChange={handleDateChange}
              mode="date"
              minimumDate={new Date()} // Prevent selecting previous dates
              style={styles.datePicker}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  bannerContainer: {
    height: BANNER_HEIGHT,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    
  },
  bannerImageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bannerBackgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bannerContentWrapper: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 55 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative',
    zIndex: 2,
  },
  bannerContent: {
    textAlign: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  bannerTitle: {
    fontSize: 32,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.cardBackground,
    marginBottom: 8,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerSubtitle: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    textAlign: 'left',
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerSparkleIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginRight: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  backText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontFamily: fontFamilyBody,
    marginLeft: 8,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  formCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 2 : 1 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0.08,
    shadowRadius: Platform.OS === 'ios' ? 4 : 3,
    elevation: Platform.OS === 'android' ? 2 : 0,
  },
  specialEventCard: {
    backgroundColor: Colors.lightPink,
    borderWidth: 1,
    borderColor: Colors.primaryPink,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 50,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  readOnlyInputContainer: {
    backgroundColor: Colors.backgroundGray,
    opacity: 0.7,
  },
  readOnlyInput: {
    color: Colors.textSecondary,
  },
  textAreaContainer: {
    minHeight: 100,
  },
  textArea: {
    paddingVertical: 12,
    minHeight: 100,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleContent: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoUploadSection: {
    marginTop: 16,
  },
  logoUploadTitle: {
    fontSize: 16,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: '#1976D2',
    marginBottom: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.error,
    marginLeft: 8,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: Colors.primaryPink,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  logoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  uploadText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.primaryPink,
    marginTop: 8,
    fontWeight: '500',
  },
  deliveryDateCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveryDateContent: {
    marginLeft: 12,
    flex: 1,
  },
  deliveryDateLabel: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  deliveryDateValue: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.success,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.error,
    marginTop: 4,
  },
  footer: {
    backgroundColor: Colors.cardBackground,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: Colors.backgroundGray,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primaryPink,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.cardBackground,
  },
  bottomSheetBackground: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  handleIndicator: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.3,
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80, // Extra padding to account for fixed footer
  },
  scrollView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.lightPink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  orderSummaryContainer: {
    width: '100%',
    backgroundColor: Colors.backgroundGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderSummaryLabel: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  orderSummaryValue: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonNo: {
    backgroundColor: Colors.backgroundGray,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
  },
  modalButtonYes: {
    backgroundColor: Colors.primaryPink,
  },
  modalButtonNoText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalButtonYesText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.cardBackground,
  },
  // Date Picker Styles
  datePickerInput: {
    backgroundColor: '#F5F5F5',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  datePickerText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginLeft: 12,
  },
  helperText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContainer: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  datePickerTitle: {
    fontSize: 18,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  datePickerCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  datePickerConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    color: Colors.primaryPink,
    fontWeight: '600',
  },
  datePicker: {
    marginTop: 20,
  },
});

export default CreateOrderScreen;

