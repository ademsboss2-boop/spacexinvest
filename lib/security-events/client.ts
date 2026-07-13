import type { SupabaseClient } from '@supabase/supabase-js'

export type SecurityEventType =
  | 'mfa_enrolled'
  | 'mfa_verified'
  | 'mfa_verification_failed'
  | 'mfa_factor_removed'
  | 'privileged_challenge_required'
  | 'privileged_access_denied'
  | 'other_sessions_signed_out'
  | 'session_control_failed'

export async function recordSecurityEvent(
  supabase: SupabaseClient,
  eventType: SecurityEventType,
  metadata: Record<string, unknown> = {}
) {
  const { error } = await supabase.rpc(
    'record_security_event',
    {
      p_event_type: eventType,
      p_metadata: metadata
    }
  )

  if (error) {
    console.error('Security event recording failed:', {
      eventType,
      code: error.code,
      message: error.message
    })

    return false
  }

  return true
}
