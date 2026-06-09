import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadToBucket } from "@/lib/panel";
import { toast } from "sonner";
import { Heart, MessageCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/showcase")({
  component: Showcase,
});

const FILTERS = ["all", "showcase", "idea", "streak", "creator"] as const;
type Filter = typeof FILTERS[number];

type Post = { id: string; user_id: string; type: string; title: string | null; body: string; media_urls: string[]; tags: string[]; votes_count: number; comments_count: number; created_at: string; profiles?: { display_name: string | null; avatar_url: string | null } | null };

function Showcase() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [composer, setComposer] = useState({ open: false, type: "showcase", title: "", body: "", tags: "", file: null as File | null });

  async function load() {
    let q = supabase.from("posts").select("id, user_id, type, title, body, media_urls, tags, votes_count, comments_count, created_at, profiles:user_id(display_name, avatar_url)").order("created_at", { ascending: false }).limit(50);
    if (filter !== "all") q = q.eq("type", filter as never);
    if (search.trim()) q = q.ilike("body", `%${search.trim()}%`);
    const { data } = await q;
    setPosts((data as never) ?? []);
    if (user) {
      const { data: votes } = await supabase.from("post_votes").select("post_id").eq("user_id", user.id);
      setVoted(new Set((votes ?? []).map((v) => v.post_id)));
    }
  }
  useEffect(() => { load(); }, [filter, user?.id]);

  async function vote(postId: string) {
    if (!user) return;
    if (voted.has(postId)) {
      await supabase.from("post_votes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_votes").insert({ post_id: postId, user_id: user.id });
    }
    load();
  }

  async function submit() {
    if (!user || !composer.body.trim()) return;
    let media: string[] = [];
    if (composer.file) {
      try { const { url } = await uploadToBucket("post-media", composer.file, user.id); media = [url]; } catch (e) { toast.error("Upload failed"); return; }
    }
    const { error } = await supabase.from("posts").insert({
      user_id: user.id, type: composer.type as "showcase",
      title: composer.title || null, body: composer.body,
      tags: composer.tags.split(",").map((s) => s.trim()).filter(Boolean),
      media_urls: media,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Posted!"); setComposer({ open: false, type: "showcase", title: "", body: "", tags: "", file: null });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Showcase</h1>
        <Button variant="hero" onClick={() => setComposer({ ...composer, open: !composer.open })}>{composer.open ? "Cancel" : "+ New post"}</Button>
      </div>

      {composer.open && (
        <div className="glass-strong rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["showcase", "idea", "creator"] as const).map((t) => (
              <button key={t} onClick={() => setComposer({ ...composer, type: t })} className={cn("px-3 py-1 rounded-full text-xs capitalize border", composer.type === t ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{t}</button>
            ))}
          </div>
          <Input placeholder="Title (optional)" value={composer.title} onChange={(e) => setComposer({ ...composer, title: e.target.value })} />
          <Textarea placeholder="What are you sharing?" rows={4} value={composer.body} onChange={(e) => setComposer({ ...composer, body: e.target.value })} />
          <Input placeholder="tags, comma, separated" value={composer.tags} onChange={(e) => setComposer({ ...composer, tags: e.target.value })} />
          <Input type="file" accept="image/*" onChange={(e) => setComposer({ ...composer, file: e.target.files?.[0] ?? null })} />
          <Button variant="hero" onClick={submit}>Publish</Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-full text-sm capitalize border transition",
            filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}>
            {f}
          </button>
        ))}
        <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search…" className="pl-9" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {posts.map((p) => (
          <article key={p.id} className="glass-strong rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold">
                {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} className="h-full w-full object-cover" alt="" /> : (p.profiles?.display_name ?? "?").slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{p.profiles?.display_name ?? "Anon"}</div>
                <div className="text-xs text-muted-foreground capitalize">{p.type} · {new Date(p.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            {p.title && <h3 className="font-display font-bold text-lg">{p.title}</h3>}
            <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{p.body}</p>
            {p.media_urls[0] && <img src={p.media_urls[0]} alt="" className="mt-3 rounded-lg max-h-72 w-full object-cover" />}
            {p.tags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{p.tags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted">{t}</span>)}</div>}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <button onClick={() => vote(p.id)} className={cn("flex items-center gap-1 hover:text-primary transition", voted.has(p.id) && "text-primary")}>
                <Heart className={cn("h-4 w-4", voted.has(p.id) && "fill-current")} /> {p.votes_count}
              </button>
              <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {p.comments_count}</span>
            </div>
          </article>
        ))}
        {posts.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-12">No posts yet.</p>}
      </div>
    </div>
  );
}
