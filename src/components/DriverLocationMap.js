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

const GOOGLE_MAPS_API_KEY = 'AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI';

const { width, height } = Dimensions.get('window');

const DriverLocationMap = ({ orderId, deliveryAddress, driverId = null }) => {
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
    if (!orderId || !isDriverAssigned()) {
      setLoading(false);
      return;
    }

    fetchDriverLocation();
    geocodeDeliveryAddress();
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscription on unmount
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [orderId, driverId, deliveryAddress]);

  // Update region when locations change and calculate route
  useEffect(() => {
    try {
      if (driverLocation && deliveryLocation) {
        const centerLat = (driverLocation.latitude + deliveryLocation.latitude) / 2;
        const centerLng = (driverLocation.longitude + deliveryLocation.longitude) / 2;
        
        // Calculate bounds
        const latDelta = Math.abs(driverLocation.latitude - deliveryLocation.latitude) * 1.5;
        const lngDelta = Math.abs(driverLocation.longitude - deliveryLocation.longitude) * 1.5;
        
        setRegion({
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: Math.max(latDelta, 0.01),
          longitudeDelta: Math.max(lngDelta, 0.01),
        });
        
        // Route will be calculated automatically by MapViewDirections
      } else if (driverLocation) {
        setRegion({
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (err) {
      console.error('Error setting region:', err);
    }
  }, [driverLocation, deliveryLocation]);

  // Fetch driver location from database
  const fetchDriverLocation = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('driver_locations')
        .select('latitude, longitude, updated_at')
        .eq('driver_id', driverId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching driver location:', error);
        setError('Unable to fetch driver location');
        setLoading(false);
        return;
      }

      if (data?.latitude && data?.longitude) {
        const location = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          updatedAt: data.updated_at,
        };
        setDriverLocation(location);
        
        // Calculate ETA if delivery location is available
        if (deliveryLocation) {
          calculateETA(location.latitude, location.longitude, deliveryLocation.latitude, deliveryLocation.longitude);
        }
      } else {
        setError('Driver location not available');
      }
    } catch (err) {
      console.error('Error in fetchDriverLocation:', err);
      setError('Failed to load driver location');
    } finally {
      setLoading(false);
    }
  };

  // Fetch driver location using polling (more efficient than real-time)
  const startLocationPolling = () => {
    if (!orderId || !isDriverAssigned()) return;

    // Poll every 3 seconds instead of real-time (reduces overhead)
    const pollInterval = setInterval(async () => {
      const now = Date.now();
      // Throttle updates
      if (now - lastUpdateTimeRef.current < updateThrottleMs) {
        return;
      }
      lastUpdateTimeRef.current = now;

      try {
        const { data, error } = await supabase
          .from('driver_locations')
          .select('latitude, longitude, updated_at')
          .eq('driver_id', driverId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error) return;
        
        const location = data?.latitude && data?.longitude ? {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          updatedAt: data.updated_at,
        } : null;

        if (!location) return;

        // Only update if location actually changed
        if (driverLocation) {
          const latDiff = Math.abs(driverLocation.latitude - location.latitude);
          const lngDiff = Math.abs(driverLocation.longitude - location.longitude);
          // Only update if moved more than 0.0001 degrees (~11 meters)
          if (latDiff < 0.0001 && lngDiff < 0.0001) {
            return;
          }
        }

        setDriverLocation(location);
        
        // Throttled ETA calculation
        if (deliveryLocation) {
          calculateETA(location.latitude, location.longitude, deliveryLocation.latitude, deliveryLocation.longitude);
        }
      } catch (err) {
        console.error('Error polling driver location:', err);
      }
    }, 3000); // Poll every 3 seconds

    subscriptionRef.current = { unsubscribe: () => clearInterval(pollInterval) };
  };

  // Setup Supabase Realtime subscription for live updates
  const setupRealtimeSubscription = () => {
    if (!orderId || !isDriverAssigned()) return;

    try {
      // Use polling instead of real-time for better performance
      startLocationPolling();
    } catch (err) {
      console.error('Error setting up realtime subscription:', err);
    }
  };

  // Geocode delivery address to get coordinates
  const geocodeDeliveryAddress = async () => {
    if (!deliveryAddress) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(deliveryAddress)}&key=AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI`
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
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${driverLat},${driverLng}&destinations=${deliveryLat},${deliveryLng}&key=AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI&units=imperial`
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

  if (!isDriverAssigned()) {
    return (
      <View style={styles.container}>
        <View style={styles.noDriverContainer}>
          <Icon name="car-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.noDriverText}>No driver assigned yet</Text>
          <Text style={styles.noDriverSubtext}>
            Driver location will appear here once assigned
          </Text>
        </View>
      </View>
    );
  }

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

  if (!driverLocation) {
    return (
      <View style={styles.container}>
        <View style={styles.noLocationContainer}>
          <Icon name="location-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.noLocationText}>Driver location not available</Text>
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
    <View style={styles.container}>
      {/* Map - Native (Fast Zoom) */}
      <View style={styles.mapContainer}>
        {defaultRegion && (
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={styles.map}
            initialRegion={defaultRegion}
            region={defaultRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            zoomEnabled={true}
            zoomControlEnabled={false}
            scrollEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
            loadingEnabled={true}
            onMapReady={() => {
              console.log('Map is ready');
              setMapReady(true);
            }}
            onError={(error) => {
              console.error('Map error:', error);
              setError('Map loading error. Please check API key.');
            }}
          >
          {/* Driver Marker */}
          {driverLocation && (
            <Marker
              coordinate={{
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              }}
              title="Driver Location"
              description={eta ? `Arrives in ${eta}` : 'Driver'}
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
                // Optionally fit map to route
                if (mapRef.current && result.coordinates) {
                  mapRef.current.fitToCoordinates(result.coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                  });
                }
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
          <Text style={styles.currentLocationText}>Current location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  mapContainer: {
    width: '100%',
    height: 400,
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
