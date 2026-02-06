import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class TimeEntriesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TimeEntriesSchedulerService.name);
  private readonly JOB_NAME = 'process-incomplete-workdays';
  private readonly CRON_SCHEDULE = '0 5 0 * * *'; // Todos los días a las 00:05:00

  constructor(
    @InjectQueue('time-entries')
    private readonly timeEntriesQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing time entries scheduler...');
    
    // Limpiar jobs existentes para evitar duplicados
    await this.cleanExistingJobs();
    
    // Programar el job diario
    await this.scheduleDailyJob();
    
    this.logger.log('Time entries scheduler initialized successfully');
  }

  private async cleanExistingJobs() {
    try {
      const jobs = await this.timeEntriesQueue.getRepeatableJobs();
      for (const job of jobs) {
        if (job.name === this.JOB_NAME) {
          this.logger.log(`Removing existing repeatable job: ${job.key}`);
          await this.timeEntriesQueue.removeRepeatableByKey(job.key);
        }
      }
      this.logger.log('Cleaned existing jobs');
    } catch (error) {
      this.logger.warn(`Failed to clean existing jobs: ${error.message}`);
    }
  }

  private async scheduleDailyJob() {
    try {
      // Programar job repetible diariamente a las 00:05
      await this.timeEntriesQueue.add(
        this.JOB_NAME,
        { userId: null }, // null = procesar todos los usuarios
        {
          repeat: {
            cron: this.CRON_SCHEDULE,
            tz: 'Europe/Madrid', // Zona horaria de España (UTC+1)
          },
          jobId: 'daily-incomplete-workdays-check',
          removeOnComplete: 10, // Mantener últimos 10 jobs completados
          removeOnFail: 5, // Mantener últimos 5 jobs fallidos
        },
      );

      this.logger.log(`Scheduled daily job at 00:05 (Europe/Madrid timezone)`);
      this.logger.log(`Cron schedule: ${this.CRON_SCHEDULE}`);
    } catch (error) {
      this.logger.error(`Failed to schedule daily job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permite ejecutar el job manualmente (para testing o admin)
   */
  async triggerManualCheck(userId?: string): Promise<{ jobId: string }> {
    this.logger.log(`Triggering manual check${userId ? ` for user ${userId}` : ' for all users'}`);
    
    const job = await this.timeEntriesQueue.add(
      this.JOB_NAME,
      { userId: userId || null },
      {
        priority: 1, // Alta prioridad para ejecuciones manuales
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Manual check job created with ID: ${job.id}`);
    return { jobId: job.id.toString() };
  }

  /**
   * Obtiene información sobre el job programado
   */
  async getScheduledJobs(): Promise<any[]> {
    const repeatableJobs = await this.timeEntriesQueue.getRepeatableJobs();
    return repeatableJobs.map(job => ({
      name: job.name,
      key: job.key,
      cron: job.cron,
      next: job.next,
      tz: job.tz,
    }));
  }
}
