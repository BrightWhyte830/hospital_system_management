const QRCode = require('qrcode');

/**
 * Generate a QR code (as a data: URI PNG) encoding only the minimum
 * needed for front-desk lookup — never the patient's card/ID numbers,
 * since the QR itself may be visible to bystanders.
 */
async function generatePatientQr({ patientId, firstName, lastName }) {
  const payload = JSON.stringify({
    system: 'GhanaHealth Portal',
    patientId,
    name: `${firstName} ${lastName}`,
  });
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 240,
    color: { dark: '#0a4a2e', light: '#ffffff' },
  });
}

module.exports = { generatePatientQr };
