'use client';

import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface RecentEntriesProps {
  isAdmin: boolean;
}

// Mock data - in real app this would come from API
const mockEntries = [
  {
    id: '1',
    user: 'Juan García',
    type: 'clock_in',
    timestamp: '2024-01-15T09:00:00',
    status: 'approved',
  },
  {
    id: '2',
    user: 'María López',
    type: 'clock_in',
    timestamp: '2024-01-15T08:55:00',
    status: 'approved',
  },
  {
    id: '3',
    user: 'Pedro Martínez',
    type: 'clock_out',
    timestamp: '2024-01-14T18:05:00',
    status: 'approved',
  },
  {
    id: '4',
    user: 'Ana Fernández',
    type: 'clock_in',
    timestamp: '2024-01-14T08:30:00',
    status: 'modified',
  },
];

export function RecentEntries({ isAdmin }: RecentEntriesProps) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {isAdmin ? 'Fichajes recientes' : 'Mis fichajes recientes'}
        </h2>
        <Link
          href="/dashboard/history"
          className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Ver todos
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
              {isAdmin && <th className="pb-3 font-medium">Usuario</th>}
              <th className="pb-3 font-medium">Tipo</th>
              <th className="pb-3 font-medium">Fecha/Hora</th>
              <th className="pb-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockEntries.map((entry) => (
              <tr key={entry.id} className="text-sm">
                {isAdmin && (
                  <td className="py-3 font-medium text-gray-900">
                    {entry.user}
                  </td>
                )}
                <td className="py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      entry.type === 'clock_in'
                        ? 'bg-success-50 text-success-600'
                        : 'bg-danger-50 text-danger-500'
                    }`}
                  >
                    {entry.type === 'clock_in' ? 'Entrada' : 'Salida'}
                  </span>
                </td>
                <td className="py-3 text-gray-600">
                  {new Date(entry.timestamp).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      entry.status === 'approved'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {entry.status === 'approved' ? 'Aprobado' : 'Modificado'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
