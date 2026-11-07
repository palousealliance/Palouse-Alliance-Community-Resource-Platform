import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const { mockNavigate, mockSignOut } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: mockSignOut,
    },
    from: (table) => {
      if (table === 'users') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'member' }, error: null }) }) }),
        };
      }

      return {
        select: () => ({ order: async () => ({ data: [], error: null }) }),
      };
    },
  },
  getEventFlyerUrl: (flyerPath) => (flyerPath ? `https://example.com/${flyerPath}` : null),
}));

import Navbar from './Navbar';

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('shows login/register links when no session exists', () => {
    render(
      <MemoryRouter>
        <Navbar session={null} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Log In' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
  });

  it('shows logout when session exists and logs out', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navbar session={{ user: { id: '123' } }} isAdmin={false} />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log Out' }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows admin button for admin users', () => {
    render(
      <MemoryRouter>
        <Navbar session={{ user: { id: '123' } }} isAdmin={true} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Admin Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin Dashboard' })).toHaveAttribute('href', '/admin');
  });

  it('toggles mobile menu', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Navbar session={null} />
      </MemoryRouter>
    );

    const menuButton = screen.getByLabelText('Open navigation menu');
    await user.click(menuButton);

    expect(screen.getAllByLabelText('Close navigation menu').length).toBeGreaterThan(0);
  });
});
