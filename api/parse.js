// Vercel Serverless Function: POST /api/parse
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "text required" });

    const r = await client.responses.create({
      model: "gpt-4o-mini",
      input: [{
        role: "user",
        content: [
          { type: "text", text:
`Parse German food free-text into items with grams, kcal, protein_g, carbs_g.
Return ONLY JSON: {"items":[{"name":"string","grams":number,"kcal":number,"protein_g":number,"carbs_g":number}],
"totals":{"kcal":number,"protein_g":number,"carbs_g":number}}
Rules: Guess sensible grams if missing; round numbers; ignore fats unless obvious.` },
          { type: "input_text", text }
        ]
      }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meal",
          schema: {
            type: "object", required: ["items","totals"],
            properties: {
              items: { type:"array", items:{ type:"object", required:["name","grams","kcal","protein_g","carbs_g"],
                properties:{ name:{type:"string"}, grams:{type:"number"}, kcal:{type:"number"},
                  protein_g:{type:"number"}, carbs_g:{type:"number"} } } },
              totals: { type:"object", required:["kcal","protein_g","carbs_g"],
                properties:{ kcal:{type:"number"}, protein_g:{type:"number"}, carbs_g:{type:"number"} }
              }
            }
          }
        }
      },
      max_output_tokens: 120
    });

    const usage = r.usage || {};
    const out = JSON.parse(r.output_text);
    const est_cost = (usage.input_tokens||0)*0.15/1e6 + (usage.output_tokens||0)*0.60/1e6; // USD

    return res.status(200).json({ ...out, usage: { model:"gpt-4o-mini", ...usage, est_cost } });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "failed" });
  }
}
