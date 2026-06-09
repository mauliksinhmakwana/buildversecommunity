import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadToBucket } from "@/lib/panel";
import { Paperclip, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/community/$groupId")({
  component: GroupChat,
});

type Msg = { id: string; group_id: string; user_id: string; body: string | null; attachment_url: string | null; attachment_type: string | null; created_at: string };

function GroupChat() {
  const { user } = useAuth();
  const { groupId } = Route.useParams();
  const [group, setGroup] = useState<{ name: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("groups").select("name").eq("id", groupId).maybeSingle().then(({ data }) => setGroup(data as never));
    const load = async () => {
      const { data } = await supabase.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true }).limit(200);
      const list = (data as never as Msg[]) ?? [];
      setMsgs(list);
      const ids = Array.from(new Set(list.map((m) => m.user_id)));
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
        const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
        (p ?? []).forEach((x) => { map[x.id] = { display_name: x.display_name, avatar_url: x.avatar_url }; });
        setProfiles(map);
      }
    };
    load();
    const ch = supabase.channel(`group-${groupId}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
      async (payload) => {
        const m = payload.new as Msg;
        setMsgs((p) => [...p, m]);
        if (!profiles[m.user_id]) {
          const { data: pp } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("id", m.user_id).maybeSingle();
          if (pp) setProfiles((prev) => ({ ...prev, [pp.id]: { display_name: pp.display_name, avatar_url: pp.avatar_url } }));
        }
      }
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, groupId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  async function send(attachment?: { url: string; type: string }) {
    if (!user) return;
    if (!body.trim() && !attachment) return;
    setBusy(true);
    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId, user_id: user.id, body: body.trim() || null,
      attachment_url: attachment?.url ?? null, attachment_type: attachment?.type ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f || !user) return;
    try {
      const { url } = await uploadToBucket("chat-attachments", f, user.id);
      await send({ url, type: f.type.startsWith("image/") ? "image" : "file" });
    } catch { toast.error("Upload failed"); }
    finally { e.target.value = ""; }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="glass-strong rounded-t-2xl p-3 flex items-center gap-3 border-b border-border">
        <Link to="/app/community" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="font-semibold"># {group?.name}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-card/20">
        {msgs.map((m) => {
          const p = profiles[m.user_id];
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className="flex gap-2.5">
              <div className="h-8 w-8 rounded-full gradient-primary flex-shrink-0 flex items-center justify-center overflow-hidden text-[10px] font-bold">
                {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p?.display_name ?? "?").slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">{p?.display_name ?? "User"}{mine && " (you)"}</span>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {m.body && <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>}
                {m.attachment_url && (m.attachment_type === "image"
                  ? <img src={m.attachment_url} alt="" className="rounded-lg max-h-64 mt-1" />
                  : <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">📎 attachment</a>)}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="glass-strong rounded-b-2xl p-3 flex gap-2 items-center">
        <button onClick={() => fileRef.current?.click()} className="p-2 text-muted-foreground hover:text-foreground"><Paperclip className="h-5 w-5" /></button>
        <input type="file" ref={fileRef} onChange={onFile} className="hidden" />
        <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder="Message #group" />
        <Button variant="hero" onClick={() => send()} disabled={busy}>Send</Button>
      </div>
    </div>
  );
}
