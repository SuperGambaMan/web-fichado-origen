import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesProcessor } from './time-entries.processor';
import { TimeEntriesSchedulerService } from './time-entries.scheduler.service';
import { TimeEntry } from './entities/time-entry.entity';
import { User } from '../users/entities/user.entity';
import { AuditModule } from '../audit/audit.module';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeEntry, User]),
    BullModule.registerQueue({
      name: 'time-entries',
    }),
    forwardRef(() => AuditModule),
    forwardRef(() => IncidentsModule),
  ],
  controllers: [TimeEntriesController],
  providers: [
    TimeEntriesService,
    TimeEntriesProcessor,
    TimeEntriesSchedulerService,
  ],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
