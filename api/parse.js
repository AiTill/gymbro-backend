// api/parse.js
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "text required" });

    const system = `Parse German food free-text into ONLY this JSON:
{"items":[{"name":"string","grams":number,"kcal":number,"protein_g":number,"carbs_g":number}],
"totals":{"kcal":number,"protein_g":number,"carbs_g":number}}
Rules: guess grams if missing, round numbers, only those keys, no extra text.`;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text }
      ]
    });

    const content = r.choices?.[0]?.message?.content || "{}";
    const out = JSON.parse(content);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "failed" });
  }
}
