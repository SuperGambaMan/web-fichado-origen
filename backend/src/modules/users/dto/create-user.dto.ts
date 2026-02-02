import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.EMPLOYEE })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: 'IT Department' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: '+34612345678' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @ApiPropertyOptional({ example: '2024-06-15' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
