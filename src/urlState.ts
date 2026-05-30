// Persists a small bundle of "where am I, which world" state into the URL
// hash so anyone can paste a link and reproduce the exact view. Hash (not
// search) so it never round-trips to a server and never collides with the
// `?debug` query flag. Writes are coalesced — camera ticks fire 60×/sec and
// we only want one URL update per ~400ms.

export type UrlState = {
  seed?: number;
  strategy?: string;
  x?: number;
  z?: number;
};

const KEYS = {
  seed: "s",
  strategy: "b",
  x: "x",
  z: "z",
} as const;

const numberOrUndefined = (v: string | null): number | undefined => {
  if (v === null) {
    return undefined;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  return n;
};

export const readUrlState = (): UrlState => {
  if (typeof window === "undefined") {
    return {};
  }
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    seed: numberOrUndefined(params.get(KEYS.seed)),
    strategy: params.get(KEYS.strategy) ?? undefined,
    x: numberOrUndefined(params.get(KEYS.x)),
    z: numberOrUndefined(params.get(KEYS.z)),
  };
};

let pending: UrlState = {};
let timer: ReturnType<typeof setTimeout> | null = null;

const flush = (): void => {
  timer = null;
  const params = new URLSearchParams();
  if (pending.seed !== undefined) {
    params.set(KEYS.seed, String(pending.seed));
  }
  if (pending.strategy !== undefined) {
    params.set(KEYS.strategy, pending.strategy);
  }
  if (pending.x !== undefined) {
    params.set(KEYS.x, pending.x.toFixed(1));
  }
  if (pending.z !== undefined) {
    params.set(KEYS.z, pending.z.toFixed(1));
  }
  const next = params.toString();
  const target = next ? `#${next}` : "";
  if (window.location.hash === target) {
    return;
  }
  // replaceState so per-frame writes don't pollute browser history.
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${target}`,
  );
};

// `immediate` is for discrete user actions (strategy change) where the URL
// should update right away. Camera ticks should leave it false and ride the
// 400ms throttle.
export const writeUrlState = (next: UrlState, immediate = false): void => {
  pending = { ...pending, ...next };
  if (immediate) {
    if (timer !== null) {
      clearTimeout(timer);
    }
    flush();
    return;
  }
  if (timer !== null) {
    return;
  }
  timer = setTimeout(flush, 400);
};
