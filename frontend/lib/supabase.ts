/**
 * FinPulse AI V4.0 - Supabase Authentication & Client Helper
 * Lightweight pure fetch implementation compatible with Next.js App Router
 * without requiring heavy external dependencies.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface AuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    user_metadata?: Record<string, any>;
  };
}

const STORAGE_KEY = 'finpulse_auth_session';

export const authClient = {
  isConfigured(): boolean {
    return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  },

  getSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveSession(session: AuthSession): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  },

  getToken(): string | null {
    const session = this.getSession();
    return session ? session.access_token : null;
  },

  async signUp(email: string, password: string, fullName?: string): Promise<{ data: any; error: string | null }> {
    if (!this.isConfigured()) {
      return { data: null, error: 'Supabase credentials are not configured in environment.' };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          data: { full_name: fullName || email },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { data: null, error: data.error_description || data.msg || 'Signup failed' };
      }

      if (data.access_token) {
        this.saveSession(data);
      }
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network error during signup' };
    }
  },

  async signIn(email: string, password: string): Promise<{ data: AuthSession | null; error: string | null }> {
    if (!this.isConfigured()) {
      return { data: null, error: 'Supabase credentials are not configured in environment.' };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { data: null, error: data.error_description || data.msg || 'Invalid credentials' };
      }

      this.saveSession(data);
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network error during login' };
    }
  },

  async signOut(): Promise<void> {
    const token = this.getToken();
    if (token && this.isConfigured()) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    this.clearSession();
  },

  async resetPasswordForEmail(email: string): Promise<{ data: any; error: string | null }> {
    if (!this.isConfigured()) {
      return { data: null, error: 'Supabase credentials are not configured in environment.' };
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { data: null, error: data.error_description || data.msg || 'Password recovery request failed' };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Network error during password recovery' };
    }
  },
};
