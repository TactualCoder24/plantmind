import { createClient } from "@supabase/supabase-js";

const BUCKET = "plant-documents";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function storageAvailable(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Uploads a raw source file (image/PDF) to Supabase Storage so the original
 * scan is preserved alongside its extracted text/entities. Falls back to a
 * local `data:` URI (embedded directly in the document record) if Supabase
 * isn't configured, so image previews still work without any external
 * setup — same fallback-safe pattern as the LLM provider.
 */
export async function uploadRawFile(
  documentId: string,
  filename: string,
  base64Data: string,
  mimeType: string
): Promise<{ url: string; backend: "supabase" | "inline" }> {
  const client = getClient();
  if (!client) {
    return { url: `data:${mimeType};base64,${base64Data}`, backend: "inline" };
  }

  try {
    const buffer = Buffer.from(base64Data, "base64");
    const path = `${documentId}/${filename}`;
    const { error } = await client.storage.from(BUCKET).upload(path, buffer, { contentType: mimeType, upsert: true });
    if (error) throw error;
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, backend: "supabase" };
  } catch (e) {
    console.error("[storage] Supabase upload failed, falling back to inline data URI:", e instanceof Error ? e.message : e);
    return { url: `data:${mimeType};base64,${base64Data}`, backend: "inline" };
  }
}
