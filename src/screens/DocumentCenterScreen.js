/**
 * Document Center Screen
 * Upload and manage company documents (Logo, Resale Certificate, Other Documents)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import Colors from '../theme/colors';
import { fontFamilyHeading, fontFamilyBody } from '../theme/fonts';
import Button from '../components/Button';
import supabase from '../config/supabase';

const DocumentCenterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [downloading, setDownloading] = useState({});
  const [customerData, setCustomerData] = useState(null);
  
  // Document states
  const [companyLogo, setCompanyLogo] = useState(null);
  const [resaleCertificate, setResaleCertificate] = useState(null);
  const [otherDocuments, setOtherDocuments] = useState([]);

  // Fetch customer data
  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setLoading(false);
        return;
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        setLoading(false);
        return;
      }

      setCustomerData(customer);
      
      // Load existing documents
      if (customer?.companyLogo) {
        setCompanyLogo({ url: customer.companyLogo, name: 'Company Logo' });
      }
      if (customer?.resale_certificate) {
        setResaleCertificate({ url: customer.resale_certificate, name: 'Resale Certificate' });
      }
      if (customer?.other_documents) {
        try {
          const docs = typeof customer.other_documents === 'string' 
            ? JSON.parse(customer.other_documents) 
            : customer.other_documents;
          setOtherDocuments(Array.isArray(docs) ? docs : []);
        } catch (e) {
          setOtherDocuments([]);
        }
      }
    } catch (error) {
      console.error('Error in fetchCustomerData:', error);
    } finally {
      setLoading(false);
    }
  };

  // Request permissions for file picker (Android)
  const requestFilePickerPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const androidVersion = Platform.Version;
        
        if (androidVersion >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'File Permission',
              message: 'App needs access to your files to upload documents',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission',
              message: 'App needs access to your storage to upload documents',
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
    }
    return true;
  };

  // Handle file upload
  const handleFileUpload = async (type, options = {}) => {
    if (Platform.OS === 'android') {
      const hasPermission = await requestFilePickerPermissions();
      if (!hasPermission) {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'File permission is required to upload documents.',
          position: 'top',
          visibilityTime: 2500,
        });
        return;
      }
    }

    const fileOptions = {
      mediaType: 'mixed',
      quality: 0.8,
      maxWidth: 2048,
      maxHeight: 2048,
      includeBase64: true,
      selectionLimit: 1,
      ...options,
    };

    launchImageLibrary(fileOptions, async (response) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.errorMessage || 'Failed to pick file',
          position: 'top',
          visibilityTime: 2500,
        });
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        await uploadFile(type, asset);
      }
    });
  };

  // Upload file to Supabase Storage
  const uploadFile = async (type, asset) => {
    setUploading({ ...uploading, [type]: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not logged in.',
          position: 'top',
          visibilityTime: 2500,
        });
        setUploading({ ...uploading, [type]: false });
        return;
      }

      const timestamp = Date.now();
      const filenameSafe = asset.fileName || `${type}-${timestamp}.${asset.type?.split('/')[1] || 'jpg'}`;
      const path = `documents/${user.email}/${timestamp}-${filenameSafe}`;
      const bucketName = 'customer-documents';
      const fileExt = filenameSafe.split('.').pop() || 'jpg';
      const contentType = asset.type || `application/${fileExt === 'pdf' ? 'pdf' : 'octet-stream'}`;

      let fileData;
      if (asset.base64) {
        const base64Data = asset.base64;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileData = bytes.buffer;
      } else if (asset.uri) {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        fileData = await blob.arrayBuffer();
      } else {
        throw new Error('No file data available');
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(path, fileData, { 
          upsert: true, 
          contentType: contentType,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        Toast.show({
          type: 'error',
          text1: 'Upload Failed',
          text2: uploadError.message || 'Failed to upload file. Please try again.',
          position: 'top',
          visibilityTime: 2500,
        });
        setUploading({ ...uploading, [type]: false });
        return;
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
      const fileUrl = urlData.publicUrl;

      // Update customer record
      const updateData = {};
      if (type === 'companyLogo') {
        updateData.companyLogo = fileUrl;
      } else if (type === 'resaleCertificate') {
        updateData.resale_certificate = fileUrl;
      } else if (type === 'otherDocuments') {
        const existingDocs = customerData?.other_documents 
          ? (typeof customerData.other_documents === 'string' 
              ? JSON.parse(customerData.other_documents) 
              : customerData.other_documents)
          : [];
        const newDoc = {
          id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          name: filenameSafe,
          url: fileUrl,
          type: fileExt.toUpperCase(),
          uploadedAt: new Date().toISOString(),
          size: asset.fileSize || 0,
        };
        const updatedDocs = Array.isArray(existingDocs) 
          ? [...existingDocs, newDoc] 
          : [newDoc];
        updateData.other_documents = JSON.stringify(updatedDocs);
      }

      const { error: updateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('email', user.email);

      if (updateError) {
        console.error('Error updating customer:', updateError);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to save document. Please try again.',
          position: 'top',
          visibilityTime: 2500,
        });
        setUploading({ ...uploading, [type]: false });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Document uploaded successfully!',
        position: 'top',
        visibilityTime: 2500,
      });

      // Refresh customer data
      await fetchCustomerData();
    } catch (error) {
      console.error('Error uploading file:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred.',
        position: 'top',
        visibilityTime: 2500,
      });
    } finally {
      setUploading({ ...uploading, [type]: false });
    }
  };

  // Handle delete document
  const handleDeleteDocument = async (type, docId = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'User not logged in.',
          position: 'top',
          visibilityTime: 2500,
        });
        return;
      }

      const updateData = {};
      if (type === 'companyLogo') {
        updateData.companyLogo = null;
      } else if (type === 'resaleCertificate') {
        updateData.resale_certificate = null;
      } else if (type === 'otherDocuments' && docId) {
        const existingDocs = customerData?.other_documents 
          ? (typeof customerData.other_documents === 'string' 
              ? JSON.parse(customerData.other_documents) 
              : customerData.other_documents)
          : [];
        const updatedDocs = Array.isArray(existingDocs) 
          ? existingDocs.filter(doc => doc.id !== docId)
          : [];
        updateData.other_documents = updatedDocs.length > 0 ? JSON.stringify(updatedDocs) : null;
      }

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('email', user.email);

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to delete document.',
          position: 'top',
          visibilityTime: 2500,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Document deleted successfully!',
        position: 'top',
        visibilityTime: 2500,
      });

      await fetchCustomerData();
    } catch (error) {
      console.error('Error deleting document:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An unexpected error occurred.',
        position: 'top',
        visibilityTime: 2500,
      });
    }
  };

  // Request storage permissions for Android
  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidVersion = Platform.Version;
      
      if (androidVersion >= 33) {
        // Android 13+ - request WRITE_EXTERNAL_STORAGE is not needed, but we can request MANAGE_EXTERNAL_STORAGE if needed
        // For downloads, we can use Downloads directory which doesn't require permission
        return true;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to storage to download files',
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

  // Handle download - saves file to device
  const handleDownload = async (url, fileName = null) => {
    if (!url) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'File URL is missing.',
        position: 'top',
        visibilityTime: 2500,
      });
      return;
    }

    const downloadKey = fileName || url;
    setDownloading({ ...downloading, [downloadKey]: true });

    try {
      console.log('Attempting to download file from URL:', url);
      
      // Clean and validate URL
      let fileUrl = url.trim();
      
      // Extract filename from URL or use provided name
      let finalFileName = fileName;
      if (!finalFileName) {
        const urlParts = fileUrl.split('/');
        finalFileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
        if (!finalFileName || finalFileName === '') {
          finalFileName = `document_${Date.now()}.pdf`;
        }
      }

      // Request storage permission for Android
      if (Platform.OS === 'android') {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission && Platform.Version < 33) {
          Toast.show({
            type: 'error',
            text1: 'Permission Denied',
            text2: 'Storage permission is required to download files.',
            position: 'top',
            visibilityTime: 2500,
          });
          setDownloading({ ...downloading, [downloadKey]: false });
          return;
        }
      }

      // Determine download path
      const downloadPath = Platform.select({
        ios: `${RNFS.DocumentDirectoryPath}/${finalFileName}`,
        android: `${RNFS.DownloadDirectoryPath}/${finalFileName}`,
      });

      console.log('Downloading to:', downloadPath);

      // Download file
      const downloadResult = await RNFS.downloadFile({
        fromUrl: fileUrl,
        toFile: downloadPath,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          console.log(`Download progress: ${progress.toFixed(2)}%`);
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log('File downloaded successfully to:', downloadPath);
        
        Toast.show({
          type: 'success',
          text1: 'Download Complete! ✅',
          text2: `File saved: ${finalFileName}`,
          position: 'top',
          visibilityTime: 3000,
        });

        // On Android, try to open Downloads folder
        if (Platform.OS === 'android') {
          try {
            // Open the file with default app
            await Linking.openURL(`file://${downloadPath}`);
          } catch (openError) {
            console.log('Could not open file directly, but download was successful');
          }
        }
      } else {
        throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: error.message || 'Failed to download file. Please try again.',
        position: 'top',
        visibilityTime: 2500,
      });
    } finally {
      setDownloading({ ...downloading, [downloadKey]: false });
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Get file type color
  const getFileTypeColor = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower === 'png' || typeLower === 'jpg' || typeLower === 'jpeg') return '#9C27B0';
    if (typeLower === 'pdf') return '#4CAF50';
    return Colors.primaryPink;
  };

  // Get file icon
  const getFileIcon = (type) => {
    const typeLower = (type || '').toLowerCase();
    if (typeLower === 'png' || typeLower === 'jpg' || typeLower === 'jpeg') return 'image-outline';
    return 'document-text-outline';
  };

  const handleBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryPink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.cardBackground} /> 
        <Text style={styles.headerTitle}>Document Center</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Company Logo Section */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Company Logo</Text>
          <Text style={styles.fileSpecs}>
            Preferred: Vector (SVG, AI, EPS){'\n'}
            Also: PNG, JPG, PDF • Max 5MB
          </Text>
          <View style={styles.uploadButtonRow}>
            <View style={styles.infoBox}>
              <Icon name="bulb-outline" size={16} color="#2196F3" />
              <Text style={styles.infoText}>
                Vector files (SVG, AI, EPS) provide the best quality for logos
              </Text>
            </View>
            <View style={styles.warningBox}>
              <Icon name="warning-outline" size={16} color={Colors.warning} />
              <Text style={styles.warningText}>Screenshots not accepted</Text>
            </View>
            <TouchableOpacity
              style={[styles.uploadButton, styles.primaryUploadButton]}
              onPress={() => handleFileUpload('companyLogo', {
                mediaType: 'photo',
                maxWidth: 2048,
                maxHeight: 2048,
              })}
              disabled={uploading.companyLogo}>
              {uploading.companyLogo ? (
                <Text style={styles.uploadButtonText}>Uploading...</Text>
              ) : (
                <>
                  <Icon name="arrow-up" size={18} color={Colors.cardBackground} />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Resale Certificate Section */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Resale Certificate</Text>
          <Text style={styles.fileSpecs}>
            PDF format required{'\n'}
            Max size: 10MB
          </Text>
          <TouchableOpacity
            style={[styles.uploadButton, styles.outlineUploadButton]}
            onPress={() => handleFileUpload('resaleCertificate', {
              mediaType: 'mixed',
            })}
            disabled={uploading.resaleCertificate}>
            {uploading.resaleCertificate ? (
              <Text style={styles.outlineUploadButtonText}>Uploading...</Text>
            ) : (
              <>
                <Icon name="arrow-up" size={18} color={Colors.primaryPink} />
                <Text style={styles.outlineUploadButtonText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Other Documents Section */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Other Documents</Text>
          <Text style={styles.fileSpecs}>
            PDF, DOC, or DOCX{'\n'}
            Max size: 10MB
          </Text>
          <TouchableOpacity
            style={[styles.uploadButton, styles.outlineUploadButton]}
            onPress={() => handleFileUpload('otherDocuments', {
              mediaType: 'mixed',
            })}
            disabled={uploading.otherDocuments}>
            {uploading.otherDocuments ? (
              <Text style={styles.outlineUploadButtonText}>Uploading...</Text>
            ) : (
              <>
                <Icon name="arrow-up" size={18} color={Colors.primaryPink} />
                <Text style={styles.outlineUploadButtonText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Uploaded Documents Section */}
        <View style={styles.uploadedSection}>
          <View style={styles.uploadedHeader}>
            <Text style={styles.uploadedTitle}>Uploaded Documents</Text>
            <Text style={styles.maxSizeText}>Max size: 10MB</Text>
          </View>

          {/* Company Logo */}
          {companyLogo && (
            <View style={styles.documentCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.fileIcon, { backgroundColor: '#9C27B0' }]}>
                  <Icon name="image-outline" size={24} color={Colors.cardBackground} />
                </View>
                <View style={styles.documentInfo}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName}>Company_Logo.png</Text>
                      <Text style={styles.fileLabel}>Logo</Text>
                      <Text style={styles.fileMeta}>
                        {formatDate(new Date())} • {formatFileSize(companyLogo.size || 245000)}
                      </Text>
                    </View>
                    <View style={styles.fileTypeBadge}>
                      <Text style={styles.fileTypeText}>PNG</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => handleDownload(companyLogo.url, 'Company_Logo.png')}
                  disabled={downloading[companyLogo.url] || downloading['Company_Logo.png']}>
                  {downloading[companyLogo.url] || downloading['Company_Logo.png'] ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.textPrimary} />
                      <Text style={styles.downloadText}>Downloading...</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="arrow-down" size={16} color={Colors.textPrimary} />
                      <Text style={styles.downloadText}>Download</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDocument('companyLogo')}>
                  <Icon name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Resale Certificate */}
          {resaleCertificate && (
            <View style={styles.documentCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.fileIcon, { backgroundColor: '#4CAF50' }]}>
                  <Icon name="document-text-outline" size={24} color={Colors.cardBackground} />
                </View>
                <View style={styles.documentInfo}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName}>Resale_Certificate_2025.pdf</Text>
                      <Text style={styles.fileLabel}>Resale Certificate</Text>
                      <Text style={styles.fileMeta}>
                        {formatDate(new Date())} • {formatFileSize(resaleCertificate.size || 1200000)}
                      </Text>
                    </View>
                    <View style={styles.fileTypeBadge}>
                      <Text style={styles.fileTypeText}>PDF</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => handleDownload(resaleCertificate.url, 'Resale_Certificate_2025.pdf')}
                  disabled={downloading[resaleCertificate.url] || downloading['Resale_Certificate_2025.pdf']}>
                  {downloading[resaleCertificate.url] || downloading['Resale_Certificate_2025.pdf'] ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.textPrimary} />
                      <Text style={styles.downloadText}>Downloading...</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="arrow-down" size={16} color={Colors.textPrimary} />
                      <Text style={styles.downloadText}>Download</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDocument('resaleCertificate')}>
                  <Icon name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Other Documents */}
          {otherDocuments.map((doc) => (
            <View key={doc.id} style={styles.documentCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.fileIcon, { backgroundColor: getFileTypeColor(doc.type) }]}>
                  <Icon name={getFileIcon(doc.type)} size={24} color={Colors.cardBackground} />
                </View>
                <View style={styles.documentInfo}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName}>{doc.name}</Text>
                      <Text style={styles.fileLabel}>Other</Text>
                      <Text style={styles.fileMeta}>
                        {formatDate(doc.uploadedAt)} • {formatFileSize(doc.size)}
                      </Text>
                    </View>
                    <View style={styles.fileTypeBadge}>
                      <Text style={styles.fileTypeText}>{doc.type}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.documentActions}>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => handleDownload(doc.url, doc.name)}
                  disabled={downloading[doc.url] || downloading[doc.name]}>
                  {downloading[doc.url] || downloading[doc.name] ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.textPrimary} />
                      <Text style={styles.downloadText}>Downloading...</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="arrow-down" size={16} color={Colors.textPrimary} />
                      <Text style={styles.downloadText}>Download</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDocument('otherDocuments', doc.id)}>
                  <Icon name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {!companyLogo && !resaleCertificate && otherDocuments.length === 0 && (
            <Text style={styles.noDocumentsText}>No documents uploaded yet</Text>
          )}
        </View>

        {/* Note Section */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Note: Documents uploaded here are shared at the company level and can be accessed by both users and administrators. Logo files will be used for custom branding on your coconuts.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontFamily: fontFamilyBody,
    marginLeft: 8,
    fontWeight: '500',
  },
  headerTitle: {
    color: Colors.cardBackground,
    fontSize: 18,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    flex: 1, 
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  uploadSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  fileSpecs: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  uploadButtonRow: {
    gap: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 50,
    marginTop: 8,
    gap: 8,
  },
  primaryUploadButton: {
    backgroundColor: Colors.primaryPink,
  },
  outlineUploadButton: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.borderPink,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilyBody,
    color: Colors.cardBackground,
  },
  outlineUploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilyBody,
    color: Colors.primaryPink,
  },
  uploadedSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadedTitle: {
    fontSize: 18,
    fontFamily: fontFamilyHeading,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  maxSizeText: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  documentCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 12,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontFamily: fontFamilyBody,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  fileLabel: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  fileMeta: {
    fontSize: 12,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
  },
  fileTypeBadge: {
    backgroundColor: Colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  fileTypeText: {
    fontSize: 11,
    fontFamily: fontFamilyBody,
    fontWeight: '900',
    color: '#ffffff',
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  downloadText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  deleteButton: {
    padding: 8,
  },
  noDocumentsText: {
    fontSize: 14,
    fontFamily: fontFamilyBody,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  noteBox: {
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginTop: 8,
  },
  noteText: {
    fontSize: 13,
    fontFamily: fontFamilyBody,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
});

export default DocumentCenterScreen;

