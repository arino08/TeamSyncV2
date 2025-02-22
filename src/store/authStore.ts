import { create } from 'zustand';
import axios from 'axios';

interface AuthState {
  user: User | null;
  loading: boolean;
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'manager' | 'member';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initAuth: async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Full response from /me:', response.data);
        const userData = response.data.user;

        // Remove the role check/default assignment
        if (!userData) {
          throw new Error('No user data received');
        }

        console.log('Setting user state with:', userData);
        set({ user: userData });
      }
    } catch (error) {
      console.error('InitAuth error:', error);
      localStorage.removeItem('auth_token');
      set({ user: null });
    }
  },
  signIn: async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    console.log('Sign in complete response:', response.data); // Add full response logging
    const userData = response.data.user;
    if (!userData.role) {
      console.warn('No role found in sign in response:', userData);
    }
    localStorage.setItem('auth_token', response.data.token);
    set({ user: userData });
  },
  signUp: async (email, password, name) => {
    try {
      console.log('Starting registration process...', { email, name });

      const response = await axios.post('/api/auth/register',
        { email, password, name },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
          validateStatus: null // Don't throw on any status
        }
      );

      console.log('Registration response:', {
        status: response?.status,
        data: response?.data,
        headers: response?.headers
      });

      if (!response || response.status === 404) {
        throw new Error('Server not responding');
      }

      if (response.status !== 201) {
        throw new Error(response.data?.error || 'Registration failed');
      }

      localStorage.setItem('auth_token', response.data.token);
      set({ user: response.data.user });
    } catch (error: unknown) {
      console.error('Registration error details:', {
        error,
        isAxiosError: axios.isAxiosError(error),
        response: axios.isAxiosError(error) ? error.response : undefined,
        message: error instanceof Error ? error.message : String(error)
      });

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Connection timeout - server not responding');
        }
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  },
  signOut: () => {
    localStorage.removeItem('auth_token');
    set({ user: null });
  }
}));
