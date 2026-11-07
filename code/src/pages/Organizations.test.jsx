import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const { mockOrder, mockFrom, mockUsersMaybeSingle } = vi.hoisted(() => {
  const order = vi.fn();
  const orgsSelect = vi.fn(() => ({ order }));

  const usersMaybeSingle = vi.fn(async () => ({ data: null, error: null }));
  const usersEq = vi.fn(() => ({ maybeSingle: usersMaybeSingle }));
  const usersSelect = vi.fn(() => ({ eq: usersEq, maybeSingle: usersMaybeSingle }));

  const from = vi.fn((table) => {
    if (table === 'users') {
      return { select: usersSelect };
    }
    return { select: orgsSelect };
  });

  return {
    mockOrder: order,
    mockFrom: from,
    mockUsersMaybeSingle: usersMaybeSingle,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
  getEventFlyerUrl: (flyerPath) => (flyerPath ? `https://example.com/${flyerPath}` : null),
}));

import Organizations from './Organizations';

describe('Organizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders organizations loaded from supabase', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          name: 'Food Bank Partners',
          description: 'Food support and distribution',
          phone_number: '555-1234',
          email: 'food@example.org',
          location: 'Moscow',
          events: [{ id: 11 }],
        },
      ],
      error: null,
    });

    render(
      <MemoryRouter>
        <Organizations />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food Bank Partners')).toBeInTheDocument();
      expect(screen.getByText('1 active event')).toBeInTheDocument();
    });
  });

  it('filters organizations by search term', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          name: 'Food Bank Partners',
          description: 'Food support and distribution',
          phone_number: '',
          email: '',
          location: 'Moscow',
          events: [],
        },
        {
          id: 2,
          name: 'Health Outreach',
          description: 'Health education events',
          phone_number: '',
          email: '',
          location: 'Pullman',
          events: [],
        },
      ],
      error: null,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Organizations />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food Bank Partners')).toBeInTheDocument();
      expect(screen.getByText('Health Outreach')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search by organization name...'), 'health');

    expect(screen.queryByText('Food Bank Partners')).not.toBeInTheDocument();
    expect(screen.getByText('Health Outreach')).toBeInTheDocument();
  });

  it('refetches organizations when the browser tab regains focus', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Food Bank Partners',
          description: 'Food support and distribution',
          phone_number: '',
          email: '',
          location: 'Moscow',
          events: [],
        },
      ],
      error: null,
    });

    render(
      <MemoryRouter>
        <Organizations />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food Bank Partners')).toBeInTheDocument();
    });

    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledTimes(2);
    });
  });

  it('correctly counts only active approved events and excludes past or unapproved events', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          name: 'Food Bank Partners',
          description: 'Food support and distribution',
          phone_number: '555-1234',
          email: 'food@example.org',
          location: 'Moscow',
          events: [
            { id: 1, status: 'approved', end_datetime: futureDate.toISOString() }, // active
            { id: 2, status: 'pending', end_datetime: futureDate.toISOString() }, // pending
            { id: 3, status: 'rejected', end_datetime: futureDate.toISOString() }, // rejected
            { id: 4, status: 'approved', end_datetime: pastDate.toISOString() }, // past
          ],
        },
      ],
      error: null,
    });

    render(
      <MemoryRouter>
        <Organizations />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food Bank Partners')).toBeInTheDocument();
      expect(screen.getByText('1 active event')).toBeInTheDocument();
      expect(screen.queryByText('4 active events')).not.toBeInTheDocument();
    });
  });

  it('does not show Edit Details button when user is not logged in', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          name: 'Food Bank Partners',
          description: 'Food support',
          phone_number: '555-1234',
          email: 'food@example.org',
          location: 'Moscow',
          events: [],
        },
      ],
      error: null,
    });

    render(
      <MemoryRouter>
        <Organizations session={null} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food Bank Partners')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Edit Details' })).not.toBeInTheDocument();
  });

  it('does not show Edit Details button when logged-in user is unaffiliated', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          name: 'Food Bank Partners',
          description: 'Food support',
          phone_number: '555-1234',
          email: 'food@example.org',
          location: 'Moscow',
          events: [],
        },
      ],
      error: null,
    });
    mockUsersMaybeSingle.mockResolvedValueOnce({
      data: { organization_id: 'unaffiliated', organizations: { name: 'unaffiliated' } },
      error: null,
    });

    render(
      <MemoryRouter>
        <Organizations session={{ user: { id: 'user-unaffiliated' } }} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food Bank Partners')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Edit Details' })).not.toBeInTheDocument();
  });

  it('shows Edit Details button only for the affiliated organization and opens popup listing fields', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          name: 'Food Bank Partners',
          description: 'Food support and distribution',
          phone_number: '555-1234',
          email: 'food@example.org',
          location: 'Moscow',
          events: [],
        },
        {
          id: 2,
          name: 'Other Community Org',
          description: 'Other services',
          phone_number: '555-5678',
          email: 'other@example.org',
          location: 'Pullman',
          events: [],
        },
      ],
      error: null,
    });
    mockUsersMaybeSingle.mockResolvedValueOnce({
      data: { organization_id: '1', organizations: { name: 'Food Bank Partners' } },
      error: null,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Organizations session={{ user: { id: 'user-member-1' } }} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food Bank Partners')).toBeInTheDocument();
      expect(screen.getByText('Other Community Org')).toBeInTheDocument();
    });

    // Only 1 Edit Details button should appear (for Food Bank Partners, not Other Community Org)
    const editButtons = screen.getAllByRole('button', { name: 'Edit Details' });
    expect(editButtons).toHaveLength(1);

    // Click Edit Details
    await user.click(editButtons[0]);

    // Popup opens
    expect(screen.getByRole('dialog', { name: 'Edit Organization Details' })).toBeInTheDocument();
    expect(screen.getByText(/Contact Palouse Alliance to request updates for Food Bank Partners/i)).toBeInTheDocument();
    expect(screen.getByText('palousealliance@gmail.com')).toBeInTheDocument();

    // Listed fields
    expect(screen.getByText('Organization Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Contact Email')).toBeInTheDocument();
    expect(screen.getByText('Phone Number')).toBeInTheDocument();

    // Send Email button (formatted as standard primary button)
    const sendEmailBtn = screen.getByRole('button', { name: 'Send Email' });
    expect(sendEmailBtn).toBeInTheDocument();

    // Cancel button dismisses popup
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Edit Organization Details' })).not.toBeInTheDocument();
  });
});
