import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Repeat2, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/feed")({
  component: Feed,
});

type Post = {
  id: string; user_id: string; type: "creator" | "idea" | "showcase" | "streak"; title: string | null; body: string;
  media_urls: string[]; tags: string[]; votes_count: number; comments_count: number;
  created_at: string; repost_of: string | null;
};
type Prof = { id: string; display_name: string | null; avatar_url: string | null; roles: string[]; xp: number; streak_days: number };

function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Prof>>({});
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [comments, setComments] = useState<Record<string, { id: string; user_id: string; body: string; created_at: string }[]>>({});

  async function load() {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
    const list = ((data as unknown) as Post[]) ?? [];
    setPosts(list);
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url, roles, xp, streak_days").in("id", ids);
      const map: Record<string, Prof> = {};
      (ps ?? []).forEach((p) => { map[p.id] = p as Prof; });
      setProfiles(map);
    }
    if (user) {
      const { data: v } = await supabase.from("post_votes").select("post_id").eq("user_id", user.id);
      setVoted(new Set(((v as { post_id: string }[]) ?? []).map((x) => x.post_id)));
    }
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("feed-posts").on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load()).subscribe();
    const cv = supabase.channel("feed-votes").on("postgres_changes", { event: "*", schema: "public", table: "post_votes" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(cv); };
  }, [user?.id]);

  async function like(id: string) {
    if (!user) return;
    if (voted.has(id)) {
      await supabase.from("post_votes").delete().eq("post_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("post_votes").insert({ post_id: id, user_id: user.id });
    }
  }

  async function repost(p: Post) {
    if (!user) return;
    const { error } = await supabase.from("posts").insert({
      user_id: user.id, type: p.type, body: p.body, title: p.title, tags: p.tags, repost_of: p.id,
    });
    if (error) toast.error(error.message); else toast.success("Reposted");
  }

  async function loadComments(id: string) {
    const { data } = await supabase.from("post_comments").select("id, user_id, body, created_at").eq("post_id", id).order("created_at");
    setComments((p) => ({ ...p, [id]: (data as never) ?? [] }));
  }

  async function postComment(id: string) {
    if (!user || !commentBody.trim()) return;
    const { error } = await supabase.from("post_comments").insert({ post_id: id, user_id: user.id, body: commentBody.trim() });
    if (error) { toast.error(error.message); return; }
    setCommentBody(""); loadComments(id); load();
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <h1 className="font-display text-3xl font-bold">Feed</h1>
      {posts.map((p) => {
        const u = profiles[p.user_id];
        const role = u?.roles?.[0];
        return (
          <article key={p.id} className="glass-strong rounded-2xl overflow-hidden">
            <header className="flex items-center gap-3 p-4">
              <Link to="/app/u/$userId" params={{ userId: p.user_id }} className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold flex-shrink-0">
                {u?.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (u?.display_name ?? "?").slice(0,2).toUpperCase()}
              </Link>
              <Link to="/app/u/$userId" params={{ userId: p.user_id }} className="flex-1 min-w-0 hover:opacity-80">
                <div className="font-semibold text-sm">{u?.display_name ?? "User"}</div>
                {role && <div className="text-[11px] text-muted-foreground capitalize">{role}</div>}
              </Link>
              <div className="flex gap-1.5">
                <span className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary"><Zap className="h-3 w-3" />{u?.xp ?? 0}</span>
                <span className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400"><Flame className="h-3 w-3" />{u?.streak_days ?? 0}</span>
              </div>
            </header>
            {p.media_urls?.[0] && <img src={p.media_urls[0]} alt="" className="w-full max-h-96 object-cover" />}
            <div className="p-4 pt-3">
              <span className="text-[10px] uppercase tracking-wider text-primary">{p.type}{p.repost_of && " · repost"}</span>
              {p.title && <h3 className="font-semibold mt-1">{p.title}</h3>}
              <p className="text-sm whitespace-pre-wrap mt-1">{p.body}</p>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                <button onClick={() => like(p.id)} className={cn("flex items-center gap-1 text-sm hover:text-primary transition", voted.has(p.id) && "text-primary")}>
                  <Heart className={cn("h-4 w-4", voted.has(p.id) && "fill-current")} /> {p.votes_count}
                </button>
                <button onClick={() => { const o = openComments === p.id ? null : p.id; setOpenComments(o); if (o) loadComments(p.id); }} className="flex items-center gap-1 text-sm hover:text-primary">
                  <MessageCircle className="h-4 w-4" /> {p.comments_count}
                </button>
                <button onClick={() => repost(p)} className="flex items-center gap-1 text-sm hover:text-primary"><Repeat2 className="h-4 w-4" /></button>
              </div>
              {openComments === p.id && (
                <div className="mt-3 space-y-2">
                  {(comments[p.id] ?? []).map((c) => {
                    const cu = profiles[c.user_id];
                    return (
                      <div key={c.id} className="flex gap-2 text-sm">
                        <span className="font-semibold">{cu?.display_name ?? "User"}:</span>
                        <span>{c.body}</span>
                      </div>
                    );
                  })}
                  <div className="flex gap-2 pt-2">
                    <Input value={commentBody} onChange={(e) => setCommentBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && postComment(p.id)} placeholder="Add a comment…" />
                    <Button variant="hero" size="sm" onClick={() => postComment(p.id)}>Post</Button>
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
      {posts.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No posts yet. Be the first!</p>}
    </div>
  );
}
