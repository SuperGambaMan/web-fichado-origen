import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditProcessor } from './audit.processor';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    BullModule.registerQueue({
      name: 'audit',
    }),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditProcessor],
  exports: [AuditService],
})
export class AuditModule {}
