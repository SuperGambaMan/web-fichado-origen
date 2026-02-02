import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntriesService } from './time-entries.service';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntry } from './entities/time-entry.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TimeEntry]),
    forwardRef(() => AuditModule),
  ],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
