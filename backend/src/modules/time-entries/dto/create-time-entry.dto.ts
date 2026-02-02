import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimeEntryDto {

  @ApiPropertyOptional({ example: '2024-01-15T09:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({ example: 'Working from home today' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 40.4168 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -3.7038 })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
