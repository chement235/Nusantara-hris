import { one, run } from "./db";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_LOCK_SECONDS = 15 * 60;

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export function checkLoginAllowed(key: string): { allowed: boolean; retryAfterSec?: number } {
  const row = one<{ attempts: number; first_attempt_at: number; locked_until: number | null }>(
    "SELECT attempts, first_attempt_at, locked_until FROM login_attempts WHERE key = ?",
    key,
  );
  if (!row) return { allowed: true };
  if (row.locked_until && row.locked_until > now()) {
    return { allowed: false, retryAfterSec: row.locked_until - now() };
  }
  if (now() - row.first_attempt_at > LOGIN_WINDOW_SECONDS) {
    run("DELETE FROM login_attempts WHERE key = ?", key);
    return { allowed: true };
  }
  return { allowed: true };
}

export function recordLoginFailure(key: string): { locked: boolean; retryAfterSec?: number } {
  const current = now();
  const row = one<{ attempts: number; first_attempt_at: number; locked_until: number | null }>(
    "SELECT attempts, first_attempt_at, locked_until FROM login_attempts WHERE key = ?",
    key,
  );
  if (!row || current - row.first_attempt_at > LOGIN_WINDOW_SECONDS) {
    run(
      "INSERT OR REPLACE INTO login_attempts (key, attempts, first_attempt_at, locked_until) VALUES (?, 1, ?, NULL)",
      key,
      current,
    );
    return { locked: false };
  }
  const attempts = row.attempts + 1;
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = current + LOGIN_LOCK_SECONDS;
    run(
      "UPDATE login_attempts SET attempts = ?, locked_until = ? WHERE key = ?",
      attempts,
      lockedUntil,
      key,
    );
    return { locked: true, retryAfterSec: LOGIN_LOCK_SECONDS };
  }
  run("UPDATE login_attempts SET attempts = ? WHERE key = ?", attempts, key);
  return { locked: false };
}

export function clearLoginFailures(key: string): void {
  run("DELETE FROM login_attempts WHERE key = ?", key);
}

export function revokeSessionJti(jti: string, userId: number, expiresAtSec: number): void {
  run(
    "INSERT OR REPLACE INTO revoked_sessions (jti, user_id, revoked_at, expires_at) VALUES (?, ?, ?, ?)",
    jti,
    userId,
    now(),
    expiresAtSec,
  );
}

export function isSessionRevoked(jti: string): boolean {
  run("DELETE FROM revoked_sessions WHERE expires_at < ?", now());
  const row = one<{ jti: string }>("SELECT jti FROM revoked_sessions WHERE jti = ?", jti);
  return !!row;
}

export function auditLog(entry: {
  actorUserId?: number | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: string | null;
  ip?: string | null;
}): void {
  try {
    run(
      `INSERT INTO audit_logs (actor_user_id, actor_role, action, target_type, target_id, details, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      entry.actorUserId ?? null,
      entry.actorRole ?? null,
      entry.action,
      entry.targetType ?? null,
      entry.targetId ?? null,
      entry.details ?? null,
      entry.ip ?? null,
    );
  } catch {
    // Audit logging must never break the primary flow.
  }
}
