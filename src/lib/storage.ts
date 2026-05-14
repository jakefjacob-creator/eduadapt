import { supabaseAdmin, STORAGE_BUCKET } from "./supabase";

/**
 * Upload a buffer to Supabase Storage and return its public URL.
 * Paths are namespaced per child so files stay organised.
 */
export async function uploadBuffer(
  path: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, data, { contentType, upsert: true });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: pub } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return pub.publicUrl;
}

/** Make a safe, unique storage key. */
export function storageKey(
  childId: string,
  kind: "source" | "output",
  filename: string,
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  return `${childId}/${kind}/${Date.now()}-${safe}`;
}
