import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

const API_URL = process.env.AUTH_BACKEND_URL || 'http://localhost:3001';

// Helper to validate token against backend
async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/validate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store', // Never cache validation requests
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            cache: 'no-store',
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          return {
            id: data.user.id,
            email: data.user.email,
            name: `${data.user.firstName} ${data.user.lastName}`,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in - mark as validated
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.lastValidated = Date.now();
        token.isValid = true;
        return token;
      }

      // If token was already marked as invalid, keep it invalid
      if (token.isValid === false) {
        return { ...token, accessToken: null, error: 'TokenInvalid' };
      }

      // Validate token on EVERY request if more than 30 seconds since last validation
      const thirtySeconds = 30 * 1000;
      const lastValidated = (token.lastValidated as number) || 0;
      const timeSinceValidation = Date.now() - lastValidated;

      if (token.accessToken && timeSinceValidation > thirtySeconds) {
        const isValid = await validateToken(token.accessToken as string);
        if (!isValid) {
          // Token is invalid, mark it permanently
          token.isValid = false;
          token.accessToken = null;
          token.error = 'TokenInvalid';
          return token;
        }
        token.lastValidated = Date.now();
        token.isValid = true;
      }

      return token;
    },
    async session({ session, token }) {
      // If token is invalid, return session with error to trigger logout
      if (token.isValid === false || token.error === 'TokenInvalid' || !token.accessToken) {
        return {
          ...session,
          user: undefined,
          accessToken: undefined,
          error: 'TokenInvalid'
        } as any;
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
