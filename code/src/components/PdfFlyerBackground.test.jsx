import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PdfFlyerBackground from './PdfFlyerBackground';

const { getDocument, workerOptions } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  workerOptions: {},
}));

vi.mock('pdfjs-dist', () => ({ getDocument, GlobalWorkerOptions: workerOptions }));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/pdf.worker.mjs' }));

describe('PDF flyer backgrounds', () => {
  let onIntersection;
  let destroy;
  let renderPage;
  let cancel;

  beforeEach(() => {
    getDocument.mockReset();
    destroy = vi.fn().mockResolvedValue(undefined);
    cancel = vi.fn();
    renderPage = vi.fn(() => ({ promise: Promise.resolve(), cancel }));
    const page = {
      getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
      render: renderPage,
    };
    getDocument.mockReturnValue({
      promise: Promise.resolve({ getPage: vi.fn().mockResolvedValue(page) }),
      destroy,
    });
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback) { onIntersection = callback; }
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('defers loading until visible, renders a bitmap, and releases the document', async () => {
    const { container } = render(<PdfFlyerBackground src="https://example.com/flyer.pdf" />);
    expect(getDocument).not.toHaveBeenCalled();

    act(() => onIntersection([{ isIntersecting: false }]));
    expect(getDocument).not.toHaveBeenCalled();
    act(() => onIntersection([{ isIntersecting: true }]));

    await waitFor(() => expect(container.firstChild).toHaveClass('event-pdf-background--ready'));
    expect(getDocument).toHaveBeenCalledWith({ url: 'https://example.com/flyer.pdf' });
    expect(renderPage).toHaveBeenCalledWith(expect.objectContaining({ canvas: container.querySelector('canvas') }));
    expect(container.querySelector('iframe')).toBeNull();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('leaves a safe visual fallback when the PDF cannot be loaded', async () => {
    getDocument.mockImplementation(() => ({
      promise: Promise.reject(new Error('File unavailable')),
      destroy,
    }));
    const { container } = render(<PdfFlyerBackground src="https://example.com/missing.pdf" />);
    act(() => onIntersection([{ isIntersecting: true }]));

    expect(await screen.findByText('Flyer available')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('event-pdf-background--error');
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('cancels an in-progress render when its card is removed', async () => {
    let rejectRender;
    const promise = new Promise((_, reject) => { rejectRender = reject; });
    cancel.mockImplementation(() => rejectRender(new Error('Rendering cancelled')));
    renderPage.mockReturnValue({ promise, cancel });
    const { unmount } = render(<PdfFlyerBackground src="https://example.com/flyer.pdf" />);
    act(() => onIntersection([{ isIntersecting: true }]));
    await waitFor(() => expect(renderPage).toHaveBeenCalled());

    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    await act(async () => {});
  });
});
