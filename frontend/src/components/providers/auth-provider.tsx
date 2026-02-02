'use client';

import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface AuthProviderProps {
  children: React.ReactNode;
}

function SessionValidator({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    // Check if session has error or missing accessToken
    const hasError = (session as any)?.error === 'TokenInvalid';
    const noToken = status === 'authenticated' && session && !session.accessToken;

    if (hasError || noToken) {
      // Clear invalid session and redirect to login
      signOut({ callbackUrl: '/login', redirect: true });
    }
  }, [session, status]);

  // Don't render protected content if session is invalid
  const isProtectedRoute = pathname?.startsWith('/dashboard');
  const isInvalidSession = (session as any)?.error === 'TokenInvalid' ||
                           (status === 'authenticated' && !session?.accessToken);

  if (isProtectedRoute && isInvalidSession) {
    return null; // Don't render until redirect happens
  }

  return <>{children}</>;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider
      refetchInterval={60} // Refetch session every minute to detect invalid tokens
      refetchOnWindowFocus={true}
    >
      <SessionValidator>
        {children}
      </SessionValidator>
    </SessionProvider>
  );
}
