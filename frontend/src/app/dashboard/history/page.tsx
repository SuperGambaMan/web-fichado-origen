export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Fichajes</h1>
        <p className="text-gray-600">Consulta todos tus registros de entrada y salida</p>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Desde</label>
            <input type="date" className="input mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hasta</label>
            <input type="date" className="input mt-1" />
          </div>
          <button className="btn btn-primary mt-6">Filtrar</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Entrada</th>
                <th className="pb-3 font-medium">Salida</th>
                <th className="pb-3 font-medium">Horas</th>
                <th className="pb-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="text-sm">
                <td className="py-3 font-medium text-gray-900">15/01/2024</td>
                <td className="py-3 text-gray-600">09:00</td>
                <td className="py-3 text-gray-600">18:00</td>
                <td className="py-3 text-gray-600">9h</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    Aprobado
                  </span>
                </td>
              </tr>
              <tr className="text-sm">
                <td className="py-3 font-medium text-gray-900">14/01/2024</td>
                <td className="py-3 text-gray-600">08:55</td>
                <td className="py-3 text-gray-600">17:30</td>
                <td className="py-3 text-gray-600">8.5h</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                    Aprobado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
