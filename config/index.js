'use strict';
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.REFRESH_SECRET || 'dev-refresh-secret-change-me',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
  loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5,
  loginWindowMs: parseInt(process.env.LOGIN_WINDOW_MS, 10) || 15 * 60 * 1000,
  isVercel: process.env.VERCEL === '1',
  nodeEnv: process.env.NODE_ENV || 'development'
};
