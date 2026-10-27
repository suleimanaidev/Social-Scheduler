/**
 * Server-only AES-256-GCM encryption for OAuth tokens at rest.
 *
 * Uses the Web Crypto API (available in both Node.js and Deno) so that tokens
 * encrypted in the Next.js route handlers can be decrypted in the Supabase Edge
 * Function (which runs on Deno) with an identical wire format.
 *
 * Format: `v1.<base64(iv)>.<base64(ciphertext||tag)>`
 */

async function deriveKey(secret: string): Promise<CryptoKey> {
  const data = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function toB64(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function encryptToken(
  plain: string,
  secret: string,
): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plain);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data),
  );
  return `v1.${toB64(iv)}.${toB64(ct)}`;
}

export async function decryptToken(
  cipherText: string,
  secret: string,
): Promise<string> {
  const [version, ivB64, dataB64] = cipherText.split(".");
  if (version !== "v1" || !ivB64 || !dataB64) {
    throw new Error("Unsupported encrypted token format");
  }
  const key = await deriveKey(secret);
  const iv = fromB64(ivB64);
  const data = fromB64(dataB64);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(pt);
}
