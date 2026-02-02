'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { ClockIcon, ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const manualEntrySchema = z.object({
  type: z.enum(['clock_in', 'clock_out']),
  timestamp: z.string().min(1, 'La fecha y hora son requeridas'),
  notes: z.string().optional(),
});

type ManualEntryFormData = z.infer<typeof manualEntrySchema>;

interface TimeEntry {
  id: string;
  type: 'clock_in' | 'clock_out';
  timestamp: string;
  notes?: string;
  isManual: boolean;
}

export default function TimeEntriesPage() {
  const { data: session } = useSession();
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [totalHoursToday, setTotalHoursToday] = useState(0);

  const isAdmin = session?.user?.role === 'admin';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualEntryFormData>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      type: 'clock_in',
    },
  });

  const fetchTodayEntries = async () => {
    if (!session?.accessToken) return;

    try {
      setIsLoading(true);
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const response = await api.get('/time-entries/my-entries', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: { startDate: startOfDay, endDate: endOfDay },
      });

      setTodayEntries(response.data.entries || []);

      // Fetch status for total hours
      const statusResponse = await api.get('/time-entries/status', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      setTotalHoursToday(statusResponse.data.totalHoursToday || 0);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Error al cargar los fichajes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayEntries();
  }, [session?.accessToken]);

  const onSubmit = async (data: ManualEntryFormData) => {
    if (!session?.accessToken) return;

    setIsSubmitting(true);
    try {
      const endpoint = data.type === 'clock_in' ? '/time-entries/clock-in' : '/time-entries/clock-out';

      await api.post(
        endpoint,
        {
          timestamp: new Date(data.timestamp).toISOString(),
          notes: data.notes || undefined,
        },
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }
      );

      toast.success(data.type === 'clock_in' ? 'Entrada registrada' : 'Salida registrada');
      reset();
      fetchTodayEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrar fichaje');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm', { locale: es });
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Sort entries by timestamp
  const sortedEntries = [...todayEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const handleDelete = async (entryId: string) => {
    if (!session?.accessToken) return;
    if (!confirm('¿Estás seguro de que quieres eliminar este fichaje?')) return;

    setDeletingId(entryId);
    try {
      await api.delete(`/time-entries/${entryId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      toast.success('Fichaje eliminado');
      fetchTodayEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar fichaje');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fichajes</h1>
        <p className="text-gray-600">Gestiona tus registros de entrada y salida</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario de fichaje manual */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Registrar Fichaje Manual
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo
              </label>
              <select {...register('type')} className="input mt-1">
                <option value="clock_in">Entrada</option>
                <option value="clock_out">Salida</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fecha y Hora
              </label>
              <input
                type="datetime-local"
                {...register('timestamp')}
                className="input mt-1"
              />
              {errors.timestamp && (
                <p className="mt-1 text-sm text-danger-500">{errors.timestamp.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notas (opcional)
              </label>
              <textarea
                {...register('notes')}
                className="input mt-1"
                rows={3}
                placeholder="Añade una nota si es necesario..."
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Fichaje'}
            </button>
          </form>
        </div>

        {/* Fichajes de hoy */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Fichajes de Hoy
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-lg bg-gray-100 p-3 h-16" />
              ))}
            </div>
          ) : sortedEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay fichajes registrados hoy
            </p>
          ) : (
            <div className="space-y-3">
              {sortedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    entry.type === 'clock_in' ? 'bg-success-50' : 'bg-primary-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {entry.type === 'clock_in' ? (
                      <ArrowRightOnRectangleIcon className="h-5 w-5 text-success-600" />
                    ) : (
                      <ArrowLeftOnRectangleIcon className="h-5 w-5 text-primary-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {entry.type === 'clock_in' ? 'Entrada' : 'Salida'}
                        {entry.isManual && (
                          <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded">
                            Manual
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">{formatTime(entry.timestamp)}</p>
                      {entry.notes && (
                        <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={entry.type === 'clock_in' ? 'text-success-600' : 'text-primary-600'}>
                      ✓
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-1 rounded hover:bg-danger-100 text-danger-500 hover:text-danger-700 transition-colors"
                        title="Eliminar fichaje"
                      >
                        {deletingId === entry.id ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4zm16 0a8 8 0 01-8 8v-4a4 4 0 004-4h4z"></path>
                          </svg>
                        ) : (
                          <XMarkIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tiempo trabajado hoy</span>
              <span className="text-lg font-bold text-gray-900">
                {formatHours(totalHoursToday)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
