'use client'

type ActionResult = { error?: string } & Record<string, unknown>

export interface AuthRetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  onRetry?: () => Promise<unknown> | unknown
  isAuthError?: (result: { error?: string } | null | undefined, err?: unknown) => boolean
}

const DEFAULT_AUTH_ERRORS = new Set([
  'Not authenticated',
  'Unauthorized',
  'Auth session missing',
])

function defaultIsAuthError(result: { error?: string } | null | undefined, err?: unknown) {
  if (err) return true
  if (!result) return false
  const msg = result.error
  if (!msg) return false
  return DEFAULT_AUTH_ERRORS.has(msg)
}

/**
 * Retries a server-action call when it returns an auth-style error.
 * Between attempts, it calls `onRetry()` (typically `session.touch()`) and
 * waits with a small linear backoff so Clerk has time to rotate the token.
 *
 * Non-auth errors pass through untouched on the first attempt.
 */
export async function callWithAuthRetry<T extends ActionResult>(
  fn: () => Promise<T>,
  options: AuthRetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 350,
    onRetry,
    isAuthError = defaultIsAuthError,
  } = options

  let lastResult: T | undefined
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      lastResult = await fn()
      lastError = undefined
      if (!isAuthError(lastResult)) return lastResult
    } catch (err) {
      lastError = err
      lastResult = { error: (err as Error)?.message ?? 'Unknown error' } as T
      if (!isAuthError(undefined, err)) return lastResult
    }

    if (attempt < maxAttempts - 1) {
      try {
        await onRetry?.()
      } catch {
        // Touching the session is best-effort — ignore failures.
      }
      await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)))
    }
  }

  if (lastError && !lastResult) {
    return { error: 'Not authenticated' } as T
  }
  return lastResult as T
}
