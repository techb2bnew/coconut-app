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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';

const PrivacyPolicyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <Text style={styles.title}>Privacy Policy</Text> 

            {/* Section 1 - Introduction */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Introduction</Text>
              <Text style={styles.sectionText}>
                Welcome to the Privacy Policy of Coconut Stock Corporation ("we," "our," or "us"). We are dedicated to ensuring the privacy and security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you engage with our services. By accessing or using our website and products, you consent to the practices described herein.
              </Text>
            </View>

            {/* Section 2 - Information We Collect */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Information We Collect</Text>
              <Text style={styles.sectionText}>
                We may collect the following categories of personal information from you:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Contact Information: Your name, address, email address, phone number, and other relevant contact details.</Text>
                <Text style={styles.bulletPoint}>• Payment Information: Details necessary to process transactions, such as credit card information or other payment methods.</Text>
                <Text style={styles.bulletPoint}>• Usage Data: Information about how you interact with our website, products, and services, including browsing patterns, pages viewed, and time spent on our site.</Text>
                <Text style={styles.bulletPoint}>• Log Data: Automatically collected information, including IP address, browser type, operating system, and referring pages.</Text>
              </View>
            </View>

            {/* Section 3 - How We Use Your Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
              <Text style={styles.sectionText}>
                We use your information for various purposes, including but not limited to:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Order Processing: To fulfill your orders, process payments, and deliver products to you.</Text>
                <Text style={styles.bulletPoint}>• Customer Support: To provide assistance and respond to inquiries, concerns, or requests.</Text>
                <Text style={styles.bulletPoint}>• Improvement: To enhance our products, services, and website based on user preferences and feedback.</Text>
                <Text style={styles.bulletPoint}>• Communication: To keep you informed about promotions, offers, updates, and relevant news.</Text>
              </View>
            </View>

            {/* Section 4 - Disclosure of Your Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Disclosure of Your Information</Text>
              <Text style={styles.sectionText}>
                We may share your information under the following circumstances:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Service Providers: We may engage third-party service providers to assist us in various aspects of our operations, such as payment processing, shipping, and customer support.</Text>
                <Text style={styles.bulletPoint}>• Legal Obligations: We may disclose your information in response to legal requests, court orders, government inquiries, or as required to comply with applicable laws.</Text>
                <Text style={styles.bulletPoint}>• Business Transfers: In the event of a merger, acquisition, sale, or transfer of assets, your information may be transferred to the relevant parties.</Text>
              </View>
            </View>

            {/* Section 5 - Your Choices */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Your Choices</Text>
              <Text style={styles.sectionText}>
                You have certain rights regarding your personal information:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Access and Update: You can access and update your personal information by contacting us directly.</Text>
                <Text style={styles.bulletPoint}>• Opt-Out: You have the option to unsubscribe from marketing communications at any time by following the instructions in our emails.</Text>
                <Text style={styles.bulletPoint}>• Object to Processing: You may object to certain processing activities, such as direct marketing.</Text>
              </View>
            </View>

            {/* Section 6 - Security */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Security</Text>
              <Text style={styles.sectionText}>
                We don't collect or share any of your personal information through our website.
              </Text>
            </View>

            {/* Section 7 - Changes to this Privacy Policy */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Changes to this Privacy Policy</Text>
              <Text style={styles.sectionText}>
                We may update this Privacy Policy to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes.
              </Text>
              <Text style={[styles.sectionText, { marginTop: 16 }]}>
                At Coconut Stock Corporation, we are committed to maintaining the confidentiality and security of your personal information. Your trust is paramount, and we strive to ensure that your data is handled with the utmost care. If you have any questions or require further clarification about our Privacy Policy, please don't hesitate to reach out to us. We value your partnership and appreciate the opportunity to serve you while safeguarding your privacy.
              </Text>
              <Text style={[styles.sectionText, { marginTop: 10, fontWeight: '600' }]}>
                Thank you for choosing Coconut Stock.
              </Text>
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
    paddingTop: Platform.OS === 'ios' ? 55 : 20,
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
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
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

