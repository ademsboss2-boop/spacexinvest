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

  let next =
    request.nextUrl.searchParams.get('next') ?? '/dashboard'

  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/dashboard'
  }

  const publicOrigin = getPublicOrigin(request)

  if (code) {
    const supabase = await createClient()

    const { error } =
      await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, publicOrigin))
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=confirmation_failed', publicOrigin)
  )
}
