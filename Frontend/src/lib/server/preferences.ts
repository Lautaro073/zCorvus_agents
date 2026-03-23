import { cookies } from "next/headers";

export async function getServerPreferences() {
  const cookieStore = await cookies();
  const prefs = JSON.parse(cookieStore.get("user_prefs")?.value || "{}");
  return prefs;
}