import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EventCard from './EventCard';

vi.mock('./PdfFlyerBackground', () => ({ default: () => <canvas /> }));

vi.mock('../lib/supabase', () => ({
  getEventFlyerUrl: (flyerPath) => (flyerPath ? `https://example.com/${flyerPath}` : null),
  supabase: {
    from: vi.fn(),
  },
}));

describe('EventCard', () => {
  const event = {
    id: 1,
    title: 'Community Cleanup',
    categoryName: 'Community Service',
    tags: ['Outdoor', 'Volunteer'],
    organizationName: 'Palouse Helpers',
    description: 'Join us to clean the neighborhood park.',
    startDate: new Date('2026-04-01T10:00:00'),
    endDate: new Date('2026-04-01T12:00:00'),
    location: 'Main Park',
    volunteer_url: 'https://example.com/volunteer',
    flyer_path: 'flyers/cleanup.png',
  };

  it('renders core event details and View Flyer button', () => {
    render(
      <EventCard
        event={event}
        formatFullDate={(date) => date.toDateString()}
        formatTimeRange={() => '10:00 AM - 12:00 PM'}
      />
    );

    expect(screen.getByText('Community Cleanup')).toBeInTheDocument();
    expect(screen.getByText('Palouse Helpers')).toBeInTheDocument();
    expect(screen.getByText('Join us to clean the neighborhood park.')).toBeInTheDocument();
    expect(screen.getByText('Community Service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Flyer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Event Link' })).toBeInTheDocument();
  });

  it('does not render View Flyer button when flyer_path is absent', () => {
    const noFlyerEvent = { ...event, flyer_path: null };

    render(
      <EventCard
        event={noFlyerEvent}
        formatFullDate={(date) => date.toDateString()}
        formatTimeRange={() => '10:00 AM - 12:00 PM'}
      />
    );

    expect(screen.queryByRole('button', { name: 'View Flyer' })).not.toBeInTheDocument();
  });

  it('opens and closes image flyer modal', async () => {
    const user = userEvent.setup();

    render(
      <EventCard
        event={event}
        formatFullDate={(date) => date.toDateString()}
        formatTimeRange={() => '10:00 AM - 12:00 PM'}
      />
    );

    await user.click(screen.getByRole('button', { name: 'View Flyer' }));
    expect(screen.getByRole('dialog', { name: /Community Cleanup Flyer Modal/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Community Cleanup Flyer/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: /Community Cleanup Flyer Modal/i })).not.toBeInTheDocument();
  });

  it('opens flyer modal with iframe when flyer is a PDF', async () => {
    const user = userEvent.setup();
    const pdfEvent = { ...event, flyer_path: 'flyers/schedule.pdf' };

    render(
      <EventCard
        event={pdfEvent}
        formatFullDate={(date) => date.toDateString()}
        formatTimeRange={() => '10:00 AM - 12:00 PM'}
      />
    );

    await user.click(screen.getByRole('button', { name: 'View Flyer' }));
    expect(screen.getByTitle('Community Cleanup Flyer PDF')).toBeInTheDocument();
  });

  it('does not render Event Link when volunteer_url is missing', () => {
    const noLinkEvent = { ...event, volunteer_url: '' };

    render(
      <EventCard
        event={noLinkEvent}
        formatFullDate={(date) => date.toDateString()}
        formatTimeRange={() => '10:00 AM - 12:00 PM'}
      />
    );

    expect(screen.queryByRole('button', { name: 'Event Link' })).not.toBeInTheDocument();
  });

  it('shows a clear start/end layout for multi-day events', () => {
    const multiDayEvent = {
      ...event,
      startDate: new Date('2026-04-01T10:00:00'),
      endDate: new Date('2026-04-02T10:00:00'),
    };

    render(
      <EventCard
        event={multiDayEvent}
        formatFullDate={(date) => date.toDateString()}
        formatTimeRange={() => 'Custom Time'}
      />
    );

    expect(screen.getByText(/Start:/)).toBeInTheDocument();
    expect(screen.getByText(/End:/)).toBeInTheDocument();
    expect(screen.getByText(/Wed Apr 01 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Thu Apr 02 2026/)).toBeInTheDocument();
    expect(screen.getAllByText(/10:00 AM/)).toHaveLength(2);
  });

  it('does not render the location row when location is missing', () => {
    render(
      <EventCard
        event={{ ...event, location: null }}
        formatFullDate={(date) => date.toDateString()}
        formatTimeRange={() => '10:00 AM - 12:00 PM'}
      />
    );

    expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
  });
});
