import { registerAs } from '@nestjs/config';
import { randomBytes } from 'crypto';

// Generate a unique instance ID on each server start
// This will invalidate all existing JWT tokens when server restarts
const instanceId = process.env.INVALIDATE_SESSIONS_ON_RESTART === 'true'
  ? randomBytes(16).toString('hex')
  : '';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  // Append instanceId to jwtSecret if INVALIDATE_SESSIONS_ON_RESTART is true
  jwtSecret: (process.env.JWT_SECRET || 'default-jwt-secret') + instanceId,
  authSecret: process.env.AUTH_SECRET || 'default-auth-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  invalidateSessionsOnRestart: process.env.INVALIDATE_SESSIONS_ON_RESTART === 'true',
}));
