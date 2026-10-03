const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { corsOrigin } = require('./config');

const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'deal-desk-api' });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found.'
    }
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const payload = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Unexpected server error.'
    }
  };

  if (err.details) payload.error.details = err.details;
  if (statusCode >= 500) console.error(err);

  res.status(statusCode).json(payload);
});

module.exports = app;
