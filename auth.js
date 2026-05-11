// auth.js — Silva AI (Supabase + Google OAuth)
// Brauzerda `supabase.createClient` yo‘q; createClient CDN dan import qilinadi.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Vercel / mahalliy: Environment o‘qish (ixtiyoriy).
 * Agar build inject qilmasa, index.html boshida quyidagicha berishingiz mumkin:
 *   <script>window.__ENV = { SUPABASE_URL: "...", SUPABASE_ANON_KEY: "..." };</script>
 */
function readEnv(key, fallback) {
  try {
    var e = typeof window !== "undefined" && window.__ENV;
    if (e && typeof e[key] === "string" && e[key].length) return e[key];
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key])
      return String(import.meta.env[key]);
  } catch (_) {}
  return fallback;
}

const SUPABASE_URL =
  readEnv(
    "SUPABASE_URL",
    window.location.hostname === "localhost"
      ? "https://znzybymwzmezqrqlocvm.supabase.co"
      : "https://znzybymwzmezqrqlocvm.supabase.co"
  ) || "https://znzybymwzmezqrqlocvm.supabase.co";

// Dashboard → Settings → API → anon (public). To‘liq JWT ni joylang yoki window.__ENV orqali bering.
const SUPABASE_ANON_KEY = readEnv("SUPABASE_ANON_KEY", "");

const supabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { flowType: "pkce", detectSessionInUrl: true },
      })
    : null;

const SILVA_USER_KEY = "silva_user";

function persistUserToStorage(user) {
  var m = user.user_metadata || {};
  var id0 = user.identities && user.identities[0];
  var idData = (id0 && id0.identity_data) || {};
  var name = m.full_name || m.name || idData.full_name || idData.name || user.email || "";
  var picture = m.avatar_url || m.picture || idData.avatar_url || idData.picture || "";
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
  } catch (err) {
    console.warn("localStorage:", err);
  }
}

function oauthRedirectUrl() {
  return window.location.origin + "/writing.html";
}

async function loginWithGoogle() {
  if (!supabaseClient) return;
  try {
    var res = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectUrl(),
      },
    });
    if (res.error) throw res.error;
  } catch (err) {
    console.error("Login hatosi:", err && err.message ? err.message : err);
    alert("Login qilishda muammo yuz berdi.");
  }
}

function initAuthSession() {
  if (!supabaseClient) return;

  supabaseClient.auth.getSession().then(function (_ref) {
    var session = _ref.data && _ref.data.session;
    if (session && session.user) persistUserToStorage(session.user);
  });

  supabaseClient.auth.onAuthStateChange(function (event, session) {
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && session.user) {
      persistUserToStorage(session.user);
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  var btn = document.getElementById("btn-google-login");
  if (btn) btn.addEventListener("click", loginWithGoogle);
  initAuthSession();
});
