import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto, AdminUpdateTimeEntryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TimeEntryType, TimeEntryStatus } from './entities/time-entry.entity';

@ApiTags('time-entries')
@ApiBearerAuth()
@Controller('time-entries')
@UseGuards(JwtAuthGuard)
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in' })
  @ApiResponse({ status: 201, description: 'Clocked in successfully' })
  async clockIn(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTimeEntryDto,
    @Req() req: Request,
  ) {
    return this.timeEntriesService.clockIn(userId, dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out' })
  @ApiResponse({ status: 201, description: 'Clocked out successfully' })
  async clockOut(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTimeEntryDto,
    @Req() req: Request,
  ) {
    return this.timeEntriesService.clockOut(userId, dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current clock status for the day' })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.timeEntriesService.getTodayStatus(userId);
  }

  @Get('my-entries')
  @ApiOperation({ summary: 'Get my time entries' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyEntries(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.timeEntriesService.findByUser(userId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all time entries (admin)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'type', required: false, enum: TimeEntryType })
  @ApiQuery({ name: 'status', required: false, enum: TimeEntryStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: TimeEntryType,
    @Query('status') status?: TimeEntryStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.timeEntriesService.findAll({
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      status,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a time entry by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.timeEntriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a time entry (admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateTimeEntryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.timeEntriesService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a time entry (admin)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.timeEntriesService.remove(id, userId);
  }
}
