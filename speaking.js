/**
 * Silva AI Speaking — Web Speech API + Groq transcript uchun ball (speaking.html).
 */
(function (global) {
  var SR = global.SpeechRecognition || global.webkitSpeechRecognition;

  function $(id) {
    return document.getElementById(id);
  }

  /** Groq dan (yoki boshqa manbadan) matn kelganda — asosiy kirish nuqtasi */
  function handleGroqResponse(transcript) {
    if (!transcript || !String(transcript).trim()) return null;

    console.log("Groq transcript:", transcript);

    var scores = calculateHaqqoniyScores(transcript);
    updateUI(scores);

    return {
      pron: scores.pronunciation,
      into: scores.intonation,
      vocab: scores.vocabulary,
    };
  }

  function calculateHaqqoniyScores(text) {
    var words = String(text)
      .trim()
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 0;
      });
    var wordCount = words.length;

    var pronScore = Math.min(98, 65 + (wordCount > 5 ? 20 : wordCount * 4));

    var uniqueWords = new Set(
      words.map(function (w) {
        return w.toLowerCase();
      })
    ).size;
    var denom = wordCount || 1;
    var vocabScore = Math.round((uniqueWords / denom) * 100);
    vocabScore = Math.max(35, Math.min(98, vocabScore));

    var intonScore = Math.min(95, 60 + wordCount * 1.5);
    intonScore = Math.max(38, Math.min(96, Math.round(intonScore)));

    pronScore = Math.max(35, Math.min(98, Math.round(pronScore)));

    return {
      pronunciation: pronScore,
      vocabulary: vocabScore,
      intonation: intonScore,
    };
  }

  function setBarAndValue(barId, valId, percent) {
    var bar = $(barId);
    var val = $(valId);
    if (bar) bar.style.width = percent + "%";
    if (val) val.textContent = percent + "%";
  }

  /** speaking.html: bar-pron, score-pron, …; ixtiyoriy: pron-bar, pron-value, … */
  function updateUI(scores) {
    if (!scores) return;

    setBarAndValue("bar-pron", "score-pron", scores.pronunciation);
    setBarAndValue("bar-vocab", "score-vocab", scores.vocabulary);
    setBarAndValue("bar-into", "score-into", scores.intonation);

    setBarAndValue("pron-bar", "pron-value", scores.pronunciation);
    setBarAndValue("vocab-bar", "vocab-value", scores.vocabulary);
    setBarAndValue("inton-bar", "inton-value", scores.intonation);
  }

  /** IELTS band (0–9) → progress foizi */
  function bandToPercent(band) {
    var n = Number(band);
    if (!isFinite(n) || n < 0) return 0;
    n = Math.min(9, Math.max(0, n));
    return Math.round((n / 9) * 100);
  }

  var speakingData = { part1: "", part2: "", part3: "", scores: [] };

  function resetSpeakingData() {
    speakingData.part1 = "";
    speakingData.part2 = "";
    speakingData.part3 = "";
    speakingData.scores = [];
    try {
      sessionStorage.removeItem("silva_speaking_data");
    } catch (_) {}
    var cert = $("speaking-overall-band");
    if (cert) {
      cert.textContent = "";
      cert.classList.add("is-hidden");
    }
  }

  function showFinalCertificate(finalScores) {
    if (!finalScores || typeof finalScores !== "object") return;
    var overall = finalScores.overall != null ? Number(finalScores.overall) : NaN;
    var pronunciation =
      finalScores.pronunciation != null ? Number(finalScores.pronunciation) : NaN;
    var vocabulary = finalScores.vocabulary != null ? Number(finalScores.vocabulary) : NaN;
    var grammar = finalScores.grammar != null ? Number(finalScores.grammar) : NaN;
    if (!isFinite(pronunciation)) pronunciation = isFinite(overall) ? overall : 6;
    if (!isFinite(vocabulary)) vocabulary = isFinite(overall) ? overall : 6;
    if (!isFinite(grammar)) grammar = isFinite(overall) ? overall : 6;
    if (!isFinite(overall)) overall = (pronunciation + vocabulary + grammar) / 3;

    var intoApprox = Math.round(bandToPercent(overall * 0.95 + 0.2));
    intoApprox = Math.max(30, Math.min(98, intoApprox));

    updateUI({
      pronunciation: Math.max(30, Math.min(98, bandToPercent(pronunciation))),
      vocabulary: Math.max(30, Math.min(98, bandToPercent(vocabulary))),
      intonation: intoApprox,
    });

    speakingData.scores.push(finalScores);

    var el = $("speaking-overall-band");
    if (el) {
      var g = isFinite(grammar) ? grammar : "—";
      var line =
        "Umumiy band: " +
        (isFinite(overall) ? overall : "—") +
        " · Pronunciation: " +
        pronunciation +
        " · Vocabulary: " +
        vocabulary +
        " · Grammar: " +
        g;
      if (finalScores._fallback) line += " (lokal baho — API xato)";
      el.textContent = line;
      el.classList.remove("is-hidden");
    }

    try {
      sessionStorage.setItem("silva_speaking_data", JSON.stringify(speakingData));
    } catch (_) {}
  }

  async function calculateFinalOverallScore() {
    try {
      var res = await fetch("/api/speaking-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part1: speakingData.part1,
          part2: speakingData.part2,
          part3: speakingData.part3,
        }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "speaking-final xato");
      showFinalCertificate(data);
    } catch (e) {
      console.warn("calculateFinalOverallScore:", e);
      showFinalCertificate({
        overall: 6.5,
        pronunciation: 6.5,
        vocabulary: 6.5,
        grammar: 6.5,
        _fallback: true,
      });
    }
  }

  async function finalizePart(partNumber, transcript) {
    var t = String(transcript || "").trim();
    if (!t && partNumber !== 3) return;

    if (t) {
      if (partNumber === 1) {
        speakingData.part1 = speakingData.part1 ? speakingData.part1 + "\n\n---\n\n" + t : t;
      } else if (partNumber === 2) {
        speakingData.part2 = t;
      } else if (partNumber === 3) {
        speakingData.part3 = t;
      }
    }

    if (t) {
      updateUI(calculateHaqqoniyScores(t));
    } else if (partNumber === 3) {
      updateUI({ pronunciation: 40, vocabulary: 40, intonation: 40 });
    }

    try {
      sessionStorage.setItem("silva_speaking_data", JSON.stringify(speakingData));
    } catch (_) {}

    console.log("Part " + partNumber + " saqlandi.");

    if (partNumber === 3) {
      await calculateFinalOverallScore();
    }
  }

  /** Speech API confidence bilan aralash ball (ixtiyoriy). UI ni o‘zgartirmaydi. */
  function computeScores(text, confidence) {
    var s = calculateHaqqoniyScores(text);
    var c = typeof confidence === "number" ? confidence : 0.72;
    var blend = Math.round(0.45 * s.pronunciation + 0.55 * Math.min(100, Math.max(0, c) * 100));
    return {
      pron: Math.max(35, Math.min(98, blend)),
      into: Math.max(38, Math.min(96, s.intonation)),
      vocab: Math.max(35, Math.min(98, s.vocabulary)),
    };
  }

  function applyScoresToDom(scores) {
    updateUI({
      pronunciation: scores.pron,
      vocabulary: scores.vocab,
      intonation: scores.into,
    });
  }

  function setMicStatus(text) {
    var el = $("mic-status");
    if (el) el.textContent = text || "";
  }

  var sharedApi = {
    handleGroqResponse: handleGroqResponse,
    calculateHaqqoniyScores: calculateHaqqoniyScores,
    updateUI: updateUI,
    computeScores: computeScores,
    applyScoresToDom: applyScoresToDom,
    setMicStatus: setMicStatus,
    speakingData: speakingData,
    finalizePart: finalizePart,
    calculateFinalOverallScore: calculateFinalOverallScore,
    showFinalCertificate: showFinalCertificate,
    resetSpeakingData: resetSpeakingData,
  };

  if (!SR) {
    global.SilvaSpeakingMic = Object.assign({ supported: false }, sharedApi);
    return;
  }

  var recognition = null;
  var isRecording = false;
  var skipNextEnd = false;
  var finalTranscript = "";
  var confSum = 0;
  var confN = 0;
  var ctx = {
    onScores: null,
    onStatus: null,
    onError: null,
    onRecordingState: null,
  };

  function ensureRecognition() {
    if (recognition) return recognition;
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = function (event) {
      for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
          var c = event.results[i][0].confidence;
          if (typeof c === "number" && !isNaN(c)) {
            confSum += c;
            confN++;
          }
        }
      }
    };

    recognition.onerror = function (event) {
      var msg = (event && event.error) || "unknown";
      isRecording = false;
      if (ctx.onRecordingState) ctx.onRecordingState(false);
      if (ctx.onError) ctx.onError(new Error(msg));
      setMicStatus("");
    };

    recognition.onend = function () {
      var wasRecording = isRecording;
      isRecording = false;
      if (ctx.onRecordingState) ctx.onRecordingState(false);
      if (skipNextEnd) {
        skipNextEnd = false;
        finalTranscript = "";
        confSum = 0;
        confN = 0;
        setMicStatus("");
        return;
      }
      var text = finalTranscript.trim();
      if (wasRecording && text.length && ctx.onScores) {
        var s = calculateHaqqoniyScores(text);
        var mapped = { pron: s.pronunciation, into: s.intonation, vocab: s.vocabulary };
        ctx.onScores(mapped, text);
      } else if (wasRecording && ctx.onScores) {
        ctx.onScores({ pron: 40, into: 40, vocab: 40 }, text);
      }
      setMicStatus("");
    };

    return recognition;
  }

  global.SilvaSpeakingMic = Object.assign(
    {
      supported: true,
      isRecording: function () {
        return isRecording;
      },

      configure: function (callbacks) {
        if (callbacks && typeof callbacks === "object") {
          ctx.onScores = callbacks.onScores || null;
          ctx.onStatus = callbacks.onStatus || null;
          ctx.onError = callbacks.onError || null;
          ctx.onRecordingState = callbacks.onRecordingState || null;
        }
      },

      start: function () {
        var rec = ensureRecognition();
        finalTranscript = "";
        confSum = 0;
        confN = 0;
        try {
          rec.start();
          isRecording = true;
          if (ctx.onRecordingState) ctx.onRecordingState(true);
          setMicStatus("Eshityapman...");
          if (ctx.onStatus) ctx.onStatus("Eshityapman...");
          console.log("SpeechRecognition: boshlandi");
        } catch (e) {
          isRecording = false;
          if (ctx.onError) ctx.onError(e);
        }
      },

      stop: function () {
        if (!recognition || !isRecording) return;
        try {
          setMicStatus("Tahlil qilinyapti...");
          if (ctx.onStatus) ctx.onStatus("Tahlil qilinyapti...");
          recognition.stop();
        } catch (e) {
          isRecording = false;
          if (ctx.onError) ctx.onError(e);
        }
      },

      abort: function () {
        skipNextEnd = true;
        finalTranscript = "";
        confSum = 0;
        confN = 0;
        try {
          if (recognition && isRecording) recognition.stop();
        } catch (_) {}
        isRecording = false;
        setMicStatus("");
      },

      toggle: function () {
        if (!isRecording) this.start();
        else this.stop();
      },
    },
    sharedApi
  );
})(typeof window !== "undefined" ? window : globalThis);
