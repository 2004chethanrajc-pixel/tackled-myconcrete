// Shared PDF utilities for web — logo header, footer, timestamp

let _logoBase64Cache = null;

/**
 * Loads the logo from /logo.png (public folder) as a base64 data URI.
 * Cached after first load.
 */
export const getLogoBase64 = async () => {
  if (_logoBase64Cache) return _logoBase64Cache;
  try {
    const response = await fetch('/logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        _logoBase64Cache = reader.result;
        resolve(_logoBase64Cache);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not load logo for PDF:', e);
    return '';
  }
};

/**
 * Returns a formatted timestamp string for the PDF footer.
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
 * Draws the logo in the top-left of the PDF header area.
 * Returns the updated yPos after the logo.
 * @param {jsPDF} pdf
 * @param {string} logoBase64 - base64 data URI
 * @param {number} margin
 * @param {number} yStart - y position to draw logo at
 */
export const addPdfLogo = (pdf, logoBase64, margin, yStart) => {
  if (!logoBase64) return yStart;
  try {
    // Draw logo: 28x28 px in top-left of header
    pdf.addImage(logoBase64, 'PNG', margin, yStart, 28, 28);
  } catch (e) {
    console.warn('Could not embed logo in PDF:', e);
  }
  return yStart;
};

/**
 * Draws the footer bar with timestamp on the last page.
 * @param {jsPDF} pdf
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @param {number} margin
 * @param {string} timestamp
 * @param {string} rightText - e.g. "Report ID: xxx"
 */
export const addPdfFooter = (pdf, pageWidth, pageHeight, margin, timestamp, rightText) => {
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');

  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${timestamp}`, margin, pageHeight - 8);

  if (rightText) {
    pdf.text(rightText, pageWidth - margin - rightText.length * 1.8, pageHeight - 8);
  }
};
