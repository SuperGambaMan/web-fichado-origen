import axios from 'axios';
import { signOut } from 'next-auth/react';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple signOut calls
let isSigningOut = false;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is passed manually in each request
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If backend returns 401, the token is invalid - force logout
    if (error.response?.status === 401 && !isSigningOut) {
      isSigningOut = true;
      console.warn('Token invalid, forcing logout');

      // Only run on client side
      if (typeof window !== 'undefined') {
        await signOut({ callbackUrl: '/login', redirect: true });
      }

      isSigningOut = false;
    }
    return Promise.reject(error);
  }
);

export default api;
