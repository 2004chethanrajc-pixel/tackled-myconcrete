import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { FontAwesome5 } from '@expo/vector-icons';
// import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { useAuth } from '../../../hooks/useAuth';
import { sitePlansApi } from '../api';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { getImageUrl } from '../../../config/api.config';

const { width, height } = Dimensions.get('window');

const SitePlansScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { projectId, projectName } = route.params;
  const { user } = useAuth();
  const [sitePlans, setSitePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const canUpload = ['admin', 'super_admin', 'project_manager', 'customer'].includes(user?.role);

  useEffect(() => {
    fetchSitePlans();
  }, [projectId]);

  const fetchSitePlans = async () => {
    try {
      setLoading(true);
      const response = await sitePlansApi.getSitePlansByProject(projectId);
      setSitePlans(response.data.sitePlans || []);
    } catch (error) {
      console.error('Error fetching site plans:', error);
      Alert.alert('Error', 'Failed to load site plans');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      // Handle the new expo-document-picker API (v11+)
      if (result.canceled) {
        console.log('User canceled document picker');
        return;
      }

      // Check if we have assets (new API) or direct file (old API)
      const fileData = result.assets ? result.assets[0] : result;
      
      if (!fileData) {
        Alert.alert('Error', 'No file selected');
        return;
      }

      console.log('Selected file:', fileData);

      setUploading(true);
      setUploadProgress(0);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      const file = {
        uri: fileData.uri,
        name: fileData.name,
        type: fileData.mimeType || 'application/pdf',
        size: fileData.size,
      };

      console.log('Uploading file:', file);
      
      try {
        const response = await sitePlansApi.uploadSitePlan(projectId, file);
        console.log('Upload response:', response);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Show success message
        Alert.alert(
          'Success',
          'Site plan uploaded successfully!',
          [
            {
              text: 'OK',
              onPress: async () => {
                await fetchSitePlans();
                setUploadProgress(0);
              }
            }
          ]
        );
      } catch (uploadError) {
        clearInterval(progressInterval);
        console.error('Upload failed:', uploadError);
        
        // Extract detailed error message
        let errorMessage = 'Failed to upload site plan';
        
        if (uploadError.response) {
          // Server responded with error
          errorMessage = uploadError.response.data?.message || 
                        uploadError.response.data?.error ||
                        `Server error: ${uploadError.response.status}`;
          
          console.error('Server error details:', {
            status: uploadError.response.status,
            data: uploadError.response.data,
            headers: uploadError.response.headers
          });
        } else if (uploadError.request) {
          // Request made but no response
          errorMessage = 'No response from server. Please check your connection.';
          console.error('No response received:', uploadError.request);
        } else {
          // Error in request setup
          errorMessage = uploadError.message || 'Unknown error occurred';
          console.error('Request setup error:', uploadError.message);
        }
        
        Alert.alert(
          'Upload Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
        
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document: ' + error.message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleViewPDF = async (plan) => {
    try {
      const url = getImageUrl(plan.file_path);
      
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }

      // Open in WebView modal
      setViewingPlan(plan);
      setPdfUrl(url);
    } catch (error) {
      Alert.alert('Error', `Failed to open PDF: ${error.message}`);
    }
  };

  const handleDownloadPDF = async () => {
    if (!viewingPlan || !pdfUrl) return;
    
    try {
      
      if (Platform.OS === 'web') {
        // On web, trigger download
        const link = document.createElement('a');
        link.href = getImageUrl(viewingPlan.file_path);
        link.download = viewingPlan.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Success', 'PDF download started');
        return;
      }
      
      // For mobile, share the already downloaded file
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(pdfUrl, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save PDF',
          UTI: 'com.adobe.pdf'
        });
        Alert.alert('Success', 'PDF ready to save');
      } else {
        Alert.alert('Info', 'PDF is already downloaded to your device');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', `Failed to share PDF: ${error.message}`);
    }
  };

  const handleClosePDFViewer = () => {
    setViewingPlan(null);
    setPdfUrl(null);
  };

  const handleDeletePlan = (plan) => {
    Alert.alert(
      'Delete Site Plan',
      `Are you sure you want to delete "${plan.file_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await sitePlansApi.deleteSitePlan(plan.id);
              Alert.alert('Success', 'Site plan deleted successfully');
              await fetchSitePlans();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete site plan');
            }
          },
        },
      ]
    );
  };

  const canDelete = (plan) => {
    return (
      user?.role === 'admin' ||
      user?.role === 'super_admin' ||
      plan.uploaded_by === user?.id
    );
  };

  const renderPlanItem = ({ item }) => (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <FontAwesome5 name="file-pdf" size={32} color="#e74c3c" />
        <View style={styles.planInfo}>
          <Text style={styles.planName} numberOfLines={1}>
            {item.file_name}
          </Text>
          <Text style={styles.planMeta}>
            Uploaded by: {item.uploaded_by_name}
          </Text>
          <Text style={styles.planMeta}>
            {new Date(item.uploaded_at).toLocaleString()}
          </Text>
          {item.file_size && (
            <Text style={styles.planMeta}>
              Size: {(item.file_size / 1024 / 1024).toFixed(2)} MB
            </Text>
          )}
        </View>
      </View>

      <View style={styles.planActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewPDF(item)}
        >
          <FontAwesome5 name="eye" size={16} color={colors.surface} />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>

        {canDelete(item) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeletePlan(item)}
          >
            <FontAwesome5 name="trash" size={16} color={colors.surface} />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader navigation={navigation} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading site plans...</Text>
        </View>
        <BottomNavigation navigation={navigation} activeRoute="SitePlans" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader navigation={navigation} />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Site Plans</Text>
          <Text style={styles.subtitle}>{projectName}</Text>
        </View>

        {canUpload && (
          <>
            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleUploadPDF}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color={colors.surface} />
                  <Text style={styles.uploadButtonText}>Uploading... {uploadProgress}%</Text>
                </>
              ) : (
                <>
                  <FontAwesome5 name="upload" size={18} color={colors.surface} />
                  <Text style={styles.uploadButtonText}>Upload Site Plan (PDF)</Text>
                </>
              )}
            </TouchableOpacity>
            
            {uploading && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              </View>
            )}
          </>
        )}

        <FlatList
          data={sitePlans}
          renderItem={renderPlanItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="file-pdf" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No site plans uploaded yet</Text>
              {canUpload && (
                <Text style={styles.emptySubtext}>
                  Tap the button above to upload a PDF
                </Text>
              )}
            </View>
          }
        />
      </View>

      <BottomNavigation navigation={navigation} activeRoute="SitePlans" />

      {/* PDF Viewer Modal */}
      <Modal
        visible={!!viewingPlan}
        animationType="slide"
        onRequestClose={handleClosePDFViewer}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleClosePDFViewer}
              >
                <FontAwesome5 name="times" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {viewingPlan?.file_name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {viewingPlan?.uploaded_by_name}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownloadPDF}
            >
              <FontAwesome5 name="download" size={18} color={colors.surface} />
              <Text style={styles.downloadButtonText}>Download</Text>
            </TouchableOpacity>
          </View>

          {/* PDF Viewer */}
          <View style={styles.pdfContainer}>
            {pdfUrl ? (
              Platform.OS === 'web' ? (
                <iframe
                  src={pdfUrl}
                  style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
                  title="PDF Viewer"
                />
              ) : (
                <WebView
                  source={{ 
                    uri: pdfUrl.includes('docs.google.com') 
                      ? pdfUrl 
                      : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`
                  }}
                  style={styles.webview}
                  startInLoadingState={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  allowFileAccess={true}
                  allowUniversalAccessFromFileURLs={true}
                  originWhitelist={['*']}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView error:', nativeEvent);
                    // If Google Docs viewer fails, try direct URL
                    if (!pdfUrl.includes('docs.google.com')) {
                      console.log('Retrying with direct URL');
                      setPdfUrl(getImageUrl(viewingPlan.file_path));
                    }
                  }}
                  renderError={(errorDomain, errorCode, errorDesc) => (
                    <View style={styles.errorContainer}>
                      <FontAwesome5 name="exclamation-triangle" size={48} color={colors.warning} />
                      <Text style={styles.errorText}>Failed to load PDF in viewer</Text>
                      <Text style={styles.errorSubtext}>Try downloading or opening with external app</Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={async () => {
                          try {
                            const directUrl = getImageUrl(viewingPlan.file_path);
                            const supported = await Linking.canOpenURL(directUrl);
                            if (supported) {
                              await Linking.openURL(directUrl);
                            } else {
                              await handleDownloadPDF();
                            }
                          } catch (error) {
                            Alert.alert('Error', 'Failed to open PDF');
                          }
                        }}
                      >
                        <Text style={styles.retryButtonText}>Open Externally</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  renderLoading={() => (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.loadingText}>Loading PDF...</Text>
                    </View>
                  )}
                />
              )
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Preparing PDF...</Text>
              </View>
            )}
            
            {/* Fallback: Open with external app button */}
            {pdfUrl && Platform.OS !== 'web' && (
              <View style={styles.fallbackContainer}>
                <TouchableOpacity
                  style={styles.fallbackButton}
                  onPress={async () => {
                    try {
                      const supported = await Linking.canOpenURL(pdfUrl);
                      if (supported) {
                        await Linking.openURL(pdfUrl);
                      } else {
                        await handleDownloadPDF();
                      }
                    } catch (error) {
                      console.error('Error opening with external app:', error);
                      Alert.alert('Error', 'Failed to open PDF with external app');
                    }
                  }}
                >
                  <FontAwesome5 name="external-link-alt" size={16} color={colors.primary} />
                  <Text style={styles.fallbackButtonText}>Open with PDF Reader</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    gap: 10,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.success || '#4CAF50',
    borderRadius: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  planHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  planMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  planActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  modalCloseButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#525659',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    ...typography.body,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  errorSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  fallbackContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fallbackButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default SitePlansScreen;
