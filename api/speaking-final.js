/**
 * Vercel Serverless: Speaking — 3 part matni → Groq → umumiy band (JSON).
 * POST /api/speaking-final
 * Body: { "part1": "...", "part2": "...", "part3": "..." }
 * Env: GROQ_API_KEY
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama3-8b-8192";

const SYSTEM = `You are an IELTS Speaking examiner. You receive transcripts for Part 1, Part 2, and Part 3 (may be partial or empty).
Reply with ONE valid JSON object only (no markdown). Use numbers for bands 0–9 in steps of 0.5 where applicable.
Shape:
{"overall":7,"pronunciation":7,"vocabulary":7,"grammar":7,"feedback":"one short paragraph in Uzbek Latin"}`;

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

  const part1 = typeof body.part1 === "string" ? body.part1 : "";
  const part2 = typeof body.part2 === "string" ? body.part2 : "";
  const part3 = typeof body.part3 === "string" ? body.part3 : "";

  const userContent =
    "Part 1:\n" +
    (part1 || "(bo'sh)") +
    "\n\nPart 2:\n" +
    (part2 || "(bo'sh)") +
    "\n\nPart 3:\n" +
    (part3 || "(bo'sh)");

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
          { role: "user", content: userContent },
        ],
        temperature: 0.35,
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
      res.end(JSON.stringify({ error: "Groq javobi JSON emas", raw: rawText.slice(0, 500) }));
      return;
    }

    if (!groqRes.ok) {
      const msg = data?.error?.message || data?.message || "Groq xato: " + groqRes.status;
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
      res.end(JSON.stringify({ error: "Model JSON emas", raw: content.slice(0, 1500) }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(parsed));
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : "So'rov yiqildi" }));
  }
};
