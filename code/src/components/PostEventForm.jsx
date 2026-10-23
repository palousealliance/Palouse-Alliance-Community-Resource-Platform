import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import FormField from "./FormField";
import "../styles/PostEvent.css";

const MAX_VOLUNTEER_URL_LENGTH = 50;
const MAX_TAG_SELECTIONS = 5;
const MAX_FLYER_SIZE_BYTES = 2 * 1024 * 1024;
const FLYER_STORAGE_BUCKET = "event-flyers";
const validFlyerMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

function getFlyerValidationError(file) {
  if (!file) {
    return null;
  }

  const mimeType = file.type?.toLowerCase();
  const name = file.name?.toLowerCase() || "";
  const isAllowedType =
    validFlyerMimeTypes.has(mimeType) ||
    name.endsWith(".pdf") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg");

  if (!isAllowedType) {
    return "Flyer upload must be a PDF, PNG, JPG, or JPEG file.";
  }

  if (file.size > MAX_FLYER_SIZE_BYTES) {
    return "Flyer upload must be 2 MB or smaller.";
  }

  return null;
}

function getFlyerFilePath(flyer) {
  if (!flyer) {
    return null;
  }

  const extension = flyer.name.includes(".") ? flyer.name.split(".").pop() : "pdf";
  return `${crypto.randomUUID()}.${extension}`;
}

async function removeUploadedFlyer(path) {
  if (!path) {
    return;
  }

  try {
    await supabase.storage.from(FLYER_STORAGE_BUCKET).remove([path]);
  } catch (error) {
    console.warn("Could not remove uploaded flyer:", error);
  }
}

function isLikelyUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getMaxAdvanceDate() {
  const today = getTodayDate();
  return new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
}

function buildDateTime(date, time) {
  if (!date || !time) {
    return null;
  }

  return new Date(`${date}T${time}:00`);
}

function isDateTimeInPast(date, time) {
  const dateTime = buildDateTime(date, time);
  return dateTime ? dateTime < new Date() : false;
}

function isDateTimeBeyondMaxAdvance(date, time) {
  const dateTime = buildDateTime(date, time);
  if (!dateTime) {
    return false;
  }

  const maxAdvance = getMaxAdvanceDate();
  const maxAdvanceEnd = new Date(
    maxAdvance.getFullYear(),
    maxAdvance.getMonth(),
    maxAdvance.getDate(),
    23,
    59,
    59,
    999
  );

  return dateTime > maxAdvanceEnd;
}

const PostEventForm = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [category, setCategory] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [volunteerUrl, setVolunteerUrl] = useState("");
  const [flyer, setFlyer] = useState(null);
  const [flyerError, setFlyerError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      if (!data?.length) {
        setCategories([]);
        setCategory("");
        return;
      }

      setCategories(data);
      setCategory((currentCategory) =>
        data.some((categoryOption) => categoryOption.name === currentCategory)
          ? currentCategory
          : data[0].name
      );
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTags = async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name")
        .order("name", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Error fetching tags:", error);
        return;
      }

      setTagOptions(data || []);
      setSelectedTagIds((currentSelected) =>
        currentSelected.filter((tagId) => (data || []).some((tagOption) => tagOption.id === tagId))
      );
    };

    loadTags();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((categoryOption) => categoryOption.name === category) || null,
    [categories, category]
  );

  const selectedTags = useMemo(
    () => tagOptions.filter((tagOption) => selectedTagIds.includes(tagOption.id)),
    [tagOptions, selectedTagIds]
  );

  const canSelectMoreTags = selectedTagIds.length < MAX_TAG_SELECTIONS;
  const trimmedLocation = location.trim();
  const trimmedVolunteerUrl = volunteerUrl.trim();
  const isVolunteerUrlTooLong = trimmedVolunteerUrl.length > MAX_VOLUNTEER_URL_LENGTH;
  const isVolunteerUrlInvalid = trimmedVolunteerUrl !== "" && !isLikelyUrl(trimmedVolunteerUrl);
  const volunteerUrlError = isVolunteerUrlInvalid
    ? "Volunteer URL must be a valid http(s) address."
    : isVolunteerUrlTooLong
    ? "Volunteer URL must be 50 characters or less."
    : undefined;

  const minStartDate = formatDateInputValue(getTodayDate());
  const maxStartDate = formatDateInputValue(getMaxAdvanceDate());
  const minStartDateTime = `${minStartDate}T00:00`;
  const maxStartDateTime = `${maxStartDate}T23:59`;
  const minEndDateTime = startDateTime ? startDateTime : `${minStartDate}T00:00`;

  const isStepValid = () => {
    if (step === 1) {
      return title.trim() !== "" && description.trim() !== "";
    }

    if (step === 2) {
      return category.trim() !== "";
    }

    if (step === 3) {
      const hasValidDates =
        startDateTime !== "" &&
        endDateTime !== "" &&
        endDateTime >= startDateTime &&
        !isDateTimeInPast(startDateTime.split("T")[0], startDateTime.split("T")[1]) &&
        !isDateTimeBeyondMaxAdvance(startDateTime.split("T")[0], startDateTime.split("T")[1]) &&
        !isDateTimeBeyondMaxAdvance(endDateTime.split("T")[0], endDateTime.split("T")[1]);

      return (
        hasValidDates &&
        trimmedLocation !== "" &&
        !isVolunteerUrlInvalid &&
        !isVolunteerUrlTooLong
      );
    }

    return true;
  };

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setCategory(categories[0]?.name || "");
    setSelectedTagIds([]);
    setStartDateTime("");
    setEndDateTime("");
    setLocation("");
    setVolunteerUrl("");
    setFlyer(null);
    setFlyerError("");
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage("");
    setFlyerError("");

    if (step === 1) {
      if (!isStepValid()) {
        setErrorMessage("Please fix any errors before continuing.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!isStepValid()) {
        setErrorMessage("Please fix any errors before continuing.");
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!isStepValid()) {
        setErrorMessage("Please fix any errors before continuing.");
        return;
      }
      setStep(4);
      return;
    }

    if (endDateTime < startDateTime) {
      setErrorMessage("End date and time must be on or after the start date and time.");
      return;
    }

    if (startDateTime === endDateTime) {
      setErrorMessage("End date and time must be after the start date and time.");
      return;
    }

    if (isDateTimeInPast(startDateTime.split("T")[0], startDateTime.split("T")[1])) {
      setErrorMessage("Event start cannot be in the past.");
      return;
    }

    if (isDateTimeBeyondMaxAdvance(startDateTime.split("T")[0], startDateTime.split("T")[1])) {
      setErrorMessage("Event start must be within 3 months of today.");
      return;
    }

    if (isDateTimeBeyondMaxAdvance(endDateTime.split("T")[0], endDateTime.split("T")[1])) {
      setErrorMessage("Event end must be within 3 months of today.");
      return;
    }

    if (isVolunteerUrlTooLong) {
      setErrorMessage(`Volunteer URL cannot exceed ${MAX_VOLUNTEER_URL_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      let session;
      let sessionError = null;

      try {
        ({
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession());
      } catch (error) {
        sessionError = error;
      }

      if (sessionError || !session?.user) {
        console.error("No logged in user", sessionError);
        setErrorMessage("You must be logged in to post an event.");
        return;
      }

      const userId = session.user.id;
      let userData;
      let userError = null;

      try {
        ({ data: userData, error: userError } = await supabase
          .from("users")
          .select("organization_id, organizations(name)")
          .eq("id", userId)
          .maybeSingle());
      } catch (error) {
        userError = error;
      }

      if (userError) {
        console.error("Error fetching submitting user:", userError);
        setErrorMessage("We couldn't verify your organization for this event.");
        return;
      }

      const isUnaffiliated = !userData?.organization_id ||
        userData.organization_id === "unaffiliated" ||
        userData?.organizations?.name?.trim()?.toLowerCase() === "unaffiliated";

      if (isUnaffiliated) {
        setErrorMessage("Your account must be linked to an organization before posting events.");
        return;
      }

      let categoryId = selectedCategory?.id || null;

      if (!categoryId) {
        let categoryData;
        let categoryError = null;

        try {
          ({ data: categoryData, error: categoryError } = await supabase
            .from("categories")
            .select("id")
            .eq("name", category)
            .maybeSingle());
        } catch (error) {
          categoryError = error;
        }

        if (categoryError) {
          console.error("Error fetching category:", categoryError);
          setErrorMessage("Invalid category.");
          return;
        }

        if (!categoryData) {
          console.error("Category not found:", category);
          setErrorMessage(`Category "${category}" does not exist.`);
          return;
        }

        categoryId = categoryData.id;
      }

      const selectedTagRecords = selectedTags
        .map((tagOption) => ({ event_id: null, tag_id: tagOption.id }))
        .filter((tagRow) => Boolean(tagRow.tag_id));

      let flyerPath = null;

      if (flyer) {
        const flyerValidationError = getFlyerValidationError(flyer);

        if (flyerValidationError) {
          setFlyerError(flyerValidationError);
          setErrorMessage(flyerValidationError);
          return;
        }

        try {
          flyerPath = getFlyerFilePath(flyer);
          const { error: uploadError } = await supabase.storage
            .from(FLYER_STORAGE_BUCKET)
            .upload(flyerPath, flyer, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw new Error(uploadError.message || "Failed to upload flyer.");
          }
        } catch (error) {
          console.error("Error uploading flyer:", error);
          setErrorMessage(error.message || "Failed to upload flyer.");
          return;
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        location: trimmedLocation,
        volunteer_url: trimmedVolunteerUrl || null,
        created_by: userId,
        category_id: categoryId,
        organization_id: userData.organization_id,
        status: "pending",
        flyer_path: flyerPath,
      };

      let eventData;
      let eventError = null;

      try {
        ({ data: eventData, error: eventError } = await supabase
          .from("events")
          .insert([payload])
          .select("id")
          .single());
      } catch (error) {
        eventError = error;
      }

      if (eventError || !eventData?.id) {
        await removeUploadedFlyer(flyerPath);
        console.error("Insert error:", eventError);
        setErrorMessage(eventError?.message || "Failed to submit event.");
        return;
      }

      if (selectedTagRecords.length > 0) {
        let eventTagsError = null;

        try {
          ({ error: eventTagsError } = await supabase.from("event_tags").insert(
            selectedTagRecords.map((tagRow) => ({
              event_id: eventData.id,
              tag_id: tagRow.tag_id,
            }))
          ));
        } catch (error) {
          eventTagsError = error;
        }

        if (eventTagsError) {
          console.error("Error saving event tags:", eventTagsError);
          await removeUploadedFlyer(flyerPath);
          await supabase.from("events").delete().eq("id", eventData.id);
          setErrorMessage(eventTagsError.message || "Failed to save event tags.");
          return;
        }
      }

      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      if (onClose) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="postevent-popup-body">
      {errorMessage ? (
        <div className="postevent-message postevent-message-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <main className="postevent-main">
        <div className="postevent-steps">
          <div className={`step ${step === 1 ? "current" : step > 1 ? "completed" : ""}`}>1</div>
          <div className="step-line"></div>
          <div className={`step ${step === 2 ? "current" : step > 2 ? "completed" : ""}`}>2</div>
          <div className="step-line"></div>
          <div className={`step ${step === 3 ? "current" : step > 3 ? "completed" : ""}`}>3</div>
          <div className="step-line"></div>
          <div className={`step ${step === 4 ? "current" : step > 4 ? "completed" : ""}`}>4</div>
        </div>

        <form className={`postevent-form ${step === 4 ? "step-4" : ""}`} onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <FormField htmlFor="event-title" label="Event Title" required>
                  <input
                    id="event-title"
                    className="form-input"
                    type="text"
                    placeholder="E.g., Community Garden Workshop"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </FormField>

                <FormField htmlFor="description" label="Event Description" required>
                  <textarea
                    id="description"
                    className="form-input"
                    rows={8}
                    placeholder="Describe your event, what attendees will learn or experience, and any important details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </FormField>
              </>
            )}

            {step === 2 && (
              <>
                <FormField htmlFor="category" label="Category" required>
                  <select
                    id="category"
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={categories.length === 0}
                  >
                    {categories.length === 0 ? (
                      <option value="">Loading categories...</option>
                    ) : (
                      categories.map((categoryOption) => (
                        <option key={categoryOption.id || categoryOption.name} value={categoryOption.name}>
                          {categoryOption.name}
                        </option>
                      ))
                    )}
                  </select>
                </FormField>

                <div className="form-group">
                  <label className="form-label">Tags</label>
                  <p className="postevent-help-text postevent-help-text-tight">
                    Select up to {MAX_TAG_SELECTIONS} tags for your event.
                  </p>
                  <div className="category-list postevent-tag-list">
                    {tagOptions.length > 0 ? (
                      tagOptions.map((tagOption) => {
                        const isSelected = selectedTagIds.includes(tagOption.id);
                        return (
                          <button
                            key={tagOption.id}
                            type="button"
                            className={`category-pill ${isSelected ? "active" : ""}`}
                            disabled={!isSelected && !canSelectMoreTags}
                            onClick={() =>
                              setSelectedTagIds((currentSelected) =>
                                currentSelected.includes(tagOption.id)
                                  ? currentSelected.filter((tagId) => tagId !== tagOption.id)
                                  : [...currentSelected, tagOption.id]
                              )
                            }
                          >
                            {tagOption.name}
                          </button>
                        );
                      })
                    ) : (
                      <p className="postevent-empty-tags">No tags are available yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <FormField htmlFor="start-datetime" label="Event Start" required>
                  <input
                    id="start-datetime"
                    className="form-input"
                    type="datetime-local"
                    value={startDateTime}
                    min={minStartDateTime}
                    max={maxStartDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    required
                  />
                </FormField>

                <FormField htmlFor="end-datetime" label="Event End" required>
                  <input
                    id="end-datetime"
                    className="form-input"
                    type="datetime-local"
                    value={endDateTime}
                    min={minEndDateTime}
                    max={maxStartDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    required
                  />
                </FormField>

                <FormField
                  htmlFor="location"
                  label="Physical Location"
                  required
                >
                  <input
                    id="location"
                    className="form-input"
                    type="text"
                    placeholder="E.g., Example Community Center, 206 E 3rd St"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </FormField>

                <FormField
                  htmlFor="volunteer-url"
                  label="Volunteer URL (Optional)"
                  error={volunteerUrlError}
                >
                  <input
                    id="volunteer-url"
                    className="form-input"
                    type="url"
                    placeholder="E.g., https://example.com/register"
                    value={volunteerUrl}
                    onChange={(e) => setVolunteerUrl(e.target.value)}
                  />
                </FormField>
              </>
            )}

            {step === 4 && (
              <>
                <FormField htmlFor="flyer" label="Upload Flyer Image (Optional)" error={flyerError}>
                  <div
                    className="file-upload"
                    onClick={() => document.getElementById("flyer").click()}
                  >
                    <span className="material-symbols-outlined upload-icon" aria-hidden="true">
                      cloud_upload
                    </span>
                    <input
                      id="flyer"
                      type="file"
                      aria-label="Upload Flyer Image"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const nextFlyer = e.target.files?.[0] ?? null;
                        const validationError = getFlyerValidationError(nextFlyer);

                        if (validationError) {
                          setFlyerError(validationError);
                          setFlyer(null);
                          e.target.value = "";
                          return;
                        }

                        setFlyerError("");
                        setErrorMessage("");
                        setFlyer(nextFlyer);
                      }}
                    />

                    <p className="upload-text">Click to upload or drag and drop</p>
                    <p className="upload-subtext">PDF, PNG, or JPG/JPEG • 2 MB max</p>

                    {flyer && <p className="upload-file-name">{flyer.name}</p>}
                  </div>
                </FormField>
              </>
            )}

            <div className="postevent-button-row">
              {step > 1 && (
                <button
                  type="button"
                  className="postevent-button btn-secondary"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              )}

              <button
                type="submit"
                className="postevent-button btn-primary"
                disabled={!isStepValid() || isSubmitting}
              >
                {step === 1
                  ? "Continue to Category & Tags"
                  : step === 2
                  ? "Continue to Date, Time & Location"
                  : step === 3
                  ? "Continue to Flyer Upload"
                  : "Submit for Review"}
              </button>
            </div>
          </form>
      </main>
    </div>
  );
};

export default PostEventForm;
