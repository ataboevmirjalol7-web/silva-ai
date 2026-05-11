/**
 * Silva AI — Supabase Auth (Google OAuth).
 *
 * Tekshiruv (Dashboard → Settings → API):
 * 1) Project URL — "Project URL" qatori, odatda https://xxxx.supabase.co (bo‘sh joy / oxirgi / yo‘q).
 * 2) anon public — "Project API keys" ostidagi "anon" "public" kalit (JWT, juda uzun satr).
 *
 * Ikkalasini ham to‘liq nusxalab, faqat qo'shtirnoqlar ichidagi matnni almashtiring.
 * Authentication → URL Configuration: Redirect URL (Vercel yoki lokal index.html).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ↓ Supabase Dashboard → Settings → API dan nusxalang (placeholderlarni o‘chirib yozing)
const SUPABASE_URL = "SIZNING_SUPABASE_URL_SHU_YERGA";
const SUPABASE_ANON_KEY = "SIZNING_SUPABASE_ANON_KEY_SHU_YERGA";

// Diqqat! Vercel / production da qiymatlar bo‘lmasa — konsolda xabar.
if (!SUPABASE_URL || SUPABASE_URL === "SIZNING_SUPABASE_URL_SHU_YERGA") {
  console.error("Supabase URL topilmadi!");
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "SIZNING_SUPABASE_ANON_KEY_SHU_YERGA") {
  console.error("Supabase Anon Key topilmadi!");
}

const supabase =
  SUPABASE_URL &&
  SUPABASE_URL !== "SIZNING_SUPABASE_URL_SHU_YERGA" &&
  SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY !== "SIZNING_SUPABASE_ANON_KEY_SHU_YERGA"
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { flowType: "pkce", detectSessionInUrl: true },
      })
    : null;

const SILVA_USER_KEY = "silva_user";

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

function hasAuthCallbackInUrl() {
  const h = window.location.hash;
  const s = window.location.search;
  if (h && (h.includes("access_token") || h.includes("code="))) return true;
  if (s && (s.includes("code=") || s.includes("error="))) return true;
  return false;
}

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
  if (!supabase) return;

  supabase.auth.onAuthStateChange((event, session) => {
    if (!session?.user) return;
    var fromOAuth =
      event === "SIGNED_IN" || (event === "INITIAL_SESSION" && isIndexPage() && hasAuthCallbackInUrl());
    if (!fromOAuth) return;
    persistUserToStorage(session.user);
    redirectToWritingAfterLogin();
  });
}

async function signInWithGoogle() {
  if (!supabase) {
    window.alert(
      "Supabase hali sozlanmagan.\n\nauth.js ichida SUPABASE_URL va SUPABASE_ANON_KEY ni o‘z qiymatlaringiz bilan almashtiring (Dashboard → Settings → API)."
    );
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
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
