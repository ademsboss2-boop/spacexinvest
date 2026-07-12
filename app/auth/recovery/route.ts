import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

function getPublicOrigin(request: NextRequest) {
  const siteUrl = process.env.SITE_URL?.trim()

  if (siteUrl) {
    return siteUrl.replace(/\/$/, '')
  }

  return request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const publicOrigin = getPublicOrigin(request)

  if (!code) {
    return NextResponse.redirect(
      new URL(
        '/forgot-password?error=invalid_recovery_link',
        publicOrigin
      )
    )
  }

  const supabase = await createClient()

  const { error } =
    await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(
        '/forgot-password?error=recovery_failed',
        publicOrigin
      )
    )
  }

  return NextResponse.redirect(
    new URL('/update-password', publicOrigin)
  )
}
