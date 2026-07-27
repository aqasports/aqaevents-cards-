/* eslint-disable @typescript-eslint/no-explicit-any */
export async function verifyCaptcha(
  token: string | undefined | null,
  ip?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || process.env.HCAPTCHA_SECRET_KEY;

  // If secret key is not configured (e.g. in local dev or test), pass through
  if (!secretKey) {
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "CAPTCHA_TOKEN_MISSING" };
  }

  try {
    const isTurnstile = !!process.env.TURNSTILE_SECRET_KEY;
    const verifyUrl = isTurnstile
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://hcaptcha.com/siteverify";

    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip && ip !== "unknown") {
      formData.append("remoteip", ip);
    }

    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!res.ok) {
      return { success: false, error: `CAPTCHA_HTTP_${res.status}` };
    }

    const data = await res.json();

    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: data["error-codes"]?.[0] || "CAPTCHA_VERIFICATION_FAILED",
    };
  } catch (err: any) {
    console.error("Captcha verification error:", err);
    return { success: false, error: "CAPTCHA_VERIFICATION_ERROR" };
  }
}
