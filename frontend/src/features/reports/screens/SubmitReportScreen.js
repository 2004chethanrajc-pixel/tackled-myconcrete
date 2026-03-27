import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSubmitReport } from '../hooks';
import { reportsApi } from '../api';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import ViewShot from 'react-native-view-shot';
import NetInfo from '@react-native-community/netinfo';
import { enqueueReport } from '../../../services/offlineQueue';
import { useTheme } from '../../../context/ThemeContext';

const SubmitReportScreen = ({ route, navigation }) => {
  const { colors: themeColors } = useTheme();
  const styles = React.useMemo(() => getStyles(themeColors), [themeColors]);
  const { project } = route.params;
  const [totalFloors, setTotalFloors] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // New states for watermark
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkPreview, setWatermarkPreview] = useState(null); // {uri, origWidth, origHeight, locText, timestamp}
  const [savingImage, setSavingImage] = useState(false);
  const [showVideoMetaModal, setShowVideoMetaModal] = useState(false);
  const [videoMetaPreview, setVideoMetaPreview] = useState(null);

  const { submitReport, loading } = useSubmitReport();
  const { scrollY, onScroll } = useScrollPosition();
  const viewShotRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;

  const pickImages = async () => {
    try {
      const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

      if (mediaStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera and gallery permissions to upload media');
        return;
      }

      Alert.alert(
        'Add Site Media',
        'Choose source\n\n📸 Camera Photo = with GPS Watermark\n🎥 Camera Video = record site video',
        [
          {
            text: '📸 Take Photo (with Watermark)',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.9,
                allowsEditing: false,
                exif: true,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                const photo = result.assets[0];

                // Get exact location + timestamp
                let locText = 'Location: Permission not granted';
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.BestForNavigation,
                    });
                    
                    // Try to get address from coordinates using reverse geocoding
                    try {
                      const address = await Location.reverseGeocodeAsync({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                      });
                      
                      if (address && address.length > 0) {
                        const addr = address[0];
                        // Build address string from available components
                        const addressParts = [];
                        if (addr.street) addressParts.push(addr.street);
                        if (addr.city) addressParts.push(addr.city);
                        if (addr.region) addressParts.push(addr.region);
                        if (addr.country) addressParts.push(addr.country);
                        
                        if (addressParts.length > 0) {
                          locText = addressParts.join(', ');
                        } else {
                          // Fallback to coordinates if no address found
                          locText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                        }
                      } else {
                        // Fallback to coordinates
                        locText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                      }
                    } catch (geocodeErr) {
                      console.log('Reverse geocoding error:', geocodeErr);
                      // Fallback to coordinates
                      locText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                    }
                  }
                } catch (locErr) {
                  console.log('Location error:', locErr);
                }

                const now = new Date();
                const dateStr = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
                const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const timestamp = `${dateStr}   ${timeStr}`;

                setWatermarkPreview({
                  uri: photo.uri,
                  origWidth: photo.width,
                  origHeight: photo.height,
                  locText,
                  timestamp,
                });
                setShowWatermarkModal(true);
              }
            },
          },
          {
            text: '🖼️ Choose from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: 10,
              });

              if (!result.canceled && result.assets) {
                const newMedia = result.assets.map(asset => ({ uri: asset.uri, type: asset.type || 'image' }));
                setSelectedImages(prev => [...prev, ...newMedia]);
              }
            },
          },
          {
            text: '🎥 Record Video',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                quality: 1,
                videoMaxDuration: 120,
                allowsEditing: false,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const video = result.assets[0];
                let locText = 'Location: Not available';
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
                    try {
                      const address = await Location.reverseGeocodeAsync({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                      });
                      if (address && address.length > 0) {
                        const addr = address[0];
                        const parts = [addr.street, addr.city, addr.region, addr.country].filter(Boolean);
                        locText = parts.length > 0 ? parts.join(', ') : `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                      } else {
                        locText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                      }
                    } catch {
                      locText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                    }
                  }
                } catch (locErr) {
                  console.log('Location error:', locErr);
                }
                const now = new Date();
                const dateStr = now.toLocaleDateString('en-GB');
                const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setVideoMetaPreview({ uri: video.uri, timestamp: `${dateStr}   ${timeStr}`, locText });
                setShowVideoMetaModal(true);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err) {
      console.error('Error picking images:', err);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const addWatermarkedImage = async () => {
    if (!viewShotRef.current || !watermarkPreview) return;

    setSavingImage(true);
    
    try {
      // Capture watermarked image
      const watermarkedUri = await viewShotRef.current.capture({
        format: 'jpg',
        quality: 0.98,
        result: 'file',
      });

      // Save watermarked image to app's document directory
      let savedLocally = false;
      try {
        // Create a unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `site_report_${timestamp}.jpg`;
        const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Copy the watermarked image to app's document directory
        await FileSystem.copyAsync({
          from: watermarkedUri,
          to: destinationUri,
        });
        
        console.log('Watermarked image saved locally:', destinationUri);
        savedLocally = true;
      } catch (saveError) {
        console.log('Could not save locally:', saveError);
        // Continue even if local save fails
      }

      // Add to selected images for report submission
      setSelectedImages((prev) => [...prev, { uri: watermarkedUri }]);
      setShowWatermarkModal(false);
      setWatermarkPreview(null);
      
      // Show success message
      Alert.alert(
        'Success',
        savedLocally 
          ? '✅ Photo saved with watermark and added to report.\n\nWatermarked image saved in app storage.'
          : '✅ Photo added to report with watermark.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Watermark capture error:', err);
      Alert.alert('Error', 'Failed to add watermark. Using original photo.');
      // Fallback to original
      setSelectedImages((prev) => [...prev, { uri: watermarkPreview.uri }]);
      setShowWatermarkModal(false);
      setWatermarkPreview(null);
    } finally {
      setSavingImage(false);
    }
  };

  const useWithoutWatermark = async () => {
    setSavingImage(true);
    
    if (watermarkPreview) {
      // Save original photo to app's document directory
      let savedLocally = false;
      try {
        // Create a unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `site_report_original_${timestamp}.jpg`;
        const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Copy the original image to app's document directory
        await FileSystem.copyAsync({
          from: watermarkPreview.uri,
          to: destinationUri,
        });
        
        console.log('Original image saved locally:', destinationUri);
        savedLocally = true;
      } catch (saveError) {
        console.log('Could not save locally:', saveError);
        // Continue even if local save fails
      }

      setSelectedImages((prev) => [...prev, { uri: watermarkPreview.uri }]);
      
      Alert.alert(
        'Photo Added',
        savedLocally
          ? '✅ Photo saved and added to report (without watermark).\n\nImage saved in app storage.'
          : '✅ Photo added to report (without watermark).',
        [{ text: 'OK' }]
      );
    }
    
    setShowWatermarkModal(false);
    setWatermarkPreview(null);
    setSavingImage(false);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) {
      return [];
    }

    try {
      setUploading(true);

      const formData = new FormData();
      
      selectedImages.forEach((image, index) => {
        const ext = image.uri.split('.').pop().toLowerCase();
        const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext) || image.type === 'video';
        const mimeType = isVideo ? `video/${ext === 'mov' ? 'quicktime' : ext}` : `image/${ext}`;
        
        formData.append('images', {
          uri: image.uri,
          name: `report-media-${Date.now()}-${index}.${ext}`,
          type: mimeType,
        });
      });

      const response = await reportsApi.uploadImages(formData);
      
      if (response.success) {
        return response.data.images;
      }
      
      throw new Error('Upload failed');
    } catch (err) {
      console.error('Error uploading images:', err);
      throw new Error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!totalFloors) {
      errors.totalFloors = 'Total floors is required';
    } else {
      const floorsNum = parseInt(totalFloors);
      if (isNaN(floorsNum) || floorsNum <= 0) {
        errors.totalFloors = 'Total floors must be a positive integer';
      }
    }

    if (!dimensions || dimensions.trim() === '') {
      errors.dimensions = 'Dimensions is required';
    }

    if (selectedImages.length === 0) {
      errors.images = 'At least one image is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    // Check network connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      // Save offline
      try {
        const reportData = {
          projectId: project.id,
          totalFloors: parseInt(totalFloors),
          dimensions: dimensions.trim(),
          images: [], // will be filled during sync
          remarks: remarks.trim() || undefined,
        };
        const imageUris = selectedImages.map(img => img.uri);
        await enqueueReport(reportData, imageUris);
        Alert.alert(
          'Saved Offline',
          'No internet connection. Your report has been saved and will be uploaded automatically when you are back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (err) {
        Alert.alert('Error', 'Failed to save report offline: ' + err.message);
      }
      return;
    }

    try {
      const imagePaths = await uploadImages();

      const reportData = {
        projectId: project.id,
        totalFloors: parseInt(totalFloors),
        dimensions: dimensions.trim(),
        images: imagePaths,
        remarks: remarks.trim() || undefined,
      };

      await submitReport(reportData);

      Alert.alert(
        'Success',
        'Report submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit report');
    }
  };

  // Calculate display size to preserve aspect ratio (fits within screen)
  const getDisplaySize = () => {
    if (!watermarkPreview) return { width: screenWidth, height: 400 };
    const { origWidth, origHeight } = watermarkPreview;
    const maxHeight = Dimensions.get('window').height * 0.68; // Leave space for buttons
    const scale = Math.min(screenWidth / origWidth, maxHeight / origHeight);
    return {
      width: Math.floor(origWidth * scale),
      height: Math.floor(origHeight * scale),
    };
  };

  const displaySize = getDisplaySize();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.background === '#121212' ? 'light-content' : 'dark-content'} backgroundColor={themeColors.background} />
      <AppHeader navigation={navigation} />

      <Animated.ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: themeColors.textPrimary }]}>Submit Site Report</Text>
          <Text style={styles.projectName}>Project: {project.name}</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: themeColors.surface }]}>
          {/* Total Floors */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Total Floors *</Text>
            <View style={[styles.inputWrapper, { backgroundColor: themeColors.background, borderColor: themeColors.border }, validationErrors.totalFloors && styles.inputWrapperError]}>
              <FontAwesome5 name="building" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.textPrimary }]}
                value={totalFloors}
                onChangeText={(text) => {
                  setTotalFloors(text);
                  if (validationErrors.totalFloors) {
                    setValidationErrors({ ...validationErrors, totalFloors: null });
                  }
                }}
                placeholder="Enter total number of floors"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                blurOnSubmit={false}
                returnKeyType="done"
              />
            </View>
            {validationErrors.totalFloors && (
              <Text style={styles.errorText}>{validationErrors.totalFloors}</Text>
            )}
          </View>

          {/* Dimensions */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Dimensions (L × W) *</Text>
            <View style={[styles.inputWrapper, { backgroundColor: themeColors.background, borderColor: themeColors.border }, validationErrors.dimensions && styles.inputWrapperError]}>
              <FontAwesome5 name="ruler" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.textPrimary }]}
                value={dimensions}
                onChangeText={(text) => {
                  setDimensions(text);
                  if (validationErrors.dimensions) {
                    setValidationErrors({ ...validationErrors, dimensions: null });
                  }
                }}
                placeholder="e.g., 60ft × 40ft"
                placeholderTextColor="#94A3B8"
                blurOnSubmit={false}
                returnKeyType="done"
              />
            </View>
            {validationErrors.dimensions && (
              <Text style={styles.errorText}>{validationErrors.dimensions}</Text>
            )}
          </View>

          {/* Site Media */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Site Photos & Videos * (Real Site Media)</Text>
            
            {selectedImages.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imagesPreview}
              >
                {selectedImages.map((image, index) => {
                  const ext = image.uri.split('.').pop().toLowerCase();
                  const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext) || image.type === 'video';
                  return (
                    <View key={index} style={styles.imagePreviewItem}>
                      <Image source={{ uri: image.uri }} style={styles.previewImage} />
                      {isVideo ? (
                        <View style={styles.videoOverlay}>
                          <FontAwesome5 name="play-circle" size={28} color="#FFFFFF" />
                          {image.timestamp ? (
                            <View style={styles.videoThumbMeta}>
                              <Text style={styles.videoThumbMetaText}>{image.timestamp.split('   ')[0]}</Text>
                              <Text style={styles.videoThumbMetaText}>{image.timestamp.split('   ')[1]}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <FontAwesome5 name="times" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.pickImagesButton} 
              onPress={pickImages}
              disabled={uploading}
            >
              <LinearGradient
                colors={['#F1F5F9', '#E0F2FE']}
                style={styles.pickImagesGradient}
              >
                <FontAwesome5 name="camera" size={32} color="#3B82F6" />
                <Text style={styles.pickImagesText}>
                  {selectedImages.length === 0 ? 'Upload Site Photos / Videos' : 'Add More Media'}
                </Text>
                <Text style={styles.pickImagesHint}>
                  {selectedImages.length} file(s) selected • Max 10
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {validationErrors.images && (
              <Text style={styles.errorText}>{validationErrors.images}</Text>
            )}
          </View>

          {/* Remarks */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textPrimary }]}>Remarks (Optional)</Text>
            <View style={[styles.textAreaWrapper, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
              <TextInput
                style={[styles.textArea, { color: themeColors.textPrimary }]}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Any additional observations or notes..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                blurOnSubmit={false}
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleSubmit}
            disabled={loading || uploading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#1E40AF', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.submitButton, (loading || uploading) && styles.submitButtonDisabled]}
            >
              {(loading || uploading) ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitButtonText}>
                    {uploading ? 'Uploading photos...' : 'Submitting report...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Submit Site Report</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading || uploading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <BottomNavigation 
        navigation={navigation} 
        activeRoute="SubmitReport" 
        scrollY={scrollY} 
      />

      {/* Watermark Modal - Camera photos only */}
      <Modal
        visible={showWatermarkModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowWatermarkModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Visible Watermark</Text>
            <Text style={styles.modalSubtitle}>Date • Time • Location (Address)</Text>
          </View>

          <View style={styles.previewContainer}>
            {watermarkPreview && (
              <View style={[styles.viewShotWrapper, { width: displaySize.width, height: displaySize.height }]}>
                <ViewShot
                  ref={viewShotRef}
                  options={{ 
                    format: 'jpg', 
                    quality: 0.98,
                    width: displaySize.width,
                    height: displaySize.height
                  }}
                  style={styles.viewShotContainer}
                  collapsable={false}
                >
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: watermarkPreview.uri }}
                      style={styles.watermarkImage}
                      resizeMode="cover"
                    />

                    {/* Visible Watermark - Transparent background, no border */}
                    <View style={styles.watermarkBox}>
                      <View style={styles.watermarkContent}>
                        <View style={styles.watermarkRow}>
                          <FontAwesome5 name="calendar-alt" size={8} color="#FFFFFF" />
                          <Text style={styles.watermarkDate}>
                            {watermarkPreview.timestamp.split('   ')[0]}
                          </Text>
                        </View>
                        <View style={styles.watermarkRow}>
                          <FontAwesome5 name="clock" size={8} color="#FFFFFF" />
                          <Text style={styles.watermarkTime}>
                            {watermarkPreview.timestamp.split('   ')[1]}
                          </Text>
                        </View>
                        <View style={styles.watermarkRow}>
                          <FontAwesome5 name="map-marker-alt" size={8} color="#FFFFFF" />
                          <Text style={styles.watermarkLocation}>{watermarkPreview.locText}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </ViewShot>
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.confirmButton} 
              onPress={addWatermarkedImage}
              disabled={savingImage}
            >
              <LinearGradient
                colors={['#1E40AF', '#3B82F6']}
                style={[styles.gradientButton, savingImage && styles.buttonDisabled]}
              >
                {savingImage ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.confirmButtonText}>Saving Image...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>✅ Save with Watermark</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={useWithoutWatermark}
              disabled={savingImage}
            >
              <Text style={[styles.skipButtonText, savingImage && styles.buttonTextDisabled]}>
                Use without Watermark
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Video Metadata Modal */}
      <Modal
        visible={showVideoMetaModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVideoMetaModal(false)}
      >
        <View style={styles.videoMetaModalContainer}>
          <View style={styles.videoMetaModalContent}>
            <Text style={styles.videoMetaTitle}>🎥 Video Recorded</Text>
            <Text style={styles.videoMetaSubtitle}>
              Timestamp & location will be saved with this video
            </Text>

            {videoMetaPreview ? (
              <View style={styles.videoMetaInfoBox}>
                <View style={styles.videoMetaRow}>
                  <FontAwesome5 name="calendar-alt" size={13} color="#3B82F6" />
                  <Text style={styles.videoMetaText}>
                    {videoMetaPreview.timestamp.split('   ')[0]}
                  </Text>
                </View>
                <View style={styles.videoMetaRow}>
                  <FontAwesome5 name="clock" size={13} color="#3B82F6" />
                  <Text style={styles.videoMetaText}>
                    {videoMetaPreview.timestamp.split('   ')[1]}
                  </Text>
                </View>
                <View style={styles.videoMetaRow}>
                  <FontAwesome5 name="map-marker-alt" size={13} color="#3B82F6" />
                  <Text style={styles.videoMetaText}>{videoMetaPreview.locText}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.videoMetaActions}>
              <TouchableOpacity
                style={styles.videoMetaSkipButton}
                onPress={() => {
                  if (videoMetaPreview) {
                    setSelectedImages(prev => [...prev, { uri: videoMetaPreview.uri, type: 'video' }]);
                  }
                  setShowVideoMetaModal(false);
                  setVideoMetaPreview(null);
                }}
              >
                <Text style={styles.videoMetaSkipText}>Add Without Info</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.videoMetaAddButton}
                onPress={() => {
                  if (videoMetaPreview) {
                    setSelectedImages(prev => [...prev, {
                      uri: videoMetaPreview.uri,
                      type: 'video',
                      timestamp: videoMetaPreview.timestamp,
                      locText: videoMetaPreview.locText,
                    }]);
                  }
                  setShowVideoMetaModal(false);
                  setVideoMetaPreview(null);
                }}
              >
                <Text style={styles.videoMetaAddText}>✅ Add with Info</Text>
              </TouchableOpacity>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  projectName: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textAreaWrapper: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
  },
  textArea: {
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },
  imagesPreview: {
    marginBottom: 12,
  },
  imagePreviewItem: {
    width: 110,
    height: 110,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  pickImagesButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  pickImagesGradient: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  pickImagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginTop: 8,
  },
  pickImagesHint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  actionSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  submitButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  submitButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },

  // === Watermark Modal Styles ===
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  viewShotWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  viewShotContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  watermarkImage: {
    width: '100%',
    height: '100%',
  },
  watermarkBox: {
    position: 'absolute',
    bottom: 16,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // More transparent background
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    // No border, no shadow for minimal look
  },

  watermarkContent: {
    gap: 4,
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  watermarkDate: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginLeft: 4,
  },
  watermarkTime: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginLeft: 4,
  },
  watermarkLocation: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    marginLeft: 4,
  },
  modalActions: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },

  // === Video Meta Modal Styles ===
  videoThumbMeta: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    padding: 3,
  },
  videoThumbMetaText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  videoMetaModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  videoMetaModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  videoMetaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  videoMetaSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  videoMetaInfoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  videoMetaText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  videoMetaActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  videoMetaSkipButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  videoMetaSkipText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  videoMetaAddButton: {
    flex: 1,
    backgroundColor: '#1E40AF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  videoMetaAddText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SubmitReportScreen;
