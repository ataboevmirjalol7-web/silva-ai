/**
 * Vercel Serverless: Writing topshirig‘i — Groq (llama-3.1-70b-versatile).
 * GET /api/generate-topic?task=task11|task12|part2  (default: task11)
 * Environment: GROQ_API_KEY
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-70b-versatile";

const JSON_RULE = `Reply with ONLY valid JSON (no markdown fences, no extra text):
{"taskType":"task11"|"task12"|"part2","cefrLevel":"B2","prompt":"..."}
The taskType in JSON MUST exactly match the requested mode. cefrLevel: one of B1, B2, C1.`;

/**
 * @param {string} mode
 */
function buildGroqMessages(mode) {
  if (mode === "task11") {
    return {
      system: `You create IELTS General Training Writing Task 1 practice: a short **email** scenario.

${JSON_RULE}

**Task 1.1 rules:** The entire instruction in "prompt" must be **about 50 English words** (40–60 is OK). Style like real GT paper: brief context, you may use 2–3 short bullet points, then what to write. Mention the candidate should write about **150 words** in their email. Random real-life contexts (neighbour, manager, landlord, club organiser, etc.).`,
      user: `Generate ONE new Task 1.1 email question as JSON. Vary the situation completely. Hint: ${Date.now()}`,
    };
  }
  if (mode === "task12") {
    return {
      system: `You create IELTS General Training Task 1 style: a **formal email** exam question.

${JSON_RULE}

**Task 1.2 rules:** The instruction text in "prompt" must be **120–150 English words** (count carefully). Formal register; detailed scenario (letters to council, company, complaint, application, etc.); clear bullet points or numbered requirements. State expected length for the candidate (~150 words) if appropriate.`,
      user: `Generate ONE new Task 1.2 formal email question as JSON. Professional tone. Hint: ${Date.now()}`,
    };
  }
  /* part2 */
  return {
    system: `You create IELTS Writing Task 2 or **online forum / discussion** style prompts.

${JSON_RULE}

**Part 2 rules:** The instruction in "prompt" must be **180–200 English words**. Include background, both sides or multiple aspects, and a clear question (e.g. agree/disadvantages, causes and solutions, to what extent). Suitable for a 250-word candidate response.`,
    user: `Generate ONE new Part 2 essay / online discussion question as JSON. Thought-provoking topic. Hint: ${Date.now()}`,
  };
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

/**
 * @param {object} obj
 * @param {string} mode
 */
function validateTopic(obj, mode) {
  const allowed = ["task11", "task12", "part2"];
  if (!obj || typeof obj !== "object") throw new Error("noto‘g‘ri javob");
  if (!allowed.includes(obj.taskType)) throw new Error("taskType noto‘g‘ri");
  if (obj.taskType !== mode) throw new Error("taskType mos emas");
  if (typeof obj.cefrLevel !== "string" || !obj.cefrLevel.trim()) {
    throw new Error("cefrLevel yetarli emas");
  }
  if (typeof obj.prompt !== "string") throw new Error("prompt yetarli emas");
  const len = obj.prompt.trim().length;
  const min = mode === "task11" ? 20 : mode === "task12" ? 80 : 140;
  if (len < min) throw new Error("prompt yetarli emas");
}

function parseTaskFromUrl(req) {
  const raw = req.url || "";
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  const task = new URLSearchParams(q).get("task");
  if (task === "task11" || task === "task12" || task === "part2") return task;
  return "task11";
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

  const mode = parseTaskFromUrl(req);
  const { system, user } = buildGroqMessages(mode);

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: mode === "part2" ? 0.88 : 0.92,
        max_tokens: mode === "task11" ? 600 : mode === "task12" ? 900 : 1200,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
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
      validateTopic(parsed, mode);
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
