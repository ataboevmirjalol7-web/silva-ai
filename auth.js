// auth.js — Silva AI (Supabase Auth)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// 1. Supabase ma'lumotlari
const SUPABASE_URL = "https://znzybymwzmezqrqlocvm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Dashboard → API: to'liq anon public JWT ni qo'ying

// 2. Client (brauzerda `supabase.createClient` yo‘q — createClient import)
let supabaseClient = null;
try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: "pkce", detectSessionInUrl: true },
  });
} catch (e) {
  console.error("[Silva Auth] createClient:", e);
}

const SILVA_USER_KEY = "silva_user";

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
  } catch (err) {
    console.warn("[Silva Auth] localStorage:", err);
  }
}

function initAuthSession() {
  if (!supabaseClient) return;
  supabaseClient.auth.getSession().then(function (ref) {
    const session = ref.data && ref.data.session;
    if (session && session.user) persistUserToStorage(session.user);
  });
  supabaseClient.auth.onAuthStateChange(function (event, session) {
    if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && session.user) {
      persistUserToStorage(session.user);
    }
  });
}

// 3. Login
async function loginWithGoogle() {
  if (!supabaseClient) {
    console.error("[Silva Auth] Login: klient yaratilmagan (URL yoki key).");
    return;
  }
  console.log("Login jarayoni boshlandi...");
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/writing.html",
    },
  });
  if (error) {
    console.error("Xatolik tafsiloti:", error.message);
    alert("Xatolik yuz berdi: " + error.message);
  }
}

// 4. Tugma + sessiya
document.addEventListener("DOMContentLoaded", () => {
  initAuthSession();

  const loginBtn = document.getElementById("google-login-btn");
  if (loginBtn) {
    loginBtn.onclick = (e) => {
      e.preventDefault();
      loginWithGoogle();
    };
  } else {
    console.warn("[Silva Auth] #google-login-btn topilmadi (index.html).");
  }
});
