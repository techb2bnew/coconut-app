/**
 * Terms & Conditions Screen
 * Displays terms and conditions with same design as screenshots
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

const TermsAndConditionsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={20} color={Colors.cardBackground} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Main Card Container */}
        <View style={styles.cardContainer}>
          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Terms & Conditions</Text> 

            {/* Section 1 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.sectionText}>
                By accessing and using the CoconutStock mobile application and services, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
              </Text>
            </View>

            {/* Section 2 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Service Description</Text>
              <Text style={styles.sectionText}>
                CoconutStock provides fresh coconut ordering and delivery services. We offer:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Cases of coconuts ($9.00 per case, 9 pieces or 9 units)</Text>
                <Text style={styles.bulletPoint}>• Coconut opener kits ($15.00 per kit)</Text>
                <Text style={styles.bulletPoint}>• Volume discounts on qualifying orders</Text>
              </View>
            </View>

            {/* Section 3 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Order Placement and Acceptance</Text>
              <Text style={styles.sectionText}>
                When you place an order through our app:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Your order constitutes an offer to purchase</Text>
                <Text style={styles.bulletPoint}>• We reserve the right to accept or decline any order</Text>
                <Text style={styles.bulletPoint}>• Order confirmation will be sent via email and in-app notification</Text>
                <Text style={styles.bulletPoint}>• Delivery dates are estimates and may vary based on availability</Text>
                <Text style={styles.bulletPoint}>• Orders placed after 2 PM qualify for next-day delivery</Text>
              </View>
            </View>

            {/* Section 4 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Pricing and Payment</Text>
              <Text style={styles.sectionText}>
                All prices are in USD and subject to change without notice. Volume discounts:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• 1-100 items: Standard pricing (0% discount)</Text>
                <Text style={styles.bulletPoint}>• 101-200 items: 5% discount</Text>
                <Text style={styles.bulletPoint}>• 201-500 items: 10% discount</Text>
                <Text style={styles.bulletPoint}>• 501+ items: 15% discount</Text>
              </View>
              <Text style={styles.sectionText}>
                Payment is due at the time of order placement. We accept major credit cards and approved purchase orders.
              </Text>
            </View>

            {/* Section 5 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Delivery Terms</Text>
              <Text style={styles.sectionText}>
                Delivery terms and conditions:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Delivery dates are estimates, not guarantees</Text>
                <Text style={styles.bulletPoint}>• You must provide accurate delivery address information</Text>
                <Text style={styles.bulletPoint}>• Someone must be available to receive the delivery</Text>
                <Text style={styles.bulletPoint}>• We are not responsible for delays due to weather or circumstances beyond our control</Text>
                <Text style={styles.bulletPoint}>• Delivery fees may apply based on location and order size</Text>
              </View>
            </View>

            {/* Section 6 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Product Quality</Text>
              <Text style={styles.sectionText}>
                We guarantee fresh, high-quality coconuts. All products are inspected before delivery. If you receive damaged or unsatisfactory products, please contact us within 24 hours of delivery for resolution.
              </Text>
            </View>

            {/* Section 7 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Cancellations and Refunds</Text>
              <Text style={styles.sectionText}>
                Cancellation and refund policy:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Orders can be cancelled before processing begins</Text>
                <Text style={styles.bulletPoint}>• Once an order is "In Transit," it cannot be cancelled</Text>
                <Text style={styles.bulletPoint}>• Refunds for quality issues will be processed within 5-7 business days</Text>
                <Text style={styles.bulletPoint}>• Partial refunds may be issued for partial order issues</Text>
              </View>
            </View>

            {/* Section 8 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. User Accounts</Text>
              <Text style={styles.sectionText}>
                You are responsible for:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Maintaining the confidentiality of your account credentials</Text>
                <Text style={styles.bulletPoint}>• All activities that occur under your account</Text>
                <Text style={styles.bulletPoint}>• Notifying us immediately of any unauthorized access</Text>
                <Text style={styles.bulletPoint}>• Providing accurate and current information</Text>
              </View>
            </View>

            {/* Section 9 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
              <Text style={styles.sectionText}>
                CoconutStock shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services. Our total liability shall not exceed the amount paid for the specific order in question.
              </Text>
            </View>

            {/* Section 10 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Intellectual Property</Text>
              <Text style={styles.sectionText}>
                All content, trademarks, logos, and intellectual property on the CoconutStock app are owned by or licensed to CoconutStock. You may not use, reproduce, or distribute our content without written permission.
              </Text>
            </View>

            {/* Section 11 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. Modifications to Terms</Text>
              <Text style={styles.sectionText}>
                We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting. Your continued use of our services constitutes acceptance of the modified terms.
              </Text>
            </View>

            {/* Section 12 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>12. Governing Law</Text>
              <Text style={styles.sectionText}>
                These Terms and Conditions are governed by the laws of the State of Florida, USA. Any disputes shall be resolved in the courts of Miami-Dade County, Florida.
              </Text>
            </View>

            {/* Section 13 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>13. Contact Information</Text>
              <Text style={styles.sectionText}>
                If you have any questions about these Terms and Conditions, please contact us at:
              </Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactText}>Email: support@coconutstock.com</Text>
                <Text style={styles.contactText}>Phone: 1-800-COCONUT</Text>
                <Text style={styles.contactText}>Address: 123 Tropical Lane, Miami, FL 33101</Text>
                <Text style={styles.contactText}>Business Hours: Monday-Friday, 8 AM - 6 PM EST</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pink Brand Message Box */}
        <View style={styles.brandBox}>
          <Text style={styles.brandText}>
            Brand in a Nut: By using CoconutStock, you're joining our tropical community! We're committed to delivering fresh, quality coconuts with a smile. 🥥
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
    paddingTop: 60, // Add padding to account for sticky header
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: Colors.cardBackground,
    overflow: 'hidden',
    marginBottom: 20,
  },
  header: {
    backgroundColor: Colors.primaryBlue,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  brandBox: {
    backgroundColor: Colors.primaryPink,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D81B60',
    padding: 16,
    marginTop: 10,
    marginLeft: 20,
    marginRight: 20,
  },
  brandText: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default TermsAndConditionsScreen;

