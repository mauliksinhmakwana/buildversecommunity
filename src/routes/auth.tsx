import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, KeyRound, ArrowRight, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendOtp, verifyOtpAndSetPin, loginWithPin } from "@/lib/phone-auth.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · BuildVerse" },
      { name: "description", content: "Sign in to BuildVerse with your mobile number and a private PIN — no passwords." },
    ],
  }),
  component: AuthPage,
});

type Stage = "phone" | "otp" | "setpin" | "pin";
type Flow = "signup" | "signin" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [flow, setFlow] = useState<Flow>("signin");
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinLength, setPinLength] = useState<4 | 6>(6);
  const [busy, setBusy] = useState(false);

  const callSendOtp = useServerFn(sendOtp);
  const callVerify = useServerFn(verifyOtpAndSetPin);
  const callLogin = useServerFn(loginWithPin);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app/feed", replace: true });
  }, [user, loading, navigate]);

  function resetAll() {
    setStage("phone");
    setCode("");
    setPin("");
    setPinConfirm("");
  }

  async function handleContinueFromPhone(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (flow === "signin") {
        setStage("pin");
      } else {
        await callSendOtp({ data: { phone, purpose: flow === "reset" ? "reset" : "signup" } });
        toast.success("OTP sent to your phone.");
        setStage("otp");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 4) return toast.error("Enter the 6-digit code");
    setStage("setpin");
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== pinLength) return toast.error(`PIN must be ${pinLength} digits`);
    if (pin !== pinConfirm) return toast.error("PINs don't match");
    setBusy(true);
    try {
      const tokens = await callVerify({
        data: { phone, code, pin, purpose: flow === "reset" ? "reset" : "signup" },
      });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      toast.success(flow === "reset" ? "PIN updated. You're signed in." : "Welcome to BuildVerse.");
      navigate({ to: "/app/feed", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) return toast.error("Enter your PIN");
    setBusy(true);
    try {
      const tokens = await callLogin({ data: { phone, pin } });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      toast.success("Welcome back.");
      navigate({ to: "/app/feed", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  const title =
    flow === "signup" ? "Create your account" :
    flow === "reset" ? "Reset your PIN" :
    "Welcome back";

  const subtitle =
    stage === "phone" ? "Enter your mobile number to continue." :
    stage === "otp" ? "Enter the 6-digit code we sent you." :
    stage === "setpin" ? "Set a PIN you'll use to sign in." :
    "Enter your PIN to continue.";

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-background overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl -z-10" />

      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
          <Logo size="lg" />
          <span className="font-display font-bold text-xl">
            Build<span className="text-primary">Verse</span>
          </span>
        </Link>

        <div className="glass-strong rounded-2xl p-6 sm:p-8 shadow-elegant">
          {stage !== "phone" && (
            <button
              type="button"
              onClick={resetAll}
              className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Change number
            </button>
          )}

          <h1 className="font-display text-2xl font-bold text-center">{title}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">{subtitle}</p>

          {stage === "phone" && (
            <form onSubmit={handleContinueFromPhone} className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="+91 98123 45678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Include country code, e.g. +91 for India.</p>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? "Working…" : "Continue"} <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {stage === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <Label htmlFor="otp">One-time code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="tracking-[0.5em] text-center text-lg"
                />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                type="button"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  try {
                    await callSendOtp({ data: { phone, purpose: flow === "reset" ? "reset" : "signup" } });
                    toast.success("New OTP sent.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not resend");
                  }
                }}
              >
                Resend code
              </button>
            </form>
          )}

          {stage === "setpin" && (
            <form onSubmit={handleSetPin} className="space-y-4 mt-6">
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-muted-foreground">PIN length:</span>
                <button type="button" onClick={() => setPinLength(4)} className={`px-2 py-1 rounded ${pinLength === 4 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>4 digits</button>
                <button type="button" onClick={() => setPinLength(6)} className={`px-2 py-1 rounded ${pinLength === 6 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>6 digits</button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin">Create PIN</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    required
                    maxLength={pinLength}
                    placeholder={"•".repeat(pinLength)}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, pinLength))}
                    className="pl-9 tracking-[0.4em]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin2">Confirm PIN</Label>
                <Input
                  id="pin2"
                  type="password"
                  inputMode="numeric"
                  required
                  maxLength={pinLength}
                  placeholder={"•".repeat(pinLength)}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, pinLength))}
                  className="tracking-[0.4em]"
                />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? "Creating…" : flow === "reset" ? "Update PIN" : "Create account"} <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {stage === "pin" && (
            <form onSubmit={handleSignIn} className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pinin">Your PIN</Label>
                  <button
                    type="button"
                    onClick={async () => {
                      setFlow("reset");
                      setBusy(true);
                      try {
                        await callSendOtp({ data: { phone, purpose: "reset" } });
                        toast.success("OTP sent to reset your PIN.");
                        setStage("otp");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not send OTP");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot PIN?
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pinin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    required
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-9 tracking-[0.4em]"
                  />
                </div>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {flow === "signin" ? (
              <>
                New to BuildVerse?{" "}
                <button
                  onClick={() => { setFlow("signup"); resetAll(); }}
                  className="text-primary hover:underline font-medium"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already a founder?{" "}
                <button
                  onClick={() => { setFlow("signin"); resetAll(); }}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
