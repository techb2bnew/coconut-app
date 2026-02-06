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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';

const TermsAndConditionsScreen = ({ navigation }) => {
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
            <Text style={styles.title}>Coconut Stock Terms and Conditions</Text> 
            <Text style={styles.sectionText}>
              By choosing to work with Coconut Stock Corporation or buy our products, you agree to the terms and conditions below. These rules show our commitment to giving you the best custom-branded coconuts. Please read and understand these conditions that govern your interaction with Coconut Stock Corporation.
            </Text>

            {/* Section 1 - Product */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product</Text>
              <Text style={styles.sectionText}>
                At Coconut Stock Corporation, we specialize in providing fresh, young coconuts. The coconuts arrive unopened, ensuring prime quality and offering.
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Each coconut offers refreshing coconut water and creamy white flesh. On average, one young coconut contains about 10-14 ounces (295-414 ml) of coconut water, with slight variations based on the coconut's size and maturity.</Text>
                <Text style={styles.bulletPoint}>• It's important to note that the size of the coconuts in each case may vary. Natural color and flavor differences are influenced by harvest time and storage conditions.</Text>
                <Text style={styles.bulletPoint}>• Upon opening, there's a possibility of the coconut water developing a pink hue due to the enzyme polyphenol oxidase (PPO), a natural occurrence.</Text>
                <Text style={styles.bulletPoint}>• To maintain quality control, our team hand-stamps each coconut before every delivery. This meticulous process ensures the consistency and high standards of our products.</Text>
              </View>
            </View>

            {/* Section 2 - Storage Guidelines */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Storage Guidelines</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Coconuts should be maintained at the temperature of 36°F (2°C) upon receipt. Avoid exposing them to direct sunlight or room temperature storage.</Text>
                <Text style={styles.bulletPoint}>• Consume products after opening.</Text>
              </View>
            </View>

            {/* Section 3 - Logo Design and Customization */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Logo Design and Customization</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• The required logo formats include EPS (Vector, SVG, AI, PS), and the recommended dimensions are 4"W x 3"H.</Text>
                <Text style={styles.bulletPoint}>• Our design team can incorporate a monogram or initials for the logo design fee.</Text>
                <Text style={styles.bulletPoint}>• We use CNC machinery to create a metal logo. Each stamp is unique so after we create the logo we can not make any changes.</Text>
                <Text style={styles.bulletPoint}>• Our team starts the logo process right after we send the invoice. If there is a change or cancellation request it should come before you receive the invoice.</Text>
                <Text style={styles.bulletPoint}>• The deadline for receiving the logo file is set at five days. Requests with a timeframe of fewer than three days will be considered rush orders, potentially incurring an additional fee based on availability.</Text>
              </View>
            </View>

            {/* Section 4 - Delivery */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• New orders can be scheduled for delivery seven days after we receive essential information, including company details, billing information, accounting details, a signed agreement, a logo file, and the resale certificate.</Text>
                <Text style={styles.bulletPoint}>• To order custom-branded coconuts, you can contact our team via email at sales@coconutstock.com, through text, or by phone at 786-751-7799.</Text>
                <Text style={styles.bulletPoint}>• Our delivery services are available from Monday to Saturday, excluding Sundays. For next-day deliveries, orders should be submitted by 1 pm the day before.</Text>
                <Text style={styles.bulletPoint}>• We serve locations from South Point Key West to North West Palm Beach, including the West Coast Naples. Additionally, our Orlando franchise location extends its services to the Orlando, FL area.</Text>
                <Text style={styles.bulletPoint}>• If the product is delivered as planned, our team will not be held responsible for any delays thereafter.</Text>
                <Text style={styles.bulletPoint}>• Upon delivery of your order for an event, your team is responsible for inspecting the product and promptly notifying us of any issues with the order.</Text>
              </View>
            </View>

            {/* Section 5 - Return, Damaged Product, Cancellation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Return, Damaged Product, Cancellation</Text>
              
              {/* Subsection - Resale */}
              <Text style={[styles.sectionTitle, { fontSize: 16, marginTop: 16, marginBottom: 8 }]}>Resale</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• We guarantee swift replacement in the unlikely event of product damage during delivery. However, it's important to note that coconuts, being perishable items, may exhibit spots or discoloration on the outer shell.</Text>
                <Text style={styles.bulletPoint}>• To enhance the handling of products, please instruct your team to consume older items before newer ones.</Text>
                <Text style={styles.bulletPoint}>• In case of a replacement request, kindly return the damaged product to us for examination by our warehouse team. Without the actual damaged product, we cannot process the replacement request.</Text>
                <Text style={styles.bulletPoint}>• In the event that you choose to terminate our services, Coconut Stock requests that you provide us with one week's advance notice. This allows us the necessary time to ensure the provision of any stocked products you may require before discontinuation.</Text>
              </View>

              {/* Subsection - Events */}
              <Text style={[styles.sectionTitle, { fontSize: 16, marginTop: 16, marginBottom: 8 }]}>Events</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• If there is an error in the product or an issue in the delivery process, we take full responsibility and provide a complete refund.</Text>
                <Text style={styles.bulletPoint}>• If the product has been delivered but remains unused due to internal reasons, you must return the product to us to receive the refund. We will void the product and employee charges, but the customer is responsible for covering the logo fee.</Text>
                <Text style={styles.bulletPoint}>• In the case of a same-day cancellation upon contract signing, we will issue a full refund.</Text>
              </View>

              {/* Subsection - Wholesale */}
              <Text style={[styles.sectionTitle, { fontSize: 16, marginTop: 16, marginBottom: 8 }]}>Wholesale</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• For branded coconut purchases, the full payment must be made to process the orders.</Text>
                <Text style={styles.bulletPoint}>• Orders should be placed at least 10-15 days in advance.</Text>
                <Text style={styles.bulletPoint}>• In the event of a replacement request, please return the damaged product for examination by our warehouse team. We cannot process replacement requests without the actual damaged product.</Text>
                <Text style={styles.bulletPoint}>• Coconuts are perishable items, and not all will come in the same shape or size.</Text>
              </View>
            </View>

            {/* Section 6 - Packaging */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Packaging</Text>
              <Text style={styles.sectionText}>
                Your coconuts arrive in robust cases, individually wrapped for freshness and protection.
              </Text>
            </View>

            {/* Section 7 - Payment Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Options</Text>
              <Text style={styles.sectionText}>
                Accepted methods: Major credit cards (%3.5 CC fee), Zelle, Wire & ACH, and checks.
              </Text>
            </View>

            {/* Section 8 - Image Sharing and Usage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Image Sharing and Usage</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletPoint}>• Customer images may be shared on our social media and website for promotional purposes.</Text>
                <Text style={styles.bulletPoint}>• Opt-out is available if you prefer not to have your images shared. Please communicate with our team at events@coconutstock.com.</Text>
              </View>
            </View>

            {/* Closing Statement */}
            <View style={styles.section}>
              <Text style={styles.sectionText}>
                For any further questions or additional information, please don't hesitate to contact our dedicated sales team. We are excited to serve you and provide you with the ultimate choice in custom-branded coconuts!
              </Text>
              <Text style={[styles.sectionText, { marginTop: 16, fontWeight: '600' }]}>
                Thank you for choosing Coconut Stock.
              </Text>
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
    paddingTop: 60,
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
    paddingTop: Platform.OS === 'ios' ? 55 : 55, 
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

