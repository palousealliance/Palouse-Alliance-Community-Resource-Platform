import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => {
  const mockEventsOrder = vi.fn(async () => ({
    data: [
      {
        id: 'event-1',
        title: 'Pending Event',
        description: 'Ready for review',
        start_datetime: '2026-04-15T10:00:00',
        end_datetime: '2026-04-15T12:00:00',
        status: 'pending',
        location: 'City Park',
        flyer_path: 'flyers/pending-event.pdf',
        organizations: { name: 'Org A' },
        categories: { name: 'Community' },
        event_tags: [{ tag_id: 'tag-1' }],
      },
    ],
    error: null,
  }));

  const mockEventsSelect = vi.fn(() => ({ order: mockEventsOrder }));
  const mockTagsOrder = vi.fn(async () => ({ data: [{ id: 'tag-1', name: 'Outdoors' }], error: null }));
  const mockTagsSelect = vi.fn(() => ({ order: mockTagsOrder }));

  const mockFrom = vi.fn((table) => {
    if (table === 'events') {
      return { select: mockEventsSelect };
    }
    if (table === 'tags') {
      return { select: mockTagsSelect };
    }
    return { select: vi.fn(() => ({ order: vi.fn(async () => ({ data: [], error: null })) })) };
  });

  return { mockFrom };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' }, access_token: 'test-access-token' } } }),
    },
    from: mockFrom,
  },
  getEventFlyerUrl: (flyerPath) => (flyerPath ? `https://example.com/${flyerPath}` : null),
}));

import Admin from './Admin';

describe('Admin page interactions', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens organization, user, and event management popups', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url.toString().endsWith('/api/organizations')) {
        return { ok: true, json: async () => [{ id: 'org-1', name: 'Org 1' }] };
      }
      if (url.toString().endsWith('/api/users')) {
        return {
          ok: true,
          json: async () => [
            { id: 'user-1', email: 'user@example.com', role: 'member', organization_id: 'org-1' },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    const user = userEvent.setup();
    render(<Admin session={{ user: { id: 'user-1' } }} />);

    await user.click(screen.getByRole('button', { name: /Manage Organizations/i }));
    const orgDialog = await screen.findByRole('dialog', { name: /Manage Organizations/i });

    await waitFor(() => {
      expect(within(orgDialog).getByRole('heading', { name: /Manage Organizations/i })).toBeInTheDocument();
    });
    expect(within(orgDialog).getByText('Org 1')).toBeInTheDocument();

    await user.click(within(orgDialog).getByRole('button', { name: /Close popup/i }));

    await user.click(screen.getByRole('button', { name: /Register Organization/i }));
    const registerOrgDialog = await screen.findByRole('dialog', { name: /Register Organization/i });

    await waitFor(() => {
      expect(within(registerOrgDialog).getByRole('heading', { name: /Register Organization/i })).toBeInTheDocument();
    });
    await user.click(within(registerOrgDialog).getByRole('button', { name: /^Cancel$/i }));

    await user.click(screen.getByRole('button', { name: /Register User/i }));
    const registerUserDialog = await screen.findByRole('dialog', { name: /Register User/i });

    await waitFor(() => {
      expect(within(registerUserDialog).getByRole('heading', { name: /Register User/i })).toBeInTheDocument();
    });
    await user.click(within(registerUserDialog).getByRole('button', { name: /^Cancel$/i }));

    await user.click(screen.getByRole('button', { name: /Manage Users/i }));
    const manageUsersDialog = await screen.findByRole('dialog', { name: /Manage Users/i });

    await waitFor(() => {
      expect(within(manageUsersDialog).getByRole('heading', { name: /Manage Users/i })).toBeInTheDocument();
    });
    expect(within(manageUsersDialog).getByText('user@example.com')).toBeInTheDocument();
    await user.click(within(manageUsersDialog).getByRole('button', { name: /^Close$/i }));

    await user.click(screen.getByRole('button', { name: /Manage Events/i }));
    const manageEventsDialog = await screen.findByRole('dialog', { name: /Manage Events/i });

    await waitFor(() => {
      expect(within(manageEventsDialog).getByRole('heading', { name: /Manage Events/i })).toBeInTheDocument();
    });
    await user.click(within(manageEventsDialog).getByRole('button', { name: /Pending Events/i }));
    expect(within(manageEventsDialog).getByRole('heading', { name: /^Pending Event$/i })).toBeInTheDocument();
    expect(within(manageEventsDialog).getByRole('button', { name: /View Flyer/i })).toBeInTheDocument();
  });
  it('edits a user and sets organization to Unaffiliated submitting the Unaffiliated org id', async () => {
    let patchedBody = null;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.toString().endsWith('/api/organizations')) {
        return {
          ok: true,
          json: async () => [
            { id: 'unaffiliated-uuid', name: 'Unaffiliated' },
            { id: 'org-1', name: 'Org 1' },
          ],
        };
      }
      if (url.toString().endsWith('/api/users/user-2') && options?.method === 'PATCH') {
        patchedBody = JSON.parse(options.body);
        return { ok: true, json: async () => ({ id: 'user-2' }) };
      }
      if (url.toString().endsWith('/api/users')) {
        return {
          ok: true,
          json: async () => [
            { id: 'user-1', email: 'admin@example.com', role: 'admin', organization_id: 'org-1' },
            { id: 'user-2', email: 'member@example.com', role: 'member', organization_id: 'org-1' },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    const user = userEvent.setup();
    render(<Admin session={{ user: { id: 'user-1' } }} />);

    await user.click(screen.getByRole('button', { name: /Manage Users/i }));
    const manageUsersDialog = await screen.findByRole('dialog', { name: /Manage Users/i });

    await user.click(within(manageUsersDialog).getByRole('button', { name: /Edit member@example.com/i }));

    const orgSelect = within(manageUsersDialog).getByLabelText(/Organization/i);
    expect(orgSelect).toHaveValue('org-1');

    // Change to Unaffiliated
    await user.selectOptions(orgSelect, 'unaffiliated-uuid');
    expect(orgSelect).toHaveValue('unaffiliated-uuid');

    // Click Save Changes
    await user.click(within(manageUsersDialog).getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(patchedBody).toEqual({
        role: 'member',
        organization_id: 'unaffiliated-uuid',
      });
    });
  });

  it('displays organization errors under organization dropdown and not under role dropdown', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url.toString().endsWith('/api/organizations')) {
        return {
          ok: true,
          json: async () => [
            { id: 'unaffiliated-uuid', name: 'Unaffiliated' },
            { id: 'org-1', name: 'Org 1' },
          ],
        };
      }
      if (url.toString().endsWith('/api/users/user-2') && options?.method === 'PATCH') {
        return {
          ok: false,
          json: async () => ({
            message: 'null value in column "organization_id" of relation "users" violates not-null constraint',
          }),
        };
      }
      if (url.toString().endsWith('/api/users')) {
        return {
          ok: true,
          json: async () => [
            { id: 'user-1', email: 'admin@example.com', role: 'admin', organization_id: 'org-1' },
            { id: 'user-2', email: 'member@example.com', role: 'member', organization_id: 'org-1' },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    const user = userEvent.setup();
    render(<Admin session={{ user: { id: 'user-1' } }} />);

    await user.click(screen.getByRole('button', { name: /Manage Users/i }));
    const manageUsersDialog = await screen.findByRole('dialog', { name: /Manage Users/i });

    await user.click(within(manageUsersDialog).getByRole('button', { name: /Edit member@example.com/i }));

    // Save changes to trigger error
    await user.click(within(manageUsersDialog).getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(within(manageUsersDialog).getAllByText(/null value in column "organization_id"/i).length).toBeGreaterThanOrEqual(1);
    });

    // Check that role dropdown FormField does NOT have error
    const roleFormField = within(manageUsersDialog).getByLabelText(/Role/i).closest('.form-group');
    expect(within(roleFormField).queryByText(/null value in column "organization_id"/i)).not.toBeInTheDocument();

    // Check that organization dropdown FormField DOES have error
    const orgFormField = within(manageUsersDialog).getByLabelText(/Organization/i).closest('.form-group');
    expect(within(orgFormField).getByText(/null value in column "organization_id"/i)).toBeInTheDocument();
  });

  it('filters out Unaffiliated from Manage Organizations list', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (url.toString().endsWith('/api/organizations')) {
        return {
          ok: true,
          json: async () => [
            { id: 'unaffiliated-uuid', name: 'Unaffiliated' },
            { id: 'org-1', name: 'Org 1' },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    const user = userEvent.setup();
    render(<Admin session={{ user: { id: 'user-1' } }} />);

    await user.click(screen.getByRole('button', { name: /Manage Organizations/i }));
    const orgDialog = await screen.findByRole('dialog', { name: /Manage Organizations/i });

    await waitFor(() => {
      expect(within(orgDialog).getByText('Org 1')).toBeInTheDocument();
    });

    // Ensure 'Unaffiliated' does NOT appear in the Manage Organizations directory
    expect(within(orgDialog).queryByText('Unaffiliated')).not.toBeInTheDocument();
  });
  it('creates a user assigned to any organization selected from the dropdown', async () => {
    let registerBody = null;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.toString().endsWith('/api/organizations')) {
        return {
          ok: true,
          json: async () => [
            { id: 'unaffiliated-uuid', name: 'Unaffiliated' },
            { id: 'org-1', name: 'Org 1' },
            { id: 'org-2', name: 'Org 2' },
          ],
        };
      }
      if (url.toString().endsWith('/api/register') && options?.method === 'POST') {
        registerBody = JSON.parse(options.body);
        return { ok: true, json: async () => ({ id: 'new-user-id' }) };
      }
      if (url.toString().endsWith('/api/users')) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => [] };
    });

    const user = userEvent.setup();
    render(<Admin session={{ user: { id: 'user-1' } }} />);

    await user.click(screen.getByRole('button', { name: /Register User/i }));
    const registerDialog = await screen.findByRole('dialog', { name: /Register User/i });

    await user.type(within(registerDialog).getByLabelText(/Email Address/i), 'newuser@example.com');
    await user.type(within(registerDialog).getByLabelText(/^Password/i), 'ValidPassword123');

    // Select Org 2
    const orgSelect = within(registerDialog).getByLabelText(/Organization/i);
    await user.selectOptions(orgSelect, 'org-2');
    expect(orgSelect).toHaveValue('org-2');

    await user.click(within(registerDialog).getByRole('button', { name: /Create User/i }));

    await waitFor(() => {
      expect(registerBody).toEqual({
        email: 'newuser@example.com',
        password: 'ValidPassword123',
        role: 'member',
        organization_id: 'org-2',
      });
    });
  });

  it('creates a user assigned to Unaffiliated when kept as default', async () => {
    let registerBody = null;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.toString().endsWith('/api/organizations')) {
        return {
          ok: true,
          json: async () => [
            { id: 'unaffiliated-uuid', name: 'Unaffiliated' },
            { id: 'org-1', name: 'Org 1' },
          ],
        };
      }
      if (url.toString().endsWith('/api/register') && options?.method === 'POST') {
        registerBody = JSON.parse(options.body);
        return { ok: true, json: async () => ({ id: 'new-user-id' }) };
      }
      if (url.toString().endsWith('/api/users')) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => [] };
    });

    const user = userEvent.setup();
    render(<Admin session={{ user: { id: 'user-1' } }} />);

    await user.click(screen.getByRole('button', { name: /Register User/i }));
    const registerDialog = await screen.findByRole('dialog', { name: /Register User/i });

    await user.type(within(registerDialog).getByLabelText(/Email Address/i), 'unaffiliateduser@example.com');
    await user.type(within(registerDialog).getByLabelText(/^Password/i), 'ValidPassword123');

    // Default is Unaffiliated
    const orgSelect = within(registerDialog).getByLabelText(/Organization/i);
    expect(orgSelect).toHaveValue('unaffiliated-uuid');

    await user.click(within(registerDialog).getByRole('button', { name: /Create User/i }));

    await waitFor(() => {
      expect(registerBody).toEqual({
        email: 'unaffiliateduser@example.com',
        password: 'ValidPassword123',
        role: 'member',
        organization_id: 'unaffiliated-uuid',
      });
    });
  });

  it('edits a user from Unaffiliated and assigns any other organization', async () => {
    let patchedBody = null;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.toString().endsWith('/api/organizations')) {
        return {
          ok: true,
          json: async () => [
            { id: 'unaffiliated-uuid', name: 'Unaffiliated' },
            { id: 'org-1', name: 'Org 1' },
            { id: 'org-2', name: 'Org 2' },
          ],
        };
      }
      if (url.toString().endsWith('/api/users/user-2') && options?.method === 'PATCH') {
        patchedBody = JSON.parse(options.body);
        return { ok: true, json: async () => ({ id: 'user-2' }) };
      }
      if (url.toString().endsWith('/api/users')) {
        return {
          ok: true,
          json: async () => [
            { id: 'user-1', email: 'admin@example.com', role: 'admin', organization_id: 'org-1' },
            { id: 'user-2', email: 'member@example.com', role: 'member', organization_id: 'unaffiliated-uuid' },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    });

    const user = userEvent.setup();
    render(<Admin session={{ user: { id: 'user-1' } }} />);

    await user.click(screen.getByRole('button', { name: /Manage Users/i }));
    const manageUsersDialog = await screen.findByRole('dialog', { name: /Manage Users/i });

    // Verify user-2 displays as Unaffiliated
    expect(within(manageUsersDialog).getByText(/member · Unaffiliated/i)).toBeInTheDocument();

    await user.click(within(manageUsersDialog).getByRole('button', { name: /Edit member@example.com/i }));

    const orgSelect = within(manageUsersDialog).getByLabelText(/Organization/i);
    expect(orgSelect).toHaveValue('unaffiliated-uuid');

    // Change to Org 2
    await user.selectOptions(orgSelect, 'org-2');
    expect(orgSelect).toHaveValue('org-2');

    await user.click(within(manageUsersDialog).getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(patchedBody).toEqual({
        role: 'member',
        organization_id: 'org-2',
      });
    });
  });
});
