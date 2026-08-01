// Real Elite identity spine (spec §16). Real Elite is the canonical IdP; this
// satellite verifies short-lived HS256 handoff tokens and stamps canonical IDs.
// Federation only — no data movement, standalone signups keep working.

export type HubClaims = {
  reo_org_id: string;
  reo_user_id: string;
  email: string;
  name?: string;
  org_name?: string;
  role?: string;
  exp: number;
};

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Verifies an HS256 hub token against the shared secret and returns its claims. */
export async function verifyHubToken(token: string): Promise<HubClaims> {
  // Family standard: ONE shared secret value, same name in every app.
  // REAL_ELITE_HUB_SECRET is kept only as a legacy fallback.
  const secret = process.env.HUB_SIGNING_SECRET ?? process.env.REAL_ELITE_HUB_SECRET;
  if (!secret) throw new Error("Hub linking is not configured");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed hub token");
  const [h, p, s] = parts;

  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h))) as { alg?: string };
  if (header.alg !== "HS256") throw new Error("Unsupported token algorithm");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToBytes(s),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!ok) throw new Error("Invalid hub token signature");

  const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))) as HubClaims;
  if (!claims.reo_org_id || !claims.reo_user_id || !claims.email) {
    throw new Error("Hub token is missing required claims");
  }
  if (!claims.exp || claims.exp * 1000 < Date.now()) throw new Error("Hub token has expired");
  return claims;
}
