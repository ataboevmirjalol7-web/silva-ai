/**
 * writing.html — Topic: questions.js dan tasodifiy; Analyze: POST /api/check-writing (Groq).
 */
(function () {
  const API_ANALYZE = "/api/check-writing";
  const MIN_LENGTH = 20;

  function countWords(text) {
    const t = text.trim();
    if (!t) return 0;
    return t.split(/\s+/).length;
  }

  function formatScore(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return "—";
    return (Math.round(n * 2) / 2).toFixed(1);
  }

  function overallSummary(band) {
    if (Number.isNaN(band)) return "";
    if (band >= 7.5) return "Kuchli natija — ayrim detallar bilan 8+ bandga yaqinlashish mumkin.";
    if (band >= 6.5) return "Yaxshi asos — jumlalar va topshirishni yanada puxta qiling.";
    if (band >= 5.5) return "Barqaror boshlang‘ich — grammatika va bog‘lovchilarga e’tibor bering.";
    return "Salmoqli tahlil — avvalo topshirish va aniq yozishga fokus qiling.";
  }

  function analysisOnly(block) {
    if (!block || typeof block !== "object") return "—";
    const analysis = typeof block.analysis === "string" ? block.analysis.trim() : "";
    return analysis || "—";
  }

  function taskTypeLabel(type) {
    const m = {
      task11: "Task 1.1",
      task12: "Task 1.2",
      part2: "Part 2",
      email: "Email",
      letter: "Letter",
      essay: "Essay",
      report: "Task 1 report",
    };
    return m[type] || type;
  }

  /**
   * @param {string | { context?: string, prompt?: string }} item
   * @param {Record<string, unknown>} bank
   * @param {string} taskKey
   * @returns {{ fullText: string, showContext: boolean, contextText: string, promptText: string }}
   */
  function buildTopicPayload(item, bank, taskKey) {
    if (typeof item === "string") {
      return {
        fullText: item,
        showContext: false,
        contextText: "",
        promptText: item,
      };
    }
    var prompt = typeof item.prompt === "string" ? item.prompt : "";
    var ctx =
      typeof item.context === "string"
        ? item.context
        : typeof bank.canteenContext === "string"
          ? bank.canteenContext
          : "";
    if ((taskKey === "task11" || taskKey === "task12") && ctx) {
      return {
        fullText: "Context:\n\n" + ctx + "\n\n---\n\n" + prompt,
        showContext: true,
        contextText: ctx,
        promptText: prompt,
      };
    }
    return {
      fullText: prompt,
      showContext: false,
      contextText: "",
      promptText: prompt,
    };
  }

  /**
   * @param {unknown[]} list
   * @param {Record<string, unknown>} bank
   * @param {string} taskKey
   * @param {string} [avoidFullText]
   */
  function pickRandomItem(list, bank, taskKey, avoidFullText) {
    if (!list || list.length === 0) return null;
    if (list.length === 1) return list[0];
    var pick = list[Math.floor(Math.random() * list.length)];
    var tries = 0;
    while (tries < 25) {
      var full = buildTopicPayload(pick, bank, taskKey).fullText;
      if (!avoidFullText || full !== avoidFullText || tries > 15) break;
      pick = list[Math.floor(Math.random() * list.length)];
      tries++;
    }
    return pick;
  }

  function initWritingPage() {
    const essay = document.getElementById("essay");
    const checkBtn = document.getElementById("check-btn");
    if (!essay || !checkBtn) return;

    /** @type {string} */
    let currentTopic = "";
    /** @type {'task11' | 'task12' | 'part2'} */
    let selectedTask = "task11";

    const wordCountEl = document.getElementById("word-count");
    const topicLoading = document.getElementById("topic-loading");
    const topicContent = document.getElementById("topic-content");
    const topicBadges = document.getElementById("topic-badges");
    const topicText = document.getElementById("topic-text");
    const topicContextWrap = document.getElementById("topic-context-wrap");
    const topicContextEl = document.getElementById("topic-context");
    const topicError = document.getElementById("topic-error");
    const refreshTopicBtn = document.getElementById("refresh-topic-btn");
    const tabTask11 = document.getElementById("tab-task11");
    const tabTask12 = document.getElementById("tab-task12");
    const tabPart2 = document.getElementById("tab-part2");

    const emptyState = document.getElementById("empty-state");
    const loadingOverlay = document.getElementById("loading-overlay");
    const resultsContent = document.getElementById("results-content");
    const bandNum = document.getElementById("band-score-num");
    const bandSummary = document.getElementById("band-summary");
    const scoreGrammar = document.getElementById("score-grammar");
    const scoreVocab = document.getElementById("score-vocab");
    const scoreTask = document.getElementById("score-task");
    const scoreCohesion = document.getElementById("score-cohesion");
    const resultGrammar = document.getElementById("result-grammar");
    const resultVocab = document.getElementById("result-vocab");
    const resultTask = document.getElementById("result-task");
    const resultCohesion = document.getElementById("result-cohesion");
    const errorEl = document.getElementById("writing-error");
    const yearEl = document.getElementById("year");

    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    function updateWordCount() {
      if (!wordCountEl) return;
      wordCountEl.textContent = String(countWords(essay.value));
    }
    updateWordCount();
    essay.addEventListener("input", updateWordCount);

    function setActiveTaskTab(mode) {
      const tabs = [tabTask11, tabTask12, tabPart2].filter(Boolean);
      tabs.forEach(function (btn) {
        if (!btn) return;
        const isSel = btn.getAttribute("data-task") === mode;
        btn.classList.toggle("task-tab-active", isSel);
        btn.setAttribute("aria-selected", isSel ? "true" : "false");
      });
    }

    function loadTopic() {
      if (topicError) {
        topicError.classList.add("hidden");
        topicError.textContent = "";
      }
      if (topicLoading) topicLoading.classList.add("hidden");

      const bank =
        typeof window !== "undefined" && window.LIVA_WRITING_QUESTIONS
          ? window.LIVA_WRITING_QUESTIONS
          : null;
      const list = bank && bank[selectedTask] ? bank[selectedTask] : null;

      if (!list || list.length === 0) {
        currentTopic = "";
        if (topicContent) topicContent.classList.add("hidden");
        if (topicContextWrap) topicContextWrap.classList.add("hidden");
        if (topicError) {
          topicError.textContent =
            "Savollar topilmadi — questions.js yuklanganini tekshiring (LIVA_WRITING_QUESTIONS).";
          topicError.classList.remove("hidden");
        }
        return;
      }

      var picked = pickRandomItem(list, bank, selectedTask, currentTopic);
      if (picked == null) {
        currentTopic = "";
        return;
      }
      var payload = buildTopicPayload(picked, bank, selectedTask);
      currentTopic = payload.fullText;
      if (topicContextEl) topicContextEl.textContent = payload.contextText;
      if (topicContextWrap) {
        if (payload.showContext && payload.contextText) {
          topicContextWrap.classList.remove("hidden");
        } else {
          topicContextWrap.classList.add("hidden");
        }
      }
      if (topicText) topicText.textContent = payload.promptText;
      if (topicBadges) {
        topicBadges.innerHTML = "";
        const typeBadge = document.createElement("span");
        typeBadge.className =
          "rounded-lg border border-fuchsia-400/35 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-fuchsia-100";
        typeBadge.textContent = taskTypeLabel(selectedTask);
        topicBadges.appendChild(typeBadge);
        const srcBadge = document.createElement("span");
        srcBadge.className =
          "rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-100";
        srcBadge.textContent = "Lokal bank";
        topicBadges.appendChild(srcBadge);
      }
      if (topicContent) topicContent.classList.remove("hidden");
    }

    function onTabClick(mode) {
      if (mode !== "task11" && mode !== "task12" && mode !== "part2") return;
      selectedTask = mode;
      setActiveTaskTab(mode);
      loadTopic();
    }

    if (tabTask11) tabTask11.addEventListener("click", function () { onTabClick("task11"); });
    if (tabTask12) tabTask12.addEventListener("click", function () { onTabClick("task12"); });
    if (tabPart2) tabPart2.addEventListener("click", function () { onTabClick("part2"); });

    setActiveTaskTab("task11");
    loadTopic();
    if (refreshTopicBtn) {
      refreshTopicBtn.addEventListener("click", loadTopic);
    }

    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.classList.remove("hidden");
    }

    function hideError() {
      if (!errorEl) return;
      errorEl.classList.add("hidden");
      errorEl.textContent = "";
    }

    function setLoading(isLoading) {
      if (!loadingOverlay) return;
      loadingOverlay.classList.toggle("is-hidden", !isLoading);
      loadingOverlay.setAttribute("aria-busy", isLoading ? "true" : "false");
    }

    checkBtn.addEventListener("click", function () {
      const text = essay.value.trim();
      if (text.length < MIN_LENGTH) {
        essay.focus();
        essay.classList.add("ring-2", "ring-amber-400/45");
        window.setTimeout(function () {
          essay.classList.remove("ring-2", "ring-amber-400/45");
        }, 1200);
        return;
      }

      hideError();
      checkBtn.disabled = true;
      if (emptyState) emptyState.classList.add("hidden");
      if (resultsContent) resultsContent.classList.add("is-hidden");
      setLoading(true);

      const body = {
        essay: text,
        topic: currentTopic,
      };

      fetch(API_ANALYZE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      })
        .then(function (res) {
          return res.json().then(function (payload) {
            if (!res.ok) {
              const message =
                (payload && payload.error) ||
                (res.status === 404
                  ? "Tahlil API topilmadi (statik ochilsa /api ishlamaydi — Vercelda sinang)."
                  : "Server xatosi: " + res.status);
              throw new Error(message);
            }
            return payload;
          });
        })
        .then(function (data) {
          const ob = Number(data.overallBand);
          if (bandNum) bandNum.textContent = formatScore(data.overallBand);
          if (bandSummary) bandSummary.textContent = overallSummary(ob);

          if (scoreGrammar) scoreGrammar.textContent = formatScore(data.grammar && data.grammar.score);
          if (scoreVocab) scoreVocab.textContent = formatScore(data.vocabulary && data.vocabulary.score);
          if (scoreTask) scoreTask.textContent = formatScore(data.taskResponse && data.taskResponse.score);
          if (scoreCohesion) scoreCohesion.textContent = formatScore(data.cohesion && data.cohesion.score);

          if (resultGrammar) resultGrammar.textContent = analysisOnly(data.grammar);
          if (resultVocab) resultVocab.textContent = analysisOnly(data.vocabulary);
          if (resultTask) resultTask.textContent = analysisOnly(data.taskResponse);
          if (resultCohesion) resultCohesion.textContent = analysisOnly(data.cohesion);

          setLoading(false);
          if (resultsContent) resultsContent.classList.remove("is-hidden");
        })
        .catch(function (err) {
          setLoading(false);
          showError(err && err.message ? err.message : "So‘rov bajarilmadi.");
          if (emptyState) emptyState.classList.remove("hidden");
        })
        .finally(function () {
          checkBtn.disabled = false;
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWritingPage);
  } else {
    initWritingPage();
  }
})();
