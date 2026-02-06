import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'fichajes_user',
  password: process.env.DATABASE_PASSWORD || 'fichajes_password',
  name: process.env.DATABASE_NAME || 'fichajes_db',
  ssl: process.env.DATABASE_SSL === 'true',
}));

// TypeORM CLI configuration
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'fichajes_user',
  password: process.env.DATABASE_PASSWORD || 'fichajes_password',
  database: process.env.DATABASE_NAME || 'fichajes_db',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: process.env.NODE_ENV !== 'production',
};

export default new DataSource(dataSourceOptions);
