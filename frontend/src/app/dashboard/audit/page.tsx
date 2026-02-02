import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function AuditPage() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
        <p className="text-gray-600">Registro completo de todas las acciones del sistema</p>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <input
            type="search"
            placeholder="Buscar en logs..."
            className="input max-w-xs"
          />
          <select className="input max-w-[150px]">
            <option value="">Todas las acciones</option>
            <option value="create">Crear</option>
            <option value="update">Actualizar</option>
            <option value="delete">Eliminar</option>
            <option value="login">Login</option>
            <option value="clock_in">Entrada</option>
            <option value="clock_out">Salida</option>
          </select>
          <select className="input max-w-[150px]">
            <option value="">Todas las entidades</option>
            <option value="user">Usuario</option>
            <option value="time_entry">Fichaje</option>
            <option value="session">Sesión</option>
          </select>
          <div>
            <input type="date" className="input" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="pb-3 font-medium">Fecha/Hora</th>
                <th className="pb-3 font-medium">Usuario</th>
                <th className="pb-3 font-medium">Acción</th>
                <th className="pb-3 font-medium">Entidad</th>
                <th className="pb-3 font-medium">Descripción</th>
                <th className="pb-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="text-sm">
                <td className="py-3 text-gray-600">15/01/2024 09:00:15</td>
                <td className="py-3 font-medium text-gray-900">Juan García</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600">
                    clock_in
                  </span>
                </td>
                <td className="py-3 text-gray-600">time_entry</td>
                <td className="py-3 text-gray-600">User clocked in</td>
                <td className="py-3 text-gray-500">192.168.1.100</td>
              </tr>
              <tr className="text-sm">
                <td className="py-3 text-gray-600">15/01/2024 08:55:32</td>
                <td className="py-3 font-medium text-gray-900">María López</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                    login
                  </span>
                </td>
                <td className="py-3 text-gray-600">session</td>
                <td className="py-3 text-gray-600">User logged in</td>
                <td className="py-3 text-gray-500">192.168.1.105</td>
              </tr>
              <tr className="text-sm">
                <td className="py-3 text-gray-600">14/01/2024 18:05:00</td>
                <td className="py-3 font-medium text-gray-900">Admin</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                    update
                  </span>
                </td>
                <td className="py-3 text-gray-600">time_entry</td>
                <td className="py-3 text-gray-600">Time entry modified by admin</td>
                <td className="py-3 text-gray-500">192.168.1.1</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">Mostrando 1-10 de 156 registros</p>
          <div className="flex gap-2">
            <button className="btn btn-secondary" disabled>Anterior</button>
            <button className="btn btn-secondary">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
