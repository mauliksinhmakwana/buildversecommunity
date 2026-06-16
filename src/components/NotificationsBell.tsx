import { useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

export function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setItems((data as never) ?? []));
    const ch = supabase.channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((p) => [payload.new as Notif, ...p].slice(0, 30)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((p) => p.map((n) => n.id === (payload.new as Notif).id ? (payload.new as Notif) : n)))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((p) => p.filter((n) => n.id !== (payload.old as Notif).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const unread = items.filter((i) => !i.read).length;

  async function markAllRead() {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  }

  async function openItem(n: Notif) {
    if (!n.read) await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    setOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-muted/60 transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-y-auto z-50 glass-strong border border-border rounded-xl shadow-xl">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}
                    onClick={() => openItem(n)}
                    className={cn("px-3 py-2.5 cursor-pointer hover:bg-muted/40 flex gap-2 items-start group", !n.read && "bg-primary/5")}>
                    <div className={cn("h-2 w-2 mt-1.5 rounded-full flex-shrink-0", !n.read ? "bg-primary" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <button onClick={(e) => dismiss(n.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive" aria-label="Dismiss">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
