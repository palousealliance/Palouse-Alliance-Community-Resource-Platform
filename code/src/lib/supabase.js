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

// Set these after uploading the history PDF to a public Supabase Storage bucket.
// Until then, the site serves the bundled PDF from /public.
export const getHistoryPdfUrl = () => {
  const bucket = import.meta.env.VITE_HISTORY_PDF_BUCKET;
  const path = import.meta.env.VITE_HISTORY_PDF_PATH;

  if (!bucket || !path) {
    return "/palouse-alliance-history.pdf";
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "/palouse-alliance-history.pdf";
};
