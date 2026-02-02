'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { api } from '@/lib/api';

interface SessionValidatorProps {
  children: React.ReactNode;
}

export function SessionValidator({ children }: SessionValidatorProps) {
  const { data: session, status } = useSession();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      // If not authenticated, no need to validate
      if (status === 'unauthenticated') {
        setIsValidating(false);
        setIsValid(false);
        return;
      }

      // If still loading, wait
      if (status === 'loading') {
        return;
      }

      // If authenticated, validate the token against the backend
      if (status === 'authenticated' && session?.accessToken) {
        try {
          await api.post('/auth/validate-session', {}, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          });
          setIsValid(true);
        } catch (error: any) {
          console.error('Session validation failed:', error);
          // Token is invalid, force logout
          if (error.response?.status === 401) {
            await signOut({ callbackUrl: '/login', redirect: true });
            return;
          }
          setIsValid(false);
        }
      } else if (status === 'authenticated' && !session?.accessToken) {
        // Session exists but no token, invalid
        await signOut({ callbackUrl: '/login', redirect: true });
        return;
      }

      setIsValidating(false);
    };

    validateSession();
  }, [session, status]);

  // Show loading while validating
  if (isValidating || status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          <p className="text-gray-600">Validando sesión...</p>
        </div>
      </div>
    );
  }

  // If not valid and not validating, don't render (redirect should happen)
  if (!isValid && status === 'authenticated') {
    return null;
  }

  return <>{children}</>;
}
