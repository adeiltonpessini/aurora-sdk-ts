import { describe, it, expect } from "vitest"
import { newPkcePair, newOauthState } from "../src/oauth/pkce.js"

describe("PKCE", () => {
  it("gera verifier + challenge válidos (RFC 7636)", async () => {
    const { verifier, challenge } = await newPkcePair()
    // verifier deve ter pelo menos 43 chars
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    // verifier deve usar alfabeto unreserved
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
    // challenge é base64url do sha256 → tem comprimento previsível (43)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(challenge.length).toBe(43)
  })

  it("gera pares distintos a cada chamada", async () => {
    const a = await newPkcePair()
    const b = await newPkcePair()
    expect(a.verifier).not.toBe(b.verifier)
    expect(a.challenge).not.toBe(b.challenge)
  })

  it("state OAuth tem comprimento mínimo", () => {
    const s = newOauthState()
    expect(s.length).toBeGreaterThanOrEqual(16)
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})
