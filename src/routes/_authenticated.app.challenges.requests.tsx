import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/challenges/requests")({
  component: MyRequests,
});

type R = { id: string; title: string; description: string | null; status: string; created_at: string };
type M = { id: string; request_id: string; from_user: string; body: string; created_at: string };

function MyRequests() {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<R[]>([]);
  const [open, setOpen] = useState<R | null>(null);
  const [msgs, setMsgs] = useState<M[]>([]);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("challenge_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setReqs((data as never) ?? []));
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    supabase.from("challenge_request_messages").select("*").eq("request_id", open.id).order("created_at").then(({ data }) => setMsgs((data as never) ?? []));
    const ch = supabase.channel(`creq-${open.id}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "challenge_request_messages", filter: `request_id=eq.${open.id}` },
      (payload) => setMsgs((p) => [...p, payload.new as M])
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  async function send() {
    if (!user || !open || !body.trim()) return;
    const { error } = await supabase.from("challenge_request_messages").insert({ request_id: open.id, from_user: user.id, body: body.trim() });
    if (error) { toast.error(error.message); return; }
    setBody("");
  }

  return (
    <div className="space-y-6">
      <Link to="/app/challenges" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Challenges</Link>
      <h1 className="font-display text-2xl font-bold">My challenge requests</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {reqs.map((r) => (
            <button key={r.id} onClick={() => setOpen(r)} className={cn("w-full text-left glass-strong rounded-xl p-3 hover:bg-card/70", open?.id === r.id && "ring-2 ring-primary")}>
              <div className="font-semibold text-sm">{r.title}</div>
              <div className="text-xs mt-1 flex justify-between"><span className="capitalize px-2 py-0.5 rounded-full bg-muted">{r.status}</span><span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div>
            </button>
          ))}
          {reqs.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
        </div>
        <div className="glass-strong rounded-2xl flex flex-col h-[70vh]">
          {open ? (
            <>
              <div className="p-3 border-b border-border font-semibold">{open.title}</div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {msgs.map((m) => {
                  const mine = m.from_user === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "glass")}>{m.body}</div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message admin…" />
                <Button variant="hero" onClick={send}>Send</Button>
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground p-6">Select a request to chat with admin.</p>}
        </div>
      </div>
    </div>
  );
}
