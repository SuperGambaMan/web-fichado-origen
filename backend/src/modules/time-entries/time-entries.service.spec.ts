import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeEntriesService, TimeEntryPair, DailyWorkSummary } from './time-entries.service';
import { TimeEntry, TimeEntryType, TimeEntryStatus } from './entities/time-entry.entity';
import { AuditService } from '../audit/audit.service';

// ============================================
// Test Utilities and Mocks
// ============================================

/**
 * Helper function to create a mock TimeEntry
 */
const createMockEntry = (
  id: string,
  userId: string,
  type: TimeEntryType,
  timestamp: Date,
  options?: {
    status?: TimeEntryStatus;
    isManual?: boolean;
    notes?: string;
  }
): TimeEntry => ({
  id,
  userId,
  type,
  timestamp,
  status: options?.status || TimeEntryStatus.APPROVED,
  isManual: options?.isManual || false,
  notes: options?.notes || '',
  ipAddress: '127.0.0.1',
  userAgent: 'Jest Test',
  latitude: undefined as any,
  longitude: undefined as any,
  modifiedBy: undefined as any,
  originalTimestamp: undefined as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: undefined as any,
});

/**
 * Mock AuditService
 */
const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

/**
 * Mock TimeEntry Repository
 */
const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getCount: jest.fn(),
    subQuery: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    getQuery: jest.fn(),
    setParameter: jest.fn().mockReturnThis(),
  })),
  manager: {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  },
});

// ============================================
// Test Suite
// ============================================

describe('TimeEntriesService', () => {
  let service: TimeEntriesService;
  let repository: jest.Mocked<Repository<TimeEntry>>;

  // Test user IDs
  const USER_ID_1 = 'user-1-uuid';
  const USER_ID_2 = 'user-2-uuid';

  beforeEach(async () => {
    const mockRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeEntriesService,
        {
          provide: getRepositoryToken(TimeEntry),
          useValue: mockRepo,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
    repository = module.get(getRepositoryToken(TimeEntry));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // 1. EMPAREJAMIENTO CORRECTO
  // ============================================

  describe('Emparejamiento de entradas y salidas', () => {
    describe('Caso básico: entrada seguida de salida', () => {
      it('debería emparejar correctamente una entrada con su salida', async () => {
        // Arrange: Una entrada a las 09:00 y una salida a las 17:00
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries).toHaveLength(1);
        expect(result.dailySummaries[0].pairs).toHaveLength(1);
        expect(result.dailySummaries[0].pairs[0].clockIn.id).toBe('1');
        expect(result.dailySummaries[0].pairs[0].clockOut?.id).toBe('2');
        expect(result.dailySummaries[0].isComplete).toBe(true);
      });
    });

    describe('Múltiples sesiones en el mismo día', () => {
      it('debería emparejar múltiples entradas/salidas del mismo día', async () => {
        // Arrange: Dos sesiones de trabajo en el mismo día
        // Sesión 1: 09:00 - 13:00 (4 horas)
        // Sesión 2: 14:00 - 18:00 (4 horas)
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T13:00:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T14:00:00Z')),
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T18:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries).toHaveLength(1);
        expect(result.dailySummaries[0].pairs).toHaveLength(2);

        // Primer par: 09:00 - 13:00
        expect(result.dailySummaries[0].pairs[0].clockIn.id).toBe('1');
        expect(result.dailySummaries[0].pairs[0].clockOut?.id).toBe('2');

        // Segundo par: 14:00 - 18:00
        expect(result.dailySummaries[0].pairs[1].clockIn.id).toBe('3');
        expect(result.dailySummaries[0].pairs[1].clockOut?.id).toBe('4');

        expect(result.dailySummaries[0].isComplete).toBe(true);
      });
    });

    describe('Registros desordenados', () => {
      it('debería ordenar y emparejar correctamente registros que vienen desordenados', async () => {
        // Arrange: Registros en orden incorrecto
        const entries: TimeEntry[] = [
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T18:00:00Z')),
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T14:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T13:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Debería ordenar correctamente y emparejar
        expect(result.dailySummaries[0].pairs).toHaveLength(2);
        expect(result.dailySummaries[0].pairs[0].clockIn.id).toBe('1');
        expect(result.dailySummaries[0].pairs[0].clockOut?.id).toBe('2');
        expect(result.dailySummaries[0].pairs[1].clockIn.id).toBe('3');
        expect(result.dailySummaries[0].pairs[1].clockOut?.id).toBe('4');
      });
    });

    describe('Registros manuales mezclados con automáticos', () => {
      it('debería emparejar correctamente registros manuales y automáticos', async () => {
        // Arrange: Mezcla de registros manuales y automáticos
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z'), { isManual: true }),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T13:00:00Z'), { isManual: false }),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T14:00:00Z'), { isManual: false }),
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T18:00:00Z'), { isManual: true }),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].pairs).toHaveLength(2);
        expect(result.dailySummaries[0].pairs[0].clockIn.isManual).toBe(true);
        expect(result.dailySummaries[0].pairs[0].clockOut?.isManual).toBe(false);
        expect(result.dailySummaries[0].pairs[1].clockIn.isManual).toBe(false);
        expect(result.dailySummaries[0].pairs[1].clockOut?.isManual).toBe(true);
      });
    });
  });

  // ============================================
  // 2. CÁLCULO CORRECTO DEL TIEMPO TRABAJADO
  // ============================================

  describe('Cálculo del tiempo trabajado', () => {
    describe('Duración positiva', () => {
      it('debería calcular correctamente 8 horas de trabajo', async () => {
        // Arrange: Entrada 09:00, Salida 17:00 = 8 horas = 480 minutos
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].totalMinutes).toBe(480); // 8 horas
        expect(result.dailySummaries[0].totalHours).toBe(8);
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(480);
      });

      it('debería calcular correctamente 30 minutos de trabajo', async () => {
        // Arrange: Entrada 09:00, Salida 09:30 = 30 minutos
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T09:30:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].totalMinutes).toBe(30);
        expect(result.dailySummaries[0].totalHours).toBe(0.5);
      });
    });

    describe('Suma de varios tramos en el mismo día', () => {
      it('debería sumar correctamente múltiples sesiones de trabajo', async () => {
        // Arrange:
        // Sesión 1: 09:00 - 13:00 = 4 horas (240 min)
        // Sesión 2: 14:00 - 18:00 = 4 horas (240 min)
        // Total: 8 horas (480 min)
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T13:00:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T14:00:00Z')),
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T18:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(240); // 4 horas
        expect(result.dailySummaries[0].pairs[1].durationMinutes).toBe(240); // 4 horas
        expect(result.dailySummaries[0].totalMinutes).toBe(480); // 8 horas total
        expect(result.dailySummaries[0].totalHours).toBe(8);
      });

      it('debería sumar correctamente 3 sesiones cortas', async () => {
        // Arrange:
        // Sesión 1: 09:00 - 10:30 = 1.5 horas (90 min)
        // Sesión 2: 11:00 - 12:00 = 1 hora (60 min)
        // Sesión 3: 14:00 - 16:30 = 2.5 horas (150 min)
        // Total: 5 horas (300 min)
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T10:30:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T11:00:00Z')),
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T12:00:00Z')),
          createMockEntry('5', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T14:00:00Z')),
          createMockEntry('6', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T16:30:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].pairs).toHaveLength(3);
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(90);
        expect(result.dailySummaries[0].pairs[1].durationMinutes).toBe(60);
        expect(result.dailySummaries[0].pairs[2].durationMinutes).toBe(150);
        expect(result.dailySummaries[0].totalMinutes).toBe(300);
        expect(result.dailySummaries[0].totalHours).toBe(5);
      });
    });

    describe('Totales y promedios', () => {
      it('debería calcular correctamente totalDays, totalHours y averageHoursPerDay', async () => {
        // Arrange: 2 días de trabajo
        // Día 1: 8 horas
        // Día 2: 6 horas
        // Total: 14 horas, Promedio: 7 horas/día
        const entries: TimeEntry[] = [
          // Día 1
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-01T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-01T17:00:00Z')),
          // Día 2
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T10:00:00Z')),
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T16:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.totalDays).toBe(2);
        expect(result.totalHours).toBe(14);
        expect(result.averageHoursPerDay).toBe(7);
      });
    });
  });

  // ============================================
  // 3. CASOS LÍMITE
  // ============================================

  describe('Casos límite', () => {
    describe('Más entradas que salidas', () => {
      it('debería manejar correctamente cuando hay más entradas que salidas', async () => {
        // Arrange: 3 entradas pero solo 2 salidas
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T13:00:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T14:00:00Z')),
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T18:00:00Z')),
          createMockEntry('5', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T19:00:00Z')),
          // Sin salida para la última entrada
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].pairs).toHaveLength(3);
        expect(result.dailySummaries[0].pairs[0].clockOut).not.toBeNull();
        expect(result.dailySummaries[0].pairs[1].clockOut).not.toBeNull();
        expect(result.dailySummaries[0].pairs[2].clockOut).toBeNull(); // Última entrada sin salida
        expect(result.dailySummaries[0].isComplete).toBe(false);
      });
    });

    describe('Más salidas que entradas', () => {
      it('debería ignorar salidas huérfanas (sin entrada previa)', async () => {
        // Arrange: Salida al inicio sin entrada previa
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T08:00:00Z')), // Salida huérfana
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Solo debería haber 1 par válido
        expect(result.dailySummaries[0].pairs).toHaveLength(1);
        expect(result.dailySummaries[0].pairs[0].clockIn.id).toBe('2');
        expect(result.dailySummaries[0].pairs[0].clockOut?.id).toBe('3');
        expect(result.dailySummaries[0].totalMinutes).toBe(480); // 8 horas
      });
    });

    describe('Entrada sin salida', () => {
      it('debería marcar el día como incompleto si hay entrada sin salida', async () => {
        // Arrange: Solo una entrada, sin salida
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].pairs).toHaveLength(1);
        expect(result.dailySummaries[0].pairs[0].clockIn).toBeDefined();
        expect(result.dailySummaries[0].pairs[0].clockOut).toBeNull();
        expect(result.dailySummaries[0].isComplete).toBe(false);
      });
    });

    describe('Salida sin entrada', () => {
      it('debería crear un día con 0 pares cuando solo hay salidas huérfanas', async () => {
        // Arrange: Solo una salida, sin entrada
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: El día existe pero sin pares válidos y 0 horas
        expect(result.dailySummaries).toHaveLength(1);
        expect(result.dailySummaries[0].pairs).toHaveLength(0);
        expect(result.dailySummaries[0].totalMinutes).toBe(0);
        expect(result.dailySummaries[0].totalHours).toBe(0);
        expect(result.dailySummaries[0].isComplete).toBe(true); // Completo porque no hay pares pendientes
      });
    });

    describe('Registros duplicados y entradas consecutivas', () => {
      it('debería generar salida automática cuando hay 2 entradas consecutivas', async () => {
        // Arrange: Dos entradas consecutivas sin salida entre ellas
        // Entrada1: 09:00, Entrada2: 10:00, Salida: 17:00
        // Esperado: Entrada1(09:00)->SalidaVirtual(10:00) = 1h, Entrada2(10:00)->Salida(17:00) = 7h
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T10:00:00Z')), // Segunda entrada
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Ahora genera salida automática para la primera entrada
        expect(result.dailySummaries[0].pairs).toHaveLength(2);

        // Primer par: Entrada1 (09:00) -> Salida Virtual (10:00) = 1 hora = 60 minutos
        expect(result.dailySummaries[0].pairs[0].clockIn.id).toBe('1');
        expect(result.dailySummaries[0].pairs[0].clockOut).not.toBeNull();
        expect(result.dailySummaries[0].pairs[0].clockOut?.id).toBe('virtual-1');
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(60); // 1 hora

        // Segundo par: Entrada2 (10:00) -> Salida (17:00) = 7 horas = 420 minutos
        expect(result.dailySummaries[0].pairs[1].clockIn.id).toBe('2');
        expect(result.dailySummaries[0].pairs[1].clockOut?.id).toBe('3');
        expect(result.dailySummaries[0].pairs[1].durationMinutes).toBe(420); // 7 horas

        // Total: 1 + 7 = 8 horas
        expect(result.dailySummaries[0].totalMinutes).toBe(480);
        expect(result.dailySummaries[0].totalHours).toBe(8);
        expect(result.dailySummaries[0].isComplete).toBe(true);
      });

      it('debería generar 2 salidas automáticas cuando hay 3 entradas consecutivas', async () => {
        // Arrange: Tres entradas consecutivas
        // Entrada1: 09:00, Entrada2: 10:00, Entrada3: 11:00, Salida: 17:00
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T10:00:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T11:00:00Z')),
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Debe generar 2 salidas virtuales
        expect(result.dailySummaries[0].pairs).toHaveLength(3);

        // Par 1: Entrada1 (09:00) -> Salida Virtual (10:00) = 1 hora
        expect(result.dailySummaries[0].pairs[0].clockIn.id).toBe('1');
        expect(result.dailySummaries[0].pairs[0].clockOut?.id).toBe('virtual-1');
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(60);

        // Par 2: Entrada2 (10:00) -> Salida Virtual (11:00) = 1 hora
        expect(result.dailySummaries[0].pairs[1].clockIn.id).toBe('2');
        expect(result.dailySummaries[0].pairs[1].clockOut?.id).toBe('virtual-2');
        expect(result.dailySummaries[0].pairs[1].durationMinutes).toBe(60);

        // Par 3: Entrada3 (11:00) -> Salida (17:00) = 6 horas
        expect(result.dailySummaries[0].pairs[2].clockIn.id).toBe('3');
        expect(result.dailySummaries[0].pairs[2].clockOut?.id).toBe('4');
        expect(result.dailySummaries[0].pairs[2].durationMinutes).toBe(360);

        // Total: 1 + 1 + 6 = 8 horas
        expect(result.dailySummaries[0].totalMinutes).toBe(480);
        expect(result.dailySummaries[0].totalHours).toBe(8);
        expect(result.dailySummaries[0].isComplete).toBe(true);
      });

      it('debería manejar entradas consecutivas mezcladas con manuales y automáticas', async () => {
        // Arrange: Mezcla de registros manuales y automáticos con entradas consecutivas
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z'), { isManual: true }),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T10:00:00Z'), { isManual: false }), // Consecutiva
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T14:00:00Z'), { isManual: false }),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].pairs).toHaveLength(2);
        expect(result.dailySummaries[0].pairs[0].clockIn.isManual).toBe(true);
        expect(result.dailySummaries[0].pairs[0].clockOut).not.toBeNull();
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(60); // 1 hora
        expect(result.dailySummaries[0].pairs[1].clockIn.isManual).toBe(false);
        expect(result.dailySummaries[0].pairs[1].clockOut?.isManual).toBe(false);
      });

      it('debería manejar entradas consecutivas con registros desordenados', async () => {
        // Arrange: Registros desordenados con entradas consecutivas
        const entries: TimeEntry[] = [
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T10:00:00Z')), // Desordenado
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')), // Desordenado
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Debe ordenar primero y luego detectar entradas consecutivas
        expect(result.dailySummaries[0].pairs).toHaveLength(2);

        // Después de ordenar: Entrada1(09:00), Entrada2(10:00), Salida(17:00)
        // Par 1: 09:00 -> 10:00 (virtual) = 1 hora
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(60);

        // Par 2: 10:00 -> 17:00 = 7 horas
        expect(result.dailySummaries[0].pairs[1].durationMinutes).toBe(420);

        expect(result.dailySummaries[0].totalHours).toBe(8);
      });

      it('debería manejar entradas duplicadas en el mismo segundo', async () => {
        // Arrange: Dos entradas con exactamente el mismo timestamp
        const sameTime = new Date('2026-02-02T09:00:00Z');
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, sameTime),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_IN, sameTime), // Mismo timestamp
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Debe generar salida virtual con duración 0 para la primera
        expect(result.dailySummaries[0].pairs).toHaveLength(2);
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(0); // Mismo timestamp = 0 minutos
        expect(result.dailySummaries[0].pairs[1].durationMinutes).toBe(480); // 8 horas

        // Total debe ser positivo y sin errores
        expect(result.dailySummaries[0].totalMinutes).toBeGreaterThanOrEqual(0);
        expect(result.dailySummaries[0].isComplete).toBe(true);
      });

      it('nunca debería generar tiempos negativos con entradas consecutivas', async () => {
        // Arrange: Caso extremo con múltiples entradas consecutivas
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:30:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T10:00:00Z')),
          createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T10:30:00Z')),
          createMockEntry('5', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Todos los tiempos deben ser >= 0
        result.dailySummaries.forEach(day => {
          day.pairs.forEach(pair => {
            expect(pair.durationMinutes).toBeGreaterThanOrEqual(0);
          });
          expect(day.totalMinutes).toBeGreaterThanOrEqual(0);
          expect(day.totalHours).toBeGreaterThanOrEqual(0);
        });

        // Debe estar completo ya que todas las entradas tienen salida (virtual o real)
        expect(result.dailySummaries[0].isComplete).toBe(true);
      });
    });

    describe('Registros con timestamps iguales', () => {
      it('debería manejar registros con el mismo timestamp', async () => {
        // Arrange: Entrada y salida con el mismo timestamp (edge case)
        const sameTime = new Date('2026-02-02T09:00:00Z');
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, sameTime),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, sameTime),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Debería tener duración 0 (o un pequeño valor)
        expect(result.dailySummaries[0].pairs).toHaveLength(1);
        expect(result.dailySummaries[0].pairs[0].durationMinutes).toBe(0);
        expect(result.dailySummaries[0].totalMinutes).toBe(0);
      });
    });

    describe('Nunca tiempos negativos', () => {
      it('nunca debería producir duraciones negativas', async () => {
        // Arrange: Caso extremo - salida antes de entrada (datos corruptos)
        // La lógica debería ignorar la salida huérfana
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T08:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Todas las duraciones deben ser >= 0
        result.dailySummaries.forEach(day => {
          day.pairs.forEach(pair => {
            expect(pair.durationMinutes).toBeGreaterThanOrEqual(0);
          });
          expect(day.totalMinutes).toBeGreaterThanOrEqual(0);
          expect(day.totalHours).toBeGreaterThanOrEqual(0);
        });
      });
    });

    describe('Sin registros', () => {
      it('debería manejar correctamente cuando no hay registros', async () => {
        // Arrange: Sin registros
        const entries: TimeEntry[] = [];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries).toHaveLength(0);
        expect(result.totalDays).toBe(0);
        expect(result.totalHours).toBe(0);
        expect(result.averageHoursPerDay).toBe(0);
      });
    });

    describe('Registros modificados', () => {
      it('debería marcar hasModifications cuando hay registros modificados', async () => {
        // Arrange: Registro con estado MODIFIED
        const entries: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z'),
            { status: TimeEntryStatus.MODIFIED }),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entries),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries[0].hasModifications).toBe(true);
      });
    });
  });

  // ============================================
  // 4. VALIDACIÓN DE USUARIO
  // ============================================

  describe('Validación de usuario', () => {
    describe('Solo registros del usuario autenticado', () => {
      it('debería filtrar por userId en la consulta', async () => {
        // Arrange
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert: Debe filtrar por userId
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'entry.userId = :userId',
          { userId: USER_ID_1 }
        );
      });
    });

    describe('No mezcla registros de otros usuarios', () => {
      it('debería devolver solo registros del usuario especificado', async () => {
        // Arrange: Registros de dos usuarios diferentes
        const entriesUser1: TimeEntry[] = [
          createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
          createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),
        ];

        // Simulamos que el repositorio solo devuelve registros del USER_ID_1
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(entriesUser1),
        };
        repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

        // Act
        const result = await service.getHistoryWithSummaries(USER_ID_1, {
          startDate: new Date('2026-02-02'),
          endDate: new Date('2026-02-02'),
        });

        // Assert
        expect(result.dailySummaries).toHaveLength(1);
        result.dailySummaries.forEach(day => {
          day.pairs.forEach(pair => {
            expect(pair.clockIn.userId).toBe(USER_ID_1);
            if (pair.clockOut) {
              expect(pair.clockOut.userId).toBe(USER_ID_1);
            }
          });
        });
      });
    });
  });

  // ============================================
  // 5. TESTS DE REGRESIÓN
  // ============================================

  describe('Tests de regresión', () => {
    it('debería manejar correctamente un escenario complejo del mundo real', async () => {
      // Arrange: Semana típica de trabajo con varios escenarios
      const entries: TimeEntry[] = [
        // Lunes: Jornada normal 8h
        createMockEntry('1', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-02T09:00:00Z')),
        createMockEntry('2', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-02T17:00:00Z')),

        // Martes: Jornada partida (4h + 3h = 7h)
        createMockEntry('3', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-03T09:00:00Z')),
        createMockEntry('4', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-03T13:00:00Z')),
        createMockEntry('5', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-03T15:00:00Z')),
        createMockEntry('6', USER_ID_1, TimeEntryType.CLOCK_OUT, new Date('2026-02-03T18:00:00Z')),

        // Miércoles: Solo entrada (incompleto)
        createMockEntry('7', USER_ID_1, TimeEntryType.CLOCK_IN, new Date('2026-02-04T09:00:00Z')),
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(entries),
      };
      repository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getHistoryWithSummaries(USER_ID_1, {
        startDate: new Date('2026-02-02'),
        endDate: new Date('2026-02-04'),
      });

      // Assert
      expect(result.totalDays).toBe(3);
      expect(result.dailySummaries).toHaveLength(3);

      // Ordenados por fecha descendente
      const sortedSummaries = result.dailySummaries.sort((a, b) => a.date.localeCompare(b.date));

      // Lunes: 8h completo
      expect(sortedSummaries[0].date).toBe('2026-02-02');
      expect(sortedSummaries[0].totalHours).toBe(8);
      expect(sortedSummaries[0].isComplete).toBe(true);

      // Martes: 7h completo
      expect(sortedSummaries[1].date).toBe('2026-02-03');
      expect(sortedSummaries[1].totalHours).toBe(7);
      expect(sortedSummaries[1].pairs).toHaveLength(2);
      expect(sortedSummaries[1].isComplete).toBe(true);

      // Miércoles: incompleto
      expect(sortedSummaries[2].date).toBe('2026-02-04');
      expect(sortedSummaries[2].isComplete).toBe(false);
    });
  });
});
