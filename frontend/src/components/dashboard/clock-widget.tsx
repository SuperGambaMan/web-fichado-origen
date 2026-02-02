'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { PlayIcon, StopIcon } from '@heroicons/react/24/solid';
import { api } from '@/lib/api';

export function ClockWidget() {
  const { data: session } = useSession();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [todayHours, setTodayHours] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.accessToken) {
      fetchStatus();
    }
  }, [session]);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/time-entries/status', {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      setIsClockedIn(response.data.isClockedIn);
      setTodayHours(response.data.totalHoursToday);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleClock = async () => {
    setIsLoading(true);

    try {
      const endpoint = isClockedIn ? '/time-entries/clock-out' : '/time-entries/clock-in';
      await api.post(
        endpoint,
        { type: isClockedIn ? 'clock_out' : 'clock_in' },
        { headers: { Authorization: `Bearer ${session?.accessToken}` } }
      );

      setIsClockedIn(!isClockedIn);
      toast.success(isClockedIn ? '¡Salida registrada!' : '¡Entrada registrada!');
      fetchStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card flex flex-col items-center justify-center py-8">
      <div className="mb-6 text-center">
        <p className="text-5xl font-bold tabular-nums text-gray-900">
          {currentTime.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Horas hoy: <span className="font-semibold">{todayHours.toFixed(2)}h</span>
        </p>
      </div>

      <button
        onClick={handleClock}
        disabled={isLoading}
        className={`btn btn-lg flex items-center gap-3 ${
          isClockedIn ? 'btn-danger' : 'btn-success'
        }`}
      >
        {isLoading ? (
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : isClockedIn ? (
          <StopIcon className="h-5 w-5" />
        ) : (
          <PlayIcon className="h-5 w-5" />
        )}
        {isClockedIn ? 'Registrar Salida' : 'Registrar Entrada'}
      </button>

      <p className="mt-4 text-sm text-gray-500">
        Estado:{' '}
        <span
          className={`font-medium ${
            isClockedIn ? 'text-success-600' : 'text-gray-600'
          }`}
        >
          {isClockedIn ? 'Trabajando' : 'Fuera'}
        </span>
      </p>
    </div>
  );
}
