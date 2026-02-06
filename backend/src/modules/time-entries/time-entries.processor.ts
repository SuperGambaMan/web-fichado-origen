import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntriesService } from './time-entries.service';
import { User, UserStatus } from '../users/entities/user.entity';

interface ProcessIncompleteWorkdaysJob {
  userId?: string; // Si no se especifica, procesa todos los usuarios
}

@Processor('time-entries')
export class TimeEntriesProcessor {
  private readonly logger = new Logger(TimeEntriesProcessor.name);

  constructor(
    private readonly timeEntriesService: TimeEntriesService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Process('process-incomplete-workdays')
  async handleProcessIncompleteWorkdays(job: Job<ProcessIncompleteWorkdaysJob>) {
    this.logger.log(`Processing incomplete workdays job ${job.id}`);
    
    try {
      if (job.data.userId) {
        // Procesar un usuario específico
        this.logger.log(`Processing user: ${job.data.userId}`);
        await this.timeEntriesService.detectAndProcessIncompleteWorkdays(job.data.userId);
      } else {
        // Procesar TODOS los usuarios activos
        this.logger.log('Processing all active users...');
        
        const activeUsers = await this.userRepository.find({
          where: { status: UserStatus.ACTIVE },
          select: ['id', 'email', 'firstName', 'lastName'],
        });

        this.logger.log(`Found ${activeUsers.length} active users to process`);

        let processedCount = 0;
        let errorCount = 0;

        for (const user of activeUsers) {
          try {
            this.logger.debug(`Processing user: ${user.email} (${user.id})`);
            await this.timeEntriesService.detectAndProcessIncompleteWorkdays(user.id);
            processedCount++;
          } catch (error) {
            this.logger.error(`Failed to process user ${user.id}: ${error.message}`);
            errorCount++;
            // Continuar con el siguiente usuario
          }
        }

        this.logger.log(
          `Completed processing incomplete workdays: ${processedCount} successful, ${errorCount} failed`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to process incomplete workdays job: ${error.message}`);
      throw error;
    }
  }
}
