/**
 * Splash Screen
 * Animated splash screen shown only on first app launch
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../components/Logo';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const logoScaleAnim = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;
  
  // Individual dot animations
  const dot1Scale = useRef(new Animated.Value(0)).current;
  const dot2Scale = useRef(new Animated.Value(0)).current;
  const dot3Scale = useRef(new Animated.Value(0)).current;
  const dot2Pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start all animations
    Animated.parallel([
      // Background fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Card scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // Logo scale animation (delayed)
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      // Title fade in (delayed)
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle fade in (delayed)
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Dots fade in (delayed)
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(dotsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Individual dot scale animations (sequential)
      Animated.sequence([
        Animated.delay(1000),
        Animated.spring(dot1Scale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1100),
        Animated.spring(dot2Scale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1200),
        Animated.spring(dot3Scale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Pulse animation for active dot (middle one)
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(dot2Pulse, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dot2Pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Start pulse after dots appear
    setTimeout(() => {
      pulseAnimation.start();
    }, 1300);

    // Navigate to Login after animation completes
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500); // Total animation time ~2.5 seconds

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Animated.View
        style={[
          styles.background,
          {
            opacity: fadeAnim,
            backgroundColor: Colors.darkPink,
          },
        ]}
      />
      
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo with animation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScaleAnim }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Logo size={120} />
          </View>
        </Animated.View>

        {/* Main Title */}
        <Animated.Text
          style={[
            styles.mainTitle,
            {
              opacity: titleOpacity,
            },
          ]}
        >
          Brand in a Nut
        </Animated.Text>

     

        {/* Navigation Dots */}
        <Animated.View
          style={[
            styles.dotsContainer,
            {
              opacity: dotsOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ scale: dot1Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              styles.dotActive,
              {
                transform: [{ scale: Animated.multiply(dot2Scale, dot2Pulse) }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ scale: dot3Scale }],
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: width * 0.85,
    maxWidth: 350, 
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',   
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.darkPink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color:'#ffffff',
    fontFamily: fontFamilyBody,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: fontFamilyHeading,
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.darkPink,
    opacity: 0.5,
    marginHorizontal: 4,
  },
  dotActive: {
    opacity: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default SplashScreen;

