const db = require('../db/connection');

const insert = db.prepare(`
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address, details)
  VALUES (@user_id, @action, @entity_type, @entity_id, @ip_address, @details)
`);

/**
 * Record an auditable action. Never throws — a logging failure must not
 * break the request it's describing.
 */
function logAction({ userId = null, action, entityType = null, entityId = null, req = null, details = null }) {
  try {
    insert.run({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: req ? req.ip : null,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (err) {
    console.error('[audit] failed to write log entry:', err.message);
  }
}

module.exports = { logAction };
