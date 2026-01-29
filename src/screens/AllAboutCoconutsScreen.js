/**
 * All About Coconuts Screen
 * Training videos and resources based on customer's franchise
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import Logo from '../components/Logo';
import supabase from '../config/supabase';

const AllAboutCoconutsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [franchiseId, setFranchiseId] = useState(null);
  const [customerData, setCustomerData] = useState(null);

  useEffect(() => {
    fetchCustomerAndContent();
  }, []);

  const fetchCustomerAndContent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setLoading(false);
        return;
      }

      // Fetch customer data to get franchise_id
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, franchise_id')
        .eq('email', user.email)
        .single();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
        setLoading(false);
        return;
      }

      setCustomerData(customer);
      // Get customer's franchise_id (null if superadmin's customer)
      const customerFranchiseId = customer?.franchise_id || null;
      setFranchiseId(customerFranchiseId);

      console.log('Customer data:', customer);
      console.log('Customer franchise_id:', customerFranchiseId);
      console.log('Customer belongs to superadmin?', customerFranchiseId === null || customerFranchiseId === undefined);

      // Fetch videos and documents based on customer's franchise_id
      // Logic:
      // - If customer.franchise_id is NULL (superadmin customer) → show ALL videos/documents (no filter)
      // - If customer.franchise_id exists → show only that franchise's videos/documents
      await Promise.all([
        fetchVideos(customerFranchiseId),
        fetchDocuments(customerFranchiseId)
      ]);
    } catch (error) {
      console.error('Error in fetchCustomerAndContent:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async (customerFranchiseId) => {
    try {
      // Use EXACT columns from screenshots (training_videos table):
      // id (uuid), uuid (if exists), title (text), description (text), youtube_url (text), thumbnail_url (text), 
      // views (int4), franchise_id (uuid), created_at (timestamptz), updated_at (timestamptz), created_by_email (text)
      // Note: Screenshot shows 'uuid' column exists in admin panel
      const columns = 'id, title, description, youtube_url, thumbnail_url, views, franchise_id, created_at';
      
      let videosQuery = supabase
        .from('training_videos')
        .select(columns);
      
      // Admin logic: if (!isSuperAdmin) { if (currentFranchiseId) { filter } }
      // Mobile equivalent:
      // - If customer has franchise_id → Show only that franchise's videos
      // - If customer has NO franchise_id (superadmin customer) → Show only videos where franchise_id IS NULL (superadmin content)
      if (customerFranchiseId !== null && customerFranchiseId !== undefined) {
        // Customer belongs to a franchise → Filter by franchise_id
        videosQuery = videosQuery.eq('franchise_id', customerFranchiseId);
        console.log('Customer belongs to franchise - Fetching videos for franchise_id:', customerFranchiseId);
      } else {
        // Customer belongs to superadmin → Show only superadmin content (franchise_id IS NULL)
        videosQuery = videosQuery.is('franchise_id', null);
        console.log('Customer belongs to superadmin - Fetching only superadmin videos (franchise_id IS NULL)');
      }

      const { data: videosData, error } = await videosQuery;

      if (error) {
        console.error('Error fetching videos:', error);
        Alert.alert('Error', 'Failed to fetch videos. Please try again.');
        setVideos([]);
      } else {
        console.log(`Fetched ${videosData?.length || 0} videos`);
        // Log first video to check data structure
        if (videosData && videosData.length > 0) {
          console.log('=== VIDEO DATA DEBUG ===');
          console.log('First video data:', JSON.stringify(videosData[0], null, 2));
          console.log('First video youtube_url:', videosData[0].youtube_url);
          console.log('First video keys:', Object.keys(videosData[0]));
          console.log('=== END VIDEO DEBUG ===');
        } else {
          console.log('No videos fetched!');
        }
        setVideos(videosData || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      Alert.alert('Error', 'An error occurred while fetching videos.');
      setVideos([]);
    }
  };

  const fetchDocuments = async (customerFranchiseId) => {
    try {
      // Use EXACT columns from screenshots (training_documents table):
      // id (uuid), title (text), description (text), file_url (text), file_name (text), 
      // file_size (int8), downloads (int8), franchise_id (uuid), created_at (timestamptz), 
      // updated_at (timestamptz), created_by_email (text)
      // Note: No 'order' column exists - this column does NOT exist in the table
      const columns = 'id, title, description, file_url, file_name, file_size, downloads, franchise_id, created_at';
      
      let documentsQuery = supabase
        .from('training_documents')
        .select(columns);
      
      // Admin logic: if (!isSuperAdmin) { if (currentFranchiseId) { filter } }
      // Mobile equivalent:
      // - If customer has franchise_id → Show only that franchise's documents
      // - If customer has NO franchise_id (superadmin customer) → Show only documents where franchise_id IS NULL (superadmin content)
      if (customerFranchiseId !== null && customerFranchiseId !== undefined) {
        // Customer belongs to a franchise → Filter by franchise_id
        documentsQuery = documentsQuery.eq('franchise_id', customerFranchiseId);
        console.log('Customer belongs to franchise - Fetching documents for franchise_id:', customerFranchiseId);
      } else {
        // Customer belongs to superadmin → Show only superadmin content (franchise_id IS NULL)
        documentsQuery = documentsQuery.is('franchise_id', null);
        console.log('Customer belongs to superadmin - Fetching only superadmin documents (franchise_id IS NULL)');
      }

      const { data: documentsData, error } = await documentsQuery;

      if (error) {
        console.error('Error fetching documents:', error);
        setDocuments([]);
      } else {
        console.log(`Fetched ${documentsData?.length || 0} documents`);
        // Log first document to check data structure
        
        setDocuments(documentsData || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      Alert.alert('Error', 'An error occurred while fetching documents.');
      setDocuments([]);
    }
  };

  // Extract duration from YouTube URL or format seconds
  const formatDuration = (video) => {
    // If duration is provided in seconds, use it
    if (video.duration) {
      const mins = Math.floor(video.duration / 60);
      const secs = video.duration % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    // For now, return default if not available
    // You can integrate YouTube API later to get actual duration
    return null;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  const handleVideoPress = async (video) => {
    
    // Check if YouTube URL exists and is valid
    // Try different possible column names
    const youtubeUrl = video?.youtube_url || video?.youtubeUrl || video?.youtube || '';
    const trimmedUrl = youtubeUrl.toString().trim();
    try {
      // Increment views count (matching admin panel logic)
      try {
        await supabase
          .from('training_videos')
          .update({ views: (video.views || 0) + 1 })
          .eq('id', video.id); 
      } catch (updateError) {
        console.error('Error updating video views:', updateError);
        // Continue even if view update fails
      }
      
      // Open YouTube video in browser/app
      const canOpen = await Linking.canOpenURL(trimmedUrl);
      console.log('Can open URL:', canOpen);
      
      if (canOpen) {
        await Linking.openURL(trimmedUrl); 
        // Refresh video data to update view count
        const customerFranchiseId = customerData?.franchise_id || null;
        fetchVideos(customerFranchiseId);
      } else {
        // Try opening anyway (sometimes canOpenURL returns false but openURL works)
        try {
          await Linking.openURL(trimmedUrl);
          console.log('Opened URL directly:', trimmedUrl);
          const customerFranchiseId = customerData?.franchise_id || null;
          fetchVideos(customerFranchiseId);
        } catch (openError) {
          console.error('Error opening URL:', openError);
        }
      }
    } catch (error) {
      console.error('Error opening video:', error);
      Alert.alert('Error', 'Unable to open video link. Please try again.');
    }
  };

  const handleDocumentPress = async (document) => {
    
    // Check if file URL exists and is valid
    // Try different possible column names
    const fileUrl = document?.file_url || document?.fileUrl || document?.file || '';
    const trimmedUrl = fileUrl.toString().trim();

    try {
      // Increment downloads count (matching admin panel logic)
      try {
        await supabase
          .from('training_documents')
          .update({ downloads: (document.downloads || 0) + 1 })
          .eq('id', document.id); 
      } catch (updateError) {
        console.error('Error updating document downloads:', updateError);
        // Continue even if download count update fails
      }
      
      // Open/download document link
      // For PDFs and other documents, Linking.openURL will open in browser or download app
      const canOpen = await Linking.canOpenURL(trimmedUrl); 
      
      if (canOpen) {
        await Linking.openURL(trimmedUrl); 
        // Refresh document data to update download count
        const customerFranchiseId = customerData?.franchise_id || null;
        fetchDocuments(customerFranchiseId);
      } else {
        // Try opening anyway (sometimes canOpenURL returns false but openURL works)
        try {
          await Linking.openURL(trimmedUrl); 
          const customerFranchiseId = customerData?.franchise_id || null;
          fetchDocuments(customerFranchiseId);
        } catch (openError) {
          console.error('Error opening URL:', openError);
          Alert.alert('Error', 'Unable to open document link. Please check your internet connection.');
        }
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Unable to open document link. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryPink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={Colors.cardBackground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All About Coconuts</Text>
          <Text style={styles.headerSubtitle}>Training videos and resources</Text>
          <View style={styles.logoContainer}>
            <Logo size={80} showTagline={false} />
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Training Videos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Icon name="play-circle" size={20} color={Colors.cardBackground} />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Training Videos</Text>
                <Text style={styles.sectionSubtitle}>
                  {videos.length} {videos.length === 1 ? 'video' : 'videos'} available
                </Text>
              </View>
            </View>

            {videos.length > 0 ? (
              videos.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() => handleVideoPress(video)}>
                  <View style={styles.videoThumbnail}>
                    {video.thumbnail_url ? (
                      <Image
                        source={{ uri: video.thumbnail_url }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Icon name="play-circle" size={48} color={Colors.cardBackground} />
                      </View>
                    )}
                    {formatDuration(video) && (
                      <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>
                          {formatDuration(video)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {video.title || 'Untitled Video'}
                    </Text>
                    <Text style={styles.videoDescription} numberOfLines={3}>
                      {video.description || 'No description available'}
                    </Text>
                    <View style={styles.videoMeta}>
                      <Text style={styles.videoMetaText}>
                        {video.views || video.view || 0} views
                      </Text>
                      {/* Debug: Show URL status */}
                      {!video.youtube_url && (
                        <Text style={[styles.videoMetaText, { color: 'red', fontSize: 10 }]}>
                          (No URL)
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="videocam-off-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyStateText}>No videos available</Text>
              </View>
            )}
          </View>

          {/* Training Documents Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#B3E5FC' }]}>
                <Icon name="document-text" size={20} color={Colors.textPrimary} />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Training Documents</Text>
                <Text style={styles.sectionSubtitle}>
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'} available
                </Text>
              </View>
            </View>

            {documents.length > 0 ? (
              documents.map((document) => (
                <TouchableOpacity
                  key={document.id}
                  style={styles.documentCard}
                  onPress={() => handleDocumentPress(document)}>
                  <View style={styles.documentIcon}>
                    <Icon name="document-text" size={24} color={Colors.textPrimary} />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle} numberOfLines={2}>
                      {document.title || 'Untitled Document'}
                    </Text>
                    <Text style={styles.documentDescription} numberOfLines={2}>
                      {document.description || 'No description available'}
                    </Text>
                    <View style={styles.documentMeta}>
                      <Icon name="download-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.documentMetaText}>
                        {formatFileSize(document.file_size || 0)} PDF
                      </Text>
                      {document.downloads !== undefined && document.downloads > 0 && (
                        <Text style={styles.documentMetaText}>
                          • {document.downloads} downloads
                        </Text>
                      )}
                      {/* Debug: Show URL status */}
                      {!document.file_url && (
                        <Text style={[styles.documentMetaText, { color: 'red', fontSize: 10 }]}>
                          (No URL)
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="document-outline" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyStateText}>No documents available</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
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
  header: {
    backgroundColor: Colors.primaryBlue,
    paddingTop: Platform.OS === 'ios' ? 55 : 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.cardBackground, 
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
    opacity: 0.9,
    marginBottom: 20,
  },
  logoContainer: {
    marginTop: 10,
  },
  contentContainer: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20, 
    marginLeft: 20,
    marginRight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fontFamilyHeading,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  videoCard: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  videoThumbnail: {
    width: 120,
    height: 90,
    backgroundColor: Colors.primaryPink,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  videoDescription: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  videoMeta: {
    marginTop: 4,
  },
  videoMetaText: {
    fontSize: 11,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  documentCard: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#B3E5FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  documentMetaText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default AllAboutCoconutsScreen;

