import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MapPin, Trophy, Flame, Youtube, Eye, EyeOff, Pencil, MoreVertical, Trash2, UserPlus, MessageCircle, Target, Heart, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

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
              <PostCard
                key={post.id}
                post={post}
                isMine={isMe}
                menuOpen={menuOpen === post.id}
                onToggleMenu={() => setMenuOpen(menuOpen === post.id ? null : post.id)}
                onEdit={() => { setEditingPost(post); setMenuOpen(null); }}
                onDelete={() => deletePost(post.id)}
              />
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

type Comment = { id: string; user_id: string; body: string; created_at: string; profile?: { display_name: string | null; avatar_url: string | null } };

function PostCard({ post, isMine, menuOpen, onToggleMenu, onEdit, onDelete }: {
  post: Post; isMine: boolean; menuOpen: boolean;
  onToggleMenu: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.votes_count);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comments_count);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("post_votes").select("user_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [post.id, user?.id]);

  async function toggleLike() {
    if (!user || busy) return;
    setBusy(true);
    if (liked) {
      const { error } = await supabase.from("post_votes").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (!error) { setLiked(false); setLikes((n) => Math.max(0, n - 1)); }
      else toast.error(error.message);
    } else {
      const { error } = await supabase.from("post_votes").insert({ post_id: post.id, user_id: user.id });
      if (!error) { setLiked(true); setLikes((n) => n + 1); }
      else toast.error(error.message);
    }
    setBusy(false);
  }

  async function openComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      const { data } = await supabase.from("post_comments").select("id, user_id, body, created_at").eq("post_id", post.id).order("created_at");
      const rows = (data as Comment[]) ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
        const map = new Map((ps ?? []).map((p) => [p.id, p as { display_name: string | null; avatar_url: string | null; id: string }]));
        rows.forEach((r) => { r.profile = map.get(r.user_id); });
      }
      setComments(rows);
    }
  }

  async function addComment() {
    if (!user || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    const { data, error } = await supabase.from("post_comments").insert({ post_id: post.id, user_id: user.id, body }).select("id, user_id, body, created_at").single();
    if (error) { toast.error(error.message); setDraft(body); return; }
    const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle();
    setComments((c) => [...c, { ...(data as Comment), profile: prof ?? undefined }]);
    setCommentCount((n) => n + 1);
  }

  return (
    <article className="glass-strong rounded-2xl p-4 relative">
      {isMine && (
        <div className="absolute top-3 right-3">
          <button onClick={onToggleMenu} className="p-1.5 rounded hover:bg-muted">
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 glass-strong rounded-lg p-1 shadow-lg z-10 min-w-32">
              <button onClick={onEdit} className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2"><Pencil className="h-3.5 w-3.5" />Edit</button>
              <button onClick={onDelete} className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2 text-destructive"><Trash2 className="h-3.5 w-3.5" />Delete</button>
            </div>
          )}
        </div>
      )}
      <div className="text-[10px] uppercase tracking-wider text-primary">{post.type}</div>
      {post.title && <h3 className="font-semibold mt-1">{post.title}</h3>}
      <p className="text-sm whitespace-pre-wrap mt-1">{post.body}</p>
      {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="" className="w-full max-h-80 object-cover rounded-lg mt-2" />}
      <div className="flex items-center gap-1 mt-3 text-sm">
        <button onClick={toggleLike} disabled={!user || busy} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-muted transition", liked && "text-red-500")}>
          <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {likes}
        </button>
        <button onClick={openComments} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-muted transition">
          <MessageCircle className="h-4 w-4" /> {commentCount}
        </button>
        <span className="ml-auto text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
      </div>
      {showComments && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-[10px] font-bold flex-shrink-0">
                {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.profile?.display_name ?? "?").slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 bg-muted rounded-2xl px-3 py-1.5">
                <div className="text-xs font-semibold">{c.profile?.display_name ?? "User"}</div>
                <div className="text-sm">{c.body}</div>
              </div>
            </div>
          ))}
          {user && (
            <div className="flex gap-2 pt-1">
              <Input placeholder="Write a comment…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} />
              <Button size="sm" variant="hero" onClick={addComment} disabled={!draft.trim()}><Send className="h-3.5 w-3.5" /></Button>
            </div>
          )}
          {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
        </div>
      )}
    </article>
  );
}
