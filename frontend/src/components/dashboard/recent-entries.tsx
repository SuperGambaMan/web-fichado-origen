'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { api } from '@/lib/api';

interface TimeEntry {
  id: string;
  userId: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  type: 'clock_in' | 'clock_out';
  timestamp: string;
  status: 'pending' | 'approved' | 'modified';
}

interface RecentEntriesProps {
  isAdmin: boolean;
}

// Event system for refreshing entries
export const entriesEvents = {
  listeners: [] as Array<() => void>,
  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  emit() {
    this.listeners.forEach(callback => callback());
  },
};

export function RecentEntries({ isAdmin }: RecentEntriesProps) {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setIsLoading(true);
      // Usamos siempre my-entries para usuarios normales
      // Para admin, intentamos el endpoint de todos los entries
      let endpoint = '/time-entries/my-entries';

      if (isAdmin) {
        try {
          const adminResponse = await api.get('/time-entries', {
            headers: { Authorization: `Bearer ${session.accessToken}` },
            params: { limit: 10 },
          });
          setEntries(adminResponse.data.entries || []);
          return;
        } catch (adminError) {
          // Si falla el endpoint de admin, usamos my-entries
          console.warn('Admin endpoint failed, using my-entries');
        }
      }

      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: { limit: 10 },
      });
      setEntries(response.data.entries || []);
    } catch (error: any) {
      console.error('Error fetching entries:', error);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, isAdmin]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Subscribe to clock events
  useEffect(() => {
    const unsubscribe = entriesEvents.subscribe(() => {
      fetchEntries();
    });
    return unsubscribe;
  }, [fetchEntries]);

  const getUserName = (entry: TimeEntry) => {
    if (entry.user) {
      return `${entry.user.firstName} ${entry.user.lastName}`;
    }
    return 'Usuario';
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {isAdmin ? 'Fichajes recientes' : 'Mis fichajes recientes'}
          </h2>
          <button
            onClick={fetchEntries}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Actualizar"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <Link
          href="/dashboard/history"
          className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Ver todos
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        {isLoading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay fichajes registrados
          </div>
        ) : (
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
              {entries.map((entry) => (
                <tr key={entry.id} className="text-sm">
                  {isAdmin && (
                    <td className="py-3 font-medium text-gray-900">
                      {getUserName(entry)}
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
        )}
      </div>
    </div>
  );
}
