import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const { mockEventsOrder, mockCategoriesOrder, mockTagsOrder, mockFrom } = vi.hoisted(() => {
    const eventsOrder = vi.fn();
    const eventsEq = vi.fn(() => ({ order: eventsOrder }));
    const eventsSelect = vi.fn(() => ({ eq: eventsEq, order: eventsOrder, in: vi.fn(() => ({ order: eventsOrder })) }));

    const categoriesOrder = vi.fn();
    const categoriesSelect = vi.fn(() => ({ order: categoriesOrder, in: vi.fn(() => ({ order: categoriesOrder })) }));

    const tagsOrder = vi.fn();
    const tagsSelect = vi.fn(() => ({ order: tagsOrder, in: vi.fn(() => ({ order: tagsOrder })) }));

    const usersMaybeSingle = vi.fn(async () => ({ data: { organization_id: 'org-1' }, error: null }));
    const usersSelect = vi.fn(() => ({ maybeSingle: usersMaybeSingle }));

    const select = vi.fn(() => ({ eq: eventsEq, order: eventsOrder, in: vi.fn(() => ({ order: eventsOrder })) }));

    const from = vi.fn((table) => {
      if (table === 'events') {
        return { select: eventsSelect };
      }

      if (table === 'categories') {
        return { select: categoriesSelect };
      }

      if (table === 'tags') {
        return { select: tagsSelect };
      }

      if (table === 'users') {
        return { select: usersSelect };
      }

      if (table === 'event_tags') {
        return { select };
      }

      return { select: vi.fn(() => ({ order: vi.fn(), in: vi.fn(() => ({ order: vi.fn() })) })) };
    });

    return {
      mockEventsOrder: eventsOrder,
      mockCategoriesOrder: categoriesOrder,
      mockTagsOrder: tagsOrder,
      mockFrom: from,
    };
  });

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
  getEventFlyerUrl: (flyerPath) => (flyerPath ? `https://example.com/${flyerPath}` : null),
}));

import Events from './Events';

function renderEvents(session = null) {
  return render(
    <MemoryRouter>
      <Events session={session} />
    </MemoryRouter>
  );
}

describe('Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders approved events and categories from supabase', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'Food Drive',
          description: 'Collect canned foods',
          start_datetime: '2026-04-01T10:00:00',
          end_datetime: '2026-04-01T11:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [{ tags: { name: 'Community' } }],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }, { name: 'Health' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ name: 'Community' }],
      error: null,
    });

    const user = userEvent.setup();
    renderEvents();

    await waitFor(() => {
      expect(screen.getByText('Food Drive')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Categories' }));
    expect(screen.getByRole('button', { name: 'Food' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tags' }));
    expect(screen.getByRole('button', { name: 'Community' })).toBeInTheDocument();
  });

  it('renders My Events and Post Event buttons for authenticated users', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'Food Drive',
          description: 'Collect canned foods',
          start_datetime: '2026-04-01T10:00:00',
          end_datetime: '2026-04-01T11:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [{ tags: { name: 'Community' } }],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ name: 'Community' }],
      error: null,
    });

    renderEvents({ user: { id: 'user-1' } });

    await waitFor(() => {
      expect(screen.getByText('Food Drive')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'My Events' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post Event' })).toBeInTheDocument();
  });

  it('does not render My Events or Post Event buttons for anonymous users', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'Food Drive',
          description: 'Collect canned foods',
          start_datetime: '2026-04-01T10:00:00',
          end_datetime: '2026-04-01T11:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [{ tags: { name: 'Community' } }],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ name: 'Community' }],
      error: null,
    });

    renderEvents();

    await waitFor(() => {
      expect(screen.getByText('Food Drive')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'My Events' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post Event' })).not.toBeInTheDocument();
  });

  it('filters events by search query', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'Food Drive',
          description: 'Collect canned foods',
          start_datetime: '2026-04-01T10:00:00',
          end_datetime: '2026-04-01T11:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [{ tags: { name: 'Community' } }],
        },
        {
          id: 2,
          title: 'Tech Workshop',
          description: 'Coding for youth',
          start_datetime: '2026-04-02T10:00:00',
          end_datetime: '2026-04-02T11:00:00',
          location: 'Library',
          status: 'approved',
          organizations: { name: 'Org B' },
          categories: { name: 'Technology' },
          event_tags: [{ tags: { name: 'Youth' } }],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }, { name: 'Technology' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ name: 'Community' }, { name: 'Youth' }],
      error: null,
    });

    const user = userEvent.setup();
    renderEvents();

    await waitFor(() => {
      expect(screen.getByText('Food Drive')).toBeInTheDocument();
    });

    const dayOneButtons = screen.getAllByRole('button', { name: '1' });
    const currentMonthDayButton = dayOneButtons.find(
      (button) => !button.className.includes('outside-month')
    );
    await user.click(currentMonthDayButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View All Dates' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'View All Dates' }));

    await user.type(
      screen.getByPlaceholderText('Search events by title or keywords...'),
      'tech'
    );

    expect(screen.queryByText('Food Drive')).not.toBeInTheDocument();
    expect(screen.getByText('Tech Workshop')).toBeInTheDocument();
  });

  it('rehydrates cached event dates from session storage', async () => {
    sessionStorage.setItem(
      'palouse:events-page-cache',
      JSON.stringify({
        storedAt: Date.now(),
        value: {
          events: [
            {
              id: 1,
              title: 'Food Drive',
              description: 'Collect canned foods',
              startDate: '2026-04-01T10:00:00.000Z',
              endDate: '2026-04-01T11:00:00.000Z',
              location: 'Downtown',
              categoryName: 'Food',
              organizationName: 'Org A',
              tags: ['Community'],
              tagIds: ['tag-1'],
            },
          ],
          categories: ['All Events', 'Food'],
          tags: [
            { id: 'All Tags', name: 'All Tags' },
            { id: 'tag-1', name: 'Community' },
          ],
        },
      })
    );

    renderEvents();

    expect(await screen.findByText('Food Drive')).toBeInTheDocument();
    expect(screen.queryByText('Date unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Time unavailable')).not.toBeInTheDocument();
  });

  it('shows a success flash message passed through router state', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/events',
            state: {
              flashMessage: 'Your event request was successfully sent and is now pending review.',
            },
          },
        ]}
      >
        <Routes>
          <Route path="/events" element={<Events session={null} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText('Your event request was successfully sent and is now pending review.')
    ).toBeInTheDocument();
  });

  it('initializes search bar from the query string when navigating from organizations', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'Food Drive',
          description: 'Collect canned foods',
          start_datetime: '2026-04-01T10:00:00',
          end_datetime: '2026-04-01T11:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org B' },
          categories: { name: 'Food' },
          event_tags: [{ tags: { name: 'Community' } }],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ name: 'Community' }],
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/events?q=Org%20B"]}>
        <Routes>
          <Route path="/events" element={<Events session={null} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('Org B')).toBeInTheDocument();
    expect(await screen.findByText('Food Drive')).toBeInTheDocument();
  });

  it('opens the post event popup from the events page', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ name: 'Community' }],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ id: 'cat-1', name: 'Community Events' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ id: 'tag-1', name: 'Community' }],
      error: null,
    });

    const user = userEvent.setup();
    renderEvents({ user: { id: 'user-1' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Post Event' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Post Event' }));

    expect(await screen.findByRole('heading', { name: /Post a Community Event/i })).toBeInTheDocument();
  });

  it('clears session-scoped events UI when switching accounts', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'Food Drive',
          description: 'Collect canned foods',
          start_datetime: '2026-04-01T10:00:00',
          end_datetime: '2026-04-01T11:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [{ tags: { name: 'Community' } }],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ name: 'Community' }],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ id: 'cat-1', name: 'Community Events' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [{ id: 'tag-1', name: 'Community' }],
      error: null,
    });

    const adminSession = { user: { id: 'admin-1', email: 'admin@palouse.org' } };
    const memberSession = { user: { id: 'member-1', email: 'member@palouse.org' } };

    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter>
        <Events session={adminSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food Drive')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Post Event' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Post Event' }));
    expect(await screen.findByRole('heading', { name: /Post a Community Event/i })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <Events session={memberSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Post a Community Event/i })).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'My Events' })).toBeInTheDocument();
    expect(screen.getByText('Food Drive')).toBeInTheDocument();
  });

  it('refetches events when the browser tab regains focus', async () => {
    mockEventsOrder.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'Food Drive',
          description: 'Collect canned foods',
          start_datetime: '2026-04-01T10:00:00',
          end_datetime: '2026-04-01T11:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [{ tags: { name: 'Community' } }],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValue({
      data: [{ name: 'Food' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValue({
      data: [{ id: 'tag-1', name: 'Community' }],
      error: null,
    });

    renderEvents();

    await waitFor(() => {
      expect(screen.getByText('Food Drive')).toBeInTheDocument();
    });

    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(mockEventsOrder).toHaveBeenCalledTimes(2);
    });
  });

  it('filters events by the currently selected month and updates when navigating months', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'April Community Event',
          description: 'April event description',
          start_datetime: '2026-04-10T10:00:00',
          end_datetime: '2026-04-10T12:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [],
        },
        {
          id: 2,
          title: 'May Spring Festival',
          description: 'May event description',
          start_datetime: '2026-05-15T10:00:00',
          end_datetime: '2026-05-15T12:00:00',
          location: 'City Park',
          status: 'approved',
          organizations: { name: 'Org B' },
          categories: { name: 'Community Events' },
          event_tags: [],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const user = userEvent.setup();
    renderEvents();

    await waitFor(() => {
      expect(screen.getByText('April Community Event')).toBeInTheDocument();
    });
    expect(screen.queryByText('May Spring Festival')).not.toBeInTheDocument();

    // Navigate to next month (May 2026)
    await user.click(screen.getByLabelText('Next month'));

    await waitFor(() => {
      expect(screen.getByText('May Spring Festival')).toBeInTheDocument();
    });
    expect(screen.queryByText('April Community Event')).not.toBeInTheDocument();
  });

  it('filters to selected specific days across multiple months and resets to the visible month', async () => {
    mockEventsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: 'April 10 Event',
          description: 'April 10 event',
          start_datetime: '2026-04-10T10:00:00',
          end_datetime: '2026-04-10T12:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [],
        },
        {
          id: 2,
          title: 'April 20 Event',
          description: 'April 20 event',
          start_datetime: '2026-04-20T10:00:00',
          end_datetime: '2026-04-20T12:00:00',
          location: 'Downtown',
          status: 'approved',
          organizations: { name: 'Org A' },
          categories: { name: 'Food' },
          event_tags: [],
        },
        {
          id: 3,
          title: 'May 5 Event',
          description: 'May 5 event',
          start_datetime: '2026-05-05T10:00:00',
          end_datetime: '2026-05-05T12:00:00',
          location: 'City Park',
          status: 'approved',
          organizations: { name: 'Org B' },
          categories: { name: 'Food' },
          event_tags: [],
        },
      ],
      error: null,
    });

    mockCategoriesOrder.mockResolvedValueOnce({
      data: [{ name: 'Food' }],
      error: null,
    });

    mockTagsOrder.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const user = userEvent.setup();
    renderEvents();

    await waitFor(() => {
      expect(screen.getByText('April 10 Event')).toBeInTheDocument();
      expect(screen.getByText('April 20 Event')).toBeInTheDocument();
    });
    expect(screen.queryByText('May 5 Event')).not.toBeInTheDocument();

    // Select April 10
    const dayTenButton = screen.getByRole('button', { name: '10' });
    await user.click(dayTenButton);

    await waitFor(() => {
      expect(screen.getByText('April 10 Event')).toBeInTheDocument();
    });
    expect(screen.queryByText('April 20 Event')).not.toBeInTheDocument();

    // Navigate to next month (May 2026) and select May 5
    await user.click(screen.getByLabelText('Next month'));
    const dayFiveButtons = screen.getAllByRole('button', { name: '5' });
    const currentMonthFiveButton = dayFiveButtons.find(
      (button) => !button.className.includes('outside-month')
    );
    await user.click(currentMonthFiveButton);

    // Both specifically selected dates from April and May should be shown
    await waitFor(() => {
      expect(screen.getByText('April 10 Event')).toBeInTheDocument();
      expect(screen.getByText('May 5 Event')).toBeInTheDocument();
    });
    expect(screen.queryByText('April 20 Event')).not.toBeInTheDocument();

    // Reset date filter (View All Dates) while currently showing May
    await user.click(screen.getByRole('button', { name: 'View All Dates' }));

    // Now it should show events for the currently showing month (May) only
    await waitFor(() => {
      expect(screen.getByText('May 5 Event')).toBeInTheDocument();
    });
    expect(screen.queryByText('April 10 Event')).not.toBeInTheDocument();
    expect(screen.queryByText('April 20 Event')).not.toBeInTheDocument();
  });
});
