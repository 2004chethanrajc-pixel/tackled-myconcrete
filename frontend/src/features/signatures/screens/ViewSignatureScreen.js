import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { getLogoBase64, getPdfTimestamp, getPdfHeaderFooterCSS, getPdfLogoHtml, getPdfTimestampHtml } from '../../../utils/pdfUtils';
// import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { signaturesApi } from '../api';
import { projectsApi } from '../../projects/api';
import { getBaseUrl, getImageUrl } from '../../../config/api.config';
import { sendEmail } from '../../../utils/contactUtils';

const ViewSignatureScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { projectId, project } = route.params;
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetchSignature();
  }, [projectId]);

  const fetchSignature = async () => {
    try {
      setLoading(true);
      console.log('Fetching signature for project:', projectId);
      
      const response = await signaturesApi.getSignature(projectId);
      console.log('Signature response:', response);
      
      if (response.success) {
        setSignature(response.data.signature);
        console.log('Signature loaded:', response.data.signature);
      } else {
        console.log('No signature found in response');
        setError('No signature found for this project');
      }
    } catch (err) {
      console.error('Error fetching signature:', err);
      console.error('Error response:', err.response?.data);
      
      // Check if it's a 404 (no signature exists yet)
      if (err.response?.status === 404) {
        setError('No signature has been uploaded for this project yet. The customer needs to upload their signature first.');
      } else {
        setError(err.response?.data?.message || 'Failed to load signature');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading signature document...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome5 name="exclamation-circle" size={48} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!signature) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome5 name="file-signature" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No signature document found for this project</Text>
        <Text style={styles.emptySubtext}>The customer needs to upload their signature after final payment.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Construct full image URL using centralized config
  const baseUrl = getBaseUrl();
  console.log('Base URL:', baseUrl);
  console.log('Signature path from DB:', signature.signature_path);
  
  const signatureUrl = getImageUrl(signature.signature_path);
  console.log('Constructed signature URL:', signatureUrl);

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);

      const logoBase64 = await getLogoBase64();
      const timestamp = getPdfTimestamp();

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
            }
            ${getPdfHeaderFooterCSS()}
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #1A237E;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #1A237E;
              margin: 10px 0;
            }
            .info-section {
              margin-bottom: 20px;
              padding: 15px;
              background-color: #f5f5f5;
              border-radius: 8px;
            }
            .info-row {
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #666;
            }
            .info-value {
              color: #333;
            }
            .document-image {
              width: 100%;
              max-width: 800px;
              margin: 20px auto;
              display: block;
              border: 2px solid #ddd;
              border-radius: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          ${getPdfLogoHtml(logoBase64)}
          <div class="header">
            <h1>PROJECT COMPLETION CERTIFICATE</h1>
            <p>Acceptance & Acknowledgment</p>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Signed by:</span>
              <span class="info-value">${signature.customer_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${signature.customer_email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Signed on:</span>
              <span class="info-value">${new Date(signature.signed_at).toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Document Type:</span>
              <span class="info-value">Acceptance Document</span>
            </div>
          </div>
          
          <h3 style="text-align: center; color: #1A237E;">Complete Acceptance Document</h3>
          <img src="${signatureUrl}" class="document-image" alt="Signature Document" />

          <div class="footer">
            <p>This is a legally binding document.</p>
            <p>MyConcrete - Construction Management System</p>
          </div>
          ${getPdfTimestampHtml(timestamp)}
        </body>
        </html>
      `;
          
      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Share/Download the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Signature Document',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', 'PDF generated successfully');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

 

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <FontAwesome5 name="file-contract" size={48} color={colors.success} />
          <Text style={styles.title}>Signature Document</Text>
          <Text style={styles.subtitle}>Project Completion Certificate</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <FontAwesome5 name="user" size={16} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Signed by:</Text>
              <Text style={styles.infoValue}>{signature.customer_name}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <FontAwesome5 name="envelope" size={16} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email:</Text>
              <TouchableOpacity onPress={() => sendEmail(signature.customer_email)}>
                <Text style={[styles.infoValue, styles.linkText]}>{signature.customer_email}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <FontAwesome5 name="calendar" size={16} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Signed on:</Text>
              <Text style={styles.infoValue}>
                {new Date(signature.signed_at).toLocaleString()}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <FontAwesome5 name="file-alt" size={16} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Document Type:</Text>
              <Text style={styles.infoValue}>
                {signature.signature_type === 'drawn' ? 'Hand Drawn' : 'Acceptance Document'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.documentContainer}>
          <Text style={styles.documentLabel}>Complete Acceptance Document:</Text>
          <Text style={styles.documentNote}>
            This document includes the acceptance terms and customer signature
          </Text>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: signatureUrl }}
              style={styles.documentImage}
              resizeMode="contain"
              onLoad={() => console.log('Image loaded successfully')}
              onError={(error) => {
                console.error('Image load error:', error.nativeEvent.error);
                Alert.alert('Image Error', 'Failed to load signature image. Please check if the file exists on the server.');
              }}
            />
          </View>
        </View>

        <View style={styles.verifiedBadge}>
          <FontAwesome5 name="check-circle" size={24} color={colors.success} />
          <View style={styles.verifiedContent}>
            <Text style={styles.verifiedTitle}>Verified Document</Text>
            <Text style={styles.verifiedText}>
              This signature document has been submitted and is ready for review
            </Text>
          </View>
        </View>

        <View style={styles.noteBox}>
          <FontAwesome5 name="info-circle" size={16} color={colors.primary} />
          <Text style={styles.noteText}>
            Review the complete acceptance document carefully before closing the project. 
            Ensure the signature is clear and all terms are acknowledged.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.downloadButton, downloading && styles.buttonDisabled]}
            onPress={handleDownloadPDF}
            disabled={downloading || closing}
          >
            {downloading ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <>
                <FontAwesome5 name="file-pdf" size={20} color={colors.surface} />
                <Text style={styles.buttonText}>Download as PDF</Text>
              </>
            )}
          </TouchableOpacity>

        
        </View>
      </View>
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  documentContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
  },
  documentLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  documentNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  imageWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  documentImage: {
    width: '100%',
    height: 600,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 20,
    borderRadius: 8,
    marginBottom: 16,
    gap: 16,
  },
  verifiedContent: {
    flex: 1,
  },
  verifiedTitle: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
    marginBottom: 4,
  },
  verifiedText: {
    ...typography.caption,
    color: colors.success,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  noteText: {
    ...typography.caption,
    color: colors.primary,
    flex: 1,
    lineHeight: 18,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  downloadButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  closeButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ViewSignatureScreen;
