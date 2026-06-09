import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useIsAdmin } from "@/lib/use-role";
import { uploadToBucket } from "@/lib/panel";
import { ExternalLink, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/resources")({
  component: Resources,
});

type R = { id: string; title: string; description: string | null; url: string | null; file_path: string | null; category: string; is_official: boolean; created_at: string };

function Resources() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<R[]>([]);
  const [form, setForm] = useState({ title: "", description: "", url: "", category: "general", file: null as File | null, is_official: false });
  const [filter, setFilter] = useState("all");

  async function load() {
    let q = supabase.from("resources").select("*").order("is_official", { ascending: false }).order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("category", filter);
    const { data } = await q;
    setItems((data as never) ?? []);
  }
  useEffect(() => { load(); }, [filter]);

  async function submit() {
    if (!user || !form.title) return;
    let file_path: string | null = null;
    let url = form.url || null;
    if (form.file) {
      try { const r = await uploadToBucket("resources", form.file, user.id); file_path = r.path; url = r.url; } catch { toast.error("Upload failed"); return; }
    }
    const { error } = await supabase.from("resources").insert({
      posted_by: user.id, title: form.title, description: form.description || null, url, file_path,
      category: form.category, is_official: isAdmin ? form.is_official : false,
    });
    if (error) { toast.error(error.message); return; }
    setForm({ title: "", description: "", url: "", category: "general", file: null, is_official: false });
    toast.success("Resource added"); load();
  }

  const categories = ["all", "general", "design", "engineering", "marketing", "fundraising", "legal", "tools"];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Resource Vault</h1>

      <div className="glass-strong rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">Share a resource</h2>
        <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="URL (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-transparent border border-border rounded-md px-3 py-2 text-sm">
            {categories.filter(c => c !== "all").map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Input type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_official} onChange={(e) => setForm({ ...form, is_official: e.target.checked })} />
            Mark as Official
          </label>
        )}
        <Button variant="hero" onClick={submit}>Add resource</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={cn("px-3 py-1.5 rounded-full text-sm capitalize border", filter === c ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{c}</button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((r) => (
          <a key={r.id} href={r.url ?? "#"} target="_blank" rel="noopener noreferrer" className="glass-strong rounded-xl p-4 hover:bg-card/70 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold flex items-center gap-2">{r.title} {r.is_official && <Star className="h-4 w-4 text-yellow-400 fill-current" />}</div>
              {r.url && <ExternalLink className="h-4 w-4 text-muted-foreground" />}
            </div>
            {r.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
            <div className="text-[10px] uppercase tracking-wider text-primary mt-2">{r.category}</div>
          </a>
        ))}
        {items.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No resources yet.</p>}
      </div>
    </div>
  );
}
