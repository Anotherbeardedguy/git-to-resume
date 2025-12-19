import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type RateLimitOptions = {
  windowMs: number
  max: number
}

type RateLimitResult = {
  ok: boolean
  remaining: number
  resetMs: number
  headers: Record<string, string>
}

const globalForRateLimit = globalThis as unknown as {
  __rateLimitStore?: Map<string, { count: number; resetMs: number }>
}

const rateLimitStore = globalForRateLimit.__rateLimitStore ?? new Map<string, { count: number; resetMs: number }>()
globalForRateLimit.__rateLimitStore = rateLimitStore

export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = rateLimitStore.get(key)
  const resetMs = existing?.resetMs && existing.resetMs > now ? existing.resetMs : now + opts.windowMs
  const count = existing?.resetMs && existing.resetMs > now ? existing.count + 1 : 1

  rateLimitStore.set(key, { count, resetMs })

  const ok = count <= opts.max
  const remaining = Math.max(0, opts.max - count)
  const retryAfterSeconds = Math.max(0, Math.ceil((resetMs - now) / 1000))

  return {
    ok,
    remaining,
    resetMs,
    headers: {
      ...NO_STORE_HEADERS,
      "X-RateLimit-Limit": String(opts.max),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(resetMs),
      ...(ok ? {} : { "Retry-After": String(retryAfterSeconds) }),
    },
  }
}
