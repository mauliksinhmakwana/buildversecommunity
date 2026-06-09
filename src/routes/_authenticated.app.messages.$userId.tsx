import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle().then(({ data }) => setOther(data as never));
    const load = async () => {
      const { data } = await supabase.from("direct_messages").select("*")
        .or(`and(from_user.eq.${user.id},to_user.eq.${userId}),and(from_user.eq.${userId},to_user.eq.${user.id})`)
        .order("created_at", { ascending: true }).limit(200);
      setMsgs((data as never) ?? []);
    };
    load();
    const channel = supabase.channel(`dm-${user.id}-${userId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
      const m = payload.new as Msg;
      if ((m.from_user === user.id && m.to_user === userId) || (m.from_user === userId && m.to_user === user.id)) {
        setMsgs((p) => [...p, m]);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, userId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  async function send() {
    if (!user || !body.trim()) return;
    const { error } = await supabase.from("direct_messages").insert({ from_user: user.id, to_user: userId, body: body.trim() });
    if (error) { toast.error(error.message); return; }
    setBody("");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="glass-strong rounded-t-2xl p-3 flex items-center gap-3 border-b border-border">
        <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center overflow-hidden text-xs font-bold">
          {other?.avatar_url ? <img src={other.avatar_url} alt="" className="h-full w-full object-cover" /> : (other?.display_name ?? "?").slice(0,2).toUpperCase()}
        </div>
        <div className="font-semibold">{other?.display_name}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-card/20">
        {msgs.map((m) => {
          const mine = m.from_user === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "glass")}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="glass-strong rounded-b-2xl p-3 flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" />
        <Button variant="hero" onClick={send}>Send</Button>
      </div>
    </div>
  );
}
