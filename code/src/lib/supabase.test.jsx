import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockList = vi.fn();
const mockGetPublicUrl = vi.fn();

const mockStorageBucket = {
  upload: mockUpload,
  remove: mockRemove,
  list: mockList,
  getPublicUrl: mockGetPublicUrl,
};

const mockStorageFrom = vi.fn(() => mockStorageBucket);

const mockClient = {
  isClient: true,
  storage: {
    from: mockStorageFrom,
  },
};

const mockCreateClient = vi.fn(() => mockClient);

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

const {
  supabase,
  getEventFlyerUrl,
  getHistoryPdfUrl,
  validateHistoryPdfFile,
  fetchCurrentHistoryPdf,
  replaceHistoryPdf,
  DEFAULT_HISTORY_PDF_URL,
} = await vi.importActual('./supabase.js');

describe('supabase client setup and storage helpers', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockRemove.mockReset();
    mockList.mockReset();
    mockGetPublicUrl.mockReset();
    mockStorageFrom.mockClear();
  });

  it('creates a supabase client using environment settings', () => {
    expect(supabase).toEqual(mockClient);
    expect(mockCreateClient).toHaveBeenCalled();
  });

  describe('getEventFlyerUrl', () => {
    it('returns null if no flyerPath is provided', () => {
      expect(getEventFlyerUrl(null)).toBeNull();
      expect(getEventFlyerUrl('')).toBeNull();
    });

    it('returns publicUrl from event-flyers bucket', () => {
      mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/flyer.png' } });
      const url = getEventFlyerUrl('flyer.png');
      expect(mockStorageFrom).toHaveBeenCalledWith('event-flyers');
      expect(url).toBe('https://example.com/flyer.png');
    });
  });

  describe('getHistoryPdfUrl', () => {
    it('returns default fallback URL when no path or env path is configured', () => {
      const url = getHistoryPdfUrl();
      expect(url).toBe(DEFAULT_HISTORY_PDF_URL);
    });

    it('returns publicUrl from storage when filePath is provided', () => {
      mockGetPublicUrl.mockReturnValueOnce({ data: { publicUrl: 'https://example.com/custom-history.pdf' } });
      const url = getHistoryPdfUrl('custom-history.pdf');
      expect(url).toBe('https://example.com/custom-history.pdf');
    });
  });

  describe('validateHistoryPdfFile', () => {
    it('rejects empty or null files', () => {
      expect(validateHistoryPdfFile(null)).toMatch(/select a PDF file/i);
    });

    it('rejects non-PDF files', () => {
      const imageFile = new File(['dummy'], 'image.png', { type: 'image/png' });
      expect(validateHistoryPdfFile(imageFile)).toMatch(/must be a PDF document/i);
    });

    it('rejects files larger than 5 MB', () => {
      const largeFile = new File(['dummy'], 'doc.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
      expect(validateHistoryPdfFile(largeFile)).toMatch(/5 MB or smaller/i);
    });

    it('accepts valid PDF files', () => {
      const validFile = new File(['dummy'], 'history.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });
      expect(validateHistoryPdfFile(validFile)).toBeNull();
    });
  });

  describe('fetchCurrentHistoryPdf', () => {
    it('returns default fallback URL when bucket list returns error', async () => {
      mockList.mockResolvedValueOnce({ data: null, error: { message: 'Bucket not found' } });
      const result = await fetchCurrentHistoryPdf();
      expect(result.url).toBe(DEFAULT_HISTORY_PDF_URL);
      expect(result.fileName).toBeNull();
    });

    it('returns default fallback URL when bucket has no files', async () => {
      mockList.mockResolvedValueOnce({ data: [], error: null });
      const result = await fetchCurrentHistoryPdf();
      expect(result.url).toBe(DEFAULT_HISTORY_PDF_URL);
      expect(result.fileName).toBeNull();
    });

    it('returns active file URL when bucket contains a file', async () => {
      mockList.mockResolvedValueOnce({
        data: [{ name: 'current-history.pdf' }],
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/current-history.pdf' },
      });

      const result = await fetchCurrentHistoryPdf();
      expect(result.fileName).toBe('current-history.pdf');
      expect(result.url).toBe('https://example.com/current-history.pdf');
    });
  });

  describe('replaceHistoryPdf', () => {
    it('throws when file is not a valid PDF', async () => {
      const invalidFile = new File(['test'], 'file.txt', { type: 'text/plain' });
      await expect(replaceHistoryPdf(invalidFile)).rejects.toThrow(/must be a PDF document/i);
      expect(mockList).not.toHaveBeenCalled();
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('aborts and DOES NOT upload new file if cleanup/remove fails', async () => {
      const pdfFile = new File(['%PDF-1.4 test content'], 'new-history.pdf', { type: 'application/pdf' });
      Object.defineProperty(pdfFile, 'size', { value: 5000 });

      mockList.mockResolvedValueOnce({
        data: [{ name: 'old-history.pdf' }],
        error: null,
      });
      mockRemove.mockResolvedValueOnce({
        error: { message: 'Permission denied to delete' },
      });

      await expect(replaceHistoryPdf(pdfFile)).rejects.toThrow(
        /Failed to remove old file \(Permission denied to delete\)\. The new PDF was not uploaded\./
      );

      // Verify remove was called with the old file
      expect(mockRemove).toHaveBeenCalledWith(['old-history.pdf']);
      // Verify upload was NEVER called because cleanup failed!
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('removes old file and uploads new file when cleanup succeeds', async () => {
      const pdfFile = new File(['%PDF-1.4 test content'], 'new-history.pdf', { type: 'application/pdf' });
      Object.defineProperty(pdfFile, 'size', { value: 5000 });

      mockList.mockResolvedValueOnce({
        data: [{ name: 'old-history.pdf' }],
        error: null,
      });
      mockRemove.mockResolvedValueOnce({
        data: [{ name: 'old-history.pdf' }],
        error: null,
      });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'uploaded.pdf' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/new-uploaded.pdf' },
      });

      const result = await replaceHistoryPdf(pdfFile);

      expect(mockRemove).toHaveBeenCalledWith(['old-history.pdf']);
      expect(mockUpload).toHaveBeenCalled();
      expect(result.url).toBe('https://example.com/new-uploaded.pdf');
      expect(result.originalName).toBe('new-history.pdf');
    });

    it('uploads new file directly when bucket was previously empty', async () => {
      const pdfFile = new File(['%PDF-1.4 test content'], 'initial.pdf', { type: 'application/pdf' });
      Object.defineProperty(pdfFile, 'size', { value: 5000 });

      mockList.mockResolvedValueOnce({
        data: [],
        error: null,
      });
      mockUpload.mockResolvedValueOnce({
        data: { path: 'initial.pdf' },
        error: null,
      });
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/initial.pdf' },
      });

      const result = await replaceHistoryPdf(pdfFile);

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockUpload).toHaveBeenCalled();
      expect(result.url).toBe('https://example.com/initial.pdf');
    });
  });
});
