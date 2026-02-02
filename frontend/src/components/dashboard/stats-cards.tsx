'use client';

import {
  ClockIcon,
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface StatsCardsProps {
  isAdmin: boolean;
}

const employeeStats = [
  {
    name: 'Horas esta semana',
    value: '32.5h',
    icon: ClockIcon,
    change: '+2.5h',
    changeType: 'positive',
  },
  {
    name: 'Días trabajados',
    value: '4',
    icon: CalendarDaysIcon,
    change: 'este mes: 18',
    changeType: 'neutral',
  },
  {
    name: 'Media diaria',
    value: '8.1h',
    icon: ChartBarIcon,
    change: '+0.3h vs media',
    changeType: 'positive',
  },
];

const adminStats = [
  {
    name: 'Empleados activos',
    value: '24',
    icon: UsersIcon,
    change: '+2 este mes',
    changeType: 'positive',
  },
  {
    name: 'Fichajes hoy',
    value: '48',
    icon: ClockIcon,
    change: '92% asistencia',
    changeType: 'positive',
  },
  {
    name: 'Incidencias',
    value: '3',
    icon: CalendarDaysIcon,
    change: 'pendientes',
    changeType: 'negative',
  },
];

export function StatsCards({ isAdmin }: StatsCardsProps) {
  const stats = isAdmin ? adminStats : employeeStats;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.name} className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
              <stat.icon className="h-6 w-6 text-primary-600" />
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
