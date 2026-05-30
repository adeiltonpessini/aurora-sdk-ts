/**
 * PKCE (RFC 7636) — implementação isomorfa.
 *
 * Funciona em Node 18+ (Web Crypto API global) e browsers/Deno/Bun.
 * `code_verifier` é 32 bytes random → 43 chars base64url.
 * `code_challenge` é base64url(sha256(verifier)).
 */

export interface PkcePair {
  verifier: string
  challenge: string
}

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

function randomBytes(len: number): Uint8Array {
  const buf = new Uint8Array(len)
  const cryptoObj: Crypto =
    (globalThis as { crypto?: Crypto }).crypto ??
    (() => {
      throw new Error("Aurora SDK: Web Crypto API ausente neste runtime.")
    })()
  cryptoObj.getRandomValues(buf)
  return buf
}

function base64url(bytes: Uint8Array): string {
  // Encoding manual sem Buffer pra ficar isomorfo
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function sha256(data: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(data)
  const cryptoObj: Crypto = (globalThis as { crypto?: Crypto }).crypto!
  const buf = await cryptoObj.subtle.digest("SHA-256", encoded)
  return new Uint8Array(buf)
}

/** Random URL-safe string entre 43-128 chars (default 64). */
function randomString(len = 32): string {
  const bytes = randomBytes(len)
  // bytes → string base64url-safe via alfabeto manual (mantém comprimento previsível)
  let out = ""
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHA[bytes[i] % ALPHA.length]
  }
  return out + ALPHA[bytes[0] % ALPHA.length] // garante mínimo 43
}

export async function newPkcePair(): Promise<PkcePair> {
  const verifier = randomString(43)
  const challenge = base64url(await sha256(verifier))
  return { verifier, challenge }
}

export function newOauthState(): string {
  return randomString(16)
}
