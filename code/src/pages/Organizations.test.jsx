import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const { mockOrder, mockFrom } = vi.hoisted(() => {
  const order = vi.fn();
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));

  return {
    mockOrder: order,
    mockFrom: from,
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
});
