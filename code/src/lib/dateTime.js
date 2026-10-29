export function parseSupabaseDateTime(timestamp) {
  if (!timestamp) {
    return null;
  }

  if (timestamp instanceof Date) {
    return Number.isNaN(timestamp.getTime()) ? null : timestamp;
  }

  if (typeof timestamp !== "string") {
    return null;
  }

  const normalizedTimestamp = timestamp.trim().replace(" ", "T");
  const parsedDate = new Date(normalizedTimestamp);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function isSameCalendarDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

export function formatFullDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventDateLabel(startDate, endDate) {
  if (
    !(startDate instanceof Date) ||
    Number.isNaN(startDate.getTime()) ||
    !(endDate instanceof Date) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Date unavailable";
  }

  if (isSameCalendarDay(startDate, endDate)) {
    return formatFullDate(startDate);
  }

  return `${formatFullDate(startDate)} - ${formatFullDate(endDate)}`;
}

export function formatEventTimeRange(startDate, endDate) {
  const timeFormat = { hour: "numeric", minute: "2-digit" };

  if (
    !(startDate instanceof Date) ||
    Number.isNaN(startDate.getTime()) ||
    !(endDate instanceof Date) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Time unavailable";
  }

  if (!isSameCalendarDay(startDate, endDate)) {
    return `${formatFullDate(startDate)} ${startDate.toLocaleTimeString("en-US", timeFormat)} - ${formatFullDate(endDate)} ${endDate.toLocaleTimeString("en-US", timeFormat)}`;
  }

  return `${startDate.toLocaleTimeString("en-US", timeFormat)} - ${endDate.toLocaleTimeString("en-US", timeFormat)}`;
}

export function isEventActive(event, referenceDate = new Date()) {
  if (!event || typeof event !== "object") {
    return false;
  }

  if (typeof event.status === "string" && event.status.trim()) {
    if (event.status.trim().toLowerCase() !== "approved") {
      return false;
    }
  }

  const endTimestamp = event.end_datetime || event.endDate || event.start_datetime || event.startDate;
  if (endTimestamp) {
    const endDate = parseSupabaseDateTime(endTimestamp);
    if (endDate && !Number.isNaN(endDate.getTime())) {
      if (typeof endTimestamp === "string" && !endTimestamp.includes("T") && !endTimestamp.includes(" ")) {
        endDate.setHours(23, 59, 59, 999);
      }
      return endDate >= referenceDate;
    }
  }

  return true;
}
