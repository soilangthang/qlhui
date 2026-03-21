import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth-constants";

export { AUTH_COOKIE_NAME };

type AuthPayload = {
  sub: string;
  rule: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET");
  }
  return secret;
}

export function signAuthToken(payload: AuthPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

export async function getAuthPayloadFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}
