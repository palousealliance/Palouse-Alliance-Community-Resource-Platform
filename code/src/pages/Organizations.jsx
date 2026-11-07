import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, Phone, Mail } from "lucide-react";
import Popup from "../components/Popup";
import { isEventActive } from "../lib/dateTime";
import { supabase } from "../lib/supabase";
import {
  getSessionCacheValue,
  readSessionCache,
  writeSessionCache,
  ORGANIZATIONS_PAGE_CACHE_KEY,
} from "../lib/sessionCache";
import "../styles/Organizations.css";

const SUPPORT_EMAIL = "palousealliance@gmail.com";

function getEditOrgMailtoLink(org) {
  const subject = `Edit Organization Details: ${org?.name || "Organization"}`;
  const lines = [
    "Hello Palouse Alliance Team,",
    "",
    `I would like to request updates to the organization profile for ${org?.name || "our organization"}.`,
    "",
    "Updated Details (please fill in any changed fields):",
    `- Organization Name: ${org?.name || ""}`,
    `- Description: ${org?.description || ""}`,
    `- Location: ${org?.location || ""}`,
    `- Contact Email: ${org?.email || ""}`,
    `- Phone Number: ${org?.phone_number || ""}`,
    "",
    "Additional Notes / Changes:",
    "",
    "",
    "Thank you!",
  ];
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

const Organizations = ({ session }) => {
  const navigate = useNavigate();
  const cachedOrganizationsEntry = readSessionCache(ORGANIZATIONS_PAGE_CACHE_KEY);
  const cachedOrganizations = getSessionCacheValue(cachedOrganizationsEntry);
  const initialOrganizations = Array.isArray(cachedOrganizations) ? cachedOrganizations : [];

  const [orgs, setOrgs] = useState(initialOrganizations);
  const [filteredOrgs, setFilteredOrgs] = useState(initialOrganizations);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(!Array.isArray(cachedOrganizations));
  const [revalidationKey, setRevalidationKey] = useState(0);
  const [currentUserOrgId, setCurrentUserOrgId] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);

  const isVisibleOrg = (org) => {
    const name = org.name?.trim()?.toLowerCase();
    return Boolean(name && name !== "unaffiliated");
  };

  const isValid = (val) => val && val !== "NULL" && val.trim() !== "";

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
    const cachedEntry = readSessionCache(ORGANIZATIONS_PAGE_CACHE_KEY);
    const cachedOrgs = getSessionCacheValue(cachedEntry);

    if (Array.isArray(cachedOrgs)) {
      setOrgs(cachedOrgs);
      setFilteredOrgs(cachedOrgs);
    }

    const fetchOrgs = async () => {
      setLoading(!(Array.isArray(cachedOrgs) && cachedOrgs.length > 0));
      const { data, error } = await supabase
        .from("organizations")
        .select(`
          id,
          name,
          description,
          phone_number,
          email,
          location,
          events (id, status, start_datetime, end_datetime)
        `)
        .order("name", { ascending: true });

      if (error) {
        console.error(error.message);
      } else {
        const visibleOrgs = data.filter(isVisibleOrg);
        const formattedData = visibleOrgs.map((org) => {
          const activeEvents = Array.isArray(org.events)
            ? org.events.filter((event) => isEventActive(event))
            : [];

          return {
            ...org,
            eventCount: activeEvents.length,
          };
        });
        setOrgs(formattedData);
        setFilteredOrgs(formattedData);
        writeSessionCache(ORGANIZATIONS_PAGE_CACHE_KEY, formattedData);
      }
      setLoading(false);
    };
    fetchOrgs();
  }, [revalidationKey]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserOrg = async () => {
      if (!session?.user?.id) {
        if (isMounted) {
          setCurrentUserOrgId(null);
        }
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("organization_id, organizations(name)")
        .eq("id", session.user.id)
        .maybeSingle();

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

  useEffect(() => {
    const results = orgs.filter(
      (org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.description &&
          org.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredOrgs(results);
  }, [searchTerm, orgs]);

  return (
    <div className="organizations-page page-root">
      <main className="page-shell organizations-shell">
        <section className="page-hero organizations-header">
          <h1 className="page-title">Community Organizations</h1>
          <p className="page-description">
            Discover local organizations making a difference across the Palouse region.
          </p>
        </section>

        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Search by organization name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <Search className="search-input-icon" size={20} aria-hidden="true" />
        </div>

        <div className="events-header">
          <div>
            <h2>
              {filteredOrgs.length} {filteredOrgs.length === 1 ? "Organization" : "Organizations"} Found
            </h2>
          </div>
        </div>

        <div className="masonry-container">
          {filteredOrgs.length > 0 &&
            filteredOrgs.map((org) => {
              const displayName = isValid(org.name)
                ? org.name
                : "Community Organization";
              const displayDescription = isValid(org.description)
                ? org.description
                : "Connecting the community through local outreach and support.";
              const displayLocation = isValid(org.location)
                ? org.location
                : "Palouse Area";
              const hasOrgInfo =
                org.eventCount > 0 ||
                isValid(org.phone_number) ||
                isValid(org.email);
              const canEditOrg = Boolean(
                session?.user?.id &&
                currentUserOrgId &&
                currentUserOrgId !== "unaffiliated" &&
                String(org.id) === String(currentUserOrgId)
              );

              return (
                <div key={org.id} className="masonry-item">
                  <div className="org-card">
                    <div className="org-card-heading">
                      <h3 className="org-title">{displayName}</h3>
                      <div className="org-location-chip">{displayLocation}</div>
                    </div>

                    <p className="org-description">{displayDescription}</p>

                    {hasOrgInfo && (
                      <div className="org-meta">
                        {org.eventCount > 0 && (
                          <span className="org-meta-row">
                            <Calendar className="org-meta-icon" size={16} aria-hidden="true" />
                            {org.eventCount} active{' '}
                            {org.eventCount === 1 ? 'event' : 'events'}
                          </span>
                        )}

                        {isValid(org.phone_number) && (
                          <span className="org-meta-row">
                            <Phone className="org-meta-icon" size={16} aria-hidden="true" />
                            {org.phone_number}
                          </span>
                        )}

                        {isValid(org.email) && (
                          <span className="org-meta-row">
                            <Mail className="org-meta-icon" size={16} aria-hidden="true" />
                            <a
                              href={`mailto:${org.email}`}
                              className="email-link"
                            >
                              {org.email}
                            </a>
                          </span>
                        )}
                      </div>
                    )}

                    {(org.eventCount > 0 || canEditOrg) && (
                      <div className="org-card-footer">
                        {org.eventCount > 0 && (
                          <button
                            className="btn-primary org-cta-btn"
                            type="button"
                            onClick={() => navigate(`/events?q=${encodeURIComponent(org.name)}`)}
                          >
                            View Events
                          </button>
                        )}
                        {canEditOrg && (
                          <button
                            type="button"
                            className="btn-secondary org-cta-btn"
                            onClick={() => setEditingOrg(org)}
                          >
                            Edit Details
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading organizations...</p>
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              <Search size={22} />
            </div>
            <h3>No Organizations Found</h3>
            <p>Try adjusting your search to find what you're looking for.</p>
          </div>
        ) : null}

        {editingOrg ? (
          <Popup
            title="Edit Organization Details"
            description={`Contact Palouse Alliance to request updates for ${editingOrg.name}.`}
            onClose={() => setEditingOrg(null)}
            className="dialog-popup"
            ariaLabel="Edit Organization Details"
            actions={
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingOrg(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const mailto = getEditOrgMailtoLink(editingOrg);
                    window.location.href = mailto;
                  }}
                >
                  Send Email
                </button>
              </>
            }
          >
            <div className="org-edit-popup-body">
              <p className="org-edit-popup-intro">
                To request edits for your organization, please contact Palouse Alliance administrators at{" "}
                <a className="email-link" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
              <p className="org-edit-popup-instructions">
                Include any updated values for the following fields in your email so an admin can update your listing:
              </p>
              <ul className="org-edit-fields-list">
                <li>
                  <strong>Organization Name</strong>
                </li>
                <li>
                  <strong>Description</strong>
                </li>
                <li>
                  <strong>Location</strong>
                </li>
                <li>
                  <strong>Contact Email</strong>
                </li>
                <li>
                  <strong>Phone Number</strong>
                </li>
              </ul>
              <p className="org-edit-popup-note">
                You can also click <strong>Send Email</strong> below to open a pre-filled draft in your default email client.
              </p>
            </div>
          </Popup>
        ) : null}
      </main>
    </div>
  );
};

export default Organizations;
