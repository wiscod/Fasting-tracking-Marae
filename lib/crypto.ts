// Client-side AES-GCM encryption for personal prayer subjects.
// Architecture: random data key per user, wrapped (encrypted) with a PBKDF2-derived key from the user's password.
// The wrapped key is stored in profiles. The unwrapped data key lives in sessionStorage only.

const PBKDF2_ITERATIONS = 100_000;

// ── Utilities ──────────────────────────────────────────────────────────────

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

// ── Key derivation ─────────────────────────────────────────────────────────

export async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return b64(salt.buffer);
}

export async function deriveWrappingKey(password: string, saltB64: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(password);
  const base = await crypto.subtle.importKey("raw", raw, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromb64(saltB64).buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

// ── Data key management ────────────────────────────────────────────────────

export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function wrapDataKey(dataKey: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey("raw", dataKey, wrappingKey, { name: "AES-GCM", iv });
  // Store iv + wrapped together
  const combined = new Uint8Array(12 + wrapped.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(wrapped), 12);
  return b64(combined.buffer);
}

export async function unwrapDataKey(wrappedB64: string, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const combined = fromb64(wrappedB64);
  const iv = combined.slice(0, 12);
  const wrapped = combined.slice(12);
  return crypto.subtle.unwrapKey(
    "raw",
    wrapped.buffer as ArrayBuffer,
    wrappingKey,
    { name: "AES-GCM", iv },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

// ── Clé en mémoire uniquement (jamais persistée) ───────────────────────────

let _dataKey: CryptoKey | null = null;

export function setSessionDataKey(dataKey: CryptoKey): void {
  _dataKey = dataKey;
}

export function getSessionDataKey(): CryptoKey | null {
  return _dataKey;
}

export function clearSessionDataKey(): void {
  _dataKey = null;
}

// ── Label encryption/decryption ────────────────────────────────────────────

const ENC_PREFIX = "enc:";

export async function encryptLabel(text: string, dataKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dataKey, encoded);
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);
  return ENC_PREFIX + b64(combined.buffer);
}

export async function decryptLabel(stored: string, dataKey: CryptoKey): Promise<string | null> {
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  try {
    const combined = fromb64(stored.slice(ENC_PREFIX.length));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, dataKey, ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

export function isEncrypted(value: string | null): boolean {
  return !!value?.startsWith(ENC_PREFIX);
}

// ── Init helpers (called from auth pages) ─────────────────────────────────

// Called after email/password login
export async function initKeyFromLogin(
  password: string,
  encSalt: string,
  encWrappedKey: string,
): Promise<void> {
  const wrappingKey = await deriveWrappingKey(password, encSalt);
  const dataKey = await unwrapDataKey(encWrappedKey, wrappingKey);
  setSessionDataKey(dataKey);
}

// Called after signup — generates key, returns salt+wrappedKey to save in profiles
export async function setupNewKey(password: string): Promise<{ salt: string; wrappedKey: string; dataKey: CryptoKey }> {
  const salt = await generateSalt();
  const wrappingKey = await deriveWrappingKey(password, salt);
  const dataKey = await generateDataKey();
  const wrappedKey = await wrapDataKey(dataKey, wrappingKey);
  setSessionDataKey(dataKey);
  return { salt, wrappedKey, dataKey };
}

// Called for password change (knows old password) — re-wraps the existing data key
export async function rewrapKey(
  oldPassword: string,
  newPassword: string,
  encSalt: string,
  encWrappedKey: string,
): Promise<{ salt: string; wrappedKey: string }> {
  const oldWrappingKey = await deriveWrappingKey(oldPassword, encSalt);
  const dataKey = await unwrapDataKey(encWrappedKey, oldWrappingKey);
  const newSalt = await generateSalt();
  const newWrappingKey = await deriveWrappingKey(newPassword, newSalt);
  const newWrappedKey = await wrapDataKey(dataKey, newWrappingKey);
  setSessionDataKey(dataKey);
  return { salt: newSalt, wrappedKey: newWrappedKey };
}

// Called for password reset (no old password) — generates fresh key, old encrypted data unreadable
export async function setupKeyAfterReset(newPassword: string): Promise<{ salt: string; wrappedKey: string }> {
  const { salt, wrappedKey } = await setupNewKey(newPassword);
  return { salt, wrappedKey };
}
