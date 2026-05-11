/**
 * Silva AI — Supabase Auth (Google OAuth).
 * Supabase Dashboard → Settings → API: Project URL va anon public key ni quyiga qo‘ying.
 * Authentication → URL Configuration: “Redirect URLs” ga ushbu saytning to‘liq index.html manzilini qo‘shing (masalan http://127.0.0.1:5500/index.html).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** @type {string} */
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
/** @type {string} */
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_PUBLIC_ANON_KEY";

const SILVA_USER_KEY = "silva_user";

let supabaseClient = null;

function isConfigured() {
  return (
    SUPABASE_URL &&
    !/YOUR_PROJECT_REF/i.test(SUPABASE_URL) &&
    SUPABASE_ANON_KEY &&
    !/^YOUR_SUPABASE_ANON/i.test(SUPABASE_ANON_KEY)
  );
}

function getSupabase() {
  if (!supabaseClient) {
    if (!isConfigured()) return null;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { flowType: "pkce", detectSessionInUrl: true },
    });
  }
  return supabaseClient;
}

function getOAuthRedirectUrl() {
  const { origin, pathname } = window.location;
  if (pathname.endsWith("index.html")) return origin + pathname;
  if (pathname === "/" || pathname === "") return origin + "/index.html";
  const base = pathname.replace(/\/[^/]*$/, "/");
  return origin + base + "index.html";
}

function isIndexPage() {
  const p = window.location.pathname;
  return /index\.html$/i.test(p) || p === "/" || p === "";
}

/** OAuth / PKCE qaytishi: URL fragment yoki query da sessiya belgilari. */
function hasAuthCallbackInUrl() {
  const h = window.location.hash;
  const s = window.location.search;
  if (h && (h.includes("access_token") || h.includes("code="))) return true;
  if (s && (s.includes("code=") || s.includes("error="))) return true;
  return false;
}

/** Foydalanuvchi ism va rasmini localStorage ga yozadi. */
function persistUserToStorage(user) {
  const m = user.user_metadata || {};
  const id0 = user.identities && user.identities[0];
  const idData = (id0 && id0.identity_data) || {};
  const name = m.full_name || m.name || idData.full_name || idData.name || user.email || "";
  const picture = m.avatar_url || m.picture || idData.avatar_url || idData.picture || "";
  try {
    localStorage.setItem(
      SILVA_USER_KEY,
      JSON.stringify({
        name: String(name),
        picture: String(picture),
        email: user.email || "",
        updatedAt: Date.now(),
      })
    );
  } catch (e) {
    console.warn("localStorage yozilmadi:", e);
  }
}

let postLoginRedirectScheduled = false;

function redirectToWritingAfterLogin() {
  if (postLoginRedirectScheduled) return;
  if (!isIndexPage()) return;
  postLoginRedirectScheduled = true;
  try {
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  } catch (_) {}
  window.location.assign("writing.html");
}

function initAuthSession() {
  const sb = getSupabase();
  if (!sb) return;

  sb.auth.onAuthStateChange((event, session) => {
    if (!session?.user) return;
    var fromOAuth =
      event === "SIGNED_IN" || (event === "INITIAL_SESSION" && isIndexPage() && hasAuthCallbackInUrl());
    if (!fromOAuth) return;
    persistUserToStorage(session.user);
    redirectToWritingAfterLogin();
  });
}

async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) {
    window.alert(
      "Supabase hali sozlanmagan.\n\nauth.js ichida SUPABASE_URL va SUPABASE_ANON_KEY ni Supabase Dashboard → Settings → API dan nusxalang."
    );
    return;
  }
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getOAuthRedirectUrl(),
    },
  });
  if (error) {
    console.error(error);
    window.alert(error.message || "Google orqali kirishda xatolik.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-google-login");
  if (btn) {
    btn.addEventListener("click", function () {
      signInWithGoogle();
    });
  }
  initAuthSession();
});
