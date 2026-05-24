import { supabase } from "@/integrations/supabase/client";

const BUCKET = "kpt-files";

/**
 * Extracts the storage path (relative to the bucket) from either:
 * - a stored bare path like "documents/foo.png"
 * - a legacy public URL like ".../storage/v1/object/public/kpt-files/documents/foo.png"
 * - a signed URL like ".../storage/v1/object/sign/kpt-files/documents/foo.png?token=..."
 */
export function extractStoragePath(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const s = String(urlOrPath).trim();
  if (!s) return null;
  // data: or blob: — return as-is via caller (handled separately)
  if (s.startsWith("data:") || s.startsWith("blob:")) return null;
  const markers = [
    `/storage/v1/object/public/${BUCKET}/`,
    `/storage/v1/object/sign/${BUCKET}/`,
    `/storage/v1/object/authenticated/${BUCKET}/`,
  ];
  for (const m of markers) {
    const idx = s.indexOf(m);
    if (idx !== -1) {
      const rest = s.slice(idx + m.length);
      const qIdx = rest.indexOf("?");
      return decodeURIComponent(qIdx === -1 ? rest : rest.slice(0, qIdx));
    }
  }
  // Already a bare path
  if (/^https?:\/\//i.test(s)) return null; // unknown URL, can't sign
  return s.replace(/^\/+/, "");
}

/**
 * Returns a freshly signed URL for a stored asset. Pass-through for data:/blob: URIs.
 * Returns null if the value can't be resolved.
 */
export async function signFileUrl(
  urlOrPath: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!urlOrPath) return null;
  const s = String(urlOrPath);
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  const path = extractStoragePath(s);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
