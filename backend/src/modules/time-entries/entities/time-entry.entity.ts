import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TimeEntryType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
}

export enum TimeEntryStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MODIFIED = 'modified',
}

@Entity('time_entries')
@Index(['userId', 'timestamp'])
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: TimeEntryType,
  })
  type: TimeEntryType;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: TimeEntryStatus,
    default: TimeEntryStatus.APPROVED,
  })
  status: TimeEntryStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ name: 'is_manual', default: false })
  isManual: boolean;

  @Column({ name: 'modified_by', nullable: true })
  modifiedBy: string;

  @Column({ name: 'original_timestamp', type: 'timestamptz', nullable: true })
  originalTimestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.timeEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
