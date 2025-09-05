import type { User } from '../types/auth';

interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  user_metadata?: {
    full_name?: string;
    approved?: boolean;
  };
  aud: string;
  exp: number;
  iat: number;
  iss: string;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    // Split the JWT token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

export function extractUserFromJwt(token: string): User | null {
  const payload = decodeJwt(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    fullName: payload.user_metadata?.full_name,
    approved: payload.user_metadata?.approved ?? true, // Default to true for valid JWTs
    createdAt: new Date(payload.iat * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
