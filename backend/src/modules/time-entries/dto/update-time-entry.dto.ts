import { PartialType } from '@nestjs/swagger';
import { CreateTimeEntryDto } from './create-time-entry.dto';
import { IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeEntryStatus } from '../entities/time-entry.entity';

export class UpdateTimeEntryDto extends PartialType(CreateTimeEntryDto) {
  @ApiPropertyOptional({ enum: TimeEntryStatus })
  @IsEnum(TimeEntryStatus)
  @IsOptional()
  status?: TimeEntryStatus;
}

export class AdminUpdateTimeEntryDto extends UpdateTimeEntryDto {
  @ApiPropertyOptional({ description: 'User ID (admin only)' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: '2024-01-15T09:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  timestamp?: string;
}
