"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AuthButton from "@/components/auth/AuthButton";
import AuthStatus from "@/components/auth/AuthStatus";
import PasswordInput from "@/components/auth/PasswordInput";
import {
  emailPattern,
  friendlyAuthError,
  getVerificationResendRemainingSeconds,
  recordVerificationEmailSent,
  validatePassword,
} from "@/lib/customer-auth";
import { createCustomerBrowserClient } from "@/lib/supabase/customer-browser";
import styles from "./Auth.module.css";

export default function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (!registeredEmail) return;

    const updateCooldown = () => {
      setCooldownSeconds(
        getVerificationResendRemainingSeconds(registeredEmail)
      );
    };

    updateCooldown();
    const timer = window.setInterval(updateCooldown, 1_000);
    return () => window.clearInterval(timer);
  }, [registeredEmail]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = fullName.trim();
    if (name.length < 2 || name.length > 100) {
      setError("Full name must be between 2 and 100 characters.");
      return;
    }
    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      setError(passwordResult.message);
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createCustomerBrowserClient();
      const normalizedEmail = email.trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account?verified=1`,
        },
      });
      if (signUpError) {
        setError(friendlyAuthError(signUpError.message));
        setLoading(false);
        return;
      }
      // Email-confirmation projects return no session. If confirmation was
      // disabled accidentally, still honor this flow and require an explicit
      // login after registration.
      if (data.session) await supabase.auth.signOut();

      recordVerificationEmailSent(normalizedEmail);
      setRegisteredEmail(normalizedEmail);
      setCooldownSeconds(getVerificationResendRemainingSeconds(normalizedEmail));
      setLoading(false);
      setPassword("");
      setConfirmation("");
    } catch {
      setError("Unable to connect. Check your connection and try again.");
      setLoading(false);
    }
  }

  async function resendVerificationEmail() {
    if (!registeredEmail || resending) return;

    const remainingSeconds =
      getVerificationResendRemainingSeconds(registeredEmail);
    if (remainingSeconds > 0) {
      setCooldownSeconds(remainingSeconds);
      return;
    }

    setResending(true);
    setResendError(null);
    setResendSuccess(null);

    try {
      const supabase = createCustomerBrowserClient();
      const { error: resendVerificationError } = await supabase.auth.resend({
        type: "signup",
        email: registeredEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account?verified=1`,
        },
      });

      if (resendVerificationError) {
        setResendError(friendlyAuthError(resendVerificationError.message));
        return;
      }

      recordVerificationEmailSent(registeredEmail);
      setCooldownSeconds(getVerificationResendRemainingSeconds(registeredEmail));
      setResendSuccess("A new verification email has been sent.");
    } catch {
      setResendError("Unable to connect. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className={styles.verificationScreen}>
        <div>
          <h1 className={styles.heading}>Check your email</h1>
          <div className={styles.verificationCopy}>
            <p>We&apos;ve sent a verification email to your email address.</p>
            <p>Please verify your email before logging in.</p>
          </div>
        </div>

        <div className={styles.registeredEmail}>
          <span>Verification email sent to</span>
          <strong>{registeredEmail}</strong>
        </div>

        <div className={styles.informationCard}>
          <i className="ri-information-line" aria-hidden="true" />
          <ul>
            <li>Verification emails may take a few minutes to arrive.</li>
            <li>Check your Spam/Junk folder if you don&apos;t see it.</li>
            <li>Unverified accounts are automatically deleted after 1 hour.</li>
          </ul>
        </div>

        {resendError && <AuthStatus message={resendError} type="error" />}
        {resendSuccess && <AuthStatus message={resendSuccess} type="success" />}

        <div className={styles.verificationActions}>
          <button
            type="button"
            className={styles.resendButton}
            onClick={resendVerificationEmail}
            disabled={resending || cooldownSeconds > 0}
          >
            {resending
              ? "Sending verification email..."
              : cooldownSeconds > 0
                ? `Resend Verification Email (${cooldownSeconds}s)`
                : "Resend Verification Email"}
          </button>
          <p className={styles.cooldownText} aria-live="polite">
            {cooldownSeconds > 0
              ? `You can resend the email in ${cooldownSeconds} second${cooldownSeconds === 1 ? "" : "s"}.`
              : "You can request another verification email now."}
          </p>
          <Link href="/login" className={styles.loginButton}>Back to Login</Link>
        </div>

        <Link href="/" className={`${styles.textLink} ${styles.back}`}>
          <i className="ri-arrow-left-line" /> Back to storefront
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Create account</h1>
      <p className={styles.intro}>Create your customer profile for future Catchus features.</p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="register-name">Full Name</label>
          <input id="register-name" name="fullName" className={styles.input} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" disabled={loading} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="register-email">Email</label>
          <input id="register-email" name="email" type="email" className={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" disabled={loading} required />
        </div>
        <PasswordInput id="register-password" name="password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" disabled={loading} helper="Use 8+ characters with uppercase, lowercase, number, and special character." />
        <PasswordInput id="register-confirmation" name="confirmation" label="Confirm Password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" disabled={loading} />
        {error && <AuthStatus message={error} type="error" />}
        <AuthButton loading={loading} idleText="Register" loadingText="Creating account..." />
      </form>
      <p className={styles.footerText}>
        Already registered? <Link href="/login" className={styles.textLink}>Login</Link>
      </p>
      <Link href="/" className={`${styles.textLink} ${styles.back}`}><i className="ri-arrow-left-line" /> Back to storefront</Link>
    </>
  );
}
