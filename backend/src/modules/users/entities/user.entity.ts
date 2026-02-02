import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { TimeEntry } from '../../time-entries/entities/time-entry.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';

export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  INTERN = 'intern',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ nullable: true })
  department: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  // Relations
  @OneToMany(() => TimeEntry, (timeEntry) => timeEntry.user)
  timeEntries: TimeEntry[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  // Virtual property
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
