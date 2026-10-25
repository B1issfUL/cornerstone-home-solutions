// Privacy-safe failure reporting: records only where it failed and the error code,
// never messages, payloads, user input or keys.
export function reportError(scope, error) {
  const code = error?.code || error?.status || error?.name || 'unknown';
  console.warn(`[Cornerstone] ${scope} failed:`, String(code).slice(0, 80));
}
