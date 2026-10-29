import { describe, it, expect } from 'vitest';
import {
  parseSupabaseDateTime,
  isSameCalendarDay,
  formatFullDate,
  formatEventDateLabel,
  formatEventTimeRange,
  isEventActive,
} from './dateTime';

describe('dateTime utilities', () => {
  it('returns null for invalid timestamps', () => {
    expect(parseSupabaseDateTime(null)).toBeNull();
    expect(parseSupabaseDateTime('invalid-date')).toBeNull();
    expect(parseSupabaseDateTime(12345)).toBeNull();
  });

  it('parses string and Date inputs correctly', () => {
    const isoString = '2026-04-01 10:30:00';
    const parsed = parseSupabaseDateTime(isoString);

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getHours()).toBe(10);

    const dateInput = new Date('2026-05-02T00:00:00');
    expect(parseSupabaseDateTime(dateInput)).toEqual(dateInput);
  });

  it('compares calendar days accurately', () => {
    const first = new Date('2026-04-01T05:00:00');
    const second = new Date('2026-04-01T23:59:59');
    const third = new Date('2026-04-02T00:00:00');

    expect(isSameCalendarDay(first, second)).toBe(true);
    expect(isSameCalendarDay(first, third)).toBe(false);
  });

  it('formats dates and event labels correctly', () => {
    const startDate = new Date('2026-04-01T10:00:00');
    const endDate = new Date('2026-04-01T12:00:00');
    const multiDayEnd = new Date('2026-04-02T12:00:00');

    expect(formatFullDate(startDate)).toContain('2026');
    expect(formatEventDateLabel(startDate, endDate)).toContain('2026');
    expect(formatEventDateLabel(startDate, multiDayEnd)).toContain('-');

    const sameDayTime = formatEventTimeRange(startDate, endDate);
    expect(sameDayTime).toContain(':');
    expect(sameDayTime).not.toContain('- 2026');

    const multiDayTime = formatEventTimeRange(startDate, multiDayEnd);
    expect(multiDayTime).toContain('2026');
    expect(multiDayTime).toContain(' - ');
  });

  it('correctly determines whether an event is active', () => {
    const reference = new Date('2026-10-28T12:00:00');

    // Invalid input
    expect(isEventActive(null, reference)).toBe(false);
    expect(isEventActive(undefined, reference)).toBe(false);

    // Legacy mock with only id
    expect(isEventActive({ id: 11 }, reference)).toBe(true);

    // Pending or rejected events are not active
    expect(isEventActive({ status: 'pending', end_datetime: '2026-11-01T10:00:00' }, reference)).toBe(false);
    expect(isEventActive({ status: 'rejected', end_datetime: '2026-11-01T10:00:00' }, reference)).toBe(false);

    // Approved upcoming event is active
    expect(isEventActive({ status: 'approved', end_datetime: '2026-11-01T10:00:00' }, reference)).toBe(true);

    // Approved past event is not active
    expect(isEventActive({ status: 'approved', end_datetime: '2026-10-20T10:00:00' }, reference)).toBe(false);

    // Approved event ending in the future on the same day is active
    expect(isEventActive({ status: 'approved', end_datetime: '2026-10-28T14:00:00' }, reference)).toBe(true);

    // Approved event ended earlier on the same day is not active
    expect(isEventActive({ status: 'approved', end_datetime: '2026-10-28T10:00:00' }, reference)).toBe(false);
  });
});