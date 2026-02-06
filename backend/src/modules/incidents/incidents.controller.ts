import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { QueryIncidentsDto, ResolveIncidentDto, UpdateIncidentDto, RequestCorrectionDto, CreateIncidentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  /**
   * Create a new incident (admin only)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateIncidentDto) {
    return this.incidentsService.create(dto);
  }

  /**
   * Get all incidents (admin only)
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(@Query() query: QueryIncidentsDto) {
    return this.incidentsService.findAll(query);
  }

  /**
   * Get correction requests pending review (admin only)
   */
  @Get('pending-reviews')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingReviews() {
    return this.incidentsService.getPendingReviews();
  }

  /**
   * Get user's pending incidents (for current user)
   */
  @Get('my-pending')
  async getMyPendingIncidents(@CurrentUser('id') userId: string) {
    return this.incidentsService.getUserPendingIncidents(userId);
  }

  /**
   * Get user's complete incident history (for current user)
   */
  @Get('my-history')
  async getMyHistory(@CurrentUser('id') userId: string) {
    return this.incidentsService.getMyHistory(userId);
  }

  /**
   * Get yesterday's pending incidents for current user (for login alert)
   */
  @Get('my-yesterday-pending')
  async getMyYesterdayPendingIncidents(@CurrentUser('id') userId: string) {
    return this.incidentsService.getYesterdayPendingIncidents(userId);
  }

  /**
   * Get incident statistics (admin only)
   */
  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.incidentsService.getStats();
  }

  /**
   * Get pending incidents count (admin only)
   */
  @Get('pending-count')
  @Roles(UserRole.ADMIN)
  async getPendingCount() {
    const count = await this.incidentsService.getPendingCount();
    return { count };
  }

  /**
   * Get incidents for a specific user (admin only)
   */
  @Get('user/:userId')
  @Roles(UserRole.ADMIN)
  async findByUser(@Param('userId') userId: string) {
    return this.incidentsService.findByUser(userId);
  }

  /**
   * Get a single incident by ID
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  /**
   * Resolve an incident (admin only)
   */
  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN)
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveIncidentDto,
    @CurrentUser() user: any,
  ) {
    return this.incidentsService.resolve(id, dto, user.id);
  }

  /**
   * Editar una incidencia (admin o propietario)
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: any,
  ) {
    // Verificar si es admin o el propietario de la incidencia
    const incident = await this.incidentsService.findOne(id);
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = incident.userId === user.id;
    
    if (!isAdmin && !isOwner) {
      throw new Error('No tienes permiso para editar esta incidencia');
    }
    
    return this.incidentsService.updateIncident(id, dto, user.id);
  }

  /**
   * Solicitar corrección de una incidencia (usuario propietario)
   */
  @Patch(':id/request-correction')
  async requestCorrection(
    @Param('id') id: string,
    @Body() dto: RequestCorrectionDto,
    @CurrentUser() user: any,
  ) {
    return this.incidentsService.requestCorrection(
      id,
      user.id,
      new Date(dto.requestedTime),
      dto.message,
    );
  }
}
