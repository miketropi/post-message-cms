const MAX_RAW_BYTES = 500_000;

/**
 * Stringify for storage; cap size so one bad request cannot bloat the DB.
 */
export function safeJsonStringifyForStorage(value: unknown): string {
  try {
    const s = JSON.stringify(value, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      return v;
    });
    if (s.length > MAX_RAW_BYTES) {
      return `${s.slice(0, MAX_RAW_BYTES)}\n... [truncated ${s.length - MAX_RAW_BYTES} chars]`;
    }
    return s;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `{"_serializationError":${JSON.stringify(msg)}}`;
  }
}
