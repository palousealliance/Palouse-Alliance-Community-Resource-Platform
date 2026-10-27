import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetchCurrentHistoryPdf = vi.fn();
const mockGetHistoryPdfUrl = vi.fn(() => '/palouse-alliance-history.pdf');
const mockReplaceHistoryPdf = vi.fn();

vi.mock('../lib/supabase', () => ({
  fetchCurrentHistoryPdf: () => mockFetchCurrentHistoryPdf(),
  getHistoryPdfUrl: (...args) => mockGetHistoryPdfUrl(...args),
  replaceHistoryPdf: (...args) => mockReplaceHistoryPdf(...args),
  validateHistoryPdfFile: (file) => {
    if (!file) return 'Please select a PDF file to upload.';
    const isPdf = file.type === 'application/pdf' || file.name?.endsWith('.pdf');
    if (!isPdf) return 'The uploaded file must be a PDF document (.pdf).';
    if (file.size > 5 * 1024 * 1024) return 'The PDF file size must be 5 MB or smaller.';
    return null;
  },
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
        })),
      })),
    })),
  },
}));

import History from './History';

describe('History page and admin PDF replace workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCurrentHistoryPdf.mockResolvedValue({
      url: 'https://example.com/initial-history.pdf',
      fileName: 'initial-history.pdf',
    });
  });

  it('renders history document and viewer without replace button for non-admin visitors', async () => {
    render(<History isAdmin={false} />);

    expect(screen.getByRole('heading', { name: /The story of the Palouse Alliance/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Palouse Alliance: A History/i })).toBeInTheDocument();

    // Replace button should NOT be visible
    expect(screen.queryByRole('button', { name: /Replace PDF/i })).not.toBeInTheDocument();

    // Standard links are visible
    expect(screen.getByRole('link', { name: /Open in new tab/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download PDF/i })).toBeInTheDocument();

    // Verify PDF viewer loads active file
    await waitFor(() => {
      const iframe = screen.getByTitle('Palouse Alliance history PDF');
      expect(iframe).toHaveAttribute('src', expect.stringContaining('https://example.com/initial-history.pdf'));
    });
  });

  it('renders Replace PDF button for administrators', async () => {
    render(<History isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Replace PDF/i })).toBeInTheDocument();
    });
  });

  it('opens dialog on button click and allows closing with Cancel', async () => {
    const user = userEvent.setup();
    render(<History isAdmin={true} />);

    const replaceBtn = await screen.findByRole('button', { name: /Replace PDF/i });
    await user.click(replaceBtn);

    expect(screen.getByRole('dialog', { name: /Replace History Document Dialog/i })).toBeInTheDocument();
    expect(screen.getByText(/Click to upload or drag and drop/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF only • 5 MB max/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('validates and rejects non-PDF files', async () => {
    const user = userEvent.setup();
    render(<History isAdmin={true} />);

    await user.click(await screen.findByRole('button', { name: /Replace PDF/i }));

    const invalidFile = new File(['image'], 'flyer.png', { type: 'image/png' });
    const input = document.getElementById('history-file-input');

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/must be a PDF document/i);
    expect(screen.getByRole('button', { name: /Upload and Replace/i })).toBeDisabled();
  });

  it('validates and rejects files larger than 5 MB', async () => {
    const user = userEvent.setup();
    render(<History isAdmin={true} />);

    await user.click(await screen.findByRole('button', { name: /Replace PDF/i }));

    const largeFile = new File(['%PDF large'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }); // 6 MB
    const input = document.getElementById('history-file-input');

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(screen.getByRole('alert')).toHaveTextContent(/5 MB or smaller/i);
    expect(screen.getByRole('button', { name: /Upload and Replace/i })).toBeDisabled();
  });

  it('handles valid file selection and successful replacement', async () => {
    const user = userEvent.setup();
    mockReplaceHistoryPdf.mockResolvedValueOnce({
      url: 'https://example.com/replaced-history.pdf',
      fileName: 'replaced-history.pdf',
      originalName: 'new-doc.pdf',
    });

    render(<History isAdmin={true} />);

    await user.click(await screen.findByRole('button', { name: /Replace PDF/i }));

    const validPdf = new File(['%PDF-1.4 dummy content'], 'new-doc.pdf', { type: 'application/pdf' });
    Object.defineProperty(validPdf, 'size', { value: 1024 * 500 });
    const input = document.getElementById('history-file-input');

    fireEvent.change(input, { target: { files: [validPdf] } });

    expect(screen.getByText('new-doc.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload and Replace/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Upload and Replace/i }));

    expect(mockReplaceHistoryPdf).toHaveBeenCalledWith(validPdf);

    // Dialog should be closed and success message shown
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/successfully replaced/i);
    });

    // Viewer src should be updated
    const iframe = screen.getByTitle('Palouse Alliance history PDF');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://example.com/replaced-history.pdf'));
  });

  it('displays error in dialog if atomic replacement fails (e.g. cleanup error)', async () => {
    const user = userEvent.setup();
    mockReplaceHistoryPdf.mockRejectedValueOnce(
      new Error('Failed to remove old file (Permission denied). The new PDF was not uploaded.')
    );

    render(<History isAdmin={true} />);

    await user.click(await screen.findByRole('button', { name: /Replace PDF/i }));

    const validPdf = new File(['%PDF-1.4 dummy content'], 'new-doc.pdf', { type: 'application/pdf' });
    Object.defineProperty(validPdf, 'size', { value: 1024 * 500 });
    const input = document.getElementById('history-file-input');

    fireEvent.change(input, { target: { files: [validPdf] } });
    await user.click(screen.getByRole('button', { name: /Upload and Replace/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Failed to remove old file \(Permission denied\)\. The new PDF was not uploaded\./i
      );
    });

    // Dialog remains open so admin can see and rectify
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('supports drag and drop of PDF files onto the dropzone', async () => {
    render(<History isAdmin={true} />);

    const replaceBtn = await screen.findByRole('button', { name: /Replace PDF/i });
    fireEvent.click(replaceBtn);

    const dropzone = screen.getByLabelText(/Upload History PDF/i);
    expect(dropzone).toBeInTheDocument();

    const pdfFile = new File(['%PDF-1.4 drag dropped'], 'dropped.pdf', { type: 'application/pdf' });
    Object.defineProperty(pdfFile, 'size', { value: 1024 * 200 });

    fireEvent.dragOver(dropzone);
    expect(dropzone.className).toContain('drag-over');

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [pdfFile],
      },
    });

    expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
  });
});
