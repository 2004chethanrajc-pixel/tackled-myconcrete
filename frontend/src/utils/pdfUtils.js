import * as FileSystem from 'expo-file-system';

// Cache the logo base64 so we only read it once per session
let _logoBase64Cache = null;

/**
 * Returns the logo as a base64 data URI for embedding in PDF HTML.
 * Falls back to empty string if it fails (PDF still generates, just without logo).
 */
export const getLogoBase64 = async () => {
  if (_logoBase64Cache) return _logoBase64Cache;
  try {
    // expo-file-system can read bundled assets via their require() URI
    const asset = require('../assets/logo.png');
    // In Expo, require() of an image returns an object with a uri in production
    // or a number (module ID) in dev. We use expo-file-system to resolve it.
    const { Asset } = require('expo-asset');
    const [loaded] = await Asset.loadAsync(asset);
    const base64 = await FileSystem.readAsStringAsync(loaded.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    _logoBase64Cache = `data:image/png;base64,${base64}`;
    return _logoBase64Cache;
  } catch (e) {
    console.warn('Could not load logo for PDF:', e);
    return '';
  }
};

/**
 * Returns the formatted timestamp string for the PDF footer.
 */
export const getPdfTimestamp = () => {
  return new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Common CSS for all PDFs — logo top-left, timestamp bottom-right.
 */
export const getPdfHeaderFooterCSS = () => `
  .pdf-logo {
    width: 80px;
    height: auto;
    display: block;
    margin-bottom: 8px;
  }
  .pdf-timestamp {
    position: fixed;
    bottom: 16px;
    right: 24px;
    font-size: 10px;
    color: #94A3B8;
    font-style: italic;
  }
`;

/**
 * Returns the logo HTML block (top-left).
 */
export const getPdfLogoHtml = (logoBase64) => {
  if (!logoBase64) return '';
  return `<img src="${logoBase64}" class="pdf-logo" alt="MyConcrete Logo" />`;
};

/**
 * Returns the timestamp HTML block (bottom-right, fixed).
 */
export const getPdfTimestampHtml = (timestamp) =>
  `<div class="pdf-timestamp">Report generated: ${timestamp}</div>`;
