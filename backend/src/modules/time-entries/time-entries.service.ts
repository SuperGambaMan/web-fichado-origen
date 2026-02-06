import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { TimeEntry, TimeEntryType, TimeEntryStatus } from './entities/time-entry.entity';
import { CreateTimeEntryDto, UpdateTimeEntryDto, AdminUpdateTimeEntryDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/entities/audit-log.entity';
import { IncidentsService } from '../incidents/incidents.service';

// Interface for paired time entries - exported for use in controller
export interface TimeEntryPair {
  clockIn: TimeEntry;
  clockOut: TimeEntry | null;
  durationMinutes: number;
}

// Interface for daily work summary - exported for use in controller
export interface DailyWorkSummary {
  date: string;
  pairs: TimeEntryPair[];
  totalMinutes: number;
  totalHours: number;
  isComplete: boolean;
  hasModifications: boolean;
}

@Injectable()
export class TimeEntriesService {
  // Offset de zona horaria en horas (por defecto +1 para Europa/Madrid)
  private readonly timezoneOffsetHours: number;

  constructor(
    @InjectRepository(TimeEntry)
    private readonly timeEntryRepository: Repository<TimeEntry>,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => IncidentsService))
    private readonly incidentsService: IncidentsService,
  ) {
    // Leer offset desde variable de entorno o usar +1 como default
    const offsetStr = process.env.TZ_OFFSET_HOURS;
    this.timezoneOffsetHours = offsetStr ? parseInt(offsetStr, 10) : 1;
  }

  /**
   * Calcula el fin del día (23:59:59) en la zona horaria local del usuario
   * basándose en un timestamp dado.
   */
  private getEndOfDayInLocalTimezone(timestamp: Date): Date {
    const date = new Date(timestamp);
    // Crear fecha en UTC para las 23:59:59 hora local
    // Si hora local es UTC+1, entonces 23:59:59 local = 22:59:59 UTC
    const utcHours = 23 - this.timezoneOffsetHours;
    return new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      utcHours,
      59,
      59,
      999
    ));
  }

  /**
   * Pairs clock-in and clock-out entries correctly.
   *
   * Logic:
   * 1. Sort all entries by timestamp ascending
   * 2. Iterate through entries sequentially
   * 3. When we find a clock_in, look for the next clock_out
   * 4. Pair them together and calculate duration
   * 5. Handle edge cases: unpaired entries, multiple sessions per day
   * 6. NEW: Auto-generate clock_out for consecutive clock_ins
   *
   * @param entries - Array of time entries (unsorted)
   * @returns Array of paired entries with durations
   */
  private pairTimeEntries(entries: TimeEntry[]): TimeEntryPair[] {
    // Sort entries by timestamp ascending
    let sortedEntries = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Primero, insertar salidas automáticas de fin de día
    sortedEntries = this.insertEndOfDayAutoClockOuts(sortedEntries);
    // Luego, insertar salidas virtuales por entradas consecutivas
    const processedEntries = this.insertVirtualClockOuts(sortedEntries);

    const pairs: TimeEntryPair[] = [];
    let currentClockIn: TimeEntry | null = null;

    for (const entry of processedEntries) {
      if (entry.type === TimeEntryType.CLOCK_IN) {
        // If we have an unpaired clock_in, this shouldn't happen after pre-processing
        // but handle it as a safety net
        if (currentClockIn) {
          pairs.push({
            clockIn: currentClockIn,
            clockOut: null,
            durationMinutes: 0,
          });
        }
        currentClockIn = entry;
      } else if (entry.type === TimeEntryType.CLOCK_OUT) {
        if (currentClockIn) {
          // We have a valid pair
          const clockInTime = new Date(currentClockIn.timestamp).getTime();
          const clockOutTime = new Date(entry.timestamp).getTime();
          const durationMinutes = Math.max(0, (clockOutTime - clockInTime) / 60000);

          pairs.push({
            clockIn: currentClockIn,
            clockOut: entry,
            durationMinutes,
          });
          currentClockIn = null;
        }
        // If no currentClockIn, ignore orphan clock_out
      }
    }

    // Handle last unpaired clock_in (still working)
    if (currentClockIn) {
      const clockInTime = new Date(currentClockIn.timestamp).getTime();
      const now = new Date().getTime();
      const durationMinutes = Math.max(0, (now - clockInTime) / 60000);

      pairs.push({
        clockIn: currentClockIn,
        clockOut: null,
        durationMinutes,
      });
    }

    return pairs;
  }

  /**
   * Inserta salidas virtuales a las 23:59:59 para entradas sin salida al final del día.
   * Se ejecuta antes del emparejamiento entrada/salida.
   */
  private insertEndOfDayAutoClockOuts(entries: TimeEntry[]): TimeEntry[] {
    if (entries.length === 0) return [];
    const result: TimeEntry[] = [];
    let i = 0;
    while (i < entries.length) {
      const entry = entries[i];
      result.push(entry);
      if (
        entry.type === TimeEntryType.CLOCK_IN &&
        (i === entries.length - 1 || entries[i + 1].type === TimeEntryType.CLOCK_IN)
      ) {
        // Buscar si la siguiente entrada es de otro día o no hay más
        const entryDate = new Date(entry.timestamp);
        const nextEntry = entries[i + 1];
        const isLast = !nextEntry || new Date(nextEntry.timestamp).toDateString() !== entryDate.toDateString();
        if (isLast) {
          // Generar salida virtual a las 23:59:59 del mismo día (zona horaria local)
          const autoExit = this.getEndOfDayInLocalTimezone(entry.timestamp);
          const virtualClockOut: TimeEntry = {
            ...entry,
            id: `autoexit-${entry.id}`,
            type: TimeEntryType.CLOCK_OUT,
            timestamp: autoExit,
            notes: '[Salida automática - Fin de día]',
            isManual: false,
          };
          result.push(virtualClockOut);
        }
      }
      i++;
    }
    return result;
  }

  /**
   * Inserts virtual clock_out entries for consecutive clock_ins.
   *
   * Rule: When two consecutive clock_ins are detected:
   * 1. Generate an artificial clock_out for the first entry
   * 2. The virtual clock_out timestamp = timestamp of the second clock_in
   * 3. Mark the virtual entry as generated (not to be saved to DB)
   *
   * This ensures all clock_ins have a corresponding clock_out,
   * preventing negative times or invalid pairs.
   *
   * @param sortedEntries - Entries sorted by timestamp ascending
   * @returns Entries with virtual clock_outs inserted
   */
  private insertVirtualClockOuts(sortedEntries: TimeEntry[]): TimeEntry[] {
    if (sortedEntries.length === 0) {
      return [];
    }

    const result: TimeEntry[] = [];

    for (let i = 0; i < sortedEntries.length; i++) {
      const currentEntry = sortedEntries[i];
      const nextEntry = sortedEntries[i + 1];

      // Check if current is clock_in and next is also clock_in (consecutive entries)
      if (
        currentEntry.type === TimeEntryType.CLOCK_IN &&
        nextEntry &&
        nextEntry.type === TimeEntryType.CLOCK_IN
      ) {
        // Add the current clock_in
        result.push(currentEntry);

        // Generate a virtual clock_out with timestamp of the next clock_in
        const virtualClockOut: TimeEntry = {
          ...currentEntry,
          id: `virtual-${currentEntry.id}`,
          type: TimeEntryType.CLOCK_OUT,
          timestamp: nextEntry.timestamp,
          notes: '[Salida automática - Entrada consecutiva detectada]',
          isManual: false,
        };

        result.push(virtualClockOut);
      } else {
        // Normal entry, just add it
        result.push(currentEntry);
      }
    }

    return result;
  }

  /**
   * Groups time entries by day and calculates daily summaries.
   *
   * @param entries - Array of time entries
   * @returns Array of daily work summaries
   */
  private calculateDailySummaries(entries: TimeEntry[]): DailyWorkSummary[] {
    // Group entries by date
    const entriesByDate: Record<string, TimeEntry[]> = {};

    for (const entry of entries) {
      const dateKey = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = [];
      }
      entriesByDate[dateKey].push(entry);
    }

    // Calculate summary for each day
    const summaries: DailyWorkSummary[] = [];

    for (const [date, dayEntries] of Object.entries(entriesByDate)) {
      const pairs = this.pairTimeEntries(dayEntries);
      const totalMinutes = pairs.reduce((sum, pair) => sum + pair.durationMinutes, 0);
      const isComplete = pairs.every(pair => pair.clockOut !== null);
      const hasModifications = dayEntries.some(
        entry => entry.status === TimeEntryStatus.MODIFIED
      );

      summaries.push({
        date,
        pairs,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        isComplete,
        hasModifications,
      });
    }

    // Sort by date descending
    return summaries.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Calculates total worked minutes from an array of entries.
   *
   * @param entries - Array of time entries for a period
   * @param includeCurrentSession - Whether to include ongoing session (no clock_out yet)
   * @returns Total minutes worked
   */
  private calculateTotalMinutes(entries: TimeEntry[], includeCurrentSession = true): number {
    const pairs = this.pairTimeEntries(entries);
    return pairs.reduce((sum, pair) => {
      // Only count if we have a clock_out, or if including current session
      if (pair.clockOut || includeCurrentSession) {
        return sum + pair.durationMinutes;
      }
      return sum;
    }, 0);
  }

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
    const { startDate, endDate } = options || {};
    const pageNum = options?.page && options.page > 0 ? options.page : 1;
    const limitNum = options?.limit && options.limit > 0 ? options.limit : 50;

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
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    return { entries, total };
  }

  /**
   * Gets user's time entry history with daily summaries.
   * This endpoint returns processed data ready for display.
   */
  async getHistoryWithSummaries(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    dailySummaries: DailyWorkSummary[];
    totalDays: number;
    totalHours: number;
    averageHoursPerDay: number;
  }> {
    const { startDate, endDate } = options || {};

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

    const entries = await queryBuilder
      .orderBy('entry.timestamp', 'ASC')
      .getMany();

    const dailySummaries = this.calculateDailySummaries(entries);

    const totalDays = dailySummaries.length;
    const totalHours = dailySummaries.reduce((sum, day) => sum + day.totalHours, 0);
    const completeDays = dailySummaries.filter(day => day.isComplete).length;
    const averageHoursPerDay = completeDays > 0
      ? Math.round((totalHours / completeDays) * 100) / 100
      : 0;

    return {
      dailySummaries,
      totalDays,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHoursPerDay,
    };
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
    const { userId, startDate, endDate, type, status } = options || {};
    const pageNum = options?.page && options.page > 0 ? options.page : 1;
    const limitNum = options?.limit && options.limit > 0 ? options.limit : 50;

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
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
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

    // Use the new robust pairing logic
    const totalMinutes = this.calculateTotalMinutes(todayEntries, isClockedIn);

    return {
      isClockedIn,
      lastEntry,
      todayEntries,
      totalHoursToday: Math.round((totalMinutes / 60) * 100) / 100,
    };
  }

  async getAdminDashboardStats(): Promise<{
    activeEmployees: number;
    workingNow: number;
    todayUniqueClockIns: number;
    attendancePercentage: number;
    pendingIncidents: number;
    newEmployeesThisMonth: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get first day of current month
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Count active employees (contracted employees with status=active)
    const activeEmployeesQuery = await this.timeEntryRepository.manager
      .createQueryBuilder()
      .select('COUNT(DISTINCT user.id)', 'count')
      .from('users', 'user')
      .where('user.status = :status', { status: 'active' })
      .getRawOne();

    const activeEmployees = parseInt(activeEmployeesQuery?.count || '0', 10);

    // Count UNIQUE employees who clocked in today (not number of clock-ins)
    const todayUniqueClockInsQuery = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .select('COUNT(DISTINCT entry.user_id)', 'count')
      .where('entry.type = :type', { type: TimeEntryType.CLOCK_IN })
      .andWhere('entry.timestamp >= :today', { today })
      .andWhere('entry.timestamp < :tomorrow', { tomorrow })
      .getRawOne();

    const todayUniqueClockIns = parseInt(todayUniqueClockInsQuery?.count || '0', 10);

    // Calculate attendance percentage based on unique employees
    const attendancePercentage = activeEmployees > 0
      ? Math.round((todayUniqueClockIns / activeEmployees) * 100)
      : 0;

    // Count employees currently working (last entry is clock_in)
    const workingNowQuery = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .select('COUNT(DISTINCT entry.user_id)', 'count')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(e2.timestamp)')
          .from('time_entries', 'e2')
          .where('e2.user_id = entry.user_id')
          .getQuery();
        return `entry.timestamp = ${subQuery} AND entry.type = :clockInType`;
      })
      .setParameter('clockInType', TimeEntryType.CLOCK_IN)
      .getRawOne();

    const workingNow = parseInt(workingNowQuery?.count || '0', 10);

    // Count pending incidents from incidents table
    const pendingIncidentsCount = await this.incidentsService.getPendingCount();

    // Count new employees this month
    const newEmployeesQuery = await this.timeEntryRepository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('users', 'user')
      .where('user.created_at >= :firstDayOfMonth', { firstDayOfMonth })
      .getRawOne();

    const newEmployeesThisMonth = parseInt(newEmployeesQuery?.count || '0', 10);

    return {
      activeEmployees,
      workingNow,
      todayUniqueClockIns,
      attendancePercentage,
      pendingIncidents: pendingIncidentsCount,
      newEmployeesThisMonth,
    };
  }

  async getUserDashboardStats(userId: string): Promise<{
    hoursThisWeek: number;
    daysWorkedThisWeek: number;
    daysWorkedThisMonth: number;
    averageDailyHours: number;
  }> {
    const today = new Date();

    // Get start of current week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is first day
    startOfWeek.setDate(today.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get entries for this week
    const weekEntries = await this.timeEntryRepository.find({
      where: {
        userId,
        timestamp: Between(startOfWeek, today),
      },
      order: { timestamp: 'ASC' },
    });

    // Calculate hours this week
    // daysWorkedThisWeek: any day with at least one CLOCK_IN counts
    // completedDaysWeek: only days with complete pairs (for average calculation)
    let totalMinutesWeek = 0;
    const daysWithEntriesWeek = new Set<string>();
    const completedDaysWeek = new Set<string>();

    for (let i = 0; i < weekEntries.length; i++) {
      const entry = weekEntries[i];

      // Count any day with a CLOCK_IN as a worked day
      if (entry.type === TimeEntryType.CLOCK_IN) {
        daysWithEntriesWeek.add(entry.timestamp.toDateString());

        const nextEntry = weekEntries[i + 1];
        if (nextEntry && nextEntry.type === TimeEntryType.CLOCK_OUT) {
          totalMinutesWeek += (nextEntry.timestamp.getTime() - entry.timestamp.getTime()) / 60000;
          // Mark day as completed for average calculation
          completedDaysWeek.add(entry.timestamp.toDateString());
        }
      }
    }

    const hoursThisWeek = Math.round((totalMinutesWeek / 60) * 100) / 100;
    const daysWorkedThisWeek = daysWithEntriesWeek.size;

    // Get entries for this month
    const monthEntries = await this.timeEntryRepository.find({
      where: {
        userId,
        timestamp: Between(startOfMonth, today),
      },
      order: { timestamp: 'ASC' },
    });

    // daysWorkedThisMonth: any day with at least one CLOCK_IN counts
    // completedDaysMonth: only days with complete pairs (for average calculation)
    const daysWithEntriesMonth = new Set<string>();
    const completedDaysMonth = new Set<string>();
    let totalMinutesMonth = 0;

    for (let i = 0; i < monthEntries.length; i++) {
      const entry = monthEntries[i];

      // Count any day with a CLOCK_IN as a worked day
      if (entry.type === TimeEntryType.CLOCK_IN) {
        daysWithEntriesMonth.add(entry.timestamp.toDateString());

        const nextEntry = monthEntries[i + 1];
        if (nextEntry && nextEntry.type === TimeEntryType.CLOCK_OUT) {
          totalMinutesMonth += (nextEntry.timestamp.getTime() - entry.timestamp.getTime()) / 60000;
          // Mark day as completed for average calculation
          completedDaysMonth.add(entry.timestamp.toDateString());
        }
      }
    }

    const daysWorkedThisMonth = daysWithEntriesMonth.size;
    // Average only considers completed days (days with 0 hours don't affect the average)
    const completedDaysCount = completedDaysMonth.size;
    const averageDailyHours = completedDaysCount > 0
      ? Math.round((totalMinutesMonth / 60 / completedDaysCount) * 100) / 100
      : 0;

    return {
      hoursThisWeek,
      daysWorkedThisWeek,
      daysWorkedThisMonth,
      averageDailyHours,
    };
  }

  /**
   * Detects incomplete workdays (clock-in without clock-out) from previous days
   * and creates incidents for them.
   */
  async detectAndProcessIncompleteWorkdays(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const entries = await this.timeEntryRepository.find({
      where: {
        userId,
        timestamp: Between(thirtyDaysAgo, today),
      },
      order: { timestamp: 'ASC' },
    });
    if (entries.length === 0) return;

    // Detectar entradas sin salida por día
    const entriesByDay: Record<string, TimeEntry[]> = {};
    for (const entry of entries) {
      const dayKey = entry.timestamp.toISOString().split('T')[0];
      if (!entriesByDay[dayKey]) entriesByDay[dayKey] = [];
      entriesByDay[dayKey].push(entry);
    }
    for (const [day, dayEntries] of Object.entries(entriesByDay)) {
      let openEntry: TimeEntry | null = null;
      for (const entry of dayEntries) {
        if (entry.type === TimeEntryType.CLOCK_IN) {
          openEntry = entry;
        } else if (entry.type === TimeEntryType.CLOCK_OUT && openEntry) {
          openEntry = null;
        }
      }
      // Si queda una entrada abierta al final del día, crear incidencia
      if (openEntry) {
        const entryDate = new Date(openEntry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        if (entryDate.getTime() < today.getTime()) {
          const endOfDay = this.getEndOfDayInLocalTimezone(openEntry.timestamp);
          await this.incidentsService.createAutoExitIncident(
            userId,
            openEntry.id,
            openEntry.timestamp,
            endOfDay,
          );
        }
      }
    }
  }

  /**
   * Helper to check if two dates are on the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Process entries with auto-generated exits for incomplete workdays.
   * Returns entries with virtual exits inserted for calculation purposes.
   */
  processEntriesWithAutoExits(entries: TimeEntry[]): (TimeEntry & { isAutoGenerated?: boolean })[] {
    const processed: (TimeEntry & { isAutoGenerated?: boolean })[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      processed.push(entry);

      if (entry.type === TimeEntryType.CLOCK_IN) {
        const nextEntry = entries[i + 1];

        // Check if there's no matching exit
        const needsAutoExit = !nextEntry ||
          nextEntry.type === TimeEntryType.CLOCK_IN ||
          !this.isSameDay(entry.timestamp, nextEntry.timestamp);

        if (needsAutoExit) {
          const entryDate = new Date(entry.timestamp);
          entryDate.setHours(0, 0, 0, 0);

          // Only add auto-exit for past days, not for today
          if (entryDate.getTime() < today.getTime()) {
            const autoExit = {
              ...entry,
              id: `auto-${entry.id}`,
              type: TimeEntryType.CLOCK_OUT,
              timestamp: new Date(entry.timestamp.getFullYear(), entry.timestamp.getMonth(), entry.timestamp.getDate(), 23, 59, 59, 999),
              isAutoGenerated: true,
            } as TimeEntry & { isAutoGenerated?: boolean };

            processed.push(autoExit);
          }
        }
      }
    }

    // Re-sort by timestamp to maintain order
    return processed.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Gets the pending incidents count for the admin dashboard
   */
  async getPendingIncidentsCount(): Promise<number> {
    return this.incidentsService.getPendingCount();
  }

  /**
   * Creates a clock-out entry when an incident is corrected by an admin.
   * This is used to recalculate work hours when the real exit time is provided.
   */
  async createClockOutForIncident(
    userId: string,
    timestamp: Date,
    relatedEntryId: string,
    notes?: string,
  ): Promise<TimeEntry> {
    const clockOut = new TimeEntry();
    clockOut.userId = userId;
    clockOut.type = TimeEntryType.CLOCK_OUT;
    clockOut.timestamp = new Date(timestamp);
    clockOut.status = TimeEntryStatus.APPROVED;
    clockOut.notes = notes || 'Salida registrada por corrección de incidencia';
    clockOut.isManual = true;
    clockOut.modifiedBy = userId;

    const savedEntry = await this.timeEntryRepository.save(clockOut);

    // Registrar en auditoría
    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entityType: AuditEntity.TIME_ENTRY,
      entityId: savedEntry.id,
      newValue: savedEntry,
      description: `Clock-out created from incident correction. Related entry: ${relatedEntryId}`,
    });

    return savedEntry;
  }
}

