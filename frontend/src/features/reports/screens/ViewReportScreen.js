import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Linking,
  StatusBar,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { getLogoBase64, getPdfTimestamp, getPdfHeaderFooterCSS, getPdfLogoHtml, getPdfTimestampHtml } from '../../../utils/pdfUtils';
import Animated, { 
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { reportsApi } from '../api';
import { auditApi } from '../../audit/api';
import { typography } from '../../../theme/typography';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { useTheme } from '../../../context/ThemeContext';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';

const { width } = Dimensions.get('window');

// Backend URL - should match apiClient.js
import { getBaseUrl } from '../../../config/api.config';
const BASE_URL = getBaseUrl();

const isVideoFile = (path) => /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(path);

const ViewReportScreen = ({ route, navigation }) => {
  const { reportId, projectId } = route.params;
  const { scrollY, onScroll } = useScrollPosition();
  const { colors: themeColors } = useTheme();
  const styles = React.useMemo(() => getStyles(themeColors), [themeColors]);
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Gesture handling for swipe navigation
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    fetchReportDetails();
  }, []);

  // Safety check: Close modal if report changes or images become unavailable
  useEffect(() => {
    if (imageModalVisible && report) {
      // Check if current image index is still valid
      if (!report.images || currentImageIndex >= report.images.length) {
        closeImageModal();
      }
    }
  }, [report, imageModalVisible, currentImageIndex]);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getReportsByProject(projectId);
      console.log('Reports API Response:', JSON.stringify(response, null, 2));
      const foundReport = response.data.reports.find(r => r.id === reportId);
      console.log('Found Report:', JSON.stringify(foundReport, null, 2));
      setReport(foundReport);
    } catch (error) {
      console.error('Error fetching report:', error);
      Alert.alert('Error', 'Failed to fetch report details');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (imageUrl, index) => {
    try {
      setDownloading(true);
      
      const fullUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : `${BASE_URL}${imageUrl}`;

      const extension = imageUrl.split('.').pop() || 'jpg';
      const fileName = `report-image-${index + 1}.${extension}`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const downloadResult = await FileSystem.downloadAsync(fullUrl, fileUri);

      if (downloadResult.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert('Success', `Image saved to ${fileUri}`);
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to download image');
    } finally {
      setDownloading(false);
    }
  };

  const downloadAllImages = async () => {
    if (!report || !report.images || report.images.length === 0) {
      Alert.alert('No Images', 'This report has no images to download');
      return;
    }

    Alert.alert(
      'Download All Images',
      `Download all ${report.images.length} images?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            for (let i = 0; i < report.images.length; i++) {
              await downloadImage(report.images[i], i);
            }
          },
        },
      ]
    );
  };

  const openImage = (imageUrl, index) => {
    if (!imageUrl) {
      Alert.alert('Error', 'Image not available');
      return;
    }
    
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${BASE_URL}${imageUrl}`;
    
    setSelectedImage(fullUrl);
    setCurrentImageIndex(index);
    setImageLoading(true);
    setImageModalVisible(true);
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
    setSelectedImage(null);
    setImageLoading(false);
    // Reset gesture values
    translateX.value = 0;
    scale.value = 1;
  };

  const navigateImage = (direction) => {
    if (!report.images || report.images.length <= 1) return;
    
    let newIndex = currentImageIndex;
    if (direction === 'next') {
      newIndex = (currentImageIndex + 1) % report.images.length;
    } else {
      newIndex = currentImageIndex === 0 ? report.images.length - 1 : currentImageIndex - 1;
    }
    
    // Ensure index is within bounds
    if (newIndex < 0 || newIndex >= report.images.length) {
      console.warn('Image index out of bounds:', newIndex);
      return;
    }
    
    setCurrentImageIndex(newIndex);
    const imageUrl = report.images[newIndex];
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${BASE_URL}${imageUrl}`;
    
    setImageLoading(true);
    setSelectedImage(fullUrl);
    
    // Reset gesture values
    translateX.value = withSpring(0);
  };

  // Gesture handler for swipe navigation
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      // Limit the translation to prevent excessive swiping
      const maxTranslation = width * 0.5;
      const newTranslation = Math.max(-maxTranslation, Math.min(maxTranslation, context.startX + event.translationX));
      translateX.value = newTranslation;
    },
    onEnd: (event) => {
      const threshold = width * 0.25; // Reduced threshold for better responsiveness
      const velocity = Math.abs(event.velocityX);
      
      // Consider both distance and velocity for better gesture recognition
      const shouldNavigate = Math.abs(event.translationX) > threshold || velocity > 500;
      
      if (shouldNavigate && report?.images && report.images.length > 1) {
        if (event.translationX > 0) {
          // Swipe right - previous image
          runOnJS(navigateImage)('prev');
        } else {
          // Swipe left - next image
          runOnJS(navigateImage)('next');
        }
      } else {
        // Reset position if threshold not met
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
    };
  });

  const downloadPDF = async () => {
    try {
      setDownloading(true);

      const logoBase64 = await getLogoBase64();
      const timestamp = getPdfTimestamp();

      // Convert images to base64
      const imageBase64List = [];
      if (report?.images && report.images.length > 0) {
        for (const imageUrl of report.images) {
          if (isVideoFile(imageUrl)) continue;
          try {
            const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`;
            const ext = imageUrl.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
            const localUri = FileSystem.cacheDirectory + `report-img-${imageBase64List.length}.${ext}`;
            const dl = await FileSystem.downloadAsync(fullUrl, localUri);
            if (dl.status === 200) {
              const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
              imageBase64List.push({ b64, mimeType });
            }
          } catch (e) {
            console.warn('Could not load image for PDF:', e.message);
          }
        }
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Site Report - ${report?.project_name || reportId}</title>
          <style>
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              padding: 30px;
              color: #1E293B;
              background: #F8FAFC;
            }
            ${getPdfHeaderFooterCSS()}
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding: 20px;
              background: linear-gradient(135deg, #3B82F6, #1E3A8A);
              border-radius: 15px;
              color: white;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 800;
            }
            .header p {
              margin: 5px 0 0;
              opacity: 0.9;
              font-size: 14px;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              font-weight: bold;
              color: white;
              background: ${report?.approval_status === 'approved' ? '#10B981' : report?.approval_status === 'rejected' ? '#EF4444' : '#F59E0B'};
              margin: 10px 0;
            }
            .section {
              background: white;
              border-radius: 15px;
              padding: 20px;
              margin: 20px 0;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .section-title {
              color: #3B82F6;
              font-size: 20px;
              font-weight: 700;
              margin-bottom: 15px;
              border-bottom: 2px solid #DBEAFE;
              padding-bottom: 10px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #E2E8F0;
            }
            .row:last-child { border-bottom: none; }
            .label { color: #64748B; font-weight: 600; }
            .value { color: #1E293B; font-weight: 500; text-align: right; max-width: 60%; }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #94A3B8;
              font-size: 12px;
            }
            .image-note {
              color: #64748B;
              font-style: italic;
              margin-top: 10px;
              padding: 10px;
              background: #F1F5F9;
              border-radius: 8px;
            }
            .images-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              margin-top: 10px;
            }
            .pdf-image {
              width: 45%;
              border-radius: 8px;
              object-fit: cover;
              border: 1px solid #E2E8F0;
            }
          </style>
        </head>
        <body>
          ${getPdfLogoHtml(logoBase64)}
          <div class="header">
            <h1>SITE REPORT</h1>
            <p>${report?.project_name || 'Project Report'}</p>
            <p>${report?.project_location || ''}</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <span class="status-badge">${(report?.approval_status || 'pending').toUpperCase()}</span>
          </div>

          <div class="section">
            <div class="section-title">Report Details</div>
            <div class="row">
              <span class="label">Report ID:</span>
              <span class="value">${reportId}</span>
            </div>
            <div class="row">
              <span class="label">Project Name:</span>
              <span class="value">${report?.project_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Location:</span>
              <span class="value">${report?.project_location || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Customer:</span>
              <span class="value">${report?.customer_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Submitted By:</span>
              <span class="value">${report?.site_incharge_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Created:</span>
              <span class="value">${new Date(report?.created_at).toLocaleDateString('en-IN', { 
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Site Specifications</div>
            <div class="row">
              <span class="label">Total Floors:</span>
              <span class="value">${report?.total_floors}</span>
            </div>
            <div class="row">
              <span class="label">Dimensions:</span>
              <span class="value">${report?.dimensions}</span>
            </div>
            ${report?.remarks ? `
            <div class="row">
              <span class="label">Remarks:</span>
              <span class="value">${report.remarks}</span>
            </div>
            ` : ''}
          </div>

          ${report?.images && report.images.length > 0 ? `
          <div class="section">
            <div class="section-title">Site Images (${imageBase64List.length > 0 ? imageBase64List.length : report.images.length})</div>
            ${imageBase64List.length > 0 ? `
            <div class="images-grid">
              ${imageBase64List.map(img => `<img class="pdf-image" src="data:${img.mimeType};base64,${img.b64}" />`).join('')}
            </div>
            ` : `
            <div class="image-note">
              This report contains ${report.images.length} image(s). Site images are available in the mobile app.
            </div>
            `}
          </div>
          ` : ''}

          <div class="footer">
            Report ID: ${reportId}
          </div>
          ${getPdfTimestampHtml(timestamp)}
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      const fileName = `site-report-${reportId}-${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Site Report PDF',
        });
        auditApi.logShare('PDF', 'Site Report', String(reportId), report?.project_name || String(reportId));
      } else {
        Alert.alert('Success', `PDF saved to ${fileUri}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      setDownloading(true);
      const rows = [
        ['Field', 'Value'],
        ['Project', report?.project_name || reportId],
        ['Location', report?.project_location || ''],
        ['Approval Status', report?.approval_status || 'pending'],
        ['Site Incharge', report?.site_incharge_name || ''],
        ['Visit Date', report?.visit_date ? new Date(report.visit_date).toLocaleDateString('en-IN') : ''],
        ['Work Description', report?.work_description || ''],
        ['Material Used', report?.material_used || ''],
        ['Labour Count', report?.labour_count ?? ''],
        ['Total Floors', report?.total_floors ?? ''],
        ['Dimensions', report?.dimensions || ''],
        ['Remarks', report?.remarks || ''],
        ['Images Count', report?.images?.length ?? 0],
        ['Created At', report?.created_at ? new Date(report.created_at).toLocaleDateString('en-IN') : ''],
      ];
      const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const uri = FileSystem.cacheDirectory + `site-report-${reportId}.csv`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      auditApi.logShare('CSV', 'Site Report', String(reportId), report?.project_name || String(reportId));
    } catch (e) {
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setDownloading(false);
    }
  };

  const downloadExcel = async () => {
    try {
      setDownloading(true);
      const rows = [
        ['Field', 'Value'],
        ['Project', report?.project_name || reportId],
        ['Location', report?.project_location || ''],
        ['Approval Status', report?.approval_status || 'pending'],
        ['Site Incharge', report?.site_incharge_name || ''],
        ['Visit Date', report?.visit_date ? new Date(report.visit_date).toLocaleDateString('en-IN') : ''],
        ['Work Description', report?.work_description || ''],
        ['Material Used', report?.material_used || ''],
        ['Labour Count', report?.labour_count ?? ''],
        ['Total Floors', report?.total_floors ?? ''],
        ['Dimensions', report?.dimensions || ''],
        ['Remarks', report?.remarks || ''],
        ['Images Count', report?.images?.length ?? 0],
        ['Created At', report?.created_at ? new Date(report.created_at).toLocaleDateString('en-IN') : ''],
      ];
      const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Site Report"><Table>${
        rows.map(r => `<Row>${r.map(v => `<Cell><Data ss:Type="String">${String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>`).join('')
      }</Table></Worksheet></Workbook>`;
      const uri = FileSystem.cacheDirectory + `site-report-${reportId}.xls`;
      await FileSystem.writeAsStringAsync(uri, xml, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, { mimeType: 'application/vnd.ms-excel', UTI: 'com.microsoft.excel.xls' });
      auditApi.logShare('Excel', 'Site Report', String(reportId), report?.project_name || String(reportId));
    } catch (e) {
      Alert.alert('Error', 'Failed to export Excel');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return 'check-circle';
      case 'rejected': return 'close-circle';
      default: return 'clock-outline';
    }
  };

  const InfoCard = ({ title, children, icon, delay = 100 }) => (
    <Animated.View 
      entering={FadeInDown.delay(delay).duration(400)}
      style={styles.infoCard}
    >
      <LinearGradient
        colors={[themeColors.cardBg, themeColors.surfaceSecondary]}
        style={styles.infoCardGradient}
      >
        <View style={styles.infoCardHeader}>
          <View style={styles.infoCardTitleContainer}>
            <MaterialCommunityIcons name={icon} size={22} color="#3B82F6" />
            <Text style={[styles.infoCardTitle, { color: themeColors.textPrimary }]}>{title}</Text>
          </View>
        </View>
        <View style={styles.infoCardContent}>
          {children}
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const InfoRow = ({ label, value, highlight = false }) => (
    <View style={[styles.infoRow, { borderBottomColor: themeColors.divider }]}>
      <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: themeColors.textPrimary }, highlight && styles.infoValueHighlight]}>
        {value}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <AppHeader navigation={navigation} />
        <View style={styles.loadingContent}>
          <LinearGradient
            colors={['#3B82F6', '#1E3A8A']}
            style={styles.loadingCircle}
          >
            <MaterialCommunityIcons name="file-document-outline" size={40} color="#FFF" />
          </LinearGradient>
          <Text style={styles.loadingText}>Loading report details...</Text>
          <ActivityIndicator size="large" color="#3B82F6" style={styles.loadingIndicator} />
        </View>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <AppHeader navigation={navigation} />
        <View style={styles.errorContent}>
          <View style={styles.errorIconContainer}>
            <MaterialCommunityIcons name="file-remove-outline" size={60} color="#EF4444" />
          </View>
          <Text style={styles.errorText}>Report not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <LinearGradient
              colors={['#3B82F6', '#1E3A8A']}
              style={styles.retryButtonGradient}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
              <Text style={styles.retryButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusColor = getStatusColor(report.approval_status);
  const statusIcon = getStatusIcon(report.approval_status);
  const statusText = report.approval_status?.toUpperCase() || 'PENDING';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppHeader navigation={navigation} />

      {/* Hero Section */}
      <LinearGradient
        colors={['#3B82F6', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTop}>
            <View style={styles.reportBadge}>
              <MaterialCommunityIcons name="file-document" size={14} color="#FFF" />
              <Text style={styles.reportBadgeText}>Site Report</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <MaterialCommunityIcons name={statusIcon} size={14} color="#FFF" />
              <Text style={styles.statusBadgeText}>{statusText}</Text>
            </View>
          </View>

          <Text style={styles.reportId}>{report.project_name || `Report #${reportId}`}</Text>
          
          <View style={styles.reportMeta}>
            <View style={styles.reportMetaItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.reportMetaText}>
                {report.project_location || 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.reportMeta}>
            <View style={styles.reportMetaItem}>
              <MaterialCommunityIcons name="calendar" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.reportMetaText}>
                {new Date(report.created_at).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
            <View style={styles.reportMetaItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.reportMetaText}>
                {new Date(report.created_at).toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Decorative Elements */}
        <View style={styles.heroDecoration1} />
        <View style={styles.heroDecoration2} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Report Details Card */}
        <InfoCard title="Report Details" icon="clipboard-text" delay={100}>
          <InfoRow label="Report ID" value={reportId} />
          <InfoRow label="Project Name" value={report.project_name || 'N/A'} />
          <InfoRow label="Location" value={report.project_location || 'N/A'} />
          <InfoRow label="Customer" value={report.customer_name || 'N/A'} />
          <InfoRow label="Submitted By" value={report.site_incharge_name || 'N/A'} />
          <InfoRow label="Total Floors" value={report.total_floors} />
          <InfoRow label="Dimensions" value={report.dimensions} />
          {report.remarks && (
            <View style={styles.remarksContainer}>
              <Text style={styles.remarksLabel}>Remarks</Text>
              <View style={styles.remarksBox}>
                <Text style={styles.remarksText}>{report.remarks}</Text>
              </View>
            </View>
          )}
        </InfoCard>

        {/* Images Section */}
        {report.images && report.images.length > 0 && (
          <InfoCard 
            title={`Site Media (${report.images.length})`} 
            icon="image-multiple" 
            delay={200}
          >
            <View style={styles.imagesHeader}>
              <TouchableOpacity
                style={styles.downloadAllButton}
                onPress={downloadAllImages}
                disabled={downloading}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1E3A8A']}
                  style={styles.downloadAllGradient}
                >
                  <MaterialCommunityIcons name="download" size={16} color="#FFF" />
                  <Text style={styles.downloadAllText}>Download All</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.imagesGrid}>
              {report.images.map((imageUrl, index) => {
                const fullUrl = imageUrl.startsWith('http') 
                  ? imageUrl 
                  : `${BASE_URL}${imageUrl}`;
                const isVideo = isVideoFile(imageUrl);

                return (
                  <Animated.View 
                    key={index} 
                    entering={FadeInDown.delay(300 + index * 100).duration(400)}
                    style={styles.imageCard}
                  >
                    <TouchableOpacity
                      onPress={() => !isVideo && openImage(imageUrl, index)}
                      activeOpacity={0.9}
                    >
                      {isVideo ? (
                        <View style={styles.videoCardContainer}>
                          <Video
                            source={{ uri: fullUrl }}
                            style={styles.image}
                            useNativeControls
                            resizeMode="cover"
                            isLooping={false}
                          />
                        </View>
                      ) : (
                        <>
                          <Image
                            source={{ uri: fullUrl }}
                            style={styles.image}
                            resizeMode="cover"
                            onError={() => Alert.alert('Image Load Failed', `Could not load image.\nFull URL: ${fullUrl}`)}
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.5)']}
                            style={styles.imageOverlay}
                          />
                          <View style={styles.imageBadge}>
                            <Text style={styles.imageBadgeText}>Image {index + 1}</Text>
                          </View>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.imageDownloadButton}
                      onPress={() => downloadImage(imageUrl, index)}
                      disabled={downloading}
                    >
                      <MaterialCommunityIcons name="download" size={18} color="#3B82F6" />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </InfoCard>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={[styles.pdfButton, { flex: 1, marginRight: 6 }, downloading && styles.buttonDisabled]}
              onPress={downloadPDF}
              disabled={downloading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#3B82F6', '#1E3A8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionButtonGradient}>
                {downloading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name="file-pdf-box" size={20} color="#FFF" />
                    <Text style={[styles.actionButtonText, { fontSize: 13 }]}>PDF</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pdfButton, { flex: 1, marginRight: 6 }, downloading && styles.buttonDisabled]}
              onPress={downloadCSV}
              disabled={downloading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#16A34A', '#15803D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionButtonGradient}>
                {downloading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name="file-delimited" size={20} color="#FFF" />
                    <Text style={[styles.actionButtonText, { fontSize: 13 }]}>CSV</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pdfButton, { flex: 1 }, downloading && styles.buttonDisabled]}
              onPress={downloadExcel}
              disabled={downloading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionButtonGradient}>
                {downloading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialCommunityIcons name="microsoft-excel" size={20} color="#FFF" />
                    <Text style={[styles.actionButtonText, { fontSize: 13 }]}>Excel</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Report ID: {reportId} • Generated on {new Date(report.created_at).toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>

      {/* Full-Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <TouchableOpacity 
          style={styles.imageModalContainer}
          activeOpacity={1}
          onPress={closeImageModal}
        >
          <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />
          
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeImageModal}
            activeOpacity={0.8}
          >
            <View style={styles.closeButtonBackground}>
              <MaterialCommunityIcons name="close" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* Image Counter */}
          {report?.images && report.images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1} of {report.images.length}
              </Text>
            </View>
          )}

          {/* Main Image */}
          <TouchableOpacity 
            style={styles.imageModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedImage && (
              <PanGestureHandler onGestureEvent={gestureHandler}>
                <Animated.View style={[styles.imageContainer, animatedStyle]}>
                  {imageLoading && (
                    <View style={styles.imageLoadingContainer}>
                      <ActivityIndicator size="large" color="#3B82F6" />
                      <Text style={styles.imageLoadingText}>Loading image...</Text>
                    </View>
                  )}
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      Alert.alert('Error', 'Failed to load image');
                    }}
                  />
                </Animated.View>
              </PanGestureHandler>
            )}
          </TouchableOpacity>

          {/* Navigation Arrows (only show if multiple images) */}
          {report?.images && report.images.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.navigationButton, styles.prevButton]}
                onPress={() => navigateImage('prev')}
                activeOpacity={0.8}
                disabled={imageLoading}
              >
                <View style={[
                  styles.navigationButtonBackground,
                  imageLoading && styles.navigationButtonDisabled
                ]}>
                  <MaterialCommunityIcons name="chevron-left" size={28} color="#FFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navigationButton, styles.nextButton]}
                onPress={() => navigateImage('next')}
                activeOpacity={0.8}
                disabled={imageLoading}
              >
                <View style={[
                  styles.navigationButtonBackground,
                  imageLoading && styles.navigationButtonDisabled
                ]}>
                  <MaterialCommunityIcons name="chevron-right" size={28} color="#FFF" />
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* Download Button */}
          <TouchableOpacity
            style={styles.modalDownloadButton}
            onPress={() => {
              if (report?.images && report.images[currentImageIndex]) {
                downloadImage(report.images[currentImageIndex], currentImageIndex);
              } else {
                Alert.alert('Error', 'Image not available for download');
              }
            }}
            disabled={downloading || imageLoading}
            activeOpacity={0.8}
          >
            <View style={[
              styles.modalDownloadBackground,
              (downloading || imageLoading) && styles.modalDownloadDisabled
            ]}>
              {downloading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <MaterialCommunityIcons name="download" size={24} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>

          {/* Swipe Instruction (show briefly for multiple images) */}
          {report?.images && report.images.length > 1 && (
            <View style={styles.swipeInstruction}>
              <Text style={styles.swipeInstructionText}>
                Swipe left/right to navigate • Tap outside to close
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      <BottomNavigation navigation={navigation} activeRoute="ReportsList" scrollY={scrollY} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingIndicator: {
    marginTop: 10,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 30,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  heroContent: {
    position: 'relative',
    zIndex: 2,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  reportBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  reportId: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
    lineHeight: 32,
  },
  reportMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  reportMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportMetaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  heroDecoration1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  heroDecoration2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  infoCardGradient: {
    padding: 16,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoCardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  infoValueHighlight: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  remarksContainer: {
    marginTop: 12,
  },
  remarksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  remarksBox: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  remarksText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  downloadAllButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  downloadAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  downloadAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  imageCard: {
    width: '50%',
    padding: 4,
    marginBottom: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  imageBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  imageBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  imageDownloadButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.surface,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoCardContainer: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  pdfButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  // Full-Screen Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 1000,
  },
  closeButtonBackground: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  imageCounter: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  imageCounterText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  imageModalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    zIndex: 10,
  },
  imageLoadingText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    maxWidth: width,
    maxHeight: '80%',
  },
  navigationButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    zIndex: 1000,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  navigationButtonBackground: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  navigationButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.4)',
  },
  modalDownloadButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 1000,
  },
  modalDownloadBackground: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalDownloadDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.6)',
  },
  swipeInstruction: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  swipeInstructionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default ViewReportScreen;
