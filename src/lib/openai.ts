import OpenAI from "openai";
import { ReportMetrics } from "@/types";

export async function generateSemanticSummary(params: {
  metrics: ReportMetrics;
  cvInsert: string;
  username: string;
  timeWindowMonths: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  const prompt = {
    username: params.username,
    timeWindowMonths: params.timeWindowMonths,
    metrics: params.metrics,
    cvInsert: params.cvInsert,
  };

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 350,
    messages: [
      {
        role: "system",
        content:
          "You write concise, recruiter-readable GitHub activity interpretations. Be factual and grounded only in the provided structured metrics and repository summaries. Do not guess technologies, employers, or project impact. Avoid buzzwords. Output markdown.",
      },
      {
        role: "user",
        content:
          "Create a semantic summary for a GitHub activity report. Include:\n" +
          "1) A 2–3 sentence executive summary\n" +
          "2) 4–6 bullet evidence statements grounded in the metrics (ownership, collaboration, recency, consistency)\n" +
          "3) One short caution/disclaimer sentence\n\n" +
          "Data:\n" +
          JSON.stringify(prompt, null, 2),
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) return null;

  return {
    summary: text,
    model: response.model ?? "gpt-4o-mini",
  };
}
