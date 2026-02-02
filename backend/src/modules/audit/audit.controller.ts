import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditAction, AuditEntity } from './entities/audit-log.entity';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entityType', required: false, enum: AuditEntity })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: AuditEntity,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findAll({
      userId,
      action,
      entityType,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  async findByEntity(
    @Param('entityType') entityType: AuditEntity,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }
}
