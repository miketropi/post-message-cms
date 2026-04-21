import * as jose from "jose";

import { SESSION_MAX_AGE_SEC } from "./constants";
import { getAuthSecretKey } from "./env";

export async function signSessionToken(userId: string): Promise<string> {
  return new jose.SignJWT({})
    .setSubject(userId)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getAuthSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getAuthSecretKey());
    const sub = payload.sub;
    if (typeof sub !== "string") return null;
    return { userId: sub };
  } catch {
    return null;
  }
}
