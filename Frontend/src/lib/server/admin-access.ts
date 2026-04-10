import "server-only";

import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const REFRESH_TOKEN_COOKIE_KEY = "refreshToken";
const USER_ROLE_COOKIE_KEY = "userRole";

type AdminAccessStatus = "ok" | "auth_required" | "session_expired" | "forbidden";

interface RefreshUserPayload {
  role?: string;
  role_name?: string;
  roles_id?: number;
}

interface RefreshResponseEnvelope {
  success?: boolean;
  data?: {
    accessToken?: string;
    user?: RefreshUserPayload;
  };
}

function isValidAccessToken(accessToken?: string): boolean {
  if (!accessToken) {
    return false;
  }

  return accessToken.split(".").length === 3;
}

function resolveRoleFromRefreshUser(user?: RefreshUserPayload): "admin" | "non_admin" | "unknown" {
  if (!user) {
    return "unknown";
  }

  const roleName = user.role_name || user.role;
  if (roleName) {
    return roleName === "admin" ? "admin" : "non_admin";
  }

  if (typeof user.roles_id === "number") {
    return user.roles_id === 1 ? "admin" : "non_admin";
  }

  return "unknown";
}

function resolveRoleFromHint(roleHint: string | undefined): "admin" | "non_admin" | "unknown" {
  if (roleHint === "admin") {
    return "admin";
  }

  if (roleHint === "user" || roleHint === "pro") {
    return "non_admin";
  }

  return "unknown";
}

async function probeAdminScope(accessToken: string): Promise<AdminAccessStatus> {
  try {
    const adminProbe = await fetch(`${BACKEND_URL}/api/admin`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (adminProbe.status === 200) {
      return "ok";
    }

    if (adminProbe.status === 403) {
      return "forbidden";
    }

    if (adminProbe.status === 401) {
      return "session_expired";
    }

    return "session_expired";
  } catch {
    return "session_expired";
  }
}

export async function verifyAdminAccess(): Promise<AdminAccessStatus> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_KEY)?.value;
    const roleHint = cookieStore.get(USER_ROLE_COOKIE_KEY)?.value;

    if (!refreshToken) {
      return "auth_required";
    }

    const hintedRole = resolveRoleFromHint(roleHint);
    if (hintedRole === "non_admin") {
      return "forbidden";
    }

    if (hintedRole === "admin") {
      return "ok";
    }

    const refreshResponse = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (refreshResponse.status === 403 || refreshResponse.status === 401) {
      return "session_expired";
    }

    if (!refreshResponse.ok) {
      return "session_expired";
    }

    const refreshJson = (await refreshResponse.json()) as RefreshResponseEnvelope;

    if (!refreshJson.success) {
      return "session_expired";
    }

    const accessToken = refreshJson.data?.accessToken;
    if (!isValidAccessToken(accessToken)) {
      return "session_expired";
    }

    const roleResolution = resolveRoleFromRefreshUser(refreshJson.data?.user);

    if (roleResolution === "admin") {
      return "ok";
    }

    if (roleResolution === "non_admin") {
      return "forbidden";
    }

    return probeAdminScope(accessToken!);
  } catch {
    return "session_expired";
  }
}
