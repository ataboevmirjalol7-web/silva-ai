/**
 * Vercel Serverless: tasodifiy IELTS/CEFR Writing mavzusi — Groq (llama3-70b-8192).
 * GET /api/generate-topic
 * Environment: GROQ_API_KEY
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama3-70b-8192";

const SYSTEM_PROMPT = `You create random English practice prompts for IELTS-style Writing (and linked CEFR levels).

Each time you are called, pick **randomly** ONE format:
- **email** — IELTS General Training style: semi-formal/formal email (~150 words), situation + bullet points
- **letter** — GT letter (complaint, request, apology, etc.) (~150 words)
- **essay** — IELTS Task 2 style discursive/ opinion essay (~250 words), with a clear question
- **report** — IELTS Academic Task 1 style: describe one visual (bar chart, line graph, process, or map) briefly in instructions

Also pick a random **CEFR target** for difficulty wording: one of A2, B1, B2, C1, C2 (lean toward B2–C1 for IELTS).

Reply with **only** valid JSON (no markdown, no commentary):
{
  "taskType": "email|letter|essay|report",
  "cefrLevel": "B2",
  "prompt": "<full exam-style instructions shown to the candidate, in English>"
}

The "prompt" must read like real exam paper text (clear scenario + what to write). Vary topics (environment, work, education, technology, health, travel, etc.).`;

/**
 * @param {string} content
 * @returns {object}
 */
function parseModelJson(content) {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON topilmadi");
  }
  return JSON.parse(jsonStr.slice(start, end + 1));
}

function validateTopic(obj) {
  const allowed = ["email", "letter", "essay", "report"];
  if (!obj || typeof obj !== "object") throw new Error("noto‘g‘ri javob");
  if (!allowed.includes(obj.taskType)) throw new Error("taskType noto‘g‘ri");
  if (typeof obj.cefrLevel !== "string" || !obj.cefrLevel.trim()) {
    throw new Error("cefrLevel yetarli emas");
  }
  if (typeof obj.prompt !== "string" || obj.prompt.trim().length < 40) {
    throw new Error("prompt yetarli emas");
  }
}

function cors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
module.exports = async function handler(req, res) {
  cors(res, req.headers.origin);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Faqat GET ruxsat etiladi" }));
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Serverda GROQ_API_KEY sozlanmagan" }));
    return;
  }

  const userMsg =
    "Generate ONE new random writing task now. Make it different from any generic example — vary context. Output JSON only." +
    " Random hint: " +
    String(Date.now()).slice(-4);

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.95,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    const rawText = await groqRes.text();
    let groqData;
    try {
      groqData = JSON.parse(rawText);
    } catch {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Groq javobi JSON emas" }));
      return;
    }

    if (!groqRes.ok) {
      const msg = groqData.error?.message || groqData.message || "Groq xato: " + groqRes.status;
      res.statusCode = groqRes.status >= 400 && groqRes.status < 600 ? groqRes.status : 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: msg }));
      return;
    }

    const content = groqData.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Model bo‘sh javob qaytardi" }));
      return;
    }

    let parsed;
    try {
      parsed = parseModelJson(content);
      validateTopic(parsed);
    } catch (e) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error: "Mavzu JSON tahlil qilinmadi",
          details: e instanceof Error ? e.message : undefined,
        })
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        taskType: parsed.taskType,
        cefrLevel: String(parsed.cefrLevel).trim(),
        prompt: parsed.prompt.trim(),
      })
    );
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Groq so‘rovi yiqildi",
      })
    );
  }
};
