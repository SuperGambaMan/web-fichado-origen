'use client';

import { signOut } from 'next-auth/react';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BellIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  user: {
    name: string;
    role: string;
  };
}

export function Header({ user }: HeaderProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <button className="rounded-lg p-2 hover:bg-gray-100 lg:hidden">
          <Bars3Icon className="h-5 w-5 text-gray-600" />
        </button>
        <div className="hidden lg:block">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700">
            {user.role === 'admin'
              ? 'Administrador'
              : user.role === 'employee'
              ? 'Empleado'
              : 'Estudiante'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 hover:bg-gray-100">
          <BellIcon className="h-5 w-5 text-gray-600" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger-500" />
        </button>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
