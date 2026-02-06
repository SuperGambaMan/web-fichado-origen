'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  ClockIcon,
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

interface StatsCardsProps {
  isAdmin: boolean;
}

interface AdminStats {
  activeEmployees: number;
  workingNow: number;
  todayUniqueClockIns: number;
  attendancePercentage: number;
  pendingIncidents: number;
  newEmployeesThisMonth: number;
}

interface UserStats {
  hoursThisWeek: number;
  daysWorkedThisWeek: number;
  daysWorkedThisMonth: number;
  averageDailyHours: number;
}

export function StatsCards({ isAdmin }: StatsCardsProps) {
  const { data: session } = useSession();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.accessToken) return;

      try {
        setIsLoading(true);
        const endpoint = isAdmin ? '/time-entries/stats/admin' : '/time-entries/stats/user';
        const response = await api.get(endpoint, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        if (isAdmin) {
          setAdminStats(response.data);
        } else {
          setUserStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [session?.accessToken, isAdmin]);

  if (isLoading) {
    const skeletonCount = isAdmin ? 4 : 3;
    return (
      <div className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 w-24 rounded bg-gray-200 mb-2" />
                <div className="h-6 w-16 rounded bg-gray-200" />
              </div>
            </div>
            <div className="mt-4">
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stats = isAdmin
    ? [
        {
          name: 'Empleados contratados',
          value: adminStats?.activeEmployees?.toString() || '0',
          icon: UsersIcon,
          change: `+${adminStats?.newEmployeesThisMonth || 0} este mes`,
          changeType: (adminStats?.newEmployeesThisMonth || 0) > 0 ? 'positive' : 'neutral',
        },
        {
          name: 'Trabajando ahora',
          value: adminStats?.workingNow?.toString() || '0',
          icon: UserGroupIcon,
          change: `de ${adminStats?.activeEmployees || 0} contratados`,
          changeType: (adminStats?.workingNow || 0) > 0 ? 'positive' : 'neutral',
        },
        {
          name: 'Fichajes hoy',
          value: adminStats?.todayUniqueClockIns?.toString() || '0',
          icon: ClockIcon,
          change: `${adminStats?.attendancePercentage || 0}% asistencia`,
          changeType: (adminStats?.attendancePercentage || 0) >= 80 ? 'positive' : 'negative',
        },
        {
          name: 'Incidencias',
          value: adminStats?.pendingIncidents?.toString() || '0',
          icon: ExclamationTriangleIcon,
          change: 'pendientes',
          changeType: (adminStats?.pendingIncidents || 0) > 0 ? 'negative' : 'positive',
        },
      ]
    : [
        {
          name: 'Horas esta semana',
          value: `${userStats?.hoursThisWeek?.toFixed(1) || '0'}h`,
          icon: ClockIcon,
          change: `${userStats?.daysWorkedThisWeek || 0} días trabajados`,
          changeType: 'neutral',
        },
        {
          name: 'Días trabajados',
          value: userStats?.daysWorkedThisMonth?.toString() || '0',
          icon: CalendarDaysIcon,
          change: 'este mes',
          changeType: 'neutral',
        },
        {
          name: 'Media diaria',
          value: `${userStats?.averageDailyHours?.toFixed(1) || '0'}h`,
          icon: ChartBarIcon,
          change: 'por día completado',
          changeType: 'neutral',
        },
      ];

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {stats.map((stat) => (
        <div key={stat.name} className="card">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              stat.changeType === 'negative' ? 'bg-danger-100' : 'bg-primary-100'
            }`}>
              <stat.icon className={`h-6 w-6 ${
                stat.changeType === 'negative' ? 'text-danger-600' : 'text-primary-600'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
          <div className="mt-4">
            <span
              className={`inline-flex items-center text-sm ${
                stat.changeType === 'positive'
                  ? 'text-success-600'
                  : stat.changeType === 'negative'
                  ? 'text-danger-500'
                  : 'text-gray-500'
              }`}
            >
              {stat.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
