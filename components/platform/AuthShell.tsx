import React, { type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  Orbit,
  ShieldCheck
} from 'lucide-react'

type AuthMode = 'login' | 'signup'

type AuthShellProps = {
  mode: AuthMode
  children: ReactNode
}

export default function AuthShell({
  mode,
  children
}: AuthShellProps) {
  const signup = mode === 'signup'

  const backgroundImage = signup
    ? '/media/section-backgrounds/opportunities-falcon.jpg'
    : '/media/section-backgrounds/overview-earth.jpg'

  const floatingObject = signup
    ? '/media/section-objects/opportunities-falcon9.png'
    : '/media/section-objects/why-starlink.png'

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden min-h-screen overflow-hidden border-r border-white/10 lg:flex">
          <Image
            src={backgroundImage}
            alt=""
            fill
            priority
            sizes="55vw"
            className="object-cover opacity-60"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-black/70"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.13),transparent_28%)]"
          />

          <Image
            src={floatingObject}
            alt=""
            width={700}
            height={700}
            priority
            className={[
              'pointer-events-none absolute object-contain drop-shadow-[0_30px_80px_rgba(0,0,0,0.9)]',
              signup
                ? '-bottom-24 -right-28 w-[670px] opacity-80'
                : '-bottom-6 -right-24 w-[620px] opacity-55'
            ].join(' ')}
          />

          <div className="relative z-10 flex min-h-screen w-full flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center justify-between gap-6">
              <Link
                href="/"
                aria-label="SpaceX Invest home"
                className="inline-flex items-center"
              >
                <Image
                  src="/media/spacex-logo-transparent.png"
                  alt="SpaceX"
                  width={230}
                  height={35}
                  priority
                  className="h-8 w-auto object-contain"
                />
              </Link>

              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.17em] text-white/45 transition-colors hover:text-white"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Return home
              </Link>
            </div>

            <div className="max-w-2xl pb-8">
              <div className="inline-flex items-center gap-3 border border-white/15 bg-black/30 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/55 backdrop-blur-xl">
                <Orbit size={15} aria-hidden="true" />
                Private investor network
              </div>

              <h1 className="mt-7 max-w-xl text-6xl font-semibold uppercase leading-[0.9] tracking-[-0.055em] text-white xl:text-7xl">
                {signup ? (
                  <>
                    Begin your
                    <span className="block text-white/45">
                      investment journey
                    </span>
                  </>
                ) : (
                  <>
                    Return to your
                    <span className="block text-white/45">
                      command center
                    </span>
                  </>
                )}
              </h1>

              <p className="mt-7 max-w-lg text-base leading-8 text-white/50">
                {signup
                  ? 'Create your private access profile to explore opportunities, submit applications, and monitor review activity.'
                  : 'Access your applications, saved opportunities, allocation requests, and private investor dashboard.'}
              </p>

              <div className="mt-10 grid max-w-2xl grid-cols-3 border-y border-white/10">
                <div className="border-r border-white/10 py-5 pr-5">
                  <ShieldCheck
                    size={17}
                    aria-hidden="true"
                    className="text-white/45"
                  />

                  <p className="mt-4 text-xs uppercase tracking-[0.15em] text-white/35">
                    Protected Access
                  </p>
                </div>

                <div className="border-r border-white/10 px-5 py-5">
                  <LockKeyhole
                    size={17}
                    aria-hidden="true"
                    className="text-white/45"
                  />

                  <p className="mt-4 text-xs uppercase tracking-[0.15em] text-white/35">
                    Private Account
                  </p>
                </div>

                <div className="py-5 pl-5">
                  <CheckCircle2
                    size={17}
                    aria-hidden="true"
                    className="text-white/45"
                  />

                  <p className="mt-4 text-xs uppercase tracking-[0.15em] text-white/35">
                    Verified Email
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen flex-col bg-[#050505]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(255,255,255,0.07),transparent_32%),radial-gradient(circle_at_10%_80%,rgba(60,90,130,0.07),transparent_28%)]"
          />

          <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-8 lg:hidden">
            <Link href="/" aria-label="SpaceX Invest home">
              <Image
                src="/media/spacex-logo-transparent.png"
                alt="SpaceX"
                width={190}
                height={30}
                priority
                className="h-7 w-auto object-contain"
              />
            </Link>

            <Link
              href="/"
              aria-label="Return home"
              className="flex h-10 w-10 items-center justify-center border border-white/10 text-white/55"
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
          </div>

          <div className="relative h-[215px] overflow-hidden border-b border-white/10 sm:h-[250px] lg:hidden">
            <Image
              src={backgroundImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-55"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/35"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/30"
            />

            <Image
              src={floatingObject}
              alt=""
              width={430}
              height={430}
              priority
              className={[
                'pointer-events-none absolute object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]',
                signup
                  ? '-bottom-20 -right-20 w-[360px] opacity-85'
                  : '-bottom-10 -right-16 w-[330px] opacity-65'
              ].join(' ')}
            />

            <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7">
              <div className="inline-flex items-center gap-2 border border-white/15 bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/60 backdrop-blur-xl">
                <Orbit size={13} aria-hidden="true" />
                Private Investor Network
              </div>
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12 xl:px-20">
            <div className="w-full max-w-[520px]">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
                  {signup ? 'New Investor Access' : 'Investor Authentication'}
                </p>

                <h2 className="mt-3 text-4xl font-semibold uppercase tracking-[-0.035em] text-white sm:text-5xl">
                  {signup ? 'Create Account' : 'Welcome Back'}
                </h2>

                <p className="mt-4 max-w-md text-sm leading-7 text-white/45">
                  {signup
                    ? 'Create your access credentials to enter the SpaceX Invest private portal.'
                    : 'Enter your account credentials to continue to the investor dashboard.'}
                </p>
              </div>

              {children}

              <div className="mt-7 flex items-center justify-center gap-2 text-xs text-white/25">
                <ShieldCheck size={13} aria-hidden="true" />
                Authentication powered by encrypted session management
              </div>
            </div>
          </div>

          <div className="relative border-t border-white/10 px-5 py-5 text-center text-[10px] uppercase tracking-[0.16em] text-white/20 sm:px-8">
            SpaceX Invest · Private Access Portal
          </div>
        </section>
      </div>
    </main>
  )
}
