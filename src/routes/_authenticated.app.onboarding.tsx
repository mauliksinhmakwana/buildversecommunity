import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROLES_OPTIONS, LOOKING_FOR_OPTIONS, uploadToBucket } from "@/lib/panel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    display_name: "", date_of_birth: "", bio: "", roles: [] as string[], skills: "", interests: "",
    looking_for: [] as string[], location: "", avatar_url: "" as string,
    twitter: "", github: "", linkedin: "", website: "", youtube: "",
    creator_enabled: false,
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setForm((f) => ({
        ...f,
        display_name: data.display_name ?? "",
        date_of_birth: data.date_of_birth ?? "",
        bio: data.bio ?? "",
        roles: data.roles ?? [],
        skills: (data.skills ?? []).join(", "),
        interests: (data.interests ?? []).join(", "),
        looking_for: data.looking_for ?? [],
        location: data.location ?? "",
        avatar_url: data.avatar_url ?? "",
        twitter: data.links?.twitter ?? "",
        github: data.links?.github ?? "",
        linkedin: data.links?.linkedin ?? "",
        website: data.links?.website ?? "",
        youtube: data.links?.youtube ?? "",
        creator_enabled: !!data.creator_enabled,
      }));
    });
  }, [user?.id]);

  const toggle = (key: "roles" | "looking_for", val: string) => setForm((f) =>
    ({ ...f, [key]: f[key].includes(val) ? f[key].filter((v) => v !== val) : [...f[key], val] }));

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !user) return;
    try {
      const { url } = await uploadToBucket("avatars", file, user.id);
      setForm((f) => ({ ...f, avatar_url: url }));
      toast.success("Avatar uploaded");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.display_name || form.roles.length === 0) {
      toast.error("Name and at least one role are required."); return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name,
      date_of_birth: form.date_of_birth || null,
      bio: form.bio || null,
      roles: form.roles,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
      looking_for: form.looking_for,
      location: form.location || null,
      avatar_url: form.avatar_url || null,
      links: { twitter: form.twitter, github: form.github, linkedin: form.linkedin, website: form.website, youtube: form.youtube },
      creator_enabled: form.creator_enabled,
      onboarded: true,
    }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved!");
    navigate({ to: "/app/dashboard" });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold">Set up your profile</h1>
      <p className="text-muted-foreground mt-1">Tell the community who you are. You can edit this anytime.</p>
      <form onSubmit={save} className="mt-8 space-y-6 glass-strong rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center overflow-hidden">
            {form.avatar_url ? <img src={form.avatar_url} className="h-full w-full object-cover" alt="" /> : <span className="font-bold text-primary-foreground text-xl">{(form.display_name || "?").slice(0,2).toUpperCase()}</span>}
          </div>
          <div>
            <Label htmlFor="avatar">Profile picture</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={handleAvatar} className="mt-1" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Name *</Label><Input value={form.display_name} onChange={(e) => setForm({...form, display_name: e.target.value})} required /></div>
          <div><Label>Date of birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} /></div>
        </div>
        <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="San Francisco, CA" /></div>
        <div>
          <Label>Bio</Label>
          <Textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} placeholder="What are you building?" rows={3} />
        </div>
        <div>
          <Label>I am a... *</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {ROLES_OPTIONS.map((r) => (
              <button key={r} type="button" onClick={() => toggle("roles", r)}
                className={cn("px-3 py-1.5 rounded-full text-sm border capitalize transition",
                  form.roles.includes(r) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Looking for</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {LOOKING_FOR_OPTIONS.map((r) => (
              <button key={r} type="button" onClick={() => toggle("looking_for", r)}
                className={cn("px-3 py-1.5 rounded-full text-sm border capitalize transition",
                  form.looking_for.includes(r) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Skills</Label><Input value={form.skills} onChange={(e) => setForm({...form, skills: e.target.value})} placeholder="React, Design, GTM (comma separated)" /></div>
          <div><Label>Interests</Label><Input value={form.interests} onChange={(e) => setForm({...form, interests: e.target.value})} placeholder="AI, FinTech, SaaS" /></div>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.creator_enabled} onChange={(e) => setForm({...form, creator_enabled: e.target.checked})} />
            <span className="text-sm">I'm also a creator (unlocks creator feed & links)</span>
          </label>
        </div>
        {form.creator_enabled && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>YouTube</Label><Input value={form.youtube} onChange={(e) => setForm({...form, youtube: e.target.value})} placeholder="https://youtube.com/@you" /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} /></div>
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Social links (optional)</summary>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Input value={form.twitter} onChange={(e) => setForm({...form, twitter: e.target.value})} placeholder="Twitter / X" />
            <Input value={form.github} onChange={(e) => setForm({...form, github: e.target.value})} placeholder="GitHub" />
            <Input value={form.linkedin} onChange={(e) => setForm({...form, linkedin: e.target.value})} placeholder="LinkedIn" />
            <Input value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} placeholder="Website" />
          </div>
        </details>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
      </form>
    </div>
  );
}
