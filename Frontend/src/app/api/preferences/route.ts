import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEFAULT_USER_PREFERENCES,
  normalizeUserPreferences,
  parseUserPreferencesCookie,
  serializeUserPreferences,
} from "@/lib/preferences/contract";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const prefs = parseUserPreferencesCookie(cookieStore.get("user_prefs")?.value);
    return NextResponse.json(prefs, { status: 200 });
  } catch {
    return NextResponse.json(
      DEFAULT_USER_PREFERENCES,
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const prefs = normalizeUserPreferences(await request.json());

    const cookieStore = await cookies();
    cookieStore.set("user_prefs", serializeUserPreferences(prefs), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return NextResponse.json(prefs, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
