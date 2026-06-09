import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/use-role";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Award, Trash2 } from "lucide-react";
import { uploadToBucket } from "@/lib/panel";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/hall")({
  component: Hall,
});

type H = { id: string; winner_name: string; challenge: string; built_thing: string; image_url: string | null; year: number | null; link: string | null };

function Hall() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<H[]>([]);
  const [form, setForm] = useState({ winner_name: "", challenge: "", built_thing: "", year: new Date().getFullYear(), link: "", file: null as File | null });

  async function load() {
    const { data } = await supabase.from("hall_of_fame").select("*").order("year", { ascending: false }).order("created_at", { ascending: false });
    setItems((data as never) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!user || !form.winner_name || !form.challenge || !form.built_thing) return;
    let image_url: string | null = null;
    if (form.file) {
      try { image_url = (await uploadToBucket("hall-of-fame", form.file, user.id)).url; } catch { toast.error("Upload failed"); return; }
    }
    const { error } = await supabase.from("hall_of_fame").insert({
      winner_name: form.winner_name, challenge: form.challenge, built_thing: form.built_thing,
      year: form.year || null, link: form.link || null, image_url,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Added to Hall of Fame");
    setForm({ winner_name: "", challenge: "", built_thing: "", year: new Date().getFullYear(), link: "", file: null });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove entry?")) return;
    await supabase.from("hall_of_fame").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Award className="h-6 w-6 text-primary" /> Hall of Fame</h1>
      <p className="text-muted-foreground">Past challenge winners and what they built.</p>

      {isAdmin && (
        <div className="glass-strong rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold">Add an entry</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Winner name" value={form.winner_name} onChange={(e) => setForm({ ...form, winner_name: e.target.value })} />
            <Input placeholder="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 0 })} />
          </div>
          <Input placeholder="Challenge" value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} />
          <Textarea placeholder="What they built" value={form.built_thing} onChange={(e) => setForm({ ...form, built_thing: e.target.value })} rows={2} />
          <Input placeholder="Link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <Input type="file" accept="image/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
          <Button variant="hero" onClick={add}>Add entry</Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((h) => (
          <div key={h.id} className="glass-strong rounded-2xl overflow-hidden">
            {h.image_url && <img src={h.image_url} alt="" className="h-40 w-full object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-primary font-semibold uppercase tracking-wider">{h.year} · {h.challenge}</div>
                  <div className="font-display font-bold text-lg mt-1">{h.winner_name}</div>
                </div>
                {isAdmin && <button onClick={() => remove(h.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
              </div>
              <p className="text-sm text-foreground/80 mt-2">{h.built_thing}</p>
              {h.link && <a href={h.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">Visit →</a>}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-12">No entries yet.</p>}
      </div>
    </div>
  );
}
