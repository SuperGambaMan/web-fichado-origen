import { auth } from '@/lib/auth';
import { ClockWidget } from '@/components/dashboard/clock-widget';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentEntries } from '@/components/dashboard/recent-entries';

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Hola, {session?.user?.name}!
        </h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ClockWidget />
        </div>
        <div className="lg:col-span-2">
          <StatsCards isAdmin={isAdmin} />
        </div>
      </div>

      <RecentEntries isAdmin={isAdmin} />
    </div>
  );
}
