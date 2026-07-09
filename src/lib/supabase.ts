import { createClient } from "@supabase/supabase-js";

/** ALLBLU Supabase project — hardcoded for MVP (no .env) */
const supabaseUrl = "https://walawglhxppdghfwnrct.supabase.co";
const supabaseAnonKey =
  "sb_publishable_ZqEIdQks6CMI0snwAcAEGQ_NbJUQmRC";

export const supabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
