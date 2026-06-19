import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/messages/$userId")({
  component: Thread,
});

type Msg = { id: string; from_user: string; to_user: string; body: string | null; attachment_url: string | null; created_at: string };

function Thread() {
  const { user } = useAuth();
  const { userId } = Route.useParams();
  const [other, setOther] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle()
      .then(({ data }) => setOther(data as never));
    const load = async () => {
      const { data } = await supabase.from("direct_messages").select("*")
        .or(`and(from_user.eq.${user.id},to_user.eq.${userId}),and(from_user.eq.${userId},to_user.eq.${user.id})`)
        .order("created_at", { ascending: true }).limit(500);
      const list = (data as never as Msg[]) ?? [];
      setMsgs(list);
      // mark seen up to most recent
      if (list.length) localStorage.setItem(`dm:lastseen:${user.id}:${userId}`, list[list.length - 1].created_at);
    };
    load();
    const channel = supabase.channel(`dm-${user.id}-${userId}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
      const m = payload.new as Msg;
      if ((m.from_user === user.id && m.to_user === userId) || (m.from_user === userId && m.to_user === user.id)) {
        setMsgs((p) => [...p, m]);
        localStorage.setItem(`dm:lastseen:${user.id}:${userId}`, m.created_at);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, userId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  async function send() {
    if (!user || !body.trim()) return;
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("direct_messages").insert({ from_user: user.id, to_user: userId, body: text });
    if (error) { toast.error(error.message); setBody(text); }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="glass-strong rounded-t-2xl p-3 flex items-center gap-3 border-b border-border">
        <Link to="/app/messages" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <Link to="/app/u/$userId" params={{ userId }} className="flex items-center gap-3 hover:opacity-80 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold flex-shrink-0">
            {other?.avatar_url ? <img src={other.avatar_url} alt="" className="h-full w-full object-cover" /> : (other?.display_name ?? "?").slice(0,2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{other?.display_name ?? "Loading…"}</div>
            <div className="text-[10px] text-muted-foreground">View profile</div>
          </div>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-card/20">
        {msgs.length === 0 && <p className="text-center text-xs text-muted-foreground pt-8">No messages yet. Say hi 👋</p>}
        {msgs.map((m, i) => {
          const mine = m.from_user === user?.id;
          const prev = msgs[i - 1];
          const grouped = prev && prev.from_user === m.from_user && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 60000);
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-2")}>
              <div className={cn("max-w-[75%] rounded-2xl px-3 py-1.5 text-sm break-words",
                mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm")}>
                <div>{m.body}</div>
                <div className={cn("text-[9px] mt-0.5 text-right", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="glass-strong rounded-b-2xl p-3 flex gap-2 items-center">
        <Input value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Type a message…" />
        <Button variant="hero" size="icon" onClick={send} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
