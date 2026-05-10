/**
 * Vercel Serverless: IELTS Writing tahlili — Groq API (llama-3.1-70b-versatile).
 * Environment: GROQ_API_KEY
 *
 * POST /api/check-writing
 * Body: { "essay": "...", "topic": "..." } — topic ixtiyoriy (generatsiya qilingan topshiriq matni).
 * Response: JSON — har bir kriteriya uchun ball va tahlil.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-70b-versatile";
const MIN_LENGTH = 20;
const MAX_LENGTH = 12000;

const SYSTEM_PROMPT = `You are an expert IELTS Writing examiner. Analyze the candidate's response using official IELTS Writing criteria (adapt Task 1 vs Task 2 weighting when the task is letter/email/report vs essay).

When a WRITING TASK (prompt) is provided, judge Task Response primarily by how well the answer fulfils that exact task (format, tone, content requirements).

For each criterion assign a band score from 0 to 9 in steps of 0.5, and give concise, actionable feedback in Uzbek (Latin script).

Criteria (exactly these four):
1) taskResponse — how fully and relevantly the question / task is addressed
2) cohesion — coherence, paragraphing, linking devices (Coherence & Cohesion)
3) grammar — range and accuracy of grammar
4) vocabulary — lexical resource and appropriateness

You MUST reply with a single valid JSON object only. No markdown fences, no text before or after. Use this exact shape (numbers for scores):
{
  "taskResponse": { "score": <number>, "analysis": "<string>" },
  "cohesion": { "score": <number>, "analysis": "<string>" },
  "grammar": { "score": <number>, "analysis": "<string>" },
  "vocabulary": { "score": <number>, "analysis": "<string>" }
}

Scores must be between 0 and 9 in steps of 0.5.`;

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw.trim()) {
          resolve({});
          return;
        }
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(Object.assign(new Error("JSON noto‘g‘ri"), { status: 400, cause: e }));
      }
    });
    req.on("error", reject);
  });
}

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

function validateResult(obj) {
  const keys = ["taskResponse", "cohesion", "grammar", "vocabulary"];
  for (const k of keys) {
    const block = obj[k];
    if (!block || typeof block !== "object") {
      throw new Error(`"${k}" maydoni yetarli emas`);
    }
    if (typeof block.score !== "number" || typeof block.analysis !== "string") {
      throw new Error(`"${k}.score" yoki "${k}.analysis" noto‘g‘ri`);
    }
  }
}

/** @param {number} x */
function roundToHalf(x) {
  return Math.round(x * 2) / 2;
}

/**
 * To‘rt kriteriya ballidan umumiy band (0.5 qadam).
 * @param {object} obj
 */
function setOverallFromCriteria(obj) {
  const s =
    (obj.taskResponse.score + obj.cohesion.score + obj.grammar.score + obj.vocabulary.score) / 4;
  obj.overallBand = roundToHalf(s);
}

function cors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Faqat POST ruxsat etiladi" }));
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Serverda GROQ_API_KEY sozlanmagan" }));
    return;
  }

  let essay = "";
  let topic = "";
  try {
    const body = await readJsonBody(req);
    essay = typeof body.essay === "string" ? body.essay : typeof body.text === "string" ? body.text : "";
    topic = typeof body.topic === "string" ? body.topic.trim() : "";
  } catch (e) {
    const status = /** @type {{ status?: number }} */ (e).status || 400;
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : "So‘rov xato" }));
    return;
  }

  const trimmed = essay.trim();
  if (trimmed.length < MIN_LENGTH) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: `Matn kamida ${MIN_LENGTH} belgi bo‘lishi kerak` }));
    return;
  }
  if (trimmed.length > MAX_LENGTH) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: `Matn ${MAX_LENGTH} belgidan oshmasligi kerak` }));
    return;
  }

  const userMessage =
    topic.length > 0
      ? `WRITING TASK (the candidate must follow this):\n${topic}\n\n---\n\nCANDIDATE'S TEXT (evaluate this response against the task above):\n${trimmed}\n\nFaqat JSON qaytaring.`
      : `Quyidagi matnni IELTS Writing mezonlari bo'yicha baholang va faqat JSON qaytaring:\n\n${trimmed}`;

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
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
      res.end(JSON.stringify({ error: "Groq javobi noto‘g‘ri JSON" }));
      return;
    }

    if (!groqRes.ok) {
      const msg =
        groqData.error?.message ||
        groqData.message ||
        `Groq xato: ${groqRes.status}`;
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
      validateResult(parsed);
      setOverallFromCriteria(parsed);
    } catch (e) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error: "Modeldan kelgan JSON tahlil qilinmadi",
          details: e instanceof Error ? e.message : undefined,
          raw: content.length > 2000 ? content.slice(0, 2000) + "…" : content,
        })
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(parsed));
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
