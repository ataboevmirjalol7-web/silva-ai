/**
 * writing.html — Step-by-step full test (1.1 → 1.2 → Part 2); Analyze: POST /api/check-silva.
 */
(function () {
  const API_ANALYZE = "/api/check-silva";

  const MIN_WORDS_BY_TASK = {
    task11: 45,
    task12: 110,
    part2: 170,
  };

  /** @typedef {'1.1' | '1.2' | '2'} WritingStep */

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

  /** @param {WritingStep} step */
  function stepToTaskKey(step) {
    if (step === "1.1") return "task11";
    if (step === "1.2") return "task12";
    return "part2";
  }

  function initWritingPage() {
    const essay = document.getElementById("essay");
    const checkBtn = document.getElementById("check-btn");
    const checkBtnWrap = document.getElementById("check-btn-wrap");
    const checkBtnLabel = document.getElementById("check-btn-label");
    const nextStepBtn = document.getElementById("next-step-btn");
    if (!essay || !checkBtn) return;

    /** @type {WritingStep} */
    let currentStep = "1.1";
    /** @type {'task11' | 'task12' | 'part2'} */
    let selectedTask = "task11";

    let currentTopic = "";
    let savedEssay11 = "";
    let savedTopic11 = "";
    let savedEssay12 = "";
    let savedTopic12 = "";

    /** @type {{ title?: string, canteenContext: string, task11: unknown[], task12: unknown[], part2: unknown[] } | null} */
    let activeWritingTest = null;

    const wordCountEl = document.getElementById("word-count");
    const topicLoading = document.getElementById("topic-loading");
    const topicContent = document.getElementById("topic-content");
    const topicBadges = document.getElementById("topic-badges");
    const topicText = document.getElementById("topic-text");
    const topicContextWrap = document.getElementById("topic-context-wrap");
    const topicContextEl = document.getElementById("topic-context");
    const topicError = document.getElementById("topic-error");
    const refreshTopicBtn = document.getElementById("refresh-topic-btn");
    const stepperRoot = document.getElementById("writing-stepper");
    const stepLine1 = document.getElementById("writing-step-line-1");
    const stepLine2 = document.getElementById("writing-step-line-2");

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
    const checkBtnBlocker = document.getElementById("check-btn-blocker");
    const minWordsHint = document.getElementById("min-words-hint");

    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    let analyzeBusy = false;

    function getMinWordsForTask(task) {
      var m = MIN_WORDS_BY_TASK[task];
      return typeof m === "number" ? m : MIN_WORDS_BY_TASK.task11;
    }

    function isCurrentEssayValid() {
      return countWords(essay.value) >= getMinWordsForTask(selectedTask);
    }

    function canGoNextFromStep() {
      if (currentStep === "1.1") return countWords(essay.value) >= MIN_WORDS_BY_TASK.task11;
      if (currentStep === "1.2") return countWords(essay.value) >= MIN_WORDS_BY_TASK.task12;
      return false;
    }

    function updateStepperVisual() {
      if (!stepperRoot) return;
      var order = /** @type {WritingStep[]} */ (["1.1", "1.2", "2"]);
      var idx = order.indexOf(currentStep);
      if (idx < 0) idx = 0;
      stepperRoot.querySelectorAll("[data-writing-step]").forEach(function (el) {
        var s = /** @type {HTMLElement} */ (el).getAttribute("data-writing-step");
        var i = order.indexOf(/** @type {WritingStep} */ (s));
        el.classList.remove("is-current", "is-done");
        if (i < idx) el.classList.add("is-done");
        else if (i === idx) el.classList.add("is-current");
      });
      if (stepLine1) {
        stepLine1.classList.toggle("is-done", idx >= 1);
      }
      if (stepLine2) {
        stepLine2.classList.toggle("is-done", idx >= 2);
      }
    }

    function syncAnalyzeControls() {
      selectedTask = stepToTaskKey(currentStep);
      updateStepperVisual();

      var onPart2 = currentStep === "2";
      var wordsOkAnalyze = onPart2 && isCurrentEssayValid();
      var canSubmit = wordsOkAnalyze && !analyzeBusy;

      if (checkBtnWrap) {
        checkBtnWrap.classList.toggle("hidden", !onPart2);
      }
      checkBtn.disabled = !canSubmit;
      if (checkBtnLabel) {
        checkBtnLabel.textContent = "Analyze Full Test";
      }
      if (checkBtnBlocker) {
        checkBtnBlocker.classList.toggle("hidden", !onPart2 || wordsOkAnalyze || analyzeBusy);
      }

      if (nextStepBtn) {
        var showNext = !onPart2 && canGoNextFromStep() && !analyzeBusy;
        nextStepBtn.classList.toggle("hidden", !showNext);
        if (currentStep === "1.1") {
          nextStepBtn.textContent = "Next: Task 1.2";
        } else if (currentStep === "1.2") {
          nextStepBtn.textContent = "Next: Part 2";
        }
        nextStepBtn.disabled = !canGoNextFromStep() || analyzeBusy;
      }

      if (minWordsHint) {
        var min = getMinWordsForTask(selectedTask);
        minWordsHint.textContent =
          "Minimum · " + min + " so‘z · " + taskTypeLabel(selectedTask) + " (bosqich " + currentStep + ")";
      }
    }

    function updateWordCount() {
      if (!wordCountEl) return;
      wordCountEl.textContent = String(countWords(essay.value));
      syncAnalyzeControls();
    }

    updateWordCount();
    essay.addEventListener("input", updateWordCount);

    if (checkBtnBlocker) {
      checkBtnBlocker.addEventListener("click", function (e) {
        e.preventDefault();
        window.alert("Iltimos, avval vazifani to'liq bajaring.");
      });
    }

    function setTopicLoadingVisible(visible) {
      if (!topicLoading) return;
      topicLoading.style.display = visible ? "flex" : "none";
      topicLoading.setAttribute("aria-hidden", visible ? "false" : "true");
    }

    function setTopicContentVisible(visible) {
      if (!topicContent) return;
      topicContent.style.display = visible ? "block" : "none";
      topicContent.setAttribute("aria-hidden", visible ? "false" : "true");
    }

    function loadTopic() {
      if (topicError) {
        topicError.classList.add("hidden");
        topicError.textContent = "";
      }

      setTopicLoadingVisible(false);
      setTopicContentVisible(false);

      selectedTask = stepToTaskKey(currentStep);

      const bank =
        typeof window !== "undefined" && window.SILVA_WRITING_QUESTIONS
          ? window.SILVA_WRITING_QUESTIONS
          : null;

      var effectiveBank = bank;
      if (bank && bank.tests && bank.tests.length > 0) {
        if (!activeWritingTest) {
          activeWritingTest = bank.tests[Math.floor(Math.random() * bank.tests.length)];
        }
        effectiveBank = {
          canteenContext: activeWritingTest.canteenContext,
          task11: activeWritingTest.task11,
          task12: activeWritingTest.task12,
          part2: activeWritingTest.part2,
        };
      } else {
        activeWritingTest = null;
      }

      const list = effectiveBank && effectiveBank[selectedTask] ? effectiveBank[selectedTask] : null;

      if (!list || list.length === 0) {
        currentTopic = "";
        if (topicContextWrap) topicContextWrap.classList.add("hidden");
        if (topicError) {
          topicError.textContent =
            "Savollar topilmadi — questions.js yuklanganini tekshiring (SILVA_WRITING_QUESTIONS).";
          topicError.classList.remove("hidden");
        }
        syncAnalyzeControls();
        return;
      }

      var avoid =
        selectedTask === "task11"
          ? savedTopic11
          : selectedTask === "task12"
            ? savedTopic12
            : currentTopic || "";
      var picked = pickRandomItem(list, effectiveBank, selectedTask, avoid);
      if (picked == null) {
        currentTopic = "";
        syncAnalyzeControls();
        return;
      }
      var payload = buildTopicPayload(picked, effectiveBank, selectedTask);
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
        if (activeWritingTest && activeWritingTest.title) {
          const testBadge = document.createElement("span");
          testBadge.className =
            "rounded-lg border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-violet-100";
          testBadge.textContent = activeWritingTest.title;
          topicBadges.appendChild(testBadge);
        }
        const typeBadge = document.createElement("span");
        typeBadge.className =
          "rounded-lg border border-fuchsia-400/35 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-fuchsia-100";
        typeBadge.textContent = taskTypeLabel(selectedTask);
        topicBadges.appendChild(typeBadge);
        const srcBadge = document.createElement("span");
        srcBadge.className =
          "rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-100";
        srcBadge.textContent = bank && bank.tests && bank.tests.length ? "Test banki" : "Lokal bank";
        topicBadges.appendChild(srcBadge);
      }

      setTopicLoadingVisible(false);
      setTopicContentVisible(true);
      syncAnalyzeControls();
    }

    function buildFullTestPayload() {
      var part2Text = essay.value.trim();
      var bundle =
        "=== Task 1.1 ===\nWRITING TASK:\n" +
        savedTopic11 +
        "\n\nCANDIDATE RESPONSE:\n" +
        savedEssay11 +
        "\n\n──────────\n\n=== Task 1.2 ===\nWRITING TASK:\n" +
        savedTopic12 +
        "\n\nCANDIDATE RESPONSE:\n" +
        savedEssay12 +
        "\n\n──────────\n\n=== Part 2 ===\nWRITING TASK:\n" +
        currentTopic +
        "\n\nCANDIDATE RESPONSE:\n" +
        part2Text;
      var metaTopic =
        "FULL IELTS WRITING PRACTICE TEST (3 parts in sequence). " +
        "The candidate completed Task 1.1, Task 1.2, and Part 2. " +
        "Evaluate each part against its stated task, then give concise overall feedback in Uzbek (Latin). " +
        "The candidate's three responses are bundled below with clear section headers.";
      return { essay: bundle, topic: metaTopic, task: "part2" };
    }

    if (nextStepBtn) {
      nextStepBtn.addEventListener("click", function () {
        if (analyzeBusy) return;
        if (!canGoNextFromStep()) {
          window.alert("Iltimos, avval vazifani to'liq bajaring.");
          return;
        }
        if (currentStep === "1.1") {
          savedEssay11 = essay.value.trim();
          savedTopic11 = currentTopic;
          currentStep = "1.2";
          essay.value = savedEssay12;
          loadTopic();
        } else if (currentStep === "1.2") {
          savedEssay12 = essay.value.trim();
          savedTopic12 = currentTopic;
          currentStep = "2";
          essay.value = "";
          currentTopic = "";
          loadTopic();
        }
        essay.focus();
        updateWordCount();
      });
    }

    if (refreshTopicBtn) {
      refreshTopicBtn.addEventListener("click", function () {
        activeWritingTest = null;
        loadTopic();
      });
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
      if (analyzeBusy) return;
      if (currentStep !== "2") return;
      if (!isCurrentEssayValid()) {
        window.alert("Iltimos, avval vazifani to'liq bajaring.");
        essay.focus();
        return;
      }

      hideError();
      analyzeBusy = true;
      syncAnalyzeControls();
      if (emptyState) emptyState.classList.add("hidden");
      if (resultsContent) resultsContent.classList.add("is-hidden");
      setLoading(true);

      var body = buildFullTestPayload();

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
          analyzeBusy = false;
          syncAnalyzeControls();
        });
    });

    loadTopic();
    syncAnalyzeControls();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWritingPage);
  } else {
    initWritingPage();
  }
})();
