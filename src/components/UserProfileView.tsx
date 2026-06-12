import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MapPin, Trophy, Flame, Youtube, Eye, EyeOff, Pencil, MoreVertical, Trash2, UserPlus, MessageCircle, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

type Prof = {
  id: string; display_name: string | null; avatar_url: string | null; bio: string | null;
  roles: string[]; skills: string[]; interests: string[]; looking_for: string[];
  location: string | null; xp: number; streak_days: number;
  creator_enabled: boolean; cofounder_visible: boolean; links: Record<string, string>;
};
type Post = { id: string; type: string; title: string | null; body: string; media_urls: string[]; tags: string[]; votes_count: number; comments_count: number; created_at: string };
type Chal = { id: string; title: string; status: string; cover_url: string | null };

export function UserProfileView({ userId }: { userId: string }) {
  const { user } = useAuth();
  const isMe = user?.id === userId;
  const [p, setP] = useState<Prof | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [challenges, setChallenges] = useState<Chal[]>([]);
  const [reqStatus, setReqStatus] = useState<"none" | "pending" | "accepted">("none");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  async function load() {
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setP(prof as never);
    const { data: ps } = await supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    setPosts(((ps as never) ?? []) as Post[]);
    const { data: enr } = await supabase.from("challenge_enrollments").select("challenge_id, challenges(id, title, status, cover_url)").eq("user_id", userId);
    setChallenges(((enr as { challenges: Chal }[]) ?? []).map((r) => r.challenges).filter(Boolean));
    if (user && !isMe) {
      const { data: r } = await supabase.from("cofounder_requests").select("status")
        .or(`and(from_user.eq.${user.id},to_user.eq.${userId}),and(from_user.eq.${userId},to_user.eq.${user.id})`)
        .maybeSingle();
      const s = (r as { status: string } | null)?.status;
      setReqStatus(s === "accepted" ? "accepted" : s === "pending" ? "pending" : "none");
    }
  }
  useEffect(() => { load(); }, [userId, user?.id]);

  async function connect() {
    if (!user || isMe) return;
    const { error } = await supabase.from("cofounder_requests").insert({ from_user: user.id, to_user: userId });
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent"); setReqStatus("pending");
  }

  async function toggleVisible(v: boolean) {
    if (!p || !isMe) return;
    setP({ ...p, cofounder_visible: v });
    const { error } = await supabase.from("profiles").update({ cofounder_visible: v }).eq("id", userId);
    if (error) { toast.error(error.message); setP({ ...p, cofounder_visible: !v }); }
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); setPosts((p) => p.filter((x) => x.id !== id)); }
    setMenuOpen(null);
  }

  async function savePostEdit() {
    if (!editingPost) return;
    const { error } = await supabase.from("posts").update({ title: editingPost.title, body: editingPost.body }).eq("id", editingPost.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated"); setEditingPost(null); load();
  }

  if (!p) return <div className="text-muted-foreground">Loading…</div>;
  const links = (p.links ?? {}) as Record<string, string>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xl font-bold">
            {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.display_name ?? "?").slice(0,2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{p.display_name}</h1>
            {p.location && <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.location}</div>}
            <div className="flex gap-3 mt-2 text-sm">
              <span className="flex items-center gap-1 text-primary"><Trophy className="h-3.5 w-3.5" />{p.xp} XP</span>
              <span className="flex items-center gap-1 text-orange-400"><Flame className="h-3.5 w-3.5" />{p.streak_days}d</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isMe ? (
            <>
              <Link to="/app/messages"><Button variant="glass" size="sm"><MessageCircle className="h-3.5 w-3.5" /> Connect</Button></Link>
              <Link to="/app/onboarding"><Button variant="hero" size="sm"><Pencil className="h-3.5 w-3.5" /> Edit Profile</Button></Link>
            </>
          ) : (
            <>
              {reqStatus === "accepted" ? (
                <Link to="/app/messages/$userId" params={{ userId }}><Button variant="hero" size="sm"><MessageCircle className="h-3.5 w-3.5" /> Message</Button></Link>
              ) : reqStatus === "pending" ? (
                <Button variant="glass" size="sm" disabled>Request pending</Button>
              ) : (
                <Button variant="hero" size="sm" onClick={connect}><UserPlus className="h-3.5 w-3.5" /> Connect</Button>
              )}
            </>
          )}
        </div>
      </div>

      {isMe && (
        <div className="glass-strong rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {p.cofounder_visible ? <Eye className="h-5 w-5 text-primary mt-0.5" /> : <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5" />}
            <div>
              <div className="font-semibold text-sm">Show in Co-Founders</div>
              <div className="text-xs text-muted-foreground">When off, your profile is hidden from the directory.</div>
            </div>
          </div>
          <Switch checked={p.cofounder_visible} onCheckedChange={toggleVisible} />
        </div>
      )}

      {p.bio && <div className="glass-strong rounded-xl p-5"><p className="text-foreground/90 whitespace-pre-wrap">{p.bio}</p></div>}

      {p.roles?.length > 0 && <Section title="Roles">{p.roles.map((r) => <Pill key={r}>{r}</Pill>)}</Section>}
      {p.looking_for?.length > 0 && <Section title="Looking for">{p.looking_for.map((r) => <Pill key={r}>{r}</Pill>)}</Section>}
      {p.skills?.length > 0 && <Section title="Skills">{p.skills.map((r) => <Pill key={r}>{r}</Pill>)}</Section>}
      {p.interests?.length > 0 && <Section title="Interests">{p.interests.map((r) => <Pill key={r}>{r}</Pill>)}</Section>}

      {p.creator_enabled && Object.values(links).some(Boolean) && (
        <div className="glass-strong rounded-xl p-5">
          <h3 className="font-display font-bold flex items-center gap-2"><Youtube className="h-5 w-5 text-primary" /> Creator</h3>
          <div className="flex flex-wrap gap-2 mt-3 text-sm">
            {Object.entries(links).filter(([, v]) => v).map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-full bg-primary/15 text-primary hover:bg-primary/25 capitalize">{k} →</a>
            ))}
          </div>
        </div>
      )}

      {/* Participated challenges */}
      <div>
        <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Participated Challenges</h2>
        {challenges.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {challenges.map((c) => (
              <Link key={c.id} to="/app/challenges/$id" params={{ id: c.id }} className="glass rounded-xl p-3 hover:bg-card/70 transition flex items-center gap-3">
                {c.cover_url && <img src={c.cover_url} alt="" className="h-12 w-12 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{c.title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.status}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Posts */}
      <div>
        <h2 className="font-display text-xl font-bold mb-3">Posts</h2>
        {posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : (
          <div className="space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="glass-strong rounded-2xl p-4 relative">
                {isMe && (
                  <div className="absolute top-3 right-3">
                    <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)} className="p-1.5 rounded hover:bg-muted">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === post.id && (
                      <div className="absolute right-0 top-9 glass-strong rounded-lg p-1 shadow-lg z-10 min-w-32">
                        <button onClick={() => { setEditingPost(post); setMenuOpen(null); }} className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2"><Pencil className="h-3.5 w-3.5" />Edit</button>
                        <button onClick={() => deletePost(post.id)} className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2 text-destructive"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-wider text-primary">{post.type}</div>
                {post.title && <h3 className="font-semibold mt-1">{post.title}</h3>}
                <p className="text-sm whitespace-pre-wrap mt-1">{post.body}</p>
                {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="w-full max-h-80 object-cover rounded-lg mt-2" />}
                <div className="text-xs text-muted-foreground mt-2">❤ {post.votes_count} · 💬 {post.comments_count} · {new Date(post.created_at).toLocaleDateString()}</div>
              </article>
            ))}
          </div>
        )}
      </div>

      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditingPost(null)}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg">Edit post</h3>
            <Input placeholder="Title" value={editingPost.title ?? ""} onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })} />
            <Textarea rows={5} value={editingPost.body} onChange={(e) => setEditingPost({ ...editingPost, body: e.target.value })} />
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setEditingPost(null)}>Cancel</Button>
              <Button variant="hero" className="flex-1" onClick={savePostEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="px-2.5 py-1 rounded-full text-sm bg-muted capitalize">{children}</span>;
}
