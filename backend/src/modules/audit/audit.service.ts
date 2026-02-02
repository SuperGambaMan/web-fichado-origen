import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AuditLog, AuditAction, AuditEntity } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  userId?: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectQueue('audit')
    private readonly auditQueue: Queue,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    // Add to queue for async processing
    await this.auditQueue.add('create-log', dto, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(dto);
    return this.auditLogRepository.save(auditLog);
  }

  async findAll(options?: {
    userId?: string;
    action?: AuditAction;
    entityType?: AuditEntity;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options || {};

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

    if (userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (entityType) {
      queryBuilder.andWhere('log.entityType = :entityType', { entityType });
    }

    if (entityId) {
      queryBuilder.andWhere('log.entityId = :entityId', { entityId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [logs, total] = await queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }

  async findByEntity(
    entityType: AuditEntity,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
