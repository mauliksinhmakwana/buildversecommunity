import { supabase } from "@/integrations/supabase/client";

export const ROLES_OPTIONS = ["entrepreneur", "creator", "student", "builder", "investor", "designer", "developer"] as const;
export const LOOKING_FOR_OPTIONS = ["cofounder", "collab", "mentor", "hire", "feedback"] as const;

export async function uploadToBucket(bucket: string, file: File, userId: string) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  // Signed URL — buckets are private. Long expiry for in-app display.
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  return { path, url: data?.signedUrl ?? "" };
}

export async function signedUrl(bucket: string, path: string, expiresIn = 60 * 60) {
  if (!path) return "";
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? "";
}

export function initials(name?: string | null) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}
