import { cookies } from "next/headers";

/**
 * Obtiene las preferencias del usuario (tema, icono, capa) desde las cookies.
 * 
 * Performance Note: Leer cookies en un componente servidor en Next.js App Router
 * provoca que toda la ruta que lo consume (como layout.tsx) abandone el renderizado estático
 * (SSG) y opte por renderizado dinámico (SSR) en cada solicitud.
 * 
 * Este es un trade-off intencional para evitar "Flash of Unstyled Content" (FOUC),
 * aplicando las clases iniciales desde el servidor antes de hidratar el cliente.
 */
export async function getServerPreferences() {
  const cookieStore = await cookies();
  const prefs = JSON.parse(cookieStore.get("user_prefs")?.value || "{}");
  return prefs;
}