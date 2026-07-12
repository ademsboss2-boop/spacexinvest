import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/forgot-password?error=invalid_recovery_link', requestUrl.origin)
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL('/forgot-password?error=recovery_failed', requestUrl.origin)
    )
  }

  return NextResponse.redirect(
    new URL('/update-password', requestUrl.origin)
  )
}
