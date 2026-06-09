import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Schema = z.object({
  postId: z.string().uuid(),
  title: z.string().max(200).optional(),
  body: z.string().min(10).max(4000),
});

export const validateIdea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway unavailable");

    const prompt = `You are a sharp startup analyst. Evaluate this idea and reply ONLY with strict JSON matching:
{"score": number 0-100, "strengths": string[], "risks": string[], "market": string, "suggestions": string[]}

Title: ${data.title ?? "(none)"}
Idea: ${data.body}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let report: { score?: number; strengths?: string[]; risks?: string[]; market?: string; suggestions?: string[] };
    try { report = JSON.parse(content); } catch { report = { score: 0, strengths: [], risks: ["Could not parse AI response"], market: "", suggestions: [] }; }
    const score = Math.max(0, Math.min(100, Math.round(report.score ?? 0)));

    const { supabase, userId } = context;
    const { error } = await supabase.from("posts").update({ validation_score: score, validation_report: report }).eq("id", data.postId).eq("user_id", userId);
    if (error) throw error;
    // Bonus XP for validating
    await supabase.rpc as never;
    return { score, report };
  });
