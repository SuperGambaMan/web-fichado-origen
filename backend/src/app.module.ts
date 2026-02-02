import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';

// Config
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { appConfig } from './config/app.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TimeEntriesModule } from './modules/time-entries/time-entries.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        ssl: configService.get('database.ssl') ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: configService.get('app.nodeEnv') === 'development',
        logging: configService.get('app.nodeEnv') === 'development',
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000,
            limit: 10,
          },
          {
            name: 'medium',
            ttl: 10000,
            limit: 50,
          },
          {
            name: 'long',
            ttl: 60000,
            limit: 100,
          },
        ],
        storage: configService.get('redis.url') ? undefined : undefined,
      }),
    }),

    // Bull Queue (Redis)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
        },
      }),
    }),

    // Feature Modules
    HealthModule,
    AuthModule,
    UsersModule,
    TimeEntriesModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
