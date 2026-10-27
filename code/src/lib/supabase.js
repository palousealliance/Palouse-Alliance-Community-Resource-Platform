// Supabase setup (reference this file when working with Supabase)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getEventFlyerUrl = (flyerPath) => {
  if (!flyerPath) {
    return null;
  }

  const { data } = supabase.storage.from("event-flyers").getPublicUrl(flyerPath);
  return data?.publicUrl || null;
};

export const HISTORY_PDF_BUCKET = import.meta.env.VITE_HISTORY_PDF_BUCKET || "history-pdf";
export const DEFAULT_HISTORY_PDF_URL = "/palouse-alliance-history.pdf";
export const MAX_HISTORY_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Set these after uploading the history PDF to a public Supabase Storage bucket.
// Until then, the site serves the bundled PDF from /public.
export const getHistoryPdfUrl = (filePath) => {
  const bucket = import.meta.env.VITE_HISTORY_PDF_BUCKET || HISTORY_PDF_BUCKET;
  const path = filePath || import.meta.env.VITE_HISTORY_PDF_PATH;

  if (!bucket || !path) {
    return DEFAULT_HISTORY_PDF_URL;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || DEFAULT_HISTORY_PDF_URL;
};

export const fetchCurrentHistoryPdf = async () => {
  const bucket = import.meta.env.VITE_HISTORY_PDF_BUCKET || HISTORY_PDF_BUCKET;

  try {
    const { data, error } = await supabase.storage.from(bucket).list("", {
      limit: 10,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      console.warn("Could not list history bucket files:", error.message);
      return {
        url: getHistoryPdfUrl(),
        fileName: null,
      };
    }

    const files = (data || []).filter(
      (item) => item.name && item.name !== ".emptyFolderPlaceholder"
    );

    if (files.length === 0) {
      return {
        url: getHistoryPdfUrl(),
        fileName: null,
      };
    }

    const activeFile = files[0];
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(activeFile.name);

    return {
      url: urlData?.publicUrl || getHistoryPdfUrl(activeFile.name),
      fileName: activeFile.name,
    };
  } catch (err) {
    console.warn("Error fetching current history PDF:", err);
    return {
      url: getHistoryPdfUrl(),
      fileName: null,
    };
  }
};

export const validateHistoryPdfFile = (file) => {
  if (!file) {
    return "Please select a PDF file to upload.";
  }

  const mimeType = file.type?.toLowerCase() || "";
  const name = file.name?.toLowerCase() || "";
  const isPdf = mimeType === "application/pdf" || name.endsWith(".pdf");

  if (!isPdf) {
    return "The uploaded file must be a PDF document (.pdf).";
  }

  if (file.size > MAX_HISTORY_PDF_SIZE_BYTES) {
    return "The PDF file size must be 5 MB or smaller.";
  }

  return null;
};

export const replaceHistoryPdf = async (file) => {
  const validationError = validateHistoryPdfFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const bucket = import.meta.env.VITE_HISTORY_PDF_BUCKET || HISTORY_PDF_BUCKET;

  // Step 1: List all existing files in the history bucket to ensure only a single file remains
  const { data: existingFiles, error: listError } = await supabase.storage
    .from(bucket)
    .list("", { limit: 100 });

  if (listError) {
    throw new Error(`Failed to check existing history files in storage: ${listError.message}`);
  }

  const filesToRemove = (existingFiles || [])
    .filter((item) => item.name && item.name !== ".emptyFolderPlaceholder")
    .map((item) => item.name);

  // Step 2: Atomic cleanup. If there are old files, remove them first.
  // If the cleanup fails, do NOT proceed with uploading the new file.
  if (filesToRemove.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(filesToRemove);

    if (removeError) {
      throw new Error(`Failed to remove old file (${removeError.message}). The new PDF was not uploaded.`);
    }
  }

  // Step 3: Only after old files are successfully deleted, upload the new file
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const newFilePath = `${Date.now()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(newFilePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });

  if (uploadError) {
    throw new Error(`Failed to upload new PDF document: ${uploadError.message}`);
  }

  // Step 4: Retrieve the public URL for the newly uploaded file
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(newFilePath);

  return {
    url: publicUrlData?.publicUrl || getHistoryPdfUrl(newFilePath),
    fileName: newFilePath,
    originalName: file.name,
  };
};
