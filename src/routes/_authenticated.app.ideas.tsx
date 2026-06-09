import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { validateIdea } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/ideas")({
  component: Ideas,
});

type Idea = { id: string; user_id: string; title: string | null; body: string; tags: string[]; votes_count: number; validation_score: number | null; validation_report: { strengths?: string[]; risks?: string[]; market?: string; suggestions?: string[] } | null; profiles?: { display_name: string | null; avatar_url: string | null } | null };

function Ideas() {
  const { user } = useAuth();
  const validate = useServerFn(validateIdea);
  const [form, setForm] = useState({ title: "", body: "", tags: "" });
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("posts").select("id, user_id, title, body, tags, votes_count, validation_score, validation_report, profiles:user_id(display_name, avatar_url)").eq("type", "idea").order("created_at", { ascending: false }).limit(30);
    setIdeas((data as never) ?? []);
    if (user) {
      const { data: votes } = await supabase.from("post_votes").select("post_id").eq("user_id", user.id);
      setVoted(new Set((votes ?? []).map((v) => v.post_id)));
    }
  }
  useEffect(() => { load(); }, [user?.id]);

  async function post() {
    if (!user || form.body.length < 10) { toast.error("Describe your idea (10+ chars)"); return; }
    const { data, error } = await supabase.from("posts").insert({
      user_id: user.id, type: "idea", title: form.title || null, body: form.body,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setForm({ title: "", body: "", tags: "" });
    toast.success("Idea posted. Validating with AI…");
    await runValidation(data.id, form.title, form.body);
    load();
  }

  async function runValidation(postId: string, title: string, body: string) {
    setValidating(postId);
    try {
      const r = await validate({ data: { postId, title, body } });
      toast.success(`AI score: ${r.score}/100`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Validation failed"); }
    finally { setValidating(null); load(); }
  }

  async function vote(id: string) {
    if (!user) return;
    if (voted.has(id)) await supabase.from("post_votes").delete().eq("post_id", id).eq("user_id", user.id);
    else await supabase.from("post_votes").insert({ post_id: id, user_id: user.id });
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Idea Validator</h1>
        <p className="text-muted-foreground mt-1">Post your idea, get AI feedback + community votes.</p>
      </div>

      <div className="glass-strong rounded-2xl p-5 space-y-3">
        <Input placeholder="Idea title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea placeholder="Describe the idea, target users, why now…" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <Input placeholder="tags, comma, separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <Button variant="hero" onClick={post}>Post & validate</Button>
      </div>

      <div className="grid gap-4">
        {ideas.map((i) => (
          <article key={i.id} className="glass-strong rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold">
                  {i.profiles?.avatar_url ? <img src={i.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : (i.profiles?.display_name ?? "?").slice(0,2).toUpperCase()}
                </div>
                <div className="text-sm">{i.profiles?.display_name ?? "Anon"}</div>
              </div>
              {i.validation_score !== null && (
                <div className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">AI: {i.validation_score}/100</div>
              )}
            </div>
            {i.title && <h3 className="font-display font-bold text-lg">{i.title}</h3>}
            <p className="text-sm whitespace-pre-wrap mt-1">{i.body}</p>
            {i.validation_report && (
              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                {i.validation_report.strengths && i.validation_report.strengths.length > 0 && (
                  <div><div className="text-xs font-semibold text-green-400 mb-1">Strengths</div><ul className="list-disc list-inside text-foreground/80 space-y-0.5">{i.validation_report.strengths.map((s, k) => <li key={k}>{s}</li>)}</ul></div>
                )}
                {i.validation_report.risks && i.validation_report.risks.length > 0 && (
                  <div><div className="text-xs font-semibold text-orange-400 mb-1">Risks</div><ul className="list-disc list-inside text-foreground/80 space-y-0.5">{i.validation_report.risks.map((s, k) => <li key={k}>{s}</li>)}</ul></div>
                )}
                {i.validation_report.suggestions && i.validation_report.suggestions.length > 0 && (
                  <div className="sm:col-span-2"><div className="text-xs font-semibold text-primary mb-1">Suggestions</div><ul className="list-disc list-inside text-foreground/80 space-y-0.5">{i.validation_report.suggestions.map((s, k) => <li key={k}>{s}</li>)}</ul></div>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => vote(i.id)} className={cn("flex items-center gap-1 text-sm hover:text-primary", voted.has(i.id) && "text-primary")}>
                <Heart className={cn("h-4 w-4", voted.has(i.id) && "fill-current")} /> {i.votes_count}
              </button>
              {user?.id === i.user_id && i.validation_score === null && (
                <Button size="sm" variant="glass" onClick={() => runValidation(i.id, i.title ?? "", i.body)} disabled={validating === i.id}>
                  {validating === i.id ? "Validating…" : "Run AI validation"}
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
