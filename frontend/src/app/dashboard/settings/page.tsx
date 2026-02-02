import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function SettingsPage() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Ajustes generales del sistema</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Configuración General
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la Empresa
              </label>
              <input
                type="text"
                className="input mt-1"
                defaultValue="Mi Empresa S.L."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Zona Horaria
              </label>
              <select className="input mt-1">
                <option value="Europe/Madrid">Europe/Madrid (CET)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Formato de Hora
              </label>
              <select className="input mt-1">
                <option value="24h">24 horas</option>
                <option value="12h">12 horas (AM/PM)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Horario Laboral
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hora de Entrada
                </label>
                <input type="time" className="input mt-1" defaultValue="09:00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hora de Salida
                </label>
                <input type="time" className="input mt-1" defaultValue="18:00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tolerancia (minutos)
              </label>
              <input
                type="number"
                className="input mt-1"
                defaultValue="15"
                min="0"
                max="60"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireLocation"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                defaultChecked
              />
              <label htmlFor="requireLocation" className="text-sm text-gray-700">
                Requerir ubicación al fichar
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Notificaciones
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                Notificar fichajes tardíos
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                defaultChecked
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                Resumen diario por email
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                Alertas de incidencias
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                defaultChecked
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Seguridad
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tiempo de sesión (minutos)
              </label>
              <input
                type="number"
                className="input mt-1"
                defaultValue="60"
                min="15"
                max="480"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Intentos máximos de login
              </label>
              <input
                type="number"
                className="input mt-1"
                defaultValue="5"
                min="3"
                max="10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="btn btn-secondary">Cancelar</button>
        <button className="btn btn-primary">Guardar Cambios</button>
      </div>
    </div>
  );
}
