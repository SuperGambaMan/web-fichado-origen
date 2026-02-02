'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface TimeEntryPair {
  clockIn: {
    id: string;
    timestamp: string;
    isManual: boolean;
    status: string;
  };
  clockOut: {
    id: string;
    timestamp: string;
    isManual: boolean;
    status: string;
  } | null;
  durationMinutes: number;
}

interface DailySummary {
  date: string;
  pairs: TimeEntryPair[];
  totalMinutes: number;
  totalHours: number;
  isComplete: boolean;
  hasModifications: boolean;
}

interface HistoryResponse {
  dailySummaries: DailySummary[];
  totalDays: number;
  totalHours: number;
  averageHoursPerDay: number;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return format(startOfMonth(now), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return format(endOfMonth(now), 'yyyy-MM-dd');
  });

  const fetchHistory = async () => {
    if (!session?.accessToken) return;

    try {
      setIsLoading(true);
      const response = await api.get('/time-entries/my-history', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        params: {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate + 'T23:59:59').toISOString(),
        },
      });

      setHistoryData(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Error al cargar el historial');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [session?.accessToken, startDate, endDate]);

  const formatTime = (timestamp: string | undefined) => {
    if (!timestamp) return '-';
    return format(parseISO(timestamp), 'HH:mm', { locale: es });
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'EEEE, d MMM yyyy', { locale: es });
  };

  const formatHours = (hours: number) => {
    if (hours <= 0) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatMinutes = (minutes: number) => {
    if (minutes <= 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (summary: DailySummary) => {
    if (summary.hasModifications) {
      return (
        <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
          Modificado
        </span>
      );
    }
    if (summary.isComplete) {
      return (
        <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-1 text-xs font-medium text-success-700">
          Completado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-warning-100 px-2 py-1 text-xs font-medium text-warning-700">
        Incompleto
      </span>
    );
  };

  const handleFilter = () => {
    fetchHistory();
  };

  const handleExport = () => {
    if (!historyData) return;

    // Generate CSV with all sessions
    const rows: string[][] = [['Fecha', 'Entrada', 'Salida', 'Duración', 'Estado']];

    historyData.dailySummaries.forEach((day) => {
      day.pairs.forEach((pair, index) => {
        rows.push([
          index === 0 ? format(parseISO(day.date), 'dd/MM/yyyy') : '',
          formatTime(pair.clockIn.timestamp),
          pair.clockOut ? formatTime(pair.clockOut.timestamp) : '-',
          formatMinutes(pair.durationMinutes),
          index === 0 ? (day.isComplete ? 'Completado' : 'Incompleto') : '',
        ]);
      });
      // Add total row for the day
      if (day.pairs.length > 1) {
        rows.push(['', '', 'TOTAL DÍA:', formatHours(day.totalHours), '']);
      }
    });

    // Add summary
    rows.push([]);
    rows.push(['RESUMEN']);
    rows.push(['Total días:', historyData.totalDays.toString()]);
    rows.push(['Total horas:', formatHours(historyData.totalHours)]);
    rows.push(['Media diaria:', formatHours(historyData.averageHoursPerDay)]);

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historial_fichajes_${startDate}_${endDate}.csv`;
    link.click();
    toast.success('Historial exportado');
  };

  const dailySummaries = historyData?.dailySummaries || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Fichajes</h1>
          <p className="text-gray-600">Consulta todos tus registros de entrada y salida</p>
        </div>
        <button
          onClick={handleExport}
          disabled={dailySummaries.length === 0}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input mt-1"
            />
          </div>
          <button
            onClick={handleFilter}
            disabled={isLoading}
            className="btn btn-primary flex items-center gap-2"
          >
            {isLoading ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-4 w-4" />
            )}
            Filtrar
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse h-12 bg-gray-100 rounded" />
            ))}
          </div>
        ) : dailySummaries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay fichajes en el período seleccionado</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Fecha</th>
                    <th className="pb-3 font-medium">Sesiones</th>
                    <th className="pb-3 font-medium">Total Horas</th>
                    <th className="pb-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailySummaries.map((summary) => (
                    <tr key={summary.date} className="text-sm hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">
                        <p className="capitalize">{formatDate(summary.date)}</p>
                      </td>
                      <td className="py-3 text-gray-600">
                        <div className="space-y-1">
                          {summary.pairs.map((pair, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <span className="text-success-600 font-medium">
                                {formatTime(pair.clockIn.timestamp)}
                              </span>
                              {pair.clockIn.isManual && (
                                <span className="bg-gray-200 px-1 rounded text-[10px]">M</span>
                              )}
                              <span className="text-gray-400">→</span>
                              <span className="text-primary-600 font-medium">
                                {pair.clockOut ? formatTime(pair.clockOut.timestamp) : 'En curso'}
                              </span>
                              {pair.clockOut?.isManual && (
                                <span className="bg-gray-200 px-1 rounded text-[10px]">M</span>
                              )}
                              <span className="text-gray-400">
                                ({formatMinutes(pair.durationMinutes)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-gray-900 font-semibold">
                        {formatHours(summary.totalHours)}
                      </td>
                      <td className="py-3">{getStatusBadge(summary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Total días:</span>{' '}
                  <span className="font-semibold">{historyData?.totalDays || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total horas:</span>{' '}
                  <span className="font-semibold">
                    {formatHours(historyData?.totalHours || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Media diaria:</span>{' '}
                  <span className="font-semibold">
                    {formatHours(historyData?.averageHoursPerDay || 0)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
