const { validationResult } = require('express-validator');

/** Run after express-validator chains; short-circuits with a 400 on bad input */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Please correct the highlighted fields.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/** Central error handler — keeps stack traces out of API responses */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[error]', err);
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'That record already exists (a unique field is duplicated).' });
  }
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ error: 'That request conflicts with an existing record — the slot may already be taken.' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong on our end. Please try again.' });
}

function notFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

module.exports = { validateRequest, errorHandler, notFound };
