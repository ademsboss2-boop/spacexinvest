import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getPublicOrigin(request: NextRequest) {
  return (
    process.env.SITE_URL?.trim().replace(/\/$/, '') ||
    request.nextUrl.origin
  )
}

function safeDestination(value: string | null) {
  if (
    value &&
    value.startsWith('/') &&
    !value.startsWith('//')
  ) {
    return value
  }

  return '/dashboard'
}

export async function GET(request: NextRequest) {
  const tokenHash =
    request.nextUrl.searchParams.get('token_hash')

  const type =
    request.nextUrl.searchParams.get(
      'type'
    ) as EmailOtpType | null

  const next = safeDestination(
    request.nextUrl.searchParams.get('next')
  )

  const publicOrigin = getPublicOrigin(request)

  if (!tokenHash || !type) {
    const response = NextResponse.redirect(
      new URL(
        '/forgot-password?error=invalid_recovery_link',
        publicOrigin
      )
    )

    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  /*
   * Create the success redirect first so Supabase can attach the
   * recovery-session cookies directly to that response.
   */
  let response = NextResponse.redirect(
    new URL(next, publicOrigin)
  )

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(name, value, options)
            }
          )
        }
      }
    }
  )

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type
  })

  if (error) {
    response = NextResponse.redirect(
      new URL(
        '/forgot-password?error=recovery_link_failed',
        publicOrigin
      )
    )
  }

  response.headers.set('Cache-Control', 'private, no-store')

  return response
}
