import React from "react";
import "../styles/EventCalendar.css";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function EventCalendar({
  calendarDays,
  eventCountByDate,
  getDateKey,
  handleMonthChange,
  handleSelectDay,
  isSameDay,
  monthLabel,
  resetDateFilter,
  selectedDates = [],
  formatFullDate,
  visibleMonth,
  canNavigatePrevious = true,
  canNavigateNext = true,
  minVisibleMonth,
  maxVisibleMonth,
}) {
  return (
    <div className="calendar-card">
      <div className="calendar-month-header">
        <button
          className="calendar-arrow"
          type="button"
          onClick={canNavigatePrevious ? () => handleMonthChange(-1) : undefined}
          aria-label="Previous month"
          disabled={!canNavigatePrevious}
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <span>{monthLabel}</span>
        <button
          className="calendar-arrow"
          type="button"
          onClick={canNavigateNext ? () => handleMonthChange(1) : undefined}
          aria-label="Next month"
          disabled={!canNavigateNext}
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="calendar-weekdays">
        {DAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarDays.map((day) => {
          const dayKey = getDateKey(day);
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
          const dayMonthStart = new Date(day.getFullYear(), day.getMonth(), 1);
          const isAllowedMonth =
            minVisibleMonth && maxVisibleMonth
              ? dayMonthStart >= minVisibleMonth && dayMonthStart <= maxVisibleMonth
              : true;
          const isDisabled = !isAllowedMonth;
          const isSelected = selectedDates.some((selectedDate) => isSameDay(day, selectedDate));
          const eventCount = eventCountByDate[dayKey] || 0;

          return (
            <button
              key={dayKey}
              type="button"
              className={`calendar-day ${isSelected ? "selected" : ""} ${
                eventCount > 0 ? "has-event" : ""
              } ${!isCurrentMonth ? "outside-month" : ""} ${
                isDisabled ? "disabled" : ""
              }`}
              onClick={() => handleSelectDay(day)}
              disabled={isDisabled}
            >
              <span className="calendar-day-number">{day.getDate()}</span>
              {eventCount > 0 && <span className="event-dot"></span>}
            </button>
          );
        })}
      </div>

      <div className="selected-date-box">
        <p>Showing events for</p>
        <strong>
          {selectedDates.length === 0
            ? monthLabel
            : selectedDates.length === 1
            ? formatFullDate(selectedDates[0])
            : `${selectedDates.length} dates selected`}
        </strong>
        {selectedDates.length > 0 && (
          <button className="view-all-btn" type="button" onClick={resetDateFilter}>
            View All Dates
          </button>
        )}
      </div>
    </div>
  );
}

export default EventCalendar;
