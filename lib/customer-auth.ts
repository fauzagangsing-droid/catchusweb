export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UNVERIFIED_EMAIL_MESSAGE =
  "Your email address has not been verified.\n\nA new verification email has been sent.\n\nPlease verify your email before signing in.";

export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

const VERIFICATION_RESEND_STORAGE_KEY = "catchus:verification-email-sent";

interface VerificationEmailSentRecord {
  email: string;
  sentAt: number;
}

let inMemoryVerificationEmailSentRecord: VerificationEmailSentRecord | null = null;

function isVerificationEmailSentRecord(
  value: unknown
): value is VerificationEmailSentRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    typeof value.email === "string" &&
    "sentAt" in value &&
    typeof value.sentAt === "number" &&
    Number.isFinite(value.sentAt)
  );
}

function readVerificationEmailSentRecord(): VerificationEmailSentRecord | null {
  if (typeof window === "undefined") {
    return inMemoryVerificationEmailSentRecord;
  }

  try {
    const storedValue: unknown = JSON.parse(
      window.localStorage.getItem(VERIFICATION_RESEND_STORAGE_KEY) ?? "null"
    );
    if (isVerificationEmailSentRecord(storedValue)) {
      inMemoryVerificationEmailSentRecord = storedValue;
      return storedValue;
    }
  } catch {
    // Fall back to memory when localStorage is unavailable or malformed.
  }

  return inMemoryVerificationEmailSentRecord;
}

export function recordVerificationEmailSent(
  email: string,
  sentAt = Date.now()
): void {
  const record: VerificationEmailSentRecord = {
    email: email.trim().toLocaleLowerCase(),
    sentAt,
  };
  inMemoryVerificationEmailSentRecord = record;

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      VERIFICATION_RESEND_STORAGE_KEY,
      JSON.stringify(record)
    );
  } catch {
    // The in-memory record still enforces the cooldown for this page session.
  }
}

export function getVerificationResendRemainingSeconds(
  email: string,
  now = Date.now()
): number {
  const record = readVerificationEmailSentRecord();
  if (!record || record.email !== email.trim().toLocaleLowerCase()) return 0;

  const elapsedMilliseconds = Math.max(0, now - record.sentAt);
  const remainingMilliseconds =
    VERIFICATION_RESEND_COOLDOWN_SECONDS * 1_000 - elapsedMilliseconds;

  return Math.max(0, Math.ceil(remainingMilliseconds / 1_000));
}

interface AuthErrorDetails {
  code?: string;
  message: string;
}

export function isEmailNotConfirmedError(error: AuthErrorDetails): boolean {
  return (
    error.code === "email_not_confirmed" ||
    error.message.toLowerCase().includes("email not confirmed")
  );
}

export interface PasswordValidation {
  valid: boolean;
  message: string | null;
}

export function validatePassword(password: string): PasswordValidation {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters." };
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return { valid: false, message: "Include both uppercase and lowercase letters." };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Include at least one number." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "Include at least one special character." };
  }
  return { valid: true, message: null };
}

export function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with this email already exists.";
  }
  if (normalized.includes("password should be")) {
    return "That password does not meet the security requirements.";
  }
  if (normalized.includes("same password")) {
    return "Choose a password different from your current password.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (normalized.includes("expired") || normalized.includes("invalid token")) {
    return "This link has expired or is invalid. Please request a new one.";
  }
  return "Something went wrong. Please try again.";
}

export function safeNextPath(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
