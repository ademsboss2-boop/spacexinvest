'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  UserCog,
  UsersRound,
  XCircle
} from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

export type StaffMember = {
  staffUserId: string
  staffEmail: string
  staffDisplayName: string
  staffRole: 'reviewer' | 'admin'
  staffSince: string
  emailConfirmed: boolean
}

export type StaffAuditRecord = {
  auditId: string
  actorUserId: string | null
  actorEmail: string | null
  actorDisplayName: string | null
  targetUserId: string | null
  targetEmail: string | null
  targetDisplayName: string | null
  actionType: string
  previousRole: string | null
  newRole: string | null
  createdAt: string
}

type AdminStaffClientProps = {
  initialStaff: StaffMember[]
  initialAudit: StaffAuditRecord[]
  currentUserId: string
}

type RawStaffMember = {
  staff_user_id: string
  staff_email: string
  staff_display_name: string
  staff_role: 'reviewer' | 'admin'
  staff_since: string
  email_confirmed: boolean
}

type RawAuditRecord = {
  audit_id: string
  actor_user_id: string | null
  actor_email: string | null
  actor_display_name: string | null
  target_user_id: string | null
  target_email: string | null
  target_display_name: string | null
  action_type: string
  previous_role: string | null
  new_role: string | null
  created_at: string
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

function formatRole(value: string | null) {
  if (!value) {
    return 'No access'
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    )
}

function actionLabel(value: string) {
  switch (value) {
    case 'baseline':
      return 'Baseline access recorded'

    case 'assigned':
      return 'Staff access assigned'

    case 'role_changed':
      return 'Staff role changed'

    case 'revoked':
      return 'Staff access revoked'

    default:
      return value.replaceAll('_', ' ')
  }
}

function roleClasses(role: string) {
  if (role === 'admin') {
    return 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  }

  return 'border-sky-300/20 bg-sky-300/10 text-sky-100'
}

function normalizeStaff(
  rows: RawStaffMember[]
): StaffMember[] {
  return rows.map((member) => ({
    staffUserId: member.staff_user_id,
    staffEmail: member.staff_email,
    staffDisplayName: member.staff_display_name,
    staffRole: member.staff_role,
    staffSince: member.staff_since,
    emailConfirmed: member.email_confirmed
  }))
}

function normalizeAudit(
  rows: RawAuditRecord[]
): StaffAuditRecord[] {
  return rows.map((record) => ({
    auditId: record.audit_id,
    actorUserId: record.actor_user_id,
    actorEmail: record.actor_email,
    actorDisplayName: record.actor_display_name,
    targetUserId: record.target_user_id,
    targetEmail: record.target_email,
    targetDisplayName: record.target_display_name,
    actionType: record.action_type,
    previousRole: record.previous_role,
    newRole: record.new_role,
    createdAt: record.created_at
  }))
}

export default function AdminStaffClient({
  initialStaff,
  initialAudit,
  currentUserId
}: AdminStaffClientProps) {
  const supabase = useMemo(() => createClient(), [])

  const [staff, setStaff] =
    useState<StaffMember[]>(initialStaff)

  const [auditRecords, setAuditRecords] =
    useState<StaffAuditRecord[]>(initialAudit)

  const [email, setEmail] = useState('')
  const [role, setRole] =
    useState<'reviewer' | 'admin'>('reviewer')

  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] =
    useState<string | null>(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const adminCount = staff.filter(
    (member) => member.staffRole === 'admin'
  ).length

  const reviewerCount = staff.filter(
    (member) => member.staffRole === 'reviewer'
  ).length

  async function reloadStaffData() {
    const [staffResult, auditResult] = await Promise.all([
      supabase.rpc('list_staff_members'),
      supabase.rpc('list_staff_role_audit', {
        p_limit: 100
      })
    ])

    if (staffResult.error) {
      throw new Error(staffResult.error.message)
    }

    if (auditResult.error) {
      throw new Error(auditResult.error.message)
    }

    setStaff(
      normalizeStaff(
        (staffResult.data ?? []) as RawStaffMember[]
      )
    )

    setAuditRecords(
      normalizeAudit(
        (auditResult.data ?? []) as RawAuditRecord[]
      )
    )
  }

  async function handleAssignRole(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError('Enter the registered account email.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const { error: roleError } = await supabase.rpc(
        'set_staff_role',
        {
          p_email: normalizedEmail,
          p_role: role
        }
      )

      if (roleError) {
        setError(roleError.message)
        return
      }

      await reloadStaffData()

      setEmail('')
      setMessage(
        `${formatRole(role)} access was assigned successfully.`
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The staff role could not be saved.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(member: StaffMember) {
    const confirmed = window.confirm(
      `Revoke staff access for ${member.staffEmail}?`
    )

    if (!confirmed) {
      return
    }

    setRemovingId(member.staffUserId)
    setMessage('')
    setError('')

    try {
      const { error: removeError } = await supabase.rpc(
        'remove_staff_role',
        {
          p_user_id: member.staffUserId
        }
      )

      if (removeError) {
        setError(removeError.message)
        return
      }

      await reloadStaffData()

      setMessage(
        `Staff access was revoked for ${member.staffEmail}.`
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Staff access could not be revoked.'
      )
    } finally {
      setRemovingId(null)
    }
  }

  const summaryCards = [
    {
      label: 'Total Staff',
      value: String(staff.length),
      icon: UsersRound
    },
    {
      label: 'Administrators',
      value: String(adminCount),
      icon: ShieldCheck
    },
    {
      label: 'Reviewers',
      value: String(reviewerCount),
      icon: UserCog
    },
    {
      label: 'Access Events',
      value: String(auditRecords.length),
      icon: Clock3
    }
  ]

  return (
    <div className="relative overflow-hidden bg-[#030303] pb-20">
      <section className="relative overflow-hidden border-b border-white/10">
        <Image
          src="/media/section-backgrounds/security-dragon.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/35"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30"
        />

        <Image
          src="/media/section-objects/security-station.png"
          alt=""
          width={580}
          height={580}
          priority
          className="pointer-events-none absolute -bottom-44 -right-28 hidden w-[540px] object-contain opacity-35 lg:block"
        />

        <div className="relative mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/45">
            <span className="flex h-9 w-9 items-center justify-center border border-white/15 bg-black/30">
              <ShieldCheck size={16} aria-hidden="true" />
            </span>

            Administrator Access Control
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-semibold uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            Staff Access
            <span className="block text-white/45">
              & Role Management
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
            Assign authorized reviewers, manage administrator
            privileges, and inspect the permanent access-control
            audit history.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section
          aria-label="Staff access summary"
          className="grid border border-white/10 sm:grid-cols-2 xl:grid-cols-4"
        >
          {summaryCards.map((card, index) => {
            const Icon = card.icon

            return (
              <article
                key={card.label}
                className={[
                  'min-h-40 border-b border-white/10 bg-white/[0.025] p-6',
                  index % 2 === 0 ? 'sm:border-r' : '',
                  index < 3 ? 'xl:border-r' : '',
                  index >= 2
                    ? 'sm:border-b-0'
                    : 'xl:border-b-0'
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                    {card.label}
                  </p>

                  <Icon
                    size={18}
                    aria-hidden="true"
                    className="text-white/35"
                  />
                </div>

                <p className="mt-7 text-3xl font-semibold text-white">
                  {card.value}
                </p>
              </article>
            )
          })}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <section className="h-fit border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Existing Account Required
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Assign Staff Access
                </h2>
              </div>

              <ShieldPlus
                size={21}
                aria-hidden="true"
                className="text-white/35"
              />
            </div>

            <form
              onSubmit={handleAssignRole}
              className="mt-7"
            >
              <label
                htmlFor="staff-email"
                className="text-xs uppercase tracking-[0.14em] text-white/40"
              >
                Registered account email
              </label>

              <input
                id="staff-email"
                type="email"
                value={email}
                disabled={saving}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                  setMessage('')
                }}
                placeholder="reviewer@example.com"
                autoComplete="email"
                required
                className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/35 disabled:opacity-50"
              />

              <label
                htmlFor="staff-role"
                className="mt-6 block text-xs uppercase tracking-[0.14em] text-white/40"
              >
                Staff role
              </label>

              <select
                id="staff-role"
                value={role}
                disabled={saving}
                onChange={(event) =>
                  setRole(
                    event.target.value as
                      | 'reviewer'
                      | 'admin'
                  )
                }
                className="mt-3 min-h-12 w-full border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-white/35 disabled:opacity-50"
              >
                <option value="reviewer">
                  Reviewer
                </option>

                <option value="admin">
                  Administrator
                </option>
              </select>

              <div className="mt-5 border border-white/10 bg-black/25 p-4 text-xs leading-6 text-white/40">
                Reviewers can inspect and decide applications.
                Administrators can also manage staff access. The
                account must already be registered and email
                verified.
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary mt-6 min-h-12 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      aria-hidden="true"
                      className="animate-spin"
                    />
                    Saving Access
                  </>
                ) : (
                  <>
                    <ShieldPlus
                      size={16}
                      aria-hidden="true"
                    />
                    Assign or Update Role
                  </>
                )}
              </button>

              {error ? (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 text-xs leading-5 text-red-300"
                >
                  <XCircle
                    size={14}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />

                  {error}
                </div>
              ) : null}

              {message ? (
                <div
                  role="status"
                  className="mt-4 flex items-start gap-2 text-xs leading-5 text-emerald-100/70"
                >
                  <CheckCircle2
                    size={14}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />

                  {message}
                </div>
              ) : null}
            </form>
          </section>

          <section className="border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Current Permissions
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Authorized Staff
                </h2>
              </div>

              <UsersRound
                size={21}
                aria-hidden="true"
                className="text-white/35"
              />
            </div>

            <div className="mt-6 space-y-4">
              {staff.map((member) => {
                const isCurrentUser =
                  member.staffUserId === currentUserId

                const isFinalAdmin =
                  member.staffRole === 'admin' &&
                  adminCount <= 1

                const isRemoving =
                  removingId === member.staffUserId

                return (
                  <article
                    key={member.staffUserId}
                    className="border border-white/10 bg-black/30 p-5"
                  >
                    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="truncate font-medium text-white">
                            {member.staffDisplayName}
                          </h3>

                          {isCurrentUser ? (
                            <span className="border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/55">
                              You
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 break-all text-sm text-white/45">
                          {member.staffEmail}
                        </p>

                        <p className="mt-3 text-xs text-white/30">
                          Staff since{' '}
                          {formatDate(member.staffSince)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                        <span
                          className={`border px-3 py-2 text-xs uppercase tracking-[0.13em] ${roleClasses(
                            member.staffRole
                          )}`}
                        >
                          {formatRole(member.staffRole)}
                        </span>

                        <button
                          type="button"
                          disabled={
                            isRemoving || isFinalAdmin
                          }
                          onClick={() =>
                            handleRemove(member)
                          }
                          title={
                            isFinalAdmin
                              ? 'The final administrator cannot be removed.'
                              : 'Revoke staff access'
                          }
                          className="inline-flex min-h-10 items-center gap-2 border border-red-300/15 px-3 text-xs text-red-200/65 transition-colors hover:border-red-300/30 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {isRemoving ? (
                            <Loader2
                              size={14}
                              aria-hidden="true"
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={14}
                              aria-hidden="true"
                            />
                          )}

                          Revoke
                        </button>
                      </div>
                    </div>

                    {isFinalAdmin ? (
                      <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-white/30">
                        Protected because this is currently the
                        final administrator account.
                      </p>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>
        </div>

        <section className="mt-6 border border-white/10 bg-white/[0.025] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                Permanent Administrative History
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                Staff Access Audit
              </h2>
            </div>

            <Clock3
              size={21}
              aria-hidden="true"
              className="text-white/35"
            />
          </div>

          {auditRecords.length ? (
            <div className="mt-7 space-y-4">
              {auditRecords.map((record) => (
                <article
                  key={record.auditId}
                  className="border border-white/10 bg-black/30 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="font-medium text-white">
                        {actionLabel(record.actionType)}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-white/50">
                        <span className="text-white/75">
                          {record.targetDisplayName ||
                            record.targetEmail ||
                            'Unknown staff member'}
                        </span>

                        {record.targetEmail ? (
                          <>
                            {' '}
                            <span className="text-white/30">
                              ({record.targetEmail})
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <time className="shrink-0 text-xs text-white/30">
                      {formatDate(record.createdAt)}
                    </time>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                    <span className="border border-white/10 bg-black/30 px-3 py-2 text-white/45">
                      {formatRole(record.previousRole)}
                    </span>

                    <span className="text-white/25">
                      →
                    </span>

                    <span className="border border-white/15 bg-white/[0.05] px-3 py-2 text-white/70">
                      {formatRole(record.newRole)}
                    </span>
                  </div>

                  <p className="mt-4 border-t border-white/10 pt-4 text-xs text-white/30">
                    Performed by:{' '}
                    <span className="text-white/50">
                      {record.actorDisplayName ||
                        record.actorEmail ||
                        'System'}
                    </span>
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-7 border border-dashed border-white/15 px-6 py-14 text-center">
              <Clock3
                size={28}
                aria-hidden="true"
                className="mx-auto text-white/25"
              />

              <p className="mt-4 text-sm text-white/40">
                No staff-access events are available.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
