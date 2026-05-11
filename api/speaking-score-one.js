/**
 * Vercel Serverless: bitta speaking javobi transcript → Groq → pronunciation / intonation / vocabulary (0–100).
 * POST /api/speaking-score-one
 * Body: { "transcript": "..." }
 * Env: GROQ_API_KEY
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama3-8b-8192";

const SYSTEM =
  "You score ONE short IELTS-style speaking response. Reply with ONE JSON object only (no markdown). " +
  "Use integers 35–98 for: pronunciation, intonation, vocabulary (percent-like scores). " +
  "Shape: {\"pronunciation\":72,\"intonation\":70,\"vocabulary\":75,\"note\":\"optional short note\"}";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "GROQ_API_KEY sozlanmagan" }));
    return;
  }

  let body = {};
  try {
    const raw = await new Promise((resolve, reject) => {
      let d = "";
      req.on("data", (c) => (d += c));
      req.on("end", () => resolve(d));
      req.on("error", reject);
    });
    body = JSON.parse(raw || "{}");
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "JSON body kutiladi" }));
    return;
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "transcript bo‘sh" }));
    return;
  }

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: transcript.slice(0, 8000) },
        ],
        temperature: 0.25,
        response_format: { type: "json_object" },
      }),
    });

    const rawText = await groqRes.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Groq javobi JSON emas" }));
      return;
    }

    if (!groqRes.ok) {
      const msg = data?.error?.message || data?.message || "Groq xato";
      res.statusCode = groqRes.status >= 400 && groqRes.status < 600 ? groqRes.status : 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: msg }));
      return;
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Model bo'sh javob" }));
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Model JSON emas" }));
      return;
    }

    function clampScore(v) {
      var n = Math.round(Number(v));
      if (!isFinite(n)) return 50;
      return Math.max(35, Math.min(98, n));
    }

    const out = {
      pronunciation: clampScore(parsed.pronunciation),
      intonation: clampScore(parsed.intonation),
      vocabulary: clampScore(parsed.vocabulary),
    };

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : "So'rov yiqildi" }));
  }
};
