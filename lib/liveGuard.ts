// lib/liveGuard.ts
// Server-side guard to determine if live finance is enabled via environment flag.
// This minimal implementation relies on a production-only env var ENABLE_LIVE_FINANCE
// which should be set to 'true' in your production secret store when ops approve.

export async function isLiveEnabled(): Promise<boolean> {
  try {
    // Only enable live mode in production runtime
    if (process.env.NODE_ENV !== 'production') return false

    // Require explicit env flag from secrets manager
    if (process.env.ENABLE_LIVE_FINANCE !== 'true') return false

    // Optionally, ensure critical production secrets are present (soft check)
    const required = ['CUSTODY_API_KEY', 'KYC_API_KEY']
    for (const k of required) {
      if (!process.env[k]) {
        // If secrets missing, do not enable live mode
        console.warn(`[liveGuard] missing required secret: ${k}`)
        return false
      }
    }

    return true
  } catch (err) {
    console.error('[liveGuard] error checking live status', err)
    return false
  }
}
