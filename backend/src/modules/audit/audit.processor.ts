import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './audit.service';

@Processor('audit')
export class AuditProcessor {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  @Process('create-log')
  async handleCreateLog(job: Job<CreateAuditLogDto>) {
    this.logger.debug(`Processing audit log job ${job.id}`);

    try {
      const auditLog = this.auditLogRepository.create(job.data);
      await this.auditLogRepository.save(auditLog);
      this.logger.debug(`Audit log created: ${auditLog.id}`);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      throw error;
    }
  }
}
