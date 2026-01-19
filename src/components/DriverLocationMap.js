/**
 * Driver Location Map Component
 * Shows real-time driver location on a map using react-native-maps (Native - Fast Zoom)
 * Only displays when driver is assigned to the order
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamilyBody } from '../theme/fonts';
import supabase from '../config/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE';

const { width, height } = Dimensions.get('window');

const DriverLocationMap = ({ orderId, deliveryAddress, driverId = null, containerStyle }) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eta, setEta] = useState(null);
  const [region, setRegion] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  
  const mapRef = useRef(null);
  const subscriptionRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const updateThrottleMs = 2000; // Update only every 2 seconds
  
  // Check if driver is assigned
  const isDriverAssigned = () => {
    return driverId !== null && driverId !== undefined;
  };

  // Fetch initial driver location and geocode delivery address
  useEffect(() => {
    console.log('🔧 [DriverLocationMap] useEffect triggered');
    console.log('🔧 [DriverLocationMap] orderId:', orderId);
    console.log('🔧 [DriverLocationMap] driverId:', driverId);
    console.log('🔧 [DriverLocationMap] deliveryAddress:', deliveryAddress);
    console.log('🔧 [DriverLocationMap] isDriverAssigned:', isDriverAssigned());
    
    if (!orderId || !isDriverAssigned()) {
      console.log('⚠️ [DriverLocationMap] Skipping - missing orderId or driverId');
      setLoading(false);
      return;
    }

    console.log('✅ [DriverLocationMap] Initializing driver location tracking...');
    fetchDriverLocation();
    geocodeDeliveryAddress();
    setupRealtimeSubscription();

    return () => {
      console.log('🧹 [DriverLocationMap] Cleaning up...');
      // Cleanup subscription on unmount
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [orderId, driverId, deliveryAddress]);

  // Log when driverLocation state actually changes
  useEffect(() => {
    console.log('🔄 [DriverLocationMap] driverLocation state changed:');
    console.log('🔄 [DriverLocationMap] New location:', driverLocation);
    if (driverLocation) {
      console.log('🔄 [DriverLocationMap] Lat:', driverLocation.latitude);
      console.log('🔄 [DriverLocationMap] Lng:', driverLocation.longitude);
      console.log('🔄 [DriverLocationMap] Updated at:', driverLocation.updatedAt);
    }
  }, [driverLocation]);

  // Update region when locations change and calculate route (only on initial load)
  useEffect(() => {
    try {
      console.log('🗺️ [DriverLocationMap] Region useEffect triggered');
      console.log('🗺️ [DriverLocationMap] driverLocation:', driverLocation);
      console.log('🗺️ [DriverLocationMap] deliveryLocation:', deliveryLocation);
      
      // Only set initial region once, don't auto-zoom on location updates
      if (driverLocation && deliveryLocation && !region) {
        const centerLat = (driverLocation.latitude + deliveryLocation.latitude) / 2;
        const centerLng = (driverLocation.longitude + deliveryLocation.longitude) / 2;
        
        // Calculate bounds
        const latDelta = Math.abs(driverLocation.latitude - deliveryLocation.latitude) * 1.5;
        const lngDelta = Math.abs(driverLocation.longitude - deliveryLocation.longitude) * 1.5;
        
        const newRegion = {
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: Math.max(latDelta, 0.01),
          longitudeDelta: Math.max(lngDelta, 0.01),
        };
        
        console.log('🗺️ [DriverLocationMap] Setting initial region (both locations):', newRegion);
        setRegion(newRegion);
        
        // Route will be calculated automatically by MapViewDirections
      } else if (driverLocation && !region) {
        const newRegion = {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        console.log('🗺️ [DriverLocationMap] Setting initial region (driver only):', newRegion);
        setRegion(newRegion);
      }
    } catch (err) {
      console.error('❌ [DriverLocationMap] Error setting region:', err);
    }
  }, [driverLocation, deliveryLocation]);

  // Fetch driver location from database
  const fetchDriverLocation = async () => {
    try {
      console.log('📍 [DriverLocationMap] Fetching driver location...');
      console.log('📍 [DriverLocationMap] driverId:', driverId);
      console.log('📍 [DriverLocationMap] orderId:', orderId);
      
      setLoading(true);
      
      const { data, error } = await supabase
        .from('driver_locations')
        .select('latitude, longitude, updated_at')
        .eq('driver_id', driverId)
        .order('updated_at', { ascending: false })
        .limit(1);

      console.log('📍 [DriverLocationMap] Supabase query result:');
      console.log('📍 [DriverLocationMap] Data:', data);
      console.log('📍 [DriverLocationMap] Error:', error);

      if (error) {
        console.error('❌ [DriverLocationMap] Error fetching driver location:', error);
        console.error('❌ [DriverLocationMap] Error code:', error.code);
        console.error('❌ [DriverLocationMap] Error message:', error.message);
        setError('Unable to fetch driver location');
        setLoading(false);
        return;
      }

      // Check if data exists and has at least one row
      if (!data || data.length === 0) {
        console.warn('⚠️ [DriverLocationMap] No driver location data found');
        setError('Driver location not available');
        setLoading(false);
        return;
      }

      const locationData = data[0];
      if (locationData?.latitude && locationData?.longitude) {
        const location = {
          latitude: parseFloat(locationData.latitude),
          longitude: parseFloat(locationData.longitude),
          updatedAt: locationData.updated_at,
        };
        console.log('✅ [DriverLocationMap] Driver location fetched:');
        console.log('✅ [DriverLocationMap] Latitude:', location.latitude);
        console.log('✅ [DriverLocationMap] Longitude:', location.longitude);
        console.log('✅ [DriverLocationMap] Updated at:', location.updatedAt);
        
        setDriverLocation(location);
        
        // Calculate ETA if delivery location is available
        if (deliveryLocation) {
          calculateETA(location.latitude, location.longitude, deliveryLocation.latitude, deliveryLocation.longitude);
        }
      } else {
        console.warn('⚠️ [DriverLocationMap] Driver location data missing:');
        console.warn('⚠️ [DriverLocationMap] Latitude:', locationData?.latitude);
        console.warn('⚠️ [DriverLocationMap] Longitude:', locationData?.longitude);
        setError('Driver location not available');
      }
    } catch (err) {
      console.error('❌ [DriverLocationMap] Exception in fetchDriverLocation:', err);
      console.error('❌ [DriverLocationMap] Error stack:', err.stack);
      setError('Failed to load driver location');
    } finally {
      setLoading(false);
      console.log('📍 [DriverLocationMap] fetchDriverLocation completed');
    }
  };

  // Fetch driver location using polling (more efficient than real-time)
  const startLocationPolling = () => {
    if (!orderId || !isDriverAssigned()) {
      console.log('⚠️ [DriverLocationMap] Polling not started - missing orderId or driverId');
      return;
    }

    console.log('🔄 [DriverLocationMap] Starting location polling...');
    console.log('🔄 [DriverLocationMap] Polling interval: 3 seconds');

    // Poll every 3 seconds instead of real-time (reduces overhead)
    const pollInterval = setInterval(async () => {
      const now = Date.now();
      // Throttle updates
      if (now - lastUpdateTimeRef.current < updateThrottleMs) {
        return;
      }
      lastUpdateTimeRef.current = now;

      try {
        console.log('🔄 [DriverLocationMap] Polling driver location...');
        console.log('🔄 [DriverLocationMap] driverId:', driverId);
        
        const { data, error } = await supabase
          .from('driver_locations')
          .select('latitude, longitude, updated_at')
          .eq('driver_id', driverId)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ [DriverLocationMap] Polling error:', error);
          return;
        }
        
        console.log('🔄 [DriverLocationMap] Polling data received:', data);
        
        // Check if data exists and has at least one row
        if (!data || data.length === 0) {
          console.warn('⚠️ [DriverLocationMap] No driver location data in polling response');
          return;
        }
        
        const locationData = data[0];
        const location = locationData?.latitude && locationData?.longitude ? {
          latitude: parseFloat(locationData.latitude),
          longitude: parseFloat(locationData.longitude),
          updatedAt: locationData.updated_at,
        } : null;

        if (!location) {
          console.warn('⚠️ [DriverLocationMap] No location data in polling response');
          return;
        }

        console.log('🔄 [DriverLocationMap] Parsed location:', location);
        console.log('🔄 [DriverLocationMap] Current driverLocation state:', driverLocation);

        // Check if location or timestamp changed
        let shouldUpdate = true;
        if (driverLocation) {
          const latDiff = Math.abs(driverLocation.latitude - location.latitude);
          const lngDiff = Math.abs(driverLocation.longitude - location.longitude);
          const timeDiff = driverLocation.updatedAt !== location.updatedAt;
          
          console.log('🔄 [DriverLocationMap] Location diff - Lat:', latDiff, 'Lng:', lngDiff);
          console.log('🔄 [DriverLocationMap] Timestamp changed:', timeDiff);
          console.log('🔄 [DriverLocationMap] Old timestamp:', driverLocation.updatedAt);
          console.log('🔄 [DriverLocationMap] New timestamp:', location.updatedAt);
          
          // Update if location changed significantly OR timestamp changed (newer data)
          // Reduced threshold to 0.00001 degrees (~1 meter) for more sensitive updates
          if (latDiff < 0.00001 && lngDiff < 0.00001 && !timeDiff) {
            console.log('🔄 [DriverLocationMap] Location unchanged, skipping update');
            shouldUpdate = false;
          }
        }

        if (shouldUpdate) {
          console.log('✅ [DriverLocationMap] Updating driver location:', location);
          console.log('✅ [DriverLocationMap] Previous location:', driverLocation);
          setDriverLocation(location);
          
          // Don't auto-zoom map - let user control zoom manually
        }
        
        // Throttled ETA calculation
        if (deliveryLocation) {
          calculateETA(location.latitude, location.longitude, deliveryLocation.latitude, deliveryLocation.longitude);
        }
      } catch (err) {
        console.error('❌ [DriverLocationMap] Exception in polling:', err);
        console.error('❌ [DriverLocationMap] Error stack:', err.stack);
      }
    }, 3000); // Poll every 3 seconds

    subscriptionRef.current = { unsubscribe: () => {
      console.log('🛑 [DriverLocationMap] Stopping location polling');
      clearInterval(pollInterval);
    }};
    
    console.log('✅ [DriverLocationMap] Location polling started');
  };

  // Setup Supabase Realtime subscription for live updates
  const setupRealtimeSubscription = () => {
    if (!orderId || !isDriverAssigned()) {
      console.log('⚠️ [DriverLocationMap] Cannot setup subscription - missing orderId or driverId');
      return;
    }

    try {
      console.log('🔧 [DriverLocationMap] Setting up realtime subscription...');
      // Use polling instead of real-time for better performance
      startLocationPolling();
    } catch (err) {
      console.error('❌ [DriverLocationMap] Error setting up realtime subscription:', err);
      console.error('❌ [DriverLocationMap] Error stack:', err.stack);
    }
  };

  // Geocode delivery address to get coordinates
  const geocodeDeliveryAddress = async () => {
    if (!deliveryAddress) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(deliveryAddress)}&key=AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const deliveryLoc = {
          latitude: location.lat,
          longitude: location.lng,
        };
        setDeliveryLocation(deliveryLoc);
        
        // Calculate ETA if driver location is available
        if (driverLocation) {
          calculateETA(driverLocation.latitude, driverLocation.longitude, deliveryLoc.latitude, deliveryLoc.longitude);
        }
      }
    } catch (err) {
      console.error('Error geocoding address:', err);
    }
  };


  // Calculate ETA based on driver location and delivery location
  const calculateETA = async (driverLat, driverLng, deliveryLat, deliveryLng) => {
    if (!driverLat || !driverLng || !deliveryLat || !deliveryLng) return;

    try {
      setEta('Calculating...');
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${driverLat},${driverLng}&destinations=${deliveryLat},${deliveryLng}&key=AIzaSyBtb6hSmwJ9_OznDC5e8BcZM90ms4WD_DE&units=imperial`
      );
      const data = await response.json();
      
      if (data.rows && data.rows[0]?.elements[0]?.duration) {
        const durationText = data.rows[0].elements[0].duration.text;
        setEta(durationText);
      } else {
        setEta('Unable to calculate');
      }
    } catch (err) {
      console.error('Error calculating ETA:', err);
      setEta('Unable to calculate');
    }
  };

  // Handle current location button press
  const handleCurrentLocation = () => {
    if (deliveryLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } else if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

 

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryPink} />
          <Text style={styles.loadingText}>Loading driver location...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

 

  // Default region if not set
  const defaultRegion = region || (driverLocation ? {
    latitude: driverLocation.latitude,
    longitude: driverLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 30.7333,
    longitude: 76.7794,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Map - Native (Fast Zoom) */}
      <View style={styles.mapContainer}>
        {defaultRegion && (
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={styles.map}
            initialRegion={defaultRegion}
            region={region || defaultRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            zoomEnabled={true}
            zoomControlEnabled={false}
            scrollEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
            loadingEnabled={true}
            onMapReady={() => {
              console.log('🗺️ [DriverLocationMap] Map is ready');
              setMapReady(true);
            }}
            onError={(error) => {
              console.error('❌ [DriverLocationMap] Map error:', error);
              setError('Map loading error. Please check API key.');
            }}
          >
          {/* Driver Marker */}
          {driverLocation && (
            <Marker
              key={`driver-${driverLocation.latitude}-${driverLocation.longitude}-${driverLocation.updatedAt}`}
              coordinate={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              }}
              title="Driver Location"
              description={eta ? `Arrives in ${eta}` : 'Driver'}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              onPress={() => {
                console.log('📍 [DriverLocationMap] Driver marker pressed');
                console.log('📍 [DriverLocationMap] Location:', driverLocation);
              }}
            >
              <View style={styles.driverMarker}>
                <View style={styles.driverMarkerInner} />
                {eta && (
                  <View style={styles.etaBadge}>
                    <Text style={styles.etaText}>Arrives in {eta}</Text>
                  </View>
                )}
              </View>
            </Marker>
          )}

          {/* Delivery Marker */}
          {deliveryLocation && (
            <Marker
              coordinate={{
                latitude: deliveryLocation.latitude,
                longitude: deliveryLocation.longitude,
              }}
              title="Delivery Location"
              pinColor="#4CAF50"
            />
          )}

          {/* Route Direction Line - Green */}
          {mapReady && driverLocation && deliveryLocation && (
            <MapViewDirections
              origin={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              }}
              destination={{
                latitude: deliveryLocation.latitude,
                longitude: deliveryLocation.longitude,
              }}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={6}
              strokeColor="#4CAF50"
              optimizeWaypoints={true}
              onReady={(result) => {
                console.log('✅ Route ready:', result);
                // Don't auto-fit map to route - let user control zoom
              }}
              onError={(errorMessage) => {
                console.error('Directions error:', errorMessage);
              }}
            />
          )}
          </MapView>
        )}
        
        {/* Current Location Button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={handleCurrentLocation}
        >
          <Icon name="location" size={16} color="#FFFFFF" style={styles.currentLocationIcon} /> 
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  mapContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.backgroundGray,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  driverMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarkerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryPink,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  etaBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  etaText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: '#000',
  },
  currentLocationButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
 
  currentLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  errorContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.error,
    textAlign: 'center',
  },
  noDriverContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 20,
  },
  noDriverText: {
    fontSize: 16,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  noDriverSubtext: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  noLocationContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 0,
  },
  noLocationText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
});

export default DriverLocationMap;
