import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SessionValidator } from '@/components/auth/session-validator';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect if no session, no user, no accessToken, or session has error
  if (
    !session ||
    !session.user ||
    !session.accessToken ||
    (session as any).error === 'TokenInvalid'
  ) {
    redirect('/login');
  }

  return (
    <SessionValidator>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar user={session.user} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header user={session.user} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SessionValidator>
  );
}
