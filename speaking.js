/**
 * Silva AI Speaking — Web Speech API (haqiqiy nutqni matnga aylantirish).
 * Brauzer: Chrome/Edge (webkitSpeechRecognition). Firefox odatda qo‘llab-quvvatlamaydi.
 */
(function (global) {
  var SR = global.SpeechRecognition || global.webkitSpeechRecognition;

  function $(id) {
    return document.getElementById(id);
  }

  /**
   * @param {string} text
   * @param {number} confidence 0..1
   * @returns {{ pron: number, into: number, vocab: number }}
   */
  function computeScores(text, confidence) {
    var pronScore = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
    var words = text
      .trim()
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 0;
      });
    var n = words.length || 1;
    var unique = new Set(
      words.map(function (w) {
        return w.toLowerCase().replace(/[^a-z0-9'-]/gi, "");
      })
    ).size;
    var vocabScore = Math.min(100, Math.round((unique / n) * 110));
    var sentences = text.split(/[.!?]+/).filter(function (s) {
      return s.trim().length > 0;
    }).length;
    var density = n / Math.max(1, sentences);
    var intoScore = Math.min(
      94,
      Math.round(42 + Math.min(density * 8, 28) + Math.min(n / 4, 24))
    );
    return {
      pron: Math.max(35, Math.min(98, pronScore)),
      into: Math.max(38, Math.min(96, intoScore)),
      vocab: Math.max(35, Math.min(98, vocabScore)),
    };
  }

  function applyScoresToDom(scores) {
    var barPron = $("bar-pron");
    var barInto = $("bar-into");
    var barVocab = $("bar-vocab");
    var scorePron = $("score-pron");
    var scoreInto = $("score-into");
    var scoreVocab = $("score-vocab");
    if (scorePron) scorePron.textContent = scores.pron + "%";
    if (scoreInto) scoreInto.textContent = scores.into + "%";
    if (scoreVocab) scoreVocab.textContent = scores.vocab + "%";
    if (barPron) barPron.style.width = scores.pron + "%";
    if (barInto) barInto.style.width = scores.into + "%";
    if (barVocab) barVocab.style.width = scores.vocab + "%";
  }

  function setMicStatus(text) {
    var el = $("mic-status");
    if (el) el.textContent = text || "";
  }

  if (!SR) {
    global.SilvaSpeakingMic = {
      supported: false,
      computeScores: computeScores,
      applyScoresToDom: applyScoresToDom,
    };
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
      var conf = confN > 0 ? confSum / confN : 0.72;
      if (wasRecording && text.length && ctx.onScores) {
        var scores = computeScores(text, conf);
        ctx.onScores(scores, text);
      } else if (wasRecording && ctx.onScores) {
        ctx.onScores({ pron: 40, into: 40, vocab: 40 }, text);
      }
      setMicStatus("");
    };

    return recognition;
  }

  global.SilvaSpeakingMic = {
    supported: true,
    computeScores: computeScores,
    applyScoresToDom: applyScoresToDom,
    setMicStatus: setMicStatus,

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
  };
})(typeof window !== "undefined" ? window : globalThis);
