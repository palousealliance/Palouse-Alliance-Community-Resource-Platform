import React, { useState } from "react";
import Popup from "./Popup";
import PdfFlyerBackground from "./PdfFlyerBackground";
import {
  formatEventTimeRange,
  isSameCalendarDay,
} from "../lib/dateTime";
import { getEventFlyerUrl } from "../lib/supabase";
import "../styles/EventCard.css";

function EventCard({ event, footerActions = null, formatFullDate, formatTimeRange }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flyerModalOpen, setFlyerModalOpen] = useState(false);

  const hasLocation = Boolean(event.location?.trim());
  const volunteerUrl = event.volunteer_url?.trim();
  const volunteerActionLabel = volunteerUrl ? "Event Link" : "";
  const volunteerPopupDescription = "You are about to leave the site to visit this event's volunteer page.";
  const volunteerContinueLabel = "Continue";
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const organizationName = event.organizationName?.trim();
  const categoryName = event.categoryName?.trim();
  const flyerUrl = getEventFlyerUrl(event.flyer_path);
  const isPdfFlyer = Boolean(event.flyer_path?.toLowerCase().endsWith(".pdf"));

  const hasValidDates =
    event.startDate instanceof Date &&
    !Number.isNaN(event.startDate.getTime()) &&
    event.endDate instanceof Date &&
    !Number.isNaN(event.endDate.getTime());

  const formatDateValue = (date) => {
    if (typeof formatFullDate === "function") {
      return formatFullDate(date);
    }

    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTimeOnly = (date) => {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderTimeValue = () => {
    if (!hasValidDates) {
      return "Time unavailable";
    }

    if (typeof formatTimeRange === "function") {
      return formatTimeRange(event.startDate, event.endDate);
    }

    return formatEventTimeRange(event.startDate, event.endDate);
  };

  const renderDateMeta = () => {
    if (!hasValidDates) {
      return (
        <>
          <p>
            <strong>Date:</strong> Date unavailable
          </p>
        </>
      );
    }

    if (isSameCalendarDay(event.startDate, event.endDate)) {
      return (
        <>
          <p>
            <strong>Date:</strong> {formatDateValue(event.startDate)}
          </p>
          <p>
            <strong>Time:</strong> {renderTimeValue()}
          </p>
        </>
      );
    }

    return (
      <>
        <p>
          <strong>Start:</strong> {formatDateValue(event.startDate)} · {formatTimeOnly(event.startDate)}
        </p>
        <p>
          <strong>End:</strong> {formatDateValue(event.endDate)} · {formatTimeOnly(event.endDate)}
        </p>
      </>
    );
  };

  const handleViewDetails = () => {
    setConfirmOpen(true);
  };

  const handleLeaveSite = () => {
    if (!volunteerUrl) {
      return;
    }

    window.open(volunteerUrl, "_blank", "noopener,noreferrer");
    setConfirmOpen(false);
  };

  return (
    <>
      <article className={`event-card${flyerUrl ? " event-card--with-flyer" : ""}`}>
        {flyerUrl ? (
          <div className="event-flyer-backdrop" aria-hidden="true">
            {isPdfFlyer ? (
              <PdfFlyerBackground key={flyerUrl} src={flyerUrl} />
            ) : (
              <img src={flyerUrl} alt="" loading="lazy" />
            )}
          </div>
        ) : null}

        <div className="event-card-copy">
          <h3>{event.title}</h3>
          {(organizationName || categoryName) ? (
            <p className="event-org">
              {organizationName ? <span>{organizationName}</span> : null}
              {organizationName && categoryName ? <span> · </span> : null}
              {categoryName ? <span>{categoryName}</span> : null}
            </p>
          ) : null}

          <p className="event-description">{event.description}</p>

          <div className="event-meta">
            {renderDateMeta()}
            {hasLocation ? (
              <p>
                <strong>Location:</strong> {event.location.trim()}
              </p>
            ) : null}
          </div>

          {tags.length > 0 ? (
            <div className="event-tag-list" aria-label="Event tags">
              {tags.map((tag) => (
                <span key={tag} className="event-tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="event-actions">
            {flyerUrl ? (
              <button
                className="secondary-btn"
                type="button"
                onClick={() => setFlyerModalOpen(true)}
              >
                View Flyer
              </button>
            ) : null}

            {volunteerUrl ? (
              <button className="primary-btn" type="button" onClick={handleViewDetails}>
                {volunteerActionLabel}
              </button>
            ) : null}
          </div>

          {footerActions ? <div className="event-footer-actions">{footerActions}</div> : null}
        </div>
      </article>

      {/* Volunteer redirect popup */}
      {confirmOpen ? (
        <Popup
          title="Leave site?"
          description={volunteerPopupDescription}
          onClose={() => setConfirmOpen(false)}
          className="dialog-popup"
          actions={
            <>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={handleLeaveSite}>
                {volunteerContinueLabel}
              </button>
            </>
          }
          ariaLabel="Leave site confirmation"
        >
          <p className="event-redirect-url">{volunteerUrl}</p>
        </Popup>
      ) : null}

      {/* View flyer modal */}
      {flyerModalOpen && flyerUrl ? (
        <Popup
          title={`${event.title} - Flyer`}
          onClose={() => setFlyerModalOpen(false)}
          className="regular-popup flyer-modal-popup"
          ariaLabel={`${event.title} Flyer Modal`}
          actions={
            <button
              type="button"
              className="primary-btn"
              onClick={() => setFlyerModalOpen(false)}
            >
              Close
            </button>
          }
        >
          <div className="flyer-preview-container">
            {isPdfFlyer ? (
              <iframe
                src={flyerUrl}
                title={`${event.title} Flyer PDF`}
                className="flyer-pdf-iframe"
              />
            ) : (
              <img
                src={flyerUrl}
                alt={`${event.title} Flyer`}
                className="flyer-modal-image"
              />
            )}
          </div>
        </Popup>
      ) : null}
    </>
  );
}

export default EventCard;
