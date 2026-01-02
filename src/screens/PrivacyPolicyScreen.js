/**
 * Privacy Policy Screen
 * Displays privacy policy with same design as screenshots
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Main Card Container */}
        <View style={styles.cardContainer}>
          {/* Header */}
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={20} color={Colors.cardBackground} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Privacy Policy</Text> 

            {/* Section 1 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Information We Collect</Text>
              <Text style={styles.sectionText}>
                At CoconutStock, we collect information necessary to provide you with our coconut delivery services. This includes:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Personal information (name, email, phone number)</Text>
                <Text style={styles.bulletPoint}>• Delivery addresses</Text>
                <Text style={styles.bulletPoint}>• Order history and preferences</Text>
                <Text style={styles.bulletPoint}>• Payment information (processed securely through our payment partners)</Text>
              </View>
            </View>

            {/* Section 2 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
              <Text style={styles.sectionText}>
                We use your information to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Process and deliver your coconut orders</Text>
                <Text style={styles.bulletPoint}>• Send order confirmations and delivery notifications</Text>
                <Text style={styles.bulletPoint}>• Improve our products and services</Text>
                <Text style={styles.bulletPoint}>• Provide customer support</Text>
                <Text style={styles.bulletPoint}>• Send promotional offers (with your consent)</Text>
              </View>
            </View>

            {/* Section 3 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Information Sharing</Text>
              <Text style={styles.sectionText}>
                We do not sell your personal information. We may share your information with:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Delivery partners to fulfill your orders</Text>
                <Text style={styles.bulletPoint}>• Payment processors to handle transactions</Text>
                <Text style={styles.bulletPoint}>• Service providers who assist our operations</Text>
                <Text style={styles.bulletPoint}>• Legal authorities when required by law</Text>
              </View>
            </View>

            {/* Section 4 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Data Security</Text>
              <Text style={styles.sectionText}>
                We implement industry-standard security measures to protect your personal information. This includes encryption of sensitive data, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure.
              </Text>
            </View>

            {/* Section 5 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Your Rights</Text>
              <Text style={styles.sectionText}>
                You have the right to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Access your personal information</Text>
                <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
                <Text style={styles.bulletPoint}>• Request deletion of your data</Text>
                <Text style={styles.bulletPoint}>• Opt-out of marketing communications</Text>
                <Text style={styles.bulletPoint}>• Export your data in a portable format</Text>
              </View>
            </View>

            {/* Section 6 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Cookies and Tracking</Text>
              <Text style={styles.sectionText}>
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, and improve our services. You can control cookie preferences through your browser settings.
              </Text>
            </View>

            {/* Section 7 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
              <Text style={styles.sectionText}>
                Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </Text>
            </View>

            {/* Section 8 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
              <Text style={styles.sectionText}>
                We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last updated" date.
              </Text>
            </View>

            {/* Section 9 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Contact Us</Text>
              <Text style={styles.sectionText}>
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactText}>Email: privacy@coconutstock.com</Text>
                <Text style={styles.contactText}>Phone: 1-800-COCONUT</Text>
                <Text style={styles.contactText}>Address: 123 Tropical Lane, Miami, FL 33101</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pink Disclaimer Box */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            By using CoconutStock services, you acknowledge that you have read and understood this Privacy Policy and agree to our collection, use, and disclosure of your information as described herein.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: { 
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: Colors.cardBackground, 
    overflow: 'hidden',
    marginBottom: 20,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: fontFamilyBody,
    marginLeft: 8,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 8,
    marginTop: 8,
  },
  bulletPoint: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  contactInfo: {
    marginTop: 12,
    marginLeft: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
  },
  disclaimerBox: {
    backgroundColor: Colors.primaryPink,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D81B60',
    padding: 16,
    marginTop: 10,
    marginLeft: 20,
    marginRight: 20,
  },
  disclaimerText: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default PrivacyPolicyScreen;

