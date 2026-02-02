import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function UsersPage() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra empleados y estudiantes en prácticas</p>
        </div>
        <button className="btn btn-primary">+ Nuevo Usuario</button>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <input
            type="search"
            placeholder="Buscar usuarios..."
            className="input max-w-xs"
          />
          <select className="input max-w-[150px]">
            <option value="">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="employee">Empleado</option>
            <option value="intern">Estudiante</option>
          </select>
          <select className="input max-w-[150px]">
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="pb-3 font-medium">Usuario</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Rol</th>
                <th className="pb-3 font-medium">Departamento</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="text-sm">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                      <span className="text-xs font-medium text-primary-600">JG</span>
                    </div>
                    <span className="font-medium text-gray-900">Juan García</span>
                  </div>
                </td>
                <td className="py-3 text-gray-600">juan.garcia@empresa.com</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                    Empleado
                  </span>
                </td>
                <td className="py-3 text-gray-600">IT</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600">
                    Activo
                  </span>
                </td>
                <td className="py-3">
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    Editar
                  </button>
                </td>
              </tr>
              <tr className="text-sm">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                      <span className="text-xs font-medium text-primary-600">ML</span>
                    </div>
                    <span className="font-medium text-gray-900">María López</span>
                  </div>
                </td>
                <td className="py-3 text-gray-600">maria.lopez@empresa.com</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                    Admin
                  </span>
                </td>
                <td className="py-3 text-gray-600">RRHH</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-1 text-xs font-medium text-success-600">
                    Activo
                  </span>
                </td>
                <td className="py-3">
                  <button className="text-sm text-primary-600 hover:text-primary-700">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
