/**
 * Matnni so‘zlarga ajratadi (inglizcha diktat; raqamlar va apostrof saqlanadi).
 * @param {string} raw
 * @returns {string[]}
 */
export function tokenizeDictationWords(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, ""))
    .filter(Boolean);
}

/**
 * LCS asosida so‘z ketma-ketligini solishtiradi.
 * @param {string[]} refWords
 * @param {string[]} userWords
 * @returns {{ type: 'match' | 'replace' | 'extra' | 'miss', refWord?: string, userWord?: string }[]}
 */
export function diffWordTokens(refWords, userWords) {
  const R = refWords || [];
  const U = userWords || [];
  const n = R.length;
  const m = U.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (R[i - 1] === U[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  /** @type {{ type: 'match' | 'extra' | 'miss', refWord?: string, userWord?: string }[]} */
  const rev = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && R[i - 1] === U[j - 1]) {
      rev.push({ type: "match", refWord: R[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rev.push({ type: "extra", userWord: U[j - 1] });
      j--;
    } else if (i > 0) {
      rev.push({ type: "miss", refWord: R[i - 1] });
      i--;
    } else {
      rev.push({ type: "extra", userWord: U[j - 1] });
      j--;
    }
  }
  rev.reverse();

  /** @type {{ type: 'match' | 'replace' | 'extra' | 'miss', refWord?: string, userWord?: string }[]} */
  const merged = [];
  for (let k = 0; k < rev.length; k++) {
    const cur = rev[k];
    const nxt = rev[k + 1];
    if (cur.type === "miss" && nxt && nxt.type === "extra") {
      merged.push({ type: "replace", refWord: cur.refWord, userWord: nxt.userWord });
      k++;
    } else merged.push(/** @type {*} */ (cur));
  }
  return merged;
}

/**
 * @param {string} text
 */
export function countWordsLoose(text) {
  const t = String(text || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * @param {(s: string) => string} esc
 * @param {{ type: string, refWord?: string, userWord?: string }[]} ops
 */
export function renderWordDiffHtml(esc, ops) {
  const parts = [];
  for (const op of ops) {
    if (op.type === "match") {
      parts.push(
        `<span class="lnd-w lnd-w--ok rounded px-0.5 text-emerald-200 decoration-emerald-400/80 underline decoration-2 underline-offset-2">${esc(op.refWord || "")}</span>`,
      );
    } else if (op.type === "replace") {
      parts.push(`<span class="lnd-w lnd-w--bad mx-0.5 inline-flex flex-col items-center align-top">
  <span class="rounded bg-rose-500/25 px-1 text-rose-100">${esc(op.userWord || "")}</span>
  <span class="mt-0.5 text-[11px] font-semibold text-emerald-300">${esc(op.refWord || "")}</span>
</span>`);
    } else if (op.type === "extra") {
      parts.push(
        `<span class="lnd-w lnd-w--bad mx-0.5 inline-flex flex-col items-center align-top">
  <span class="rounded bg-rose-500/30 px-1 text-rose-100">${esc(op.userWord || "")}</span>
  <span class="mt-0.5 text-[10px] text-slate-500">(ortiqcha)</span>
</span>`,
      );
    } else if (op.type === "miss") {
      parts.push(
        `<span class="lnd-w lnd-w--miss mx-0.5 inline-flex flex-col items-center align-top">
  <span class="rounded border border-amber-500/40 bg-amber-950/40 px-1 text-[11px] text-amber-100">—</span>
  <span class="mt-0.5 text-[11px] font-semibold text-emerald-300">${esc(op.refWord || "")}</span>
</span>`,
      );
    }
  }
  return `<p class="lnd-diff leading-relaxed text-base text-slate-200">${parts.join(" ")}</p>`;
}

/**
 * @param {string} reference
 * @param {string} userText
 * @param {(s: string) => string} esc
 */
export function buildDictationDiffHtml(reference, userText, esc) {
  const refW = tokenizeDictationWords(reference);
  const userW = tokenizeDictationWords(userText);
  const ops = diffWordTokens(refW, userW);
  const ok = ops.filter((o) => o.type === "match").length;
  const bad = ops.length - ok;
  const summary = `<p class="mb-3 text-sm text-slate-400">So‘zlar bo‘yicha: <strong class="text-emerald-300">${ok}</strong> mos, <strong class="text-rose-300">${bad}</strong> farq / ortiqcha.</p>`;
  return summary + renderWordDiffHtml(esc, ops);
}
