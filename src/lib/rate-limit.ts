/**
 * Zähler je Schlüssel in einem gleitenden Fenster. Heute im Prozessspeicher (eine Instanz); bei mehreren
 * Instanzen kommt derselbe Vertrag auf Redis (docs/SKALIERUNG.md, Stufe 2). Reine Logik, Zeit wird übergeben.
 */
export interface RateLimiter {
  hit(key: string, limit: number, windowMs: number, now?: number): { allowed: boolean; remaining: number; retryAfterMs: number };
  /** Nur nachsehen, ohne zu zählen. */
  peek(key: string, limit: number, windowMs: number, now?: number): { allowed: boolean; retryAfterMs: number };
}

export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  private lastPrune = 0;

  hit(key: string, limit: number, windowMs: number, now = Date.now()) {
    this.prune(now, windowMs);
    const list = (this.hits.get(key) ?? []).filter((t) => t > now - windowMs);
    if (list.length >= limit) {
      this.hits.set(key, list);
      return { allowed: false, remaining: 0, retryAfterMs: list[0] + windowMs - now };
    }
    list.push(now);
    this.hits.set(key, list);
    return { allowed: true, remaining: limit - list.length, retryAfterMs: 0 };
  }

  peek(key: string, limit: number, windowMs: number, now = Date.now()) {
    const list = (this.hits.get(key) ?? []).filter((t) => t > now - windowMs);
    return list.length >= limit ? { allowed: false, retryAfterMs: list[0] + windowMs - now } : { allowed: true, retryAfterMs: 0 };
  }

  /** Alte Schlüssel gelegentlich wegwerfen, damit der Speicher nicht mit jedem Besucher wächst. */
  private prune(now: number, windowMs: number) {
    if (now - this.lastPrune < 60_000) return;
    this.lastPrune = now;
    for (const [k, list] of this.hits) {
      const fresh = list.filter((t) => t > now - windowMs);
      if (fresh.length === 0) this.hits.delete(k);
      else this.hits.set(k, fresh);
    }
  }

  get size() {
    return this.hits.size;
  }
}

export function formatRetry(ms: number): string {
  const min = Math.ceil(ms / 60_000);
  return min <= 1 ? "einer Minute" : `${min} Minuten`;
}
