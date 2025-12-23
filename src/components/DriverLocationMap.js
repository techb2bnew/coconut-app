import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import supabase from '../config/supabase';

const DriverLocationMap = ({ orderId, deliveryAddress, driverId }) => {
  const mapRef = useRef(null);
  const isUserInteracting = useRef(false);
  const lastCameraUpdate = useRef(0);

  const [driverLocation, setDriverLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  const isDriverAssigned = () => !!driverId;

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    if (!orderId || !isDriverAssigned()) {
      setLoading(false);
      return;
    }

    fetchDriverLocation();
    geocodeDeliveryAddress();
    setupRealtimeSubscription();

    return () => {
      supabase.removeAllChannels();
    };
  }, [orderId, driverId]);

  /* ---------------- DRIVER LOCATION ---------------- */

  const fetchDriverLocation = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('driver_locations')
      .select('latitude, longitude, updated_at')
      .eq('driver_id', driverId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const loc = {
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
      };
      setDriverLocation(loc);
    }

    setLoading(false);
  };

  /* ---------------- REALTIME ---------------- */

  const setupRealtimeSubscription = () => {
    supabase
      .channel(`driver-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const loc = {
            latitude: Number(payload.new.latitude),
            longitude: Number(payload.new.longitude),
          };

          setDriverLocation(loc);

          // 🔥 Smooth camera update (NO zoom fight)
          if (!isUserInteracting.current) {
            const now = Date.now();
            if (now - lastCameraUpdate.current > 1200) {
              lastCameraUpdate.current = now;
              mapRef.current?.animateCamera({
                center: loc,
              });
            }
          }
        }
      )
      .subscribe();
  };

  /* ---------------- DELIVERY LOCATION ---------------- */

  const geocodeDeliveryAddress = async () => {
    if (!deliveryAddress) return;

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          deliveryAddress
        )}&key=AIzaSyBXNyT9zcGdvhAUCUEYTm6e_qPw26AOPgI`
      );

      const json = await res.json();
      if (json.results?.length) {
        setDeliveryLocation({
          latitude: json.results[0].geometry.location.lat,
          longitude: json.results[0].geometry.location.lng,
        });
      }
    } catch (e) {
      console.log('Geocode error', e);
    }
  };

  /* ---------------- UI STATES ---------------- */

  if (!isDriverAssigned()) {
    return (
      <View style={styles.center}>
        <Icon name="car-outline" size={48} color={Colors.textSecondary} />
        <Text>No driver assigned yet</Text>
      </View>
    );
  }

  if (loading || !driverLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primaryPink} />
        <Text>Loading driver location...</Text>
      </View>
    );
  }

  /* ---------------- MAP ---------------- */

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPanDrag={() => (isUserInteracting.current = true)}
        onRegionChangeComplete={() => {
          setTimeout(() => {
            isUserInteracting.current = false;
          }, 2000);
        }}
      >
        {/* 🚗 Driver */}
        <Marker coordinate={driverLocation} title="Driver" />

        {/* 📍 Delivery */}
        {deliveryLocation && (
          <Marker
            coordinate={deliveryLocation}
            title="Delivery Location"
            pinColor="green"
          />
        )}

        {/* 🛣️ Line */}
        {deliveryLocation && (
          <Polyline
            coordinates={[driverLocation, deliveryLocation]}
            strokeWidth={4}
            strokeColor={Colors.primaryPink}
          />
        )}
      </MapView>

      {/* 🎯 Recenter Button */}
      <TouchableOpacity
        style={styles.recenter}
        onPress={() =>
          mapRef.current?.animateCamera({
            center: driverLocation,
            zoom: 15,
          })
        }
      >
        <Icon name="locate-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default DriverLocationMap;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    height: 400,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  center: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  recenter: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: Colors.primaryPink,
    padding: 12,
    borderRadius: 30,
    elevation: 4,
  },
});
