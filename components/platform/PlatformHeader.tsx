'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '../../lib/supabase/client'

type NavLink = {
  label: string
  href: string
  badge?: number
}

const LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Dashboard', href: '/dashboard' }
]

export default function PlatformHeader() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [open, setOpen] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [staffRole, setStaffRole] = useState<
    'reviewer' | 'finance' | 'admin' | null
  >(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let active = true

    async function applyUser(user: User | null) {
      if (!user) {
        if (active) {
          setAuthenticated(false)
          setStaffRole(null)
          setNotificationCount(0)
          setAuthChecked(true)
        }

        return
      }

      const [roleResult, unreadResult] =
        await Promise.all([
          supabase
            .from('staff_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle(),

          supabase
            .from('application_activity')
            .select('id', {
              count: 'exact',
              head: true
            })
            .eq('user_id', user.id)
            .is('read_at', null)
        ])

      const roleRecord = roleResult.data

      const role =
        roleRecord?.role === 'reviewer' ||
        roleRecord?.role === 'finance' ||
        roleRecord?.role === 'admin'
          ? roleRecord.role
          : null

      if (active) {
        setAuthenticated(true)
        setStaffRole(role)
        setNotificationCount(unreadResult.count ?? 0)
        setAuthChecked(true)
      }
    }

    async function checkAuthentication() {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      await applyUser(user)
    }

    void checkAuthentication()

    function handleActivityChanged() {
      void checkAuthentication()
    }

    window.addEventListener(
      'spacexinvest:activity-changed',
      handleActivityChanged
    )

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null)
    })

    return () => {
      active = false
      window.removeEventListener(
        'spacexinvest:activity-changed',
        handleActivityChanged
      )
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleLogout() {
    setLoggingOut(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setLoggingOut(false)
      window.alert('Unable to log out. Please try again.')
      return
    }

    setAuthenticated(false)
    setStaffRole(null)
    setNotificationCount(0)
    setOpen(false)

    router.replace('/login')
    router.refresh()
  }

  const visibleLinks: NavLink[] = authenticated
  ? [
      ...LINKS,
      {
        label: 'Portfolio',
        href: '/dashboard/portfolio'
      },
      {
        label: 'Activity',
        href: '/dashboard/activity',
        badge: notificationCount
      },
        {
          label: 'Settings',
          href: '/dashboard/settings'
        },
        ...(
          staffRole === 'reviewer' ||
          staffRole === 'admin'
            ? [
                {
                  label: 'Admin Review',
                  href: '/admin/applications'
                }
              ]
            : []
        ),
        ...(
          staffRole === 'finance' ||
          staffRole === 'admin'
            ? [
                {
                  label: 'Finance',
                  href: '/admin/finance'
                },
                {
                  label: 'Portfolio Admin',
                  href: '/admin/portfolio'
                }
              ]
            : []
        ),
        ...(staffRole === 'admin'
          ? [
              {
                label: 'Staff Access',
                href: '/admin/staff'
              }
            ]
          : [])
      ]
    : LINKS.filter((link) => link.href !== '/dashboard')

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 text-white backdrop-blur-md">
      <div className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between px-4">
        <Link
          href="/"
          aria-label="SpaceX Invest home"
          className="flex items-center"
        >
          <Image
            src="/media/spacex-logo-transparent.png"
            alt="SpaceX"
            width={220}
            height={32}
            priority
            className="h-8 w-auto object-contain md:h-9"
          />
        </Link>

        <nav
          aria-label="Platform navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex items-center gap-2 text-sm text-white/65 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {link.label}

              {link.badge ? (
                <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-black">
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-[182px] items-center justify-end gap-3 md:flex">
          {!authChecked ? (
            <div
              aria-label="Checking account"
              className="h-11 w-[182px] animate-pulse border border-white/5 bg-white/[0.03]"
            />
          ) : authenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">
                Log in
              </Link>

              <Link href="/signup" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="platform-mobile-menu"
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-11 min-w-11 items-center justify-center border border-white/10 text-white md:hidden"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <div
          id="platform-mobile-menu"
          className="border-t border-white/10 bg-black/95 px-4 py-6 md:hidden"
        >
          <nav
            aria-label="Mobile platform navigation"
            className="mx-auto flex max-w-[1200px] flex-col gap-2"
          >
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-white/10 py-4 text-lg text-white"
              >
                {link.label}

                {link.badge ? (
                  <span className="flex min-h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-black">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                ) : null}
              </Link>
            ))}

            {authChecked ? (
              authenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="btn btn-ghost mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loggingOut ? 'Logging out…' : 'Log out'}
                </button>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="btn btn-ghost"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="btn btn-primary"
                  >
                    Sign up
                  </Link>
                </div>
              )
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
