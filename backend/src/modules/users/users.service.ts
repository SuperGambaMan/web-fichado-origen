import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity } from '../audit/entities/audit-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async create(createUserDto: CreateUserDto, createdBy?: string): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const user: User = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      hireDate: createUserDto.hireDate ? new Date(createUserDto.hireDate) : undefined,
      endDate: createUserDto.endDate ? new Date(createUserDto.endDate) : undefined,
    } as Partial<User>);

    const savedUser: User = await this.userRepository.save(user);

    // Audit log
    await this.auditService.log({
      userId: createdBy,
      action: AuditAction.CREATE,
      entityType: AuditEntity.USER,
      entityId: savedUser.id,
      newValue: { ...savedUser, password: '[REDACTED]' },
      description: `User ${savedUser.email} created`,
    });

    return savedUser;
  }

  async findAll(options?: {
    role?: UserRole;
    status?: UserStatus;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; total: number }> {
    const { role, status, page = 1, limit = 20 } = options || {};

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { users, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['timeEntries'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    updatedBy?: string,
  ): Promise<User> {
    const user = await this.findOne(id);
    const oldValue = { ...user };

    Object.assign(user, updateUserDto);

    if (updateUserDto.hireDate) {
      user.hireDate = new Date(updateUserDto.hireDate);
    }
    if (updateUserDto.endDate) {
      user.endDate = new Date(updateUserDto.endDate);
    }

    const updatedUser = await this.userRepository.save(user);

    // Audit log
    await this.auditService.log({
      userId: updatedBy,
      action: AuditAction.UPDATE,
      entityType: AuditEntity.USER,
      entityId: id,
      oldValue: { ...oldValue, password: '[REDACTED]' },
      newValue: { ...updatedUser, password: '[REDACTED]' },
      description: `User ${updatedUser.email} updated`,
    });

    return updatedUser;
  }

  async remove(id: string, deletedBy?: string): Promise<void> {
    const user = await this.findOne(id);

    // Audit log before deletion
    await this.auditService.log({
      userId: deletedBy,
      action: AuditAction.DELETE,
      entityType: AuditEntity.USER,
      entityId: id,
      oldValue: { ...user, password: '[REDACTED]' },
      description: `User ${user.email} deleted`,
    });

    await this.userRepository.remove(user);
  }

  async updatePassword(
    id: string,
    newPassword: string,
    updatedBy?: string,
  ): Promise<void> {
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 12);
    await this.userRepository.save(user);

    // Audit log
    await this.auditService.log({
      userId: updatedBy,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: AuditEntity.USER,
      entityId: id,
      description: `Password changed for user ${user.email}`,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}
