require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/validate');

const authRoutes = require('./routes/authRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const serviceRequestRoutes = require('./routes/serviceRequestRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const preferredPort = Number(process.env.PORT) || 4000;
const portCandidates = Array.from(new Set([preferredPort, 4001, 4002, 4003, 4100, 5000]));

app.use(helmet({ contentSecurityPolicy: false })); // CSP relaxed for the bundled static demo frontend
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Serve the static frontend (index.html + css/js) from ../frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', notFound);
app.use(errorHandler);

function startServer(portIndex = 0) {
  const port = portCandidates[portIndex];
  const server = app.listen(port, () => {
    console.log(`GhanaHealth Portal API listening on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && portIndex < portCandidates.length - 1) {
      const nextPort = portCandidates[portIndex + 1];
      console.warn(`Port ${port} is already in use. Retrying on http://localhost:${nextPort}`);
      startServer(portIndex + 1);
      return;
    }

    console.error(`Failed to start GhanaHealth Portal on port ${port}:`, error.message);
    process.exit(1);
  });
}

startServer();
