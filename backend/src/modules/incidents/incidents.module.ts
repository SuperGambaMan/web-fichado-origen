import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { AuditModule } from '../audit/audit.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident]),
    forwardRef(() => AuditModule),
    forwardRef(() => TimeEntriesModule),
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
