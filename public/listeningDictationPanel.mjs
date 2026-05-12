import {
  countWordsLoose,
  buildDictationDiffHtml,
} from "/listeningDictationDiff.js";

const TWENTY_MIN_SEC = 20 * 60;
const MIN_WORDS_FOR_ANALYSIS = 50;

function formatMmSs(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function pickTranscript(row) {
  if (!row || typeof row !== "object") return "";
  const o = /** @type {Record<string, unknown>} */ (row);
  const keys = ["transcript", "reference_transcript", "official_transcript", "text", "answer_text"];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickAudioUrl(row) {
  if (!row || typeof row !== "object") return "";
  const o = /** @type {Record<string, unknown>} */ (row);
  const keys = ["audio_url", "audio_src", "audio", "mp3_url", "url"];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * @param {*} sb
 * @param {number} dayNum
 * @param {string} tier
 */
async function fetchListeningTaskRow(sb, dayNum, tier) {
  if (!sb || typeof sb.from !== "function") return { row: null, error: "no_supabase" };
  const t = String(tier || "A2").trim().toUpperCase();
  const d = Math.min(30, Math.max(1, Math.floor(Number(dayNum)) || 1));
  const levelEq = t === "B2" ? "B2" : t === "B1" ? "B1" : "A2";

  const trySelect = async (colTier) => {
    const q = sb.from("listening_tasks").select("*").eq("day_number", d);
    if (colTier) q.eq(colTier, levelEq);
    return q.maybeSingle();
  };

  let res = await trySelect("level");
  if (res.error && res.error.code !== "PGRST116") return { row: null, error: res.error.message };
  if (res.data) return { row: res.data, error: null };

  res = await trySelect("tier");
  if (res.data) return { row: res.data, error: null };

  const res2 = await sb.from("listening_tasks").select("*").eq("day_number", d).maybeSingle();
  if (res2.data) return { row: res2.data, error: null };
  return { row: null, error: res2.error?.message || "not_found" };
}

/**
 * Dashboard diktat kartasi: 20 daqiqa taymer, audio, matn, transcript bilan solishtirish.
 *
 * @param {HTMLElement} mount
 * @param {{
 *   studyDay: number,
 *   tier: string,
 *   ensureSupabase: () => unknown | null,
 *   escapeHtml: (s: string) => string,
 * }} ctx
 * @returns {() => void}
 */
export function setupListeningDictationMount(mount, ctx) {
  if (!mount) return () => {};

  const studyDay = Math.min(30, Math.max(1, Math.floor(Number(ctx.studyDay)) || 1));
  const tier = String(ctx.tier || "A2").trim() || "A2";
  const esc = typeof ctx.escapeHtml === "function" ? ctx.escapeHtml : (s) => String(s ?? "");
  const ensureSupabase = ctx.ensureSupabase;

  const storageKey = `lnd_draft_v1:${tier}:${studyDay}`;
  const stateKey = `lnd_timer_v1:${tier}:${studyDay}`;

  let transcriptRef = "";
  let timerRemainingSec = TWENTY_MIN_SEC;
  let timerStarted = false;
  let timerInterval = null;

  function loadTimerState() {
    try {
      const raw = localStorage.getItem(stateKey);
      if (!raw) return;
      const s = JSON.parse(raw);
      const endTs = Number(s.endTs || 0);
      if (!Number.isFinite(endTs) || endTs <= 0) return;
      const left = Math.ceil((endTs - Date.now()) / 1000);
      timerRemainingSec = Math.max(0, Math.min(TWENTY_MIN_SEC, left));
      timerStarted = Boolean(s.started);
    } catch (_) {
      /* ignore */
    }
  }

  function saveTimerState() {
    try {
      const endTs = timerStarted ? Date.now() + timerRemainingSec * 1000 : 0;
      localStorage.setItem(stateKey, JSON.stringify({ started: timerStarted, endTs }));
    } catch (_) {
      /* ignore */
    }
  }

  function loadDraft() {
    try {
      return String(localStorage.getItem(storageKey) || "");
    } catch (_) {
      return "";
    }
  }

  function saveDraft(text) {
    try {
      localStorage.setItem(storageKey, String(text || ""));
    } catch (_) {
      /* ignore */
    }
  }

  function renderShell() {
    mount.innerHTML = `
<div class="lnd-root space-y-4 rounded-2xl border border-amber-500/30 bg-black/35 p-4 sm:p-6">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0 flex-1">
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/90">Listening · diktat</p>
      <p class="mt-1 text-sm leading-relaxed text-slate-300">Kun ${esc(String(studyDay))}: faqat <strong class="text-white">20 daqiqa</strong> davomida eshitganlaringizni yozing.</p>
      <p data-lnd-status class="mt-2 text-xs text-slate-500">Transkript yuklanmoqda…</p>
    </div>
    <div class="shrink-0 rounded-2xl border-2 border-fuchsia-500/60 bg-black px-4 py-2 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
      <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Qolgan vaqt</p>
      <p data-lnd-timer class="font-mono text-2xl font-black tabular-nums text-fuchsia-200 sm:text-3xl">${formatMmSs(timerRemainingSec)}</p>
    </div>
  </div>
  <div class="rounded-xl border border-white/10 bg-black/30 p-3">
    <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Diktant audio</p>
    <audio data-lnd-audio class="mt-2 w-full" controls preload="metadata" src=""></audio>
  </div>
  <div>
    <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Diktat</label>
    <textarea data-lnd-ta rows="12" spellcheck="false" autocomplete="off" placeholder="Eshitganlaringizni yozing…"
      class="mt-2 min-h-[12rem] w-full resize-y rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-base leading-relaxed text-white placeholder:text-slate-600 focus:border-fuchsia-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/25"></textarea>
    <p data-lnd-wc class="mt-1 text-xs text-slate-500">So‘zlar: 0 (tahlil uchun kamida ${MIN_WORDS_FOR_ANALYSIS})</p>
  </div>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <button type="button" data-lnd-analyze class="hidden inline-flex min-h-[48px] items-center justify-center rounded-xl border border-cyan-400/55 bg-cyan-600/25 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.2)] transition hover:bg-cyan-600/40">
      AI tahlil
    </button>
    <p data-lnd-hint class="text-xs text-slate-500">20 daqiqa tugagach va kamida ${MIN_WORDS_FOR_ANALYSIS} so‘z bo‘lsa, «AI tahlil» paydo bo‘ladi.</p>
  </div>
  <div data-lnd-result class="hidden rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 text-sm"></div>
</div>`;
  }

  function updateWordCountLabel(ta, btn, hint) {
    const n = countWordsLoose(ta.value);
    const wc = mount.querySelector("[data-lnd-wc]");
    if (wc) wc.textContent = `So‘zlar: ${n} (tahlil uchun kamida ${MIN_WORDS_FOR_ANALYSIS})`;
    const timeUp = timerRemainingSec <= 0;
    const show = timeUp && n >= MIN_WORDS_FOR_ANALYSIS && transcriptRef.length > 0;
    btn.classList.toggle("hidden", !show);
    hint.classList.toggle("hidden", show);
  }

  function startTimerIfNeeded() {
    if (timerStarted) return;
    timerStarted = true;
    if (timerRemainingSec <= 0) timerRemainingSec = TWENTY_MIN_SEC;
    saveTimerState();
  }

  function tickTimer() {
    const chip = mount.querySelector("[data-lnd-timer]");
    if (timerRemainingSec > 0) {
      timerRemainingSec -= 1;
      saveTimerState();
    }
    if (chip) chip.textContent = formatMmSs(timerRemainingSec);
    const ta = /** @type {HTMLTextAreaElement} */ (mount.querySelector("[data-lnd-ta]"));
    const analyzeBtn = /** @type {HTMLButtonElement} */ (mount.querySelector("[data-lnd-analyze]"));
    const hintEl = mount.querySelector("[data-lnd-hint]");
    if (ta && analyzeBtn && hintEl) updateWordCountLabel(ta, analyzeBtn, hintEl);
    if (timerRemainingSec <= 0 && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  renderShell();
  loadTimerState();
  const ta = /** @type {HTMLTextAreaElement} */ (mount.querySelector("[data-lnd-ta]"));
  const audio = /** @type {HTMLAudioElement} */ (mount.querySelector("[data-lnd-audio]"));
  const analyzeBtn = /** @type {HTMLButtonElement} */ (mount.querySelector("[data-lnd-analyze]"));
  const resultEl = mount.querySelector("[data-lnd-result]");
  const statusEl = mount.querySelector("[data-lnd-status]");
  const hintEl = mount.querySelector("[data-lnd-hint]");

  ta.value = loadDraft();

  (async () => {
    const sb = typeof ensureSupabase === "function" ? ensureSupabase() : null;
    const { row, error } = await fetchListeningTaskRow(sb, studyDay, tier);
    transcriptRef = pickTranscript(row);
    const audioUrl = pickAudioUrl(row);
    if (audioUrl) audio.src = audioUrl;
    if (statusEl) {
      if (!transcriptRef)
        statusEl.textContent =
          error === "no_supabase"
            ? "Supabase ulanmagan — transcript tekshiruvi ishlamaydi."
            : "Transkript topilmadi. `listening_tasks` qatorida `transcript` maydonini tekshiring.";
      else statusEl.textContent = "Transkript yuklandi — audio yoki matn maydoniga fokuslanganda taymer ketadi.";
    }
    updateWordCountLabel(ta, analyzeBtn, hintEl);
  })();

  audio.addEventListener("play", () => {
    startTimerIfNeeded();
    if (!timerInterval) timerInterval = window.setInterval(tickTimer, 1000);
  });

  ta.addEventListener("focus", () => {
    startTimerIfNeeded();
    if (!timerInterval) timerInterval = window.setInterval(tickTimer, 1000);
  });

  ta.addEventListener("input", () => {
    saveDraft(ta.value);
    updateWordCountLabel(ta, analyzeBtn, hintEl);
  });

  if (timerStarted && timerRemainingSec > 0 && !timerInterval) {
    timerInterval = window.setInterval(tickTimer, 1000);
  }
  tickTimer();

  analyzeBtn.addEventListener("click", () => {
    if (!transcriptRef) return;
    const userText = ta.value;
    if (countWordsLoose(userText) < MIN_WORDS_FOR_ANALYSIS) return;
    resultEl.classList.remove("hidden");
    resultEl.innerHTML = `<p class="mb-2 text-[11px] font-bold uppercase tracking-wider text-violet-200">Transcript bilan solishtirish</p>${buildDictationDiffHtml(transcriptRef, userText, esc)}`;
  });

  return () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  };
}
