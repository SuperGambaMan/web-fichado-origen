import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret',
  authSecret: process.env.AUTH_SECRET || 'default-auth-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));
