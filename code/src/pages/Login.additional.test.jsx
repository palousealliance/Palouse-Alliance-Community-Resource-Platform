import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSignInWithPassword, mockNavigate } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockNavigate: vi.fn(),
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
      signInWithPassword: mockSignInWithPassword,
    },
  },
  getEventFlyerUrl: (flyerPath) => (flyerPath ? `https://example.com/${flyerPath}` : null),
}));

import Login from './Login';

describe('Login extra behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the sign in button disabled for invalid credentials', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), 'invalid-email');
    await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 'bad-pass');

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('toggles password visibility and opens the forgot password popup', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(screen.getByLabelText(/password/i, { selector: 'input' })).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(screen.getByLabelText(/password/i, { selector: 'input' })).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Forgot Password\?/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByRole('heading', { name: /Forgot Password\?/i })).not.toBeInTheDocument();
  });
});