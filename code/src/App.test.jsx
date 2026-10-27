import { render, screen, waitFor } from '@testing-library/react';
import { ADMIN_ROLE_CACHE_KEY, writeSessionCache } from './lib/sessionCache';

const {
  mockGetSession,
  mockOnAuthStateChange,
  mockGetUser,
  mockSignOut,
  mockFrom,
} = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const eventsOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const eventsEq = vi.fn(() => ({ order: eventsOrder }));
  const eventsSelect = vi.fn(() => ({ eq: eventsEq }));

  const categoriesOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const categoriesSelect = vi.fn(() => ({ order: categoriesOrder }));

  const from = vi.fn((table) => {
    if (table === 'events') {
      return { select: eventsSelect };
    }

    if (table === 'categories') {
      return { select: categoriesSelect };
    }

    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { role: window.__mockUserRole || 'member' }, error: null }),
          }),
        }),
      };
    }

    return { select: vi.fn() };
  });

  return {
    mockUnsubscribe: unsubscribe,
    mockGetSession: vi.fn(),
    mockOnAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe } },
    })),
    mockGetUser: vi.fn(),
    mockSignOut: vi.fn(),
    mockFrom: from,
  };
});

vi.mock('./lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  },
  getEventFlyerUrl: (flyerPath) => (flyerPath ? `https://example.com/${flyerPath}` : null),
  getHistoryPdfUrl: () => '/palouse-alliance-history.pdf',
  fetchCurrentHistoryPdf: vi.fn().mockResolvedValue({ url: '/palouse-alliance-history.pdf', fileName: null }),
  replaceHistoryPdf: vi.fn(),
}));

import App from './App';

describe('App routing and auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.__mockUserRole = 'member';
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'member@palouse.org' } },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('shows landing page on root route', async () => {
    window.history.pushState({}, '', '/');
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Building a Healthier/i)).toBeInTheDocument();
      expect(screen.getByText(/Your central interagency consortium/i)).toBeInTheDocument();
    });
  });

  it('shows the same landing page for logged-in users', async () => {
    window.history.pushState({}, '', '/');
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: '123', email: 'member@palouse.org' } } },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Building a Healthier/i)).toBeInTheDocument();
    });
  });

  it('keeps admin users on the admin dashboard after refresh', async () => {
    window.history.pushState({}, '', '/admin');
    window.__mockUserRole = 'admin';
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: '123', email: 'admin@palouse.org' } } },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
    });
  });

  it('renders admin dashboard immediately without loading flash when admin role is cached', async () => {
    window.history.pushState({}, '', '/admin');
    window.__mockUserRole = 'admin';
    writeSessionCache(ADMIN_ROLE_CACHE_KEY, { userId: '123', isAdmin: true });

    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: '123', email: 'admin@palouse.org' } } },
    });

    render(<App />);

    // Because admin role is cached, the Admin Dashboard heading is rendered immediately
    expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
    expect(screen.queryByText(/Loading Admin Dashboard/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });
  });

  it('redirects non-admin users away from the admin dashboard', async () => {
    window.history.pushState({}, '', '/admin');
    window.__mockUserRole = 'member';
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: '123', email: 'member@palouse.org' } } },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Admin Dashboard' })).not.toBeInTheDocument();
      expect(screen.getByText(/Building a Healthier/i)).toBeInTheDocument();
    });
  });
});
