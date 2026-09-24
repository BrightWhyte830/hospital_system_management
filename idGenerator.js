const crypto = require('crypto');

/** GH-PAT-482913 style patient ID */
function generatePatientId() {
  const n = crypto.randomInt(100000, 999999);
  return `GH-PAT-${n}`;
}

/** Short reference for a submitted record, e.g. APT-K3F9AB2 */
function generateReference(prefix) {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 7);
  return `${prefix}-${rand}`;
}

module.exports = { generatePatientId, generateReference };
