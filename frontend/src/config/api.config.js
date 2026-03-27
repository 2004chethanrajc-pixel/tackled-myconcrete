import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get environment variables
const API_HOST = Constants.expoConfig?.extra?.apiHost;
const API_PORT = Constants.expoConfig?.extra?.apiPort;
const API_PROTOCOL = Constants.expoConfig?.extra?.apiProtocol;

const getBaseURL = () => {
  // If host is a domain (not an IP), use https; otherwise use configured protocol
  const isRemoteDomain = API_HOST.includes('.');
  const protocol = isRemoteDomain && !API_HOST.match(/^\d+\.\d+\.\d+\.\d+$/) ? 'https' : API_PROTOCOL;

  // For remote domains (like apimc.tackled.co.in), no port needed
  if (!API_HOST.match(/^\d+\.\d+\.\d+\.\d+$/) && !API_HOST.includes('localhost')) {
    return `${protocol}://${API_HOST}`;
  }

  return `${protocol}://${API_HOST}:${API_PORT}`;
};

/**
 * Get the full API URL with /api/v1 prefix
 */
export const getApiUrl = () => {
  return `${getBaseURL()}/api/v1`;
};

/**
 * Get the base URL without /api/v1 (for uploads, etc.)
 */
export const getBaseUrl = () => {
  return getBaseURL();
};

/**
 * Get the uploads URL
 */
export const getUploadsUrl = () => {
  return `${getBaseURL()}/uploads`;
};

/**
 * Construct full image URL from path
 * @param {string} imagePath - Path like "/uploads/image.jpg" or "uploads/image.jpg"
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  
  // Normalize path separators
  const normalizedPath = cleanPath.replace(/\\/g, '/');
  
  return `${getBaseURL()}/${normalizedPath}`;
};

// Export configuration
export const API_CONFIG = {
  BASE_URL: getBaseURL(),
  API_URL: getApiUrl(),
  UPLOADS_URL: getUploadsUrl(),
  HOST: API_HOST,
  PORT: API_PORT,
  PLATFORM: Platform.OS,
};

// Log configuration in development
if (__DEV__) {
  console.log('=== Mobile API Configuration ===');
  console.log('Platform:', Platform.OS);
  console.log('Base URL:', API_CONFIG.BASE_URL);
  console.log('API URL:', API_CONFIG.API_URL);
  console.log('Uploads URL:', API_CONFIG.UPLOADS_URL);
  console.log('================================');
}

export default API_CONFIG;
