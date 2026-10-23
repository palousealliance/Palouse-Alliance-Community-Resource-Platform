import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import EventCalendar from "../components/EventCalendar";
import EventCard from "../components/EventCard";
import MyEvents from "../components/MyEvents";
import Popup from "../components/Popup";
import PostEventForm from "../components/PostEventForm";
import { parseSupabaseDateTime } from "../lib/dateTime";
import SubscribePopup from "../components/SubscribePopup";
import { supabase } from "../lib/supabase";
import {
  getSessionCacheValue,
  readSessionCache,
  writeSessionCache,
  EVENTS_PAGE_CACHE_KEY,
} from "../lib/sessionCache";
import "../styles/Events.css";

const ALL_EVENTS_CATEGORY = "All Events";
const ALL_EVENTS_TAG = "All Tags";
const TOAST_DURATION_MS = 2600;

function getStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

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

      if (!tagItem || typeof tagItem !== "object") {
        return "";
      }

      if (typeof tagItem.name === "string") {
        return normalizeTagName(tagItem.name);
      }

      const nestedTag = tagItem.tags || tagItem.tag;
      if (nestedTag && typeof nestedTag.name === "string") {
        return normalizeTagName(nestedTag.name);
      }

      const tagId = tagItem.tag_id || tagItem.tagId || nestedTag?.id;
      if (typeof tagId === "string" && tagLookup[tagId]) {
        return normalizeTagName(tagLookup[tagId]);
      }

      return "";
    })
    .filter((tag) => tag.length > 0)
    .filter((tag, index, self) => self.indexOf(tag) === index);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function clampMonth(month, minMonth, maxMonth) {
  if (month < minMonth) {
    return minMonth;
  }

  if (month > maxMonth) {
    return maxMonth;
  }

  return month;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(date1, date2) {
  return getDateKey(date1) === getDateKey(date2);
}

function isValidDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function isDateWithinEvent(date, startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }

  const currentDay = getStartOfDay(date);
  const eventStartDay = getStartOfDay(startDate);
  const eventEndDay = getStartOfDay(endDate);
  return currentDay >= eventStartDay && currentDay <= eventEndDay;
}

function getEventDateKeys(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return [];
  }

  const keys = [];
  const rangeStart = getStartOfDay(startDate);
  const rangeEnd = getStartOfDay(endDate);

  for (
    let currentDate = rangeStart;
    currentDate <= rangeEnd;
    currentDate = addDays(currentDate, 1)
  ) {
    keys.push(getDateKey(currentDate));
  }

  return keys;
}

function formatFullDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(start, end) {
  const timeFormat = { hour: "numeric", minute: "2-digit" };

  if (!isSameDay(start, end)) {
    return `${formatFullDate(start)} ${start.toLocaleTimeString(
      "en-US",
      timeFormat
    )} - ${formatFullDate(end)} ${end.toLocaleTimeString("en-US", timeFormat)}`;
  }

  return `${start.toLocaleTimeString("en-US", timeFormat)} - ${end.toLocaleTimeString(
    "en-US",
    timeFormat
  )}`;
}

function formatCompactDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getMonthMatrix(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function normalizeSupabaseEvent(event, tagLookup = {}, eventTagIds = []) {
  const startDate = parseSupabaseDateTime(event.start_datetime);
  const endDate = parseSupabaseDateTime(event.end_datetime);
  const eventTags = parseTags(eventTagIds.length > 0 ? eventTagIds : event.event_tags || event.tags, tagLookup);

  return {
    ...event,
    description: event.description || "",
    location: event.location || "",
    startDate,
    endDate,
    organizationName: event.organizations?.name || "Unknown Organization",
    categoryName: event.categories?.name || "General",
    tags: eventTags,
    tagIds: eventTagIds.length > 0 ? eventTagIds : (event.event_tags || []).map((tagRow) => tagRow?.tag_id).filter(Boolean),
  };
}

function hydrateCachedEvents(cachedEvents) {
  if (!Array.isArray(cachedEvents)) {
    return [];
  }

  return cachedEvents
    .map((event) => {
      const startDate = parseSupabaseDateTime(event.startDate || event.start_datetime);
      const endDate = parseSupabaseDateTime(event.endDate || event.end_datetime);

      return {
        ...event,
        startDate,
        endDate,
      };
    })
    .filter((event) => isValidDate(event.startDate) && isValidDate(event.endDate));
}

const Events = ({ session }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cachedEventsEntry = readSessionCache(EVENTS_PAGE_CACHE_KEY);
  const cachedEventsPage = getSessionCacheValue(cachedEventsEntry);
  const [events, setEvents] = useState(() => hydrateCachedEvents(cachedEventsPage?.events));
  const [categories, setCategories] = useState(() => cachedEventsPage?.categories ?? [ALL_EVENTS_CATEGORY]);
  const [tags, setTags] = useState(() => cachedEventsPage?.tags ?? [{ id: ALL_EVENTS_TAG, name: ALL_EVENTS_TAG }]);
  const [selectedCategories, setSelectedCategories] = useState([
    ALL_EVENTS_CATEGORY,
  ]);
  const [selectedTags, setSelectedTags] = useState([ALL_EVENTS_TAG]);
  const [filterMenuOpen, setFilterMenuOpen] = useState(null);
  const filterMenuRef = useRef(null);
  const [eventsLoading, setEventsLoading] = useState(() => !cachedEventsPage);
  const [eventsError, setEventsError] = useState("");
  const [toast, setToast] = useState(() =>
    location.state?.flashMessage
      ? {
          message: location.state.flashMessage,
          type: location.state.flashType || "success",
        }
      : null
  );
  const [selectedDates, setSelectedDates] = useState([]);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q")?.trim() || "");
  const [isMyEventsOpen, setIsMyEventsOpen] = useState(false);
  const [isPostEventOpen, setIsPostEventOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [postEventSuccessOpen, setPostEventSuccessOpen] = useState(false);
  const [revalidationKey, setRevalidationKey] = useState(0);
  const [currentUserOrgId, setCurrentUserOrgId] = useState(null);
  const previousSessionUserIdRef = useRef(session?.user?.id || null);

  useEffect(() => {
    const currentSessionUserId = session?.user?.id || null;

    if (previousSessionUserIdRef.current === currentSessionUserId) {
      return;
    }

    previousSessionUserIdRef.current = currentSessionUserId;

    setSelectedCategories([ALL_EVENTS_CATEGORY]);
    setSelectedTags([ALL_EVENTS_TAG]);
    setSelectedDates([]);
    setFilterMenuOpen(null);
    setToast(null);
    setIsMyEventsOpen(false);
    setIsPostEventOpen(false);
    setPostEventSuccessOpen(false);
  }, [session?.user?.id]);

  useEffect(() => {
    setSearchQuery(searchParams.get("q")?.trim() || "");
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserOrg = async () => {
      if (!session?.user?.id) {
        if (isMounted) {
          setCurrentUserOrgId(null);
        }
        return;
      }

      const usersQuery = supabase.from("users").select("organization_id, organizations(name)");
      const scopedUsersQuery = typeof usersQuery?.eq === "function"
        ? usersQuery.eq("id", session.user.id)
        : usersQuery;

      const maybeSingle = scopedUsersQuery?.maybeSingle;

      if (typeof maybeSingle !== "function") {
        if (isMounted) {
          setCurrentUserOrgId(null);
        }
        return;
      }

      const { data, error } = await maybeSingle.call(scopedUsersQuery);

      if (!isMounted) {
        return;
      }

      if (error) {
        setCurrentUserOrgId(null);
        return;
      }

      const isUnaffiliated = !data?.organization_id ||
        data.organization_id === "unaffiliated" ||
        data?.organizations?.name?.trim()?.toLowerCase() === "unaffiliated";

      setCurrentUserOrgId(isUnaffiliated ? "unaffiliated" : data?.organization_id || null);
    };

    loadCurrentUserOrg();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const currentMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);

  const minVisibleMonth = useMemo(() => addMonths(currentMonth, -1), [currentMonth]);
  const maxVisibleMonth = useMemo(() => addMonths(currentMonth, 3), [currentMonth]);
  const canPostEvent = Boolean(session?.user?.id && currentUserOrgId && currentUserOrgId !== "unaffiliated");

  useEffect(() => {
    if (!location.state?.flashMessage) {
      return;
    }

    setToast({
      message: location.state.flashMessage,
      type: location.state.flashType || "success",
    });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, TOAST_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  useEffect(() => {
    if (location.pathname !== "/events") {
      return;
    }

    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!filterMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setFilterMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [filterMenuOpen]);

  useEffect(() => {
    const triggerRevalidation = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      setRevalidationKey((currentKey) => currentKey + 1);
    };

    window.addEventListener("focus", triggerRevalidation);
    window.addEventListener("pageshow", triggerRevalidation);
    document.addEventListener("visibilitychange", triggerRevalidation);

    return () => {
      window.removeEventListener("focus", triggerRevalidation);
      window.removeEventListener("pageshow", triggerRevalidation);
      document.removeEventListener("visibilitychange", triggerRevalidation);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchCalendarData = async () => {
      const cachedEntry = readSessionCache(EVENTS_PAGE_CACHE_KEY);
      const cachedPage = getSessionCacheValue(cachedEntry);

      if (cachedPage && Array.isArray(cachedPage.events)) {
        setEvents(hydrateCachedEvents(cachedPage.events));
        setCategories(cachedPage.categories || [ALL_EVENTS_CATEGORY]);
        setTags(cachedPage.tags || [{ id: ALL_EVENTS_TAG, name: ALL_EVENTS_TAG }]);
      }

      setEventsLoading(!(cachedPage && Array.isArray(cachedPage.events) && cachedPage.events.length > 0));
      setEventsError("");

      try {
        const [
          { data: eventRows, error: eventsQueryError },
          { data: categoryRows, error: categoriesQueryError },
          { data: tagRows, error: tagsQueryError },
        ] =
          await Promise.all([
            supabase
              .from("events")
              .select(
                `
                  id,
                  title,
                  description,
                  start_datetime,
                  end_datetime,
                  location,
                  volunteer_url,
                  created_by,
                  status,
                  organization_id,
                  category_id,
                  flyer_path,
                  organizations ( name ),
                  categories ( name ),
                  event_tags ( tag_id )
                `
              )
              .eq("status", "approved")
              .order("start_datetime", { ascending: true }),
            supabase.from("categories").select("name").order("name", { ascending: true }),
            supabase.from("tags").select("id, name").order("name", { ascending: true }),
          ]);

        if (!isMounted) {
          return;
        }

        if (eventsQueryError || categoriesQueryError) {
          console.error("Error fetching home page calendar data:", {
            eventsQueryError,
            categoriesQueryError,
            tagsQueryError,
          });
          setEvents([]);
          setCategories([ALL_EVENTS_CATEGORY]);
          setEventsError("Unable to load events right now.");
          setEventsLoading(false);
          return;
        }

        if (tagsQueryError) {
          console.warn("Tag data loaded with a partial error:", {
            tagsQueryError,
          });
        }

        const tagLookup = (tagRows || []).reduce((lookup, tag) => {
          if (typeof tag?.id === "string" && typeof tag.name === "string") {
            lookup[tag.id] = tag.name;
          }
          return lookup;
        }, {});

        const eventIds = (eventRows || []).map((event) => event.id).filter(Boolean);
        let eventTagRows = [];

        if (eventIds.length > 0) {
          const { data: fetchedEventTagRows, error: eventTagsQueryError } = await supabase
            .from("event_tags")
            .select("event_id, tag_id")
            .in("event_id", eventIds);

          if (eventTagsQueryError) {
            console.warn("Event tags could not be loaded via event_tags table:", eventTagsQueryError);
          }

          eventTagRows = fetchedEventTagRows || [];
        }

        const tagsByEventId = (eventTagRows || []).reduce((acc, row) => {
          if (!row || !row.event_id) {
            return acc;
          }
          const eventTagIds = acc[row.event_id] || [];
          if (row.tag_id) {
            acc[row.event_id] = [...eventTagIds, row.tag_id];
          }
          return acc;
        }, {});

        const normalizedEvents = (eventRows || [])
          .map((event) => normalizeSupabaseEvent(event, tagLookup, tagsByEventId[event.id] || []))
          .filter((event) => isValidDate(event.startDate) && isValidDate(event.endDate))
          .sort((first, second) => first.startDate - second.startDate);

        const invalidEventCount = (eventRows || []).length - normalizedEvents.length;
        if (invalidEventCount > 0) {
          console.warn(`Dropped ${invalidEventCount} event(s) with invalid dates from the public Events page.`);
        }

        const fetchedCategoryNames = (categoryRows || []).map((category) => category.name);
        const nextCategories = [ALL_EVENTS_CATEGORY, ...fetchedCategoryNames];
        const nextTags = [{ id: ALL_EVENTS_TAG, name: ALL_EVENTS_TAG }, ...(tagRows || [])];

        setEvents(normalizedEvents);
        setCategories(nextCategories);
        setTags(nextTags);
        writeSessionCache(EVENTS_PAGE_CACHE_KEY, {
          events: normalizedEvents,
          categories: nextCategories,
          tags: nextTags,
        });

        setEventsLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Unexpected error fetching calendar data:", error);

        if (!cachedPage) {
          setEvents([]);
          setCategories([ALL_EVENTS_CATEGORY]);
          setTags([{ id: ALL_EVENTS_TAG, name: ALL_EVENTS_TAG }]);
        }

        setEventsError("Unable to load events right now.");
        setEventsLoading(false);
      }
    };

    fetchCalendarData();

    return () => {
      isMounted = false;
    };
  }, [minVisibleMonth, maxVisibleMonth, revalidationKey]);

  const calendarDays = useMemo(
    () => getMonthMatrix(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  );

  const eventCountByDate = useMemo(() => {
    return events.reduce((counts, event) => {
      getEventDateKeys(event.startDate, event.endDate).forEach((key) => {
        counts[key] = (counts[key] || 0) + 1;
      });
      return counts;
    }, {});
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const categoryFilterActive =
      selectedCategories.length > 0 &&
      !selectedCategories.includes(ALL_EVENTS_CATEGORY);
    const tagFilterActive =
      selectedTags.length > 0 && !selectedTags.includes(ALL_EVENTS_TAG);

    return events.filter((event) => {
      const matchesSelectedDate = selectedDates.length > 0
        ? selectedDates.some((date) => isDateWithinEvent(date, event.startDate, event.endDate))
        : true;
      const matchesCategory =
        !categoryFilterActive ||
        selectedCategories.includes(event.categoryName);
      const matchesTags =
        !tagFilterActive ||
        (event.tagIds || []).some((tagId) => selectedTags.includes(tagId));
      const matchesSearch =
        query.length === 0 ||
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.organizationName.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query);

      return (
        matchesSelectedDate &&
        matchesCategory &&
        matchesTags &&
        matchesSearch
      );
    });
  }, [events, searchQuery, selectedCategories, selectedTags, selectedDates]);

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function handleMonthChange(offset) {
    setVisibleMonth((currentMonth) => {
      const nextMonth = addMonths(currentMonth, offset);
      return clampMonth(nextMonth, minVisibleMonth, maxVisibleMonth);
    });
  }

  function handleSelectDay(day) {
    setSelectedDates((currentDates) => {
      const isAlreadySelected = currentDates.some((selectedDate) => isSameDay(selectedDate, day));
      if (isAlreadySelected) {
        return currentDates.filter((selectedDate) => !isSameDay(selectedDate, day));
      }
      return [...currentDates, day];
    });
    setVisibleMonth(() => {
      const nextMonth = new Date(day.getFullYear(), day.getMonth(), 1);
      return clampMonth(nextMonth, minVisibleMonth, maxVisibleMonth);
    });
  }

  function resetDateFilter() {
    setSelectedDates([]);
  }

  function toggleFilterMenu(menuName) {
    setFilterMenuOpen((currentOpen) =>
      currentOpen === menuName ? null : menuName
    );
  }

  function toggleCategory(category) {
    setSelectedCategories((currentSelected) => {
      if (category === ALL_EVENTS_CATEGORY) {
        return [ALL_EVENTS_CATEGORY];
      }

      const nextSelection = currentSelected.includes(category)
        ? currentSelected.filter((value) => value !== category)
        : [...currentSelected.filter((value) => value !== ALL_EVENTS_CATEGORY), category];

      return nextSelection.length === 0 ? [ALL_EVENTS_CATEGORY] : nextSelection;
    });
  }

  function toggleTag(tag) {
    const tagId = tag.id ?? tag;
    setSelectedTags((currentSelected) => {
      if (tagId === ALL_EVENTS_TAG) {
        return [ALL_EVENTS_TAG];
      }

      const nextSelection = currentSelected.includes(tagId)
        ? currentSelected.filter((value) => value !== tagId)
        : [...currentSelected.filter((value) => value !== ALL_EVENTS_TAG), tagId];

      return nextSelection.length === 0 ? [ALL_EVENTS_TAG] : nextSelection;
    });
  }

  useEffect(() => {
    if (!filterMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setFilterMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [filterMenuOpen]);

  function hasCategorySelected(category) {
    if (category === ALL_EVENTS_CATEGORY) {
      return selectedCategories.includes(ALL_EVENTS_CATEGORY);
    }

    return selectedCategories.includes(category);
  }

  function hasTagSelected(tag) {
    const tagId = tag.id ?? tag;
    if (tagId === ALL_EVENTS_TAG) {
      return selectedTags.includes(ALL_EVENTS_TAG);
    }

    return selectedTags.includes(tagId);
  }

  return (
    <div className="home-page">
      

      <main className="home-main">
        <section className="home-hero">
          <h1>Discover Community Events</h1>
          <p>
            Connect with local organizations and find events across the Palouse region.
          </p>
        </section>

        {toast ? (
          <div
            className={`home-toast home-toast-${toast.type}`}
            role={toast.type === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            <div className="home-toast-indicator" aria-hidden="true"></div>
            <p className="home-toast-message">{toast.message}</p>
          </div>
        ) : null}

        <section className="home-filter-bar">
          <div className="home-filter-row">
            <div className="home-search-wrapper">
              <input
                type="text"
                className="home-search-input"
                placeholder="Search events by title or keywords..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <span className="material-symbols-outlined home-search-input-icon">
                search
              </span>
            </div>

            <div className="home-filter-controls">
              <div className="filter-button-group">
                <button
                  type="button"
                  className={`filter-trigger ${filterMenuOpen === "categories" ? "active" : ""}`}
                  onClick={() => toggleFilterMenu("categories")}
                >
                  Categories
                </button>
                <button
                  type="button"
                  className={`filter-trigger ${filterMenuOpen === "tags" ? "active" : ""}`}
                  onClick={() => toggleFilterMenu("tags")}
                >
                  Tags
                </button>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsSubscribeOpen(true)}
              >
                Get Event Updates
              </button>
            </div>

            {filterMenuOpen ? (
              <Popup
                title={filterMenuOpen === "categories" ? "Choose categories" : "Choose tags"}
                description={`Filter events by ${filterMenuOpen === "categories" ? "category" : "tag"}.`}
                onClose={() => setFilterMenuOpen(null)}
                ariaLabel={filterMenuOpen === "categories" ? "Choose categories" : "Choose tags"}
                className="regular-popup filter-popup"
              >
                <div className="category-list">
                  {filterMenuOpen === "categories"
                    ? categories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          className={`category-pill ${hasCategorySelected(category) ? "active" : ""}`}
                          onClick={() => toggleCategory(category)}
                        >
                          {category}
                        </button>
                      ))
                    : tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className={`category-pill ${hasTagSelected(tag) ? "active" : ""}`}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag.name}
                        </button>
                      ))}
                </div>
              </Popup>
            ) : null}

            {canPostEvent ? (
              <div className="home-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsMyEventsOpen(true)}
                >
                  My Events
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsPostEventOpen(true)}
                >
                  Post Event
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section
          className={`home-content-grid ${
            session ? "home-content-grid-authenticated" : "home-content-grid-public"
          }`}
        >
          <aside className="home-left-column">
            <div className="home-panel">
              <div className="panel-header">
                <h2>Event Calendar</h2>
              </div>

              <EventCalendar
                calendarDays={calendarDays}
                eventCountByDate={eventCountByDate}
                formatFullDate={formatFullDate}
                getDateKey={getDateKey}
                handleMonthChange={handleMonthChange}
                handleSelectDay={handleSelectDay}
                isSameDay={isSameDay}
                monthLabel={monthLabel}
                resetDateFilter={resetDateFilter}
                selectedDates={selectedDates}
                visibleMonth={visibleMonth}
                minVisibleMonth={minVisibleMonth}
                maxVisibleMonth={maxVisibleMonth}
                canNavigatePrevious={visibleMonth > minVisibleMonth}
                canNavigateNext={visibleMonth < maxVisibleMonth}
              />
            </div>

          </aside>

          <section className="home-events-section">
            <div className="events-header">
              <div>
                <h2>
                  {filteredEvents.length}{" "}
                  {filteredEvents.length === 1 ? "Event" : "Events"} Found
                </h2>
                <p className="events-subtitle">
                  {eventsLoading
                    ? "Loading events..."
                    : eventsError }
                </p>
              </div>
            </div>

            {!eventsLoading && filteredEvents.length === 0 ? (
              <div className="empty-state">
                <h3>No Events Found</h3>
                <p>
                  Try adjusting your search.
                </p>
              </div>
            ) : eventsLoading ? (
              <div></div>
            ) : (
              <div className={`event-grid ${session ? "event-grid-authenticated" : "event-grid-public"}`}>
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    formatFullDate={formatFullDate}
                    formatTimeRange={formatTimeRange}
                  />
                ))}
              </div>
            )}
          </section>
        </section>

        {session && isMyEventsOpen ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="My Events"
            onClick={() => setIsMyEventsOpen(false)}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
          >
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <MyEvents
                session={session}
                formatCompactDate={formatCompactDate}
                formatTimeRange={formatTimeRange}
                onClose={() => setIsMyEventsOpen(false)}
                canPostEvent={canPostEvent}
                onPostEvent={canPostEvent ? () => {
                  setIsPostEventOpen(true);
                  setIsMyEventsOpen(false);
                } : null}
              />
            </div>
          </div>
        ) : null}

        {canPostEvent && isPostEventOpen ? (
          <Popup
            title="Post a Community Event"
            description="Share your community event with the Palouse area."
            onClose={() => setIsPostEventOpen(false)}
            ariaLabel="Post a Community Event"
            className="regular-popup post-event-popup"
          >
            <PostEventForm
              onClose={() => setIsPostEventOpen(false)}
              onSuccess={() => setPostEventSuccessOpen(true)}
              isPopup={true}
            />
          </Popup>
        ) : null}

        {postEventSuccessOpen ? (
          <Popup
            title="Event Submitted"
            description="Your event has been sent for review."
            onClose={() => setPostEventSuccessOpen(false)}
            ariaLabel="Event Submitted"
            className="dialog-popup post-event-success-popup"
            actions={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setPostEventSuccessOpen(false)}
              >
                Close
              </button>
            }
          >
            <p>
              Thank you! Your event request is pending review and will be published after approval.
            </p>
          </Popup>
        ) : null}
        
        {isSubscribeOpen ? (
          <SubscribePopup onClose={() => setIsSubscribeOpen(false)} />
        ) : null}
      </main>
    </div>
  );
};

export default Events;
