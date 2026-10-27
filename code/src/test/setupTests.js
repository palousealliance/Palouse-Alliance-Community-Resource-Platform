// Use jest-dom matchers with Vitest
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Stub window.scrollTo for jsdom environments
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}

// Provide a lightweight global mock for the Supabase client used across components
vi.mock('../lib/supabase', () => {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'member@palouse.org' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'uid-1' }, access_token: 'test-access-token' } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    from: (table) => {
      // Return chainable query helpers used in the app tests
      if (table === 'organizations') {
        return {
          select: () => ({ order: async () => ({ data: [{ id: 'org-1', name: 'Org 1' }], error: null }) }),
        };
      }

      if (table === 'users') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'member' }, error: null }) }) }),
        };
      }

      if (table === 'events') {
        return {
          select: () => ({ order: async () => ({ data: [], error: null }) }),
        };
      }

      return {
        select: () => ({ order: async () => ({ data: [], error: null }) }),
      };
    },
  };

  return { supabase };
});

afterEach(() => {
  cleanup();
});
