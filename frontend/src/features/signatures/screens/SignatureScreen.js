import React, { useState, useRef, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
// import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { signaturesApi } from '../api';

const SignatureScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { project } = route.params;
  const [loading, setLoading] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const documentRef = useRef();

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload signature');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSignatureImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photo');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSignatureImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const captureDocument = async () => {
    try {
      const uri = await captureRef(documentRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      
      return uri;
    } catch (error) {
      console.error('Error capturing document:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!signatureImage) {
      Alert.alert('Error', 'Please upload your signature first');
      return;
    }

    try {
      setLoading(true);

      // Capture the full document page
      const documentUri = await captureDocument();
      
      const formData = new FormData();
      
      // Add the captured document
      const fileName = `signature-document-${Date.now()}.png`;
      const file = {
        uri: Platform.OS === 'android' ? documentUri : documentUri.replace('file://', ''),
        name: fileName,
        type: 'image/png',
      };

      console.log('Uploading signature document:', file);

      formData.append('signature', file);
      formData.append('signatureType', 'uploaded');

      await signaturesApi.uploadSignature(project.id, formData);

      Alert.alert(
        'Success',
        'Signature document submitted successfully! The admin will review and close the project.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back and trigger refresh
              navigation.navigate('CustomerHomeMain', { refresh: true });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to submit signature. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Document to be captured */}
        <View ref={documentRef} style={styles.documentContainer} collapsable={false}>
          {/* Header */}
          <View style={styles.documentHeader}>
            <FontAwesome5 name="file-contract" size={40} color={colors.primary} />
            <Text style={styles.documentTitle}>PROJECT COMPLETION CERTIFICATE</Text>
            <Text style={styles.documentSubtitle}>Acceptance & Acknowledgment</Text>
          </View>

          {/* Project Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Project Name:</Text>
              <Text style={styles.detailValue}>{project.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{project.location}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>

          {/* Acceptance Text */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Declaration of Acceptance</Text>
            <Text style={styles.acceptanceText}>
              I hereby acknowledge and confirm that:
            </Text>
            <Text style={styles.acceptancePoint}>
              1. The construction work has been completed as per the agreed specifications and requirements.
            </Text>
            <Text style={styles.acceptancePoint}>
              2. I have inspected the completed work and am satisfied with the quality and workmanship.
            </Text>
            <Text style={styles.acceptancePoint}>
              3. All materials used are of acceptable quality and meet the standards discussed.
            </Text>
            <Text style={styles.acceptancePoint}>
              4. The project has been completed within the agreed timeline and budget.
            </Text>
            <Text style={styles.acceptancePoint}>
              5. I have no outstanding concerns or complaints regarding the completed work.
            </Text>
            <Text style={styles.acceptancePoint}>
              6. All payments have been settled as per the agreed payment schedule.
            </Text>
            <Text style={styles.acceptanceText}>
              By signing below, I accept the completed project and release the contractor from any further obligations related to this project, except for any warranty terms that may apply.
            </Text>
          </View>

          {/* Signature Section */}
          <View style={styles.signatureSection}>
            <Text style={styles.signatureLabel}>Customer Signature:</Text>
            {signatureImage ? (
              <View style={styles.signatureBox}>
                <Image
                  source={{ uri: signatureImage.uri }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.signaturePlaceholder}>
                <FontAwesome5 name="signature" size={32} color={colors.textSecondary} />
                <Text style={styles.placeholderText}>Signature Required</Text>
              </View>
            )}
            <View style={styles.signatureFooter}>
              <Text style={styles.footerText}>Date: {new Date().toLocaleDateString()}</Text>
              <Text style={styles.footerText}>Time: {new Date().toLocaleTimeString()}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.documentFooter}>
            <Text style={styles.footerNote}>
              This is a legally binding document. Please ensure all information is correct before signing.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!signatureImage ? (
            <>
              <Text style={styles.instructionText}>
                Please upload your signature to complete the acceptance document
              </Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={takePhoto}
                disabled={loading}
              >
                <FontAwesome5 name="camera" size={20} color={colors.surface} />
                <Text style={styles.actionButtonText}>Take Photo of Signature</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={pickImage}
                disabled={loading}
              >
                <FontAwesome5 name="image" size={20} color={colors.surface} />
                <Text style={styles.actionButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setSignatureImage(null)}
                disabled={loading}
              >
                <FontAwesome5 name="edit" size={18} color={colors.primary} />
                <Text style={styles.changeButtonText}>Change Signature</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <>
                    <FontAwesome5 name="check-circle" size={20} color={colors.surface} />
                    <Text style={styles.submitButtonText}>Submit Document</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.infoBox}>
          <FontAwesome5 name="info-circle" size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            The entire acceptance document with your signature will be captured and stored. The admin will review it before closing the project.
          </Text>
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
  documentContainer: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.border,
  },
  documentHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  documentSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textDecorationLine: 'underline',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  acceptanceText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'justify',
  },
  acceptancePoint: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 8,
    textAlign: 'justify',
  },
  signatureSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  signatureBox: {
    height: 150,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    padding: 8,
    marginBottom: 12,
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  signaturePlaceholder: {
    height: 150,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  signatureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  documentFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  footerNote: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: '600',
    marginLeft: 12,
  },
  changeButton: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 8,
  },
  changeButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  submitButtonText: {
    fontSize: 16,
    color: colors.surface,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: colors.primary,
    flex: 1,
    lineHeight: 18,
  },
});

export default SignatureScreen;
