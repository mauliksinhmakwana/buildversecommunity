import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt, timingSafeEqual } from "crypto";

// ---------- helpers ----------

const E164 = /^\+[1-9]\d{7,14}$/;

function normalizePhone(raw: string): string {
  const trimmed = raw.replace(/[\s\-()]/g, "");
  const withPlus = trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  if (!E164.test(withPlus)) throw new Error("Enter a valid phone in international format, e.g. +919812345678");
  return withPlus;
}

function hashCode(code: string, phone: string) {
  const pepper = process.env.PHONE_AUTH_PEPPER ?? "";
  return createHash("sha256").update(`${pepper}:otp:${phone}:${code}`).digest("hex");
}

function deriveSyntheticEmail(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `p${digits}@phone.buildverse.app`;
}

function derivePassword(phone: string, pin: string) {
  const pepper = process.env.PHONE_AUTH_PEPPER ?? "";
  return createHash("sha256").update(`${pepper}:pin:${phone}:${pin}`).digest("hex");
}

function safeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

async function sendSms(phone: string, code: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
  const sender = process.env.MSG91_SENDER_ID;

  if (!authKey || !templateId) {
    // Dev fallback until MSG91 keys are configured.
    console.warn(`[phone-auth] MSG91 not configured. OTP for ${phone} = ${code}`);
    return;
  }

  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", templateId);
  url.searchParams.set("mobile", phone.replace(/^\+/, ""));
  url.searchParams.set("otp", code);
  if (sender) url.searchParams.set("sender", sender);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { authkey: authKey, "content-type": "application/json" },
    body: JSON.stringify({ otp: code }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[phone-auth] MSG91 error", res.status, body);
    throw new Error("Could not send OTP right now. Please try again shortly.");
  }
}

// ---------- server fns ----------

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      phone: z.string().min(6).max(20),
      purpose: z.enum(["signup", "reset"]),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit: max 5 OTPs per phone per hour.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("phone_otps")
      .select("id", { head: true, count: "exact" })
      .eq("phone", phone)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 5) {
      throw new Error("Too many OTP requests. Please wait a bit and try again.");
    }

    // Check phone exists for the right purpose.
    const { data: existing } = await supabaseAdmin
      .from("phone_credentials")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (data.purpose === "signup" && existing) {
      throw new Error("This number is already registered. Please sign in instead.");
    }
    if (data.purpose === "reset" && !existing) {
      throw new Error("No account found for this number.");
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const code_hash = hashCode(code, phone);

    const { error: insErr } = await supabaseAdmin.from("phone_otps").insert({
      phone,
      code_hash,
      purpose: data.purpose,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (insErr) throw new Error("Could not issue OTP. Please retry.");

    await sendSms(phone, code);

    return { ok: true, phone };
  });

/** Verify OTP + create the user with a PIN (signup) or update PIN (reset). Returns session tokens. */
export const verifyOtpAndSetPin = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      phone: z.string().min(6).max(20),
      code: z.string().regex(/^\d{4,8}$/),
      pin: z.string().regex(/^\d{4}$|^\d{6}$/, "PIN must be 4 or 6 digits"),
      purpose: z.enum(["signup", "reset"]),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: otp } = await supabaseAdmin
      .from("phone_otps")
      .select("id, code_hash, expires_at, consumed_at, attempts")
      .eq("phone", phone)
      .eq("purpose", data.purpose)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) throw new Error("Please request a new OTP.");
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      throw new Error("This OTP has expired. Request a new one.");
    }
    if (otp.attempts >= 5) {
      throw new Error("Too many attempts. Request a new OTP.");
    }

    const supplied = hashCode(data.code, phone);
    if (!safeEqualHex(supplied, otp.code_hash)) {
      await supabaseAdmin.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      throw new Error("Incorrect OTP.");
    }

    await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

    const email = deriveSyntheticEmail(phone);
    const password = derivePassword(phone, data.pin);

    let userId: string | null = null;

    if (data.purpose === "signup") {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { phone, display_name: `Founder ${phone.slice(-4)}` },
      });
      if (error || !created.user) {
        // If user somehow already exists (rare race) fall through to update path.
        if (!error?.message?.toLowerCase().includes("already")) {
          throw new Error(error?.message ?? "Could not create account.");
        }
        const { data: found } = await supabaseAdmin
          .from("phone_credentials")
          .select("user_id")
          .eq("phone", phone)
          .maybeSingle();
        userId = found?.user_id ?? null;
      } else {
        userId = created.user.id;
      }

      if (userId) {
        await supabaseAdmin
          .from("phone_credentials")
          .upsert({ user_id: userId, phone }, { onConflict: "user_id" });
      }
    } else {
      // reset
      const { data: cred } = await supabaseAdmin
        .from("phone_credentials")
        .select("user_id")
        .eq("phone", phone)
        .maybeSingle();
      if (!cred) throw new Error("No account found for this number.");
      userId = cred.user_id;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) throw new Error("Could not update PIN.");
      await supabaseAdmin
        .from("phone_credentials")
        .update({ failed_attempts: 0, locked_until: null })
        .eq("user_id", userId);
    }

    // Mint a session via password grant using our server publishable key.
    const tokens = await passwordGrant(email, password);
    return tokens;
  });

/** Login with phone + PIN. Returns session tokens. */
export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      phone: z.string().min(6).max(20),
      pin: z.string().regex(/^\d{4}$|^\d{6}$/),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cred } = await supabaseAdmin
      .from("phone_credentials")
      .select("user_id, failed_attempts, locked_until")
      .eq("phone", phone)
      .maybeSingle();
    if (!cred) throw new Error("No account found for this number.");

    if (cred.locked_until && new Date(cred.locked_until).getTime() > Date.now()) {
      throw new Error("Too many attempts. Try again in a few minutes.");
    }

    const email = deriveSyntheticEmail(phone);
    const password = derivePassword(phone, data.pin);

    try {
      const tokens = await passwordGrant(email, password);
      await supabaseAdmin
        .from("phone_credentials")
        .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
        .eq("user_id", cred.user_id);
      return tokens;
    } catch (err) {
      const attempts = (cred.failed_attempts ?? 0) + 1;
      const lock = attempts >= 5 ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null;
      await supabaseAdmin
        .from("phone_credentials")
        .update({ failed_attempts: attempts, locked_until: lock })
        .eq("user_id", cred.user_id);
      throw new Error("Incorrect PIN.");
    }
  });

async function passwordGrant(email: string, password: string) {
  const url = `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error_description || body?.msg || "Sign-in failed");
  return {
    access_token: body.access_token as string,
    refresh_token: body.refresh_token as string,
  };
}
