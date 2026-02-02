import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TimeEntry, TimeEntryType, TimeEntryStatus } from './entities/time-entry.entity';
import { CreateTimeEntryDto, UpdateTimeEntryDto, AdminUpdateTimeEntryDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/entities/audit-log.entity';

@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepository: Repository<TimeEntry>,
    private readonly auditService: AuditService,
  ) {}

  async clockIn(
    userId: string,
    dto: CreateTimeEntryDto,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<TimeEntry> {
    const lastEntry = await this.getLastEntry(userId);
    if (lastEntry && lastEntry.type === TimeEntryType.CLOCK_IN) {
      throw new BadRequestException('You must clock out before clocking in again');
    }

    const timeEntry = this.timeEntryRepository.create({
      userId,
      type: TimeEntryType.CLOCK_IN,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      notes: dto.notes,
      latitude: dto.latitude,
      longitude: dto.longitude,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      isManual: !!dto.timestamp,
    });

    const savedEntry = await this.timeEntryRepository.save(timeEntry);

    await this.auditService.log({
      userId,
      action: AuditAction.CLOCK_IN,
      entityType: AuditEntity.TIME_ENTRY,
      entityId: savedEntry.id,
      newValue: savedEntry,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      description: `User clocked in`,
    });

    return savedEntry;
  }

  async clockOut(
    userId: string,
    dto: CreateTimeEntryDto,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<TimeEntry> {
    const lastEntry = await this.getLastEntry(userId);
    if (!lastEntry || lastEntry.type !== TimeEntryType.CLOCK_IN) {
      throw new BadRequestException('You must clock in before clocking out');
    }

    const timeEntry = this.timeEntryRepository.create({
      userId,
      type: TimeEntryType.CLOCK_OUT,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      notes: dto.notes,
      latitude: dto.latitude,
      longitude: dto.longitude,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      isManual: !!dto.timestamp,
    });

    const savedEntry = await this.timeEntryRepository.save(timeEntry);

    await this.auditService.log({
      userId,
      action: AuditAction.CLOCK_OUT,
      entityType: AuditEntity.TIME_ENTRY,
      entityId: savedEntry.id,
      newValue: savedEntry,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      description: `User clocked out`,
    });

    return savedEntry;
  }

  async getLastEntry(userId: string): Promise<TimeEntry | null> {
    return this.timeEntryRepository.findOne({
      where: { userId },
      order: { timestamp: 'DESC' },
    });
  }

  async findByUser(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ entries: TimeEntry[]; total: number }> {
    const { startDate, endDate, page = 1, limit = 50 } = options || {};

    const queryBuilder = this.timeEntryRepository
      .createQueryBuilder('entry')
      .where('entry.userId = :userId', { userId });

    if (startDate && endDate) {
      queryBuilder.andWhere('entry.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('entry.timestamp >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('entry.timestamp <= :endDate', { endDate });
    }

    const [entries, total] = await queryBuilder
      .orderBy('entry.timestamp', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { entries, total };
  }

  async findAll(options?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    type?: TimeEntryType;
    status?: TimeEntryStatus;
    page?: number;
    limit?: number;
  }): Promise<{ entries: TimeEntry[]; total: number }> {
    const { userId, startDate, endDate, type, status, page = 1, limit = 50 } = options || {};

    const queryBuilder = this.timeEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user');

    if (userId) {
      queryBuilder.andWhere('entry.userId = :userId', { userId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('entry.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (type) {
      queryBuilder.andWhere('entry.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('entry.status = :status', { status });
    }

    const [entries, total] = await queryBuilder
      .orderBy('entry.timestamp', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { entries, total };
  }

  async findOne(id: string): Promise<TimeEntry> {
    const entry = await this.timeEntryRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!entry) {
      throw new NotFoundException(`Time entry with ID ${id} not found`);
    }

    return entry;
  }

  async update(
    id: string,
    dto: AdminUpdateTimeEntryDto,
    modifiedBy: string,
  ): Promise<TimeEntry> {
    const entry = await this.findOne(id);
    const oldValue = { ...entry };

    if (dto.timestamp && !entry.originalTimestamp) {
      entry.originalTimestamp = entry.timestamp;
    }

    Object.assign(entry, {
      ...dto,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : entry.timestamp,
      modifiedBy,
      status: TimeEntryStatus.MODIFIED,
    });

    const updatedEntry = await this.timeEntryRepository.save(entry);

    await this.auditService.log({
      userId: modifiedBy,
      action: AuditAction.UPDATE,
      entityType: AuditEntity.TIME_ENTRY,
      entityId: id,
      oldValue,
      newValue: updatedEntry,
      description: `Time entry modified by admin`,
    });

    return updatedEntry;
  }

  async remove(id: string, deletedBy: string): Promise<void> {
    const entry = await this.findOne(id);

    await this.auditService.log({
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: AuditEntity.TIME_ENTRY,
      entityId: id,
      oldValue: entry,
      description: `Time entry deleted`,
    });

    await this.timeEntryRepository.remove(entry);
  }

  async getTodayStatus(userId: string): Promise<{
    isClockedIn: boolean;
    lastEntry: TimeEntry | null;
    todayEntries: TimeEntry[];
    totalHoursToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEntries = await this.timeEntryRepository.find({
      where: {
        userId,
        timestamp: Between(today, tomorrow),
      },
      order: { timestamp: 'ASC' },
    });

    const lastEntry = await this.getLastEntry(userId);
    const isClockedIn = lastEntry?.type === TimeEntryType.CLOCK_IN;

    let totalMinutes = 0;
    for (let i = 0; i < todayEntries.length; i += 2) {
      const clockIn = todayEntries[i];
      const clockOut = todayEntries[i + 1];
      if (clockIn && clockOut) {
        totalMinutes +=
          (clockOut.timestamp.getTime() - clockIn.timestamp.getTime()) / 60000;
      } else if (clockIn && isClockedIn) {
        totalMinutes += (new Date().getTime() - clockIn.timestamp.getTime()) / 60000;
      }
    }

    return {
      isClockedIn,
      lastEntry,
      todayEntries,
      totalHoursToday: Math.round((totalMinutes / 60) * 100) / 100,
    };
  }
}
