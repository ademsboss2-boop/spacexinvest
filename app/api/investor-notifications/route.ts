import {
  createClient as createSupabaseAdminClient,
  type SupabaseClient
} from '@supabase/supabase-js'

import {
  createClient as createSessionClient
} from '../../../lib/supabase/server'

import {
  buildPremiumInvestorEmail
} from '../../../lib/email/premium-investor-email'

import {
  sendInvestorEmail
} from '../../../lib/email/send-investor-email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type NotificationEvent =
  | 'application_status'
  | 'funding_review'
  | 'distribution_recorded'

type NotificationRequest = {
  event: NotificationEvent
  recordId: string
}

type StaffRole =
  | 'reviewer'
  | 'finance'
  | 'admin'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isNotificationEvent(
  value: unknown
): value is NotificationEvent {
  return (
    value === 'application_status' ||
    value === 'funding_review' ||
    value === 'distribution_recorded'
  )
}

function relationTitle(
  value: unknown
): string {
  if (Array.isArray(value)) {
    const first = value[0]

    if (
      isObject(first) &&
      typeof first.title === 'string'
    ) {
      return first.title
    }

    return 'Investment Opportunity'
  }

  if (
    isObject(value) &&
    typeof value.title === 'string'
  ) {
    return value.title
  }

  return 'Investment Opportunity'
}

function currency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value)
}

function readableDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

function readableDistributionType(
  value: string
): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    )
}

function portalUrl(path: string): string {
  const baseUrl = (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://spacexinvest.co'
  ).replace(/\/+$/, '')

  return new URL(path, `${baseUrl}/`).toString()
}

function adminClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const secret =
    process.env.SUPABASE_SECRET_KEY

  if (!url || !secret) {
    throw new Error(
      'Supabase server credentials are not configured.'
    )
  }

  return createSupabaseAdminClient(
    url,
    secret,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

async function resolveRecipient(
  admin: SupabaseClient,
  userId: string
): Promise<{
  email: string
  name: string
}> {
  const [
    userResult,
    profileResult
  ] = await Promise.all([
    admin.auth.admin.getUserById(userId),

    admin
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
  ])

  const email =
    userResult.data.user?.email?.trim()

  if (userResult.error || !email) {
    throw new Error(
      'Investor email could not be resolved.'
    )
  }

  const profile =
    profileResult.data as {
      display_name?: string | null
    } | null

  return {
    email,
    name:
      profile?.display_name?.trim() ||
      'Investor'
  }
}

async function sendApplicationStatusEmail(
  admin: SupabaseClient,
  applicationId: string
) {
  const {
    data,
    error
  } = await admin
    .from('investment_applications')
    .select(`
      id,
      user_id,
      reference_code,
      status,
      opportunity:opportunities (
        title
      )
    `)
    .eq('id', applicationId)
    .maybeSingle()

  if (error || !data) {
    throw new Error(
      'Application record could not be loaded.'
    )
  }

  const application =
    data as unknown as {
      id: string
      user_id: string
      reference_code: string
      status: string
      opportunity: unknown
    }

  if (
    application.status !== 'approved' &&
    application.status !== 'declined'
  ) {
    return {
      skipped: true,
      reason:
        'This application status does not send email.'
    }
  }

  const recipient = await resolveRecipient(
    admin,
    application.user_id
  )

  const approved =
    application.status === 'approved'

  const subject = approved
    ? 'Your investment application has been approved'
    : 'Update on your investment application'

  const email =
    buildPremiumInvestorEmail({
      previewText: subject,
      eyebrow: 'Application Review',
      title: approved
        ? 'Application Approved'
        : 'Application Status Updated',
      greetingName: recipient.name,
      message: approved
        ? 'Your investment application has completed review and has been approved. You may now sign in to review the opportunity and the next available steps.'
        : 'The review of your investment application has been completed. Please sign in to your private investor portal to review the current status and available information.',
      statusLabel: 'Current Status',
      statusValue: approved
        ? 'Approved'
        : 'Declined',
      details: [
        {
          label: 'Reference',
          value: application.reference_code
        },
        {
          label: 'Opportunity',
          value: relationTitle(
            application.opportunity
          )
        }
      ],
      actionLabel: 'View Application',
      actionUrl: portalUrl(
        `/dashboard/applications/${encodeURIComponent(
          application.reference_code
        )}`
      )
    })

  const sent = await sendInvestorEmail({
    to: recipient.email,
    subject,
    html: email.html,
    text: email.text,
    idempotencyKey:
      `application-${application.id}-${application.status}`
  })

  return {
    skipped: false,
    emailId: sent.id
  }
}

async function sendFundingReviewEmail(
  admin: SupabaseClient,
  depositId: string
) {
  const {
    data: depositData,
    error: depositError
  } = await admin
    .from('investor_deposits')
    .select(`
      id,
      application_id,
      investor_user_id,
      status,
      credited_usd_amount
    `)
    .eq('id', depositId)
    .maybeSingle()

  if (depositError || !depositData) {
    throw new Error(
      'Funding submission could not be loaded.'
    )
  }

  const deposit =
    depositData as {
      id: string
      application_id: string
      investor_user_id: string
      status: string
      credited_usd_amount:
        | number
        | string
        | null
    }

  if (
    deposit.status !== 'verified' &&
    deposit.status !== 'rejected'
  ) {
    return {
      skipped: true,
      reason:
        'This funding status does not send email.'
    }
  }

  const {
    data: applicationData,
    error: applicationError
  } = await admin
    .from('investment_applications')
    .select(`
      reference_code,
      opportunity:opportunities (
        title
      )
    `)
    .eq('id', deposit.application_id)
    .maybeSingle()

  if (applicationError || !applicationData) {
    throw new Error(
      'Related application could not be loaded.'
    )
  }

  const application =
    applicationData as unknown as {
      reference_code: string
      opportunity: unknown
    }

  const recipient = await resolveRecipient(
    admin,
    deposit.investor_user_id
  )

  const verified =
    deposit.status === 'verified'

  const subject = verified
    ? 'Your funding submission has been verified'
    : 'Action required for your funding submission'

  const details = [
    {
      label: 'Reference',
      value: application.reference_code
    },
    {
      label: 'Opportunity',
      value: relationTitle(
        application.opportunity
      )
    }
  ]

  if (
    verified &&
    deposit.credited_usd_amount !== null
  ) {
    details.push({
      label: 'Credited Capital',
      value: currency(
        Number(deposit.credited_usd_amount)
      )
    })
  }

  const email =
    buildPremiumInvestorEmail({
      previewText: subject,
      eyebrow: 'Funding Review',
      title: verified
        ? 'Funding Verified'
        : 'Funding Review Update',
      greetingName: recipient.name,
      message: verified
        ? 'Your funding submission has been reviewed and verified. The credited capital is now reflected in your investor portfolio.'
        : 'Your funding submission could not be verified in its current form. Please sign in to review the status before taking any further action.',
      statusLabel: 'Funding Status',
      statusValue: verified
        ? 'Verified'
        : 'Requires Attention',
      details,
      actionLabel: verified
        ? 'View Portfolio'
        : 'Review Funding',
      actionUrl: verified
        ? portalUrl('/dashboard/portfolio')
        : portalUrl(
            `/dashboard/funding/${encodeURIComponent(
              application.reference_code
            )}`
          )
    })

  const sent = await sendInvestorEmail({
    to: recipient.email,
    subject,
    html: email.html,
    text: email.text,
    idempotencyKey:
      `funding-${deposit.id}-${deposit.status}`
  })

  return {
    skipped: false,
    emailId: sent.id
  }
}

async function sendDistributionEmail(
  admin: SupabaseClient,
  distributionId: string
) {
  const {
    data: distributionData,
    error: distributionError
  } = await admin
    .from('portfolio_distributions')
    .select(`
      id,
      position_id,
      distribution_type,
      amount,
      effective_date
    `)
    .eq('id', distributionId)
    .maybeSingle()

  if (
    distributionError ||
    !distributionData
  ) {
    throw new Error(
      'Distribution record could not be loaded.'
    )
  }

  const distribution =
    distributionData as {
      id: string
      position_id: string
      distribution_type: string
      amount: number | string
      effective_date: string
    }

  const {
    data: positionData,
    error: positionError
  } = await admin
    .from('portfolio_positions')
    .select('application_id')
    .eq('id', distribution.position_id)
    .maybeSingle()

  if (positionError || !positionData) {
    throw new Error(
      'Portfolio position could not be loaded.'
    )
  }

  const position =
    positionData as {
      application_id: string
    }

  const {
    data: applicationData,
    error: applicationError
  } = await admin
    .from('investment_applications')
    .select(`
      user_id,
      reference_code,
      opportunity:opportunities (
        title
      )
    `)
    .eq('id', position.application_id)
    .maybeSingle()

  if (applicationError || !applicationData) {
    throw new Error(
      'Related application could not be loaded.'
    )
  }

  const application =
    applicationData as unknown as {
      user_id: string
      reference_code: string
      opportunity: unknown
    }

  const recipient = await resolveRecipient(
    admin,
    application.user_id
  )

  const subject =
    'A portfolio distribution has been recorded'

  const email =
    buildPremiumInvestorEmail({
      previewText: subject,
      eyebrow: 'Portfolio Activity',
      title: 'Distribution Recorded',
      greetingName: recipient.name,
      message:
        'A new distribution has been recorded for your investment portfolio. Sign in to view the updated portfolio activity and distribution history.',
      statusLabel: 'Activity',
      statusValue: 'Distribution Recorded',
      details: [
        {
          label: 'Reference',
          value: application.reference_code
        },
        {
          label: 'Opportunity',
          value: relationTitle(
            application.opportunity
          )
        },
        {
          label: 'Distribution Type',
          value: readableDistributionType(
            distribution.distribution_type
          )
        },
        {
          label: 'Amount',
          value: currency(
            Number(distribution.amount)
          )
        },
        {
          label: 'Effective Date',
          value: readableDate(
            distribution.effective_date
          )
        }
      ],
      actionLabel: 'View Portfolio',
      actionUrl: portalUrl(
        '/dashboard/portfolio'
      )
    })

  const sent = await sendInvestorEmail({
    to: recipient.email,
    subject,
    html: email.html,
    text: email.text,
    idempotencyKey:
      `distribution-${distribution.id}`
  })

  return {
    skipped: false,
    emailId: sent.id
  }
}

export async function POST(
  request: Request
) {
  try {
    let rawBody: unknown

    try {
      rawBody = await request.json()
    } catch {
      return Response.json(
        {
          error: 'Invalid JSON request.'
        },
        {
          status: 400
        }
      )
    }

    if (
      !isObject(rawBody) ||
      !isNotificationEvent(rawBody.event) ||
      typeof rawBody.recordId !== 'string' ||
      !UUID_PATTERN.test(rawBody.recordId)
    ) {
      return Response.json(
        {
          error: 'Invalid notification request.'
        },
        {
          status: 400
        }
      )
    }

    const body: NotificationRequest = {
      event: rawBody.event,
      recordId: rawBody.recordId
    }

    const session = await createSessionClient()

    const {
      data: { user },
      error: userError
    } = await session.auth.getUser()

    if (userError || !user) {
      return Response.json(
        {
          error: 'Authentication required.'
        },
        {
          status: 401
        }
      )
    }

    const {
      data: assurance,
      error: assuranceError
    } =
      await session.auth.mfa
        .getAuthenticatorAssuranceLevel()

    if (
      assuranceError ||
      assurance.currentLevel !== 'aal2'
    ) {
      return Response.json(
        {
          error: 'MFA verification required.'
        },
        {
          status: 403
        }
      )
    }

    const {
      data: staffData,
      error: staffError
    } = await session
      .from('staff_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (staffError || !staffData) {
      return Response.json(
        {
          error: 'Staff authorization required.'
        },
        {
          status: 403
        }
      )
    }

    const role =
      staffData.role as StaffRole

    const allowed =
      body.event === 'application_status'
        ? role === 'reviewer' ||
          role === 'admin'
        : role === 'finance' ||
          role === 'admin'

    if (!allowed) {
      return Response.json(
        {
          error:
            'You are not authorized to send this notification.'
        },
        {
          status: 403
        }
      )
    }

    if (
      process.env.INVESTOR_EMAIL_NOTIFICATIONS_ENABLED !==
      'true'
    ) {
      return Response.json({
        success: true,
        skipped: true,
        reason:
          'Investor email notifications are currently disabled.'
      })
    }

    const admin = adminClient()

    const result =
      body.event === 'application_status'
        ? await sendApplicationStatusEmail(
            admin,
            body.recordId
          )
        : body.event === 'funding_review'
          ? await sendFundingReviewEmail(
              admin,
              body.recordId
            )
          : await sendDistributionEmail(
              admin,
              body.recordId
            )

    return Response.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error(
      'Investor notification error:',
      error
    )

    return Response.json(
      {
        error:
          'The investor notification could not be sent.'
      },
      {
        status: 500
      }
    )
  }
}
