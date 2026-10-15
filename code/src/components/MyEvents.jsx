import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { parseSupabaseDateTime } from "../lib/dateTime";

function normalizeTagName(tag) {
  return typeof tag === "string" ? tag.trim() : "";
}

function parseTags(tags, tagLookup = {}) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tagItem) => {
      if (typeof tagItem === "string") {
        const normalized = normalizeTagName(tagItem);
        return typeof tagLookup[normalized] === "string"
          ? normalizeTagName(tagLookup[normalized])
          : normalized;
      }
      if (typeof tagItem?.name === "string") {
        return normalizeTagName(tagItem.name);
      }
      const nestedTag = tagItem?.tags || tagItem?.tag;
      if (typeof nestedTag?.name === "string") {
        return normalizeTagName(nestedTag.name);
      }
      const tagId = tagItem?.tag_id || tagItem?.tagId || nestedTag?.id;
      if (typeof tagId === "string" && tagLookup[tagId]) {
        return normalizeTagName(tagLookup[tagId]);
      }
      return "";
    })
    .map((tagName) => (typeof tagName === "string" ? tagName.trim() : ""))
    .filter((tagName) => tagName.length > 0)
    .filter((tagName, index, self) => self.indexOf(tagName) === index);
}

function normalizeSupabaseEvent(event, tagLookup = {}, eventTagIds = []) {
  return {
    ...event,
    startDate: parseSupabaseDateTime(event.start_datetime),
    endDate: parseSupabaseDateTime(event.end_datetime),
    organizationName: event.organizations?.name || "Unknown Organization",
    location: event.location || "",
    tags: parseTags(eventTagIds.length > 0 ? eventTagIds : event.event_tags || event.tags, tagLookup),
  };
}

const MyEvents = ({ session, formatTimeRange, onClose, onPostEvent, canPostEvent = true }) => {
  const [myEvents, setMyEvents] = useState([]);
  const [myEventsLoading, setMyEventsLoading] = useState(false);
  const [myEventsError, setMyEventsError] = useState("");
  const [myEventsSections, setMyEventsSections] = useState({
    pending: false,
    approved: false,
    rejected: false,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchMyEvents = async () => {
      if (!session?.user?.id) {
        setMyEvents([]);
        setMyEventsError("");
        setMyEventsLoading(false);
        return;
      }

      setMyEventsLoading(true);
      setMyEventsError("");

      try {
        const [{ data, error }, { data: tagRows, error: tagsError }] = await Promise.all([
          supabase
            .from("events")
            .select(
              `
                id,
                title,
                start_datetime,
                end_datetime,
                status,
                location,
                created_by,
                organizations ( name ),
                event_tags ( tag_id )
              `
            )
            .eq("created_by", session.user.id)
            .order("start_datetime", { ascending: true }),
          supabase.from("tags").select("id, name").order("name", { ascending: true }),
        ]);

        if (!isMounted) {
          return;
        }

        if (tagsError) {
          console.warn("Tag lookup data loaded with a partial error:", tagsError);
        }

        if (error) {
          console.error("Error fetching user events:", error);
          setMyEvents([]);
          setMyEventsError("We couldn't load your submitted events right now.");
          setMyEventsLoading(false);
          return;
        }

        const tagLookup = (tagRows || []).reduce((lookup, tag) => {
          if (typeof tag?.id === "string" && typeof tag.name === "string") {
            lookup[tag.id] = tag.name;
          }
          return lookup;
        }, {});

        const eventIds = (data || []).map((event) => event.id).filter(Boolean);
        let eventTagRows = [];

        if (eventIds.length > 0) {
          const { data: fetchedEventTagRows, error: eventTagsError } = await supabase
            .from("event_tags")
            .select("event_id, tag_id")
            .in("event_id", eventIds);

          if (eventTagsError) {
            console.warn("My events tag lookup failed:", eventTagsError);
          }

          eventTagRows = fetchedEventTagRows || [];
        }

        const tagsByEventId = (eventTagRows || []).reduce((acc, row) => {
          if (!row || !row.event_id) {
            return acc;
          }

          const ids = acc[row.event_id] || [];
          if (row.tag_id) {
            acc[row.event_id] = [...ids, row.tag_id];
          }
          return acc;
        }, {});

        setMyEvents(
          (data || []).map((event) => normalizeSupabaseEvent(event, tagLookup, tagsByEventId[event.id] || []))
        );
        setMyEventsLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.warn("Unable to load My Events:", error);
        setMyEvents([]);
        setMyEventsError("We couldn't load your submitted events right now.");
        setMyEventsLoading(false);
      }
    };

    fetchMyEvents();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const myEventCounts = useMemo(() => {
    return myEvents.reduce(
      (counts, event) => {
        const statusKey = (event.status || "").toLowerCase();

        if (statusKey === "approved") {
          counts.approved += 1;
        } else if (statusKey === "rejected") {
          counts.rejected += 1;
        } else {
          counts.pending += 1;
        }

        return counts;
      },
      { approved: 0, pending: 0, rejected: 0 }
    );
  }, [myEvents]);

  const pendingMyEvents = useMemo(
    () => myEvents.filter((event) => {
      const statusKey = (event.status || "").toLowerCase();
      return statusKey === "pending" || statusKey === "";
    }),
    [myEvents]
  );

  const approvedMyEvents = useMemo(
    () => myEvents.filter((event) => (event.status || "").toLowerCase() === "approved"),
    [myEvents]
  );

  const rejectedMyEvents = useMemo(
    () => myEvents.filter((event) => (event.status || "").toLowerCase() === "rejected"),
    [myEvents]
  );

  function toggleMyEventsSection(sectionName) {
    setMyEventsSections((currentSections) => {
      const isOpen = currentSections[sectionName];
      return {
        pending: false,
        approved: false,
        rejected: false,
        [sectionName]: !isOpen,
      };
    });
  }

  return (
    <div className="my-events-popup">
      <div className="my-events-popup-panel">
        <div className="panel-header my-events-popup-header">
          <div>
            <h2>My Events</h2>
            <p className="panel-description">
              Track where your community submissions stand.
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close My Events"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {myEventsError ? (
          <div className="my-events-empty-state">
            <h3>Unable to Load</h3>
            <p>{myEventsError}</p>
          </div>
        ) : myEvents.length === 0 && !myEventsLoading ? (
          <div className="my-events-empty-state">
            <h3>No Submitted Events Yet</h3>
            <p>
              When you submit an event for review, it will appear here with its
              approval status.
            </p>
            {canPostEvent ? (
              <button
                type="button"
                className="my-events-cta"
                onClick={onPostEvent || (() => {})}
              >
                Post an Event
              </button>
            ) : (
              <p className="my-events-group-empty">
                Your account must be linked to an organization before you can post an event.
              </p>
            )}
          </div>
        ) : (
          <div className="my-events-list">
            <div className="my-events-summary my-events-summary-popup">
              <div className="my-events-stat">
                <span className="my-events-stat-label">Pending</span>
                <strong>{myEventsLoading ? "—" : myEventCounts.pending}</strong>
              </div>
              <div className="my-events-stat">
                <span className="my-events-stat-label">Approved</span>
                <strong>{myEventsLoading ? "—" : myEventCounts.approved}</strong>
              </div>
              <div className="my-events-stat">
                <span className="my-events-stat-label">Rejected</span>
                <strong>{myEventsLoading ? "—" : myEventCounts.rejected}</strong>
              </div>
            </div>

            <section className="my-events-group">
              <button
                className="my-events-group-toggle"
                onClick={() => toggleMyEventsSection("pending")}
                type="button"
              >
                <span className="my-events-group-title">Pending Events</span>
                <span className="my-events-group-meta">
                  <span className="my-events-group-chevron" aria-hidden="true">
                    <span className="material-symbols-outlined">
                      {myEventsSections.pending ? "expand_less" : "expand_more"}
                    </span>
                  </span>
                </span>
              </button>

              {myEventsSections.pending ? (
                pendingMyEvents.length > 0 ? (
                  <div className="my-events-group-list">
                    {pendingMyEvents.map((event) => (
                      <article className="my-event-card" key={event.id}>
                        <h3>{event.title}</h3>
                        {event.location ? (
                          <p className="my-event-location">{event.location}</p>
                        ) : null}
                        <p className="my-event-time">
                          {formatTimeRange(event.startDate, event.endDate)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="my-events-group-empty">
                    No pending events right now.
                  </p>
                )
              ) : null}
            </section>

            <section className="my-events-group">
              <button
                className="my-events-group-toggle"
                onClick={() => toggleMyEventsSection("approved")}
                type="button"
              >
                <span className="my-events-group-title">Approved Events</span>
                <span className="my-events-group-meta">
                  <span className="my-events-group-chevron" aria-hidden="true">
                    <span className="material-symbols-outlined">
                      {myEventsSections.approved ? "expand_less" : "expand_more"}
                    </span>
                  </span>
                </span>
              </button>

              {myEventsSections.approved ? (
                approvedMyEvents.length > 0 ? (
                  <div className="my-events-group-list">
                    {approvedMyEvents.map((event) => (
                      <article className="my-event-card" key={event.id}>
                        <h3>{event.title}</h3>
                        {event.location ? (
                          <p className="my-event-location">{event.location}</p>
                        ) : null}
                        <p className="my-event-time">
                          {formatTimeRange(event.startDate, event.endDate)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="my-events-group-empty">
                    No approved events yet.
                  </p>
                )
              ) : null}
            </section>

            <section className="my-events-group">
              <button
                className="my-events-group-toggle"
                onClick={() => toggleMyEventsSection("rejected")}
                type="button"
              >
                <span className="my-events-group-title">Rejected Events</span>
                <span className="my-events-group-meta">
                  <span className="my-events-group-chevron" aria-hidden="true">
                    <span className="material-symbols-outlined">
                      {myEventsSections.rejected ? "expand_less" : "expand_more"}
                    </span>
                  </span>
                </span>
              </button>

              {myEventsSections.rejected ? (
                rejectedMyEvents.length > 0 ? (
                  <div className="my-events-group-list">
                    {rejectedMyEvents.map((event) => (
                      <article className="my-event-card" key={event.id}>
                        <h3>{event.title}</h3>
                        {event.location ? (
                          <p className="my-event-location">{event.location}</p>
                        ) : null}
                        <p className="my-event-time">
                          {formatTimeRange(event.startDate, event.endDate)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="my-events-group-empty">
                    No rejected events yet.
                  </p>
                )
              ) : null}
            </section>

          </div>
        )}
      </div>
    </div>
  );
};

export default MyEvents;
