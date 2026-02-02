export default function TimeEntriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fichajes</h1>
        <p className="text-gray-600">Gestiona tus registros de entrada y salida</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Registrar Fichaje Manual
          </h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo
              </label>
              <select className="input mt-1">
                <option value="clock_in">Entrada</option>
                <option value="clock_out">Salida</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fecha y Hora
              </label>
              <input type="datetime-local" className="input mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notas (opcional)
              </label>
              <textarea
                className="input mt-1"
                rows={3}
                placeholder="Añade una nota si es necesario..."
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Registrar Fichaje
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Fichajes de Hoy
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-success-50 p-3">
              <div>
                <p className="font-medium text-gray-900">Entrada</p>
                <p className="text-sm text-gray-600">09:00</p>
              </div>
              <span className="text-success-600">✓</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div>
                <p className="font-medium text-gray-900">Salida</p>
                <p className="text-sm text-gray-600">Pendiente</p>
              </div>
              <span className="text-gray-400">—</span>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tiempo trabajado hoy</span>
              <span className="text-lg font-bold text-gray-900">4h 32m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
