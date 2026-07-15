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
  | 'withdrawal_submitted'
  | 'withdrawal_reviewed'
  | 'withdrawal_processing'
  | 'withdrawal_completed'

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
    value === 'distribution_recorded' ||
    value === 'withdrawal_submitted' ||
    value === 'withdrawal_reviewed' ||
    value === 'withdrawal_processing' ||
    value === 'withdrawal_completed'
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


type WithdrawalRecord = {
  id: string
  requestReference: string
  applicationReference: string
  opportunityTitle: string
  investorUserId: string
  requestType: 'realized_profit' | 'full_exit'
  payoutAsset: 'USDT' | 'BTC'
  payoutNetwork:
    | 'TRON_TESTNET_TRC20'
    | 'BITCOIN_TESTNET'
  requestedCapital: number
  requestedProfit: number
  requestedTotal: number
  approvedCapital: number
  approvedProfit: number
  approvedTotal: number
  status:
    | 'submitted'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'processing'
    | 'completed'
    | 'cancelled'
  investorMessage: string | null
  reviewedBy: string | null
  processedBy: string | null
}

type EmailRecipient = {
  userId: string
  email: string
  name: string
}

function withdrawalRequestTypeLabel(
  value: WithdrawalRecord['requestType']
): string {
  return value === 'full_exit'
    ? 'Full Exit'
    : 'Realized Profit Only'
}

function withdrawalPayoutLabel(
  withdrawal: WithdrawalRecord
): string {
  return withdrawal.payoutNetwork ===
    'BITCOIN_TESTNET'
    ? 'BTC · Bitcoin Testnet'
    : 'USDT · TRON Testnet TRC20'
}

function withdrawalStatusLabel(
  value: WithdrawalRecord['status']
): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    )
}

async function loadWithdrawalRecord(
  admin: SupabaseClient,
  requestId: string
): Promise<WithdrawalRecord> {
  const {
    data: withdrawalData,
    error: withdrawalError
  } = await admin
    .from('investor_withdrawal_requests')
    .select(`
      id,
      request_reference,
      application_id,
      investor_user_id,
      request_type,
      payout_asset,
      payout_network,
      requested_capital,
      requested_profit,
      requested_total,
      approved_capital,
      approved_profit,
      approved_total,
      status,
      investor_message,
      reviewed_by,
      processed_by
    `)
    .eq('id', requestId)
    .maybeSingle()

  if (withdrawalError || !withdrawalData) {
    throw new Error(
      'Withdrawal request could not be loaded.'
    )
  }

  const withdrawal = withdrawalData as {
    id: string
    request_reference: string
    application_id: string
    investor_user_id: string
    request_type: 'realized_profit' | 'full_exit'
    payout_asset: 'USDT' | 'BTC'
    payout_network:
      | 'TRON_TESTNET_TRC20'
      | 'BITCOIN_TESTNET'
    requested_capital: number | string
    requested_profit: number | string
    requested_total: number | string
    approved_capital: number | string | null
    approved_profit: number | string | null
    approved_total: number | string
    status: WithdrawalRecord['status']
    investor_message: string | null
    reviewed_by: string | null
    processed_by: string | null
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
    .eq('id', withdrawal.application_id)
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

  return {
    id: withdrawal.id,
    requestReference:
      withdrawal.request_reference,
    applicationReference:
      application.reference_code,
    opportunityTitle: relationTitle(
      application.opportunity
    ),
    investorUserId:
      withdrawal.investor_user_id,
    requestType: withdrawal.request_type,
    payoutAsset: withdrawal.payout_asset,
    payoutNetwork: withdrawal.payout_network,
    requestedCapital: Number(
      withdrawal.requested_capital
    ),
    requestedProfit: Number(
      withdrawal.requested_profit
    ),
    requestedTotal: Number(
      withdrawal.requested_total
    ),
    approvedCapital: Number(
      withdrawal.approved_capital ?? 0
    ),
    approvedProfit: Number(
      withdrawal.approved_profit ?? 0
    ),
    approvedTotal: Number(
      withdrawal.approved_total
    ),
    status: withdrawal.status,
    investorMessage:
      withdrawal.investor_message,
    reviewedBy: withdrawal.reviewed_by,
    processedBy: withdrawal.processed_by
  }
}

async function resolveStaffRecipients(
  admin: SupabaseClient,
  roles: StaffRole[],
  excludedUserIds: string[] = []
): Promise<EmailRecipient[]> {
  const {
    data,
    error
  } = await admin
    .from('staff_roles')
    .select('user_id, role')
    .in('role', roles)

  if (error) {
    throw new Error(
      'Staff notification recipients could not be loaded.'
    )
  }

  const staffRows = (
    (data ?? []) as Array<{
      user_id: string
      role: StaffRole
    }>
  ).filter(
    (row) =>
      !excludedUserIds.includes(row.user_id)
  )

  const uniqueUserIds = [
    ...new Set(
      staffRows.map((row) => row.user_id)
    )
  ]

  const recipients = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const resolved = await resolveRecipient(
        admin,
        userId
      )

      return {
        userId,
        ...resolved
      }
    })
  )

  return recipients
}

async function sendWithdrawalSubmittedEmails(
  admin: SupabaseClient,
  withdrawal: WithdrawalRecord
) {
  const investor = await resolveRecipient(
    admin,
    withdrawal.investorUserId
  )

  const investorSubject =
    'Your withdrawal request has been submitted'

  const investorEmail =
    buildPremiumInvestorEmail({
      previewText: investorSubject,
      eyebrow: 'Withdrawal Request',
      title: 'Request Submitted',
      greetingName: investor.name,
      message:
        'Your withdrawal request has been recorded and is awaiting administrator review. You can monitor its status from your private investor portal.',
      statusLabel: 'Current Status',
      statusValue: 'Submitted',
      details: [
        {
          label: 'Request',
          value: withdrawal.requestReference
        },
        {
          label: 'Application',
          value: withdrawal.applicationReference
        },
        {
          label: 'Opportunity',
          value: withdrawal.opportunityTitle
        },
        {
          label: 'Request Type',
          value: withdrawalRequestTypeLabel(
            withdrawal.requestType
          )
        },
        {
          label: 'Requested Amount',
          value: currency(
            withdrawal.requestedTotal
          )
        },
        {
          label: 'Payout',
          value: withdrawalPayoutLabel(
            withdrawal
          )
        }
      ],
      actionLabel: 'View Withdrawal',
      actionUrl: portalUrl(
        '/dashboard/withdrawals'
      )
    })

  await sendInvestorEmail({
    to: investor.email,
    subject: investorSubject,
    html: investorEmail.html,
    text: investorEmail.text,
    idempotencyKey:
      `withdrawal/${withdrawal.id}/submitted/investor`
  })

  const admins = await resolveStaffRecipients(
    admin,
    ['admin']
  )

  await Promise.all(
    admins.map(async (recipient) => {
      const subject =
        'New withdrawal request awaiting review'

      const email = buildPremiumInvestorEmail({
        previewText: subject,
        eyebrow: 'Administrator Review',
        title: 'New Withdrawal Request',
        greetingName: recipient.name,
        message:
          'A new investor withdrawal request has been submitted and is ready for administrator review. The payout address is intentionally omitted from email.',
        statusLabel: 'Queue Status',
        statusValue: 'Submitted',
        details: [
          {
            label: 'Request',
            value: withdrawal.requestReference
          },
          {
            label: 'Investor',
            value: investor.name
          },
          {
            label: 'Opportunity',
            value: withdrawal.opportunityTitle
          },
          {
            label: 'Request Type',
            value: withdrawalRequestTypeLabel(
              withdrawal.requestType
            )
          },
          {
            label: 'Requested Amount',
            value: currency(
              withdrawal.requestedTotal
            )
          },
          {
            label: 'Payout',
            value: withdrawalPayoutLabel(
              withdrawal
            )
          }
        ],
        actionLabel: 'Review Withdrawal',
        actionUrl: portalUrl(
          '/admin/withdrawals'
        )
      })

      await sendInvestorEmail({
        to: recipient.email,
        subject,
        html: email.html,
        text: email.text,
        idempotencyKey:
          `withdrawal/${withdrawal.id}/submitted/admin/${recipient.userId}`
      })
    })
  )

  return {
    skipped: false,
    recipientCount: 1 + admins.length
  }
}

async function sendWithdrawalReviewedEmails(
  admin: SupabaseClient,
  withdrawal: WithdrawalRecord
) {
  if (
    withdrawal.status !== 'under_review' &&
    withdrawal.status !== 'approved' &&
    withdrawal.status !== 'rejected'
  ) {
    return {
      skipped: true,
      reason:
        'This withdrawal status does not send a review email.'
    }
  }

  const investor = await resolveRecipient(
    admin,
    withdrawal.investorUserId
  )

  const approved =
    withdrawal.status === 'approved'

  const rejected =
    withdrawal.status === 'rejected'

  const subject = approved
    ? 'Your withdrawal request has been approved'
    : rejected
      ? 'Update on your withdrawal request'
      : 'Your withdrawal request is under review'

  const defaultMessage = approved
    ? 'Your withdrawal request has been approved and is now ready for the protected finance-processing workflow.'
    : rejected
      ? 'Your withdrawal request has completed administrator review and was not approved in its current form.'
      : 'An administrator has started reviewing your withdrawal request. You can continue monitoring its status from your private investor portal.'

  const email = buildPremiumInvestorEmail({
    previewText: subject,
    eyebrow: 'Withdrawal Review',
    title: approved
      ? 'Request Approved'
      : rejected
        ? 'Review Completed'
        : 'Review In Progress',
    greetingName: investor.name,
    message:
      withdrawal.investorMessage?.trim() ||
      defaultMessage,
    statusLabel: 'Current Status',
    statusValue: withdrawalStatusLabel(
      withdrawal.status
    ),
    details: [
      {
        label: 'Request',
        value: withdrawal.requestReference
      },
      {
        label: 'Application',
        value: withdrawal.applicationReference
      },
      {
        label: 'Opportunity',
        value: withdrawal.opportunityTitle
      },
      {
        label: approved
          ? 'Approved Amount'
          : 'Requested Amount',
        value: currency(
          approved
            ? withdrawal.approvedTotal
            : withdrawal.requestedTotal
        )
      },
      {
        label: 'Payout',
        value: withdrawalPayoutLabel(
          withdrawal
        )
      }
    ],
    actionLabel: 'View Withdrawal',
    actionUrl: portalUrl(
      '/dashboard/withdrawals'
    )
  })

  await sendInvestorEmail({
    to: investor.email,
    subject,
    html: email.html,
    text: email.text,
    idempotencyKey:
      `withdrawal/${withdrawal.id}/${withdrawal.status}/investor`
  })

  let financeRecipientCount = 0

  if (approved) {
    const financeRecipients =
      await resolveStaffRecipients(
        admin,
        ['finance', 'admin'],
        withdrawal.reviewedBy
          ? [withdrawal.reviewedBy]
          : []
      )

    financeRecipientCount =
      financeRecipients.length

    await Promise.all(
      financeRecipients.map(async (recipient) => {
        const financeSubject =
          'Approved withdrawal ready for processing'

        const financeEmail =
          buildPremiumInvestorEmail({
            previewText: financeSubject,
            eyebrow: 'Finance Queue',
            title: 'Withdrawal Approved',
            greetingName: recipient.name,
            message:
              'An administrator-approved withdrawal is ready for protected finance processing. Open the finance console to review the testnet payout address. The address is intentionally omitted from email.',
            statusLabel: 'Queue Status',
            statusValue: 'Approved',
            details: [
              {
                label: 'Request',
                value:
                  withdrawal.requestReference
              },
              {
                label: 'Investor',
                value: investor.name
              },
              {
                label: 'Opportunity',
                value:
                  withdrawal.opportunityTitle
              },
              {
                label: 'Request Type',
                value:
                  withdrawalRequestTypeLabel(
                    withdrawal.requestType
                  )
              },
              {
                label: 'Approved Amount',
                value: currency(
                  withdrawal.approvedTotal
                )
              },
              {
                label: 'Payout',
                value: withdrawalPayoutLabel(
                  withdrawal
                )
              }
            ],
            actionLabel: 'Open Finance Queue',
            actionUrl: portalUrl(
              '/admin/withdrawal-processing'
            )
          })

        await sendInvestorEmail({
          to: recipient.email,
          subject: financeSubject,
          html: financeEmail.html,
          text: financeEmail.text,
          idempotencyKey:
            `withdrawal/${withdrawal.id}/approved/finance/${recipient.userId}`
        })
      })
    )
  }

  return {
    skipped: false,
    recipientCount:
      1 + financeRecipientCount
  }
}

async function sendWithdrawalProcessingEmail(
  admin: SupabaseClient,
  withdrawal: WithdrawalRecord
) {
  if (withdrawal.status !== 'processing') {
    return {
      skipped: true,
      reason:
        'This withdrawal is not currently processing.'
    }
  }

  const investor = await resolveRecipient(
    admin,
    withdrawal.investorUserId
  )

  const subject =
    'Your withdrawal request is processing'

  const email = buildPremiumInvestorEmail({
    previewText: subject,
    eyebrow: 'Withdrawal Processing',
    title: 'Processing Started',
    greetingName: investor.name,
    message:
      'Finance has started processing your approved withdrawal request through the protected testnet workflow. You can monitor its status from your private investor portal.',
    statusLabel: 'Current Status',
    statusValue: 'Processing',
    details: [
      {
        label: 'Request',
        value: withdrawal.requestReference
      },
      {
        label: 'Opportunity',
        value: withdrawal.opportunityTitle
      },
      {
        label: 'Approved Amount',
        value: currency(
          withdrawal.approvedTotal
        )
      },
      {
        label: 'Payout',
        value: withdrawalPayoutLabel(
          withdrawal
        )
      }
    ],
    actionLabel: 'View Withdrawal',
    actionUrl: portalUrl(
      '/dashboard/withdrawals'
    )
  })

  const sent = await sendInvestorEmail({
    to: investor.email,
    subject,
    html: email.html,
    text: email.text,
    idempotencyKey:
      `withdrawal/${withdrawal.id}/processing/investor`
  })

  return {
    skipped: false,
    emailId: sent.id
  }
}

async function sendWithdrawalCompletedEmail(
  admin: SupabaseClient,
  withdrawal: WithdrawalRecord
) {
  if (withdrawal.status !== 'completed') {
    return {
      skipped: true,
      reason:
        'This withdrawal is not completed.'
    }
  }

  const investor = await resolveRecipient(
    admin,
    withdrawal.investorUserId
  )

  const subject =
    'Your withdrawal request has been completed'

  const email = buildPremiumInvestorEmail({
    previewText: subject,
    eyebrow: 'Withdrawal Activity',
    title: 'Withdrawal Completed',
    greetingName: investor.name,
    message:
      'Your withdrawal request has been marked completed and the related portfolio accounting has been recorded. Sensitive transaction details are not included in email.',
    statusLabel: 'Current Status',
    statusValue: 'Completed',
    details: [
      {
        label: 'Request',
        value: withdrawal.requestReference
      },
      {
        label: 'Application',
        value: withdrawal.applicationReference
      },
      {
        label: 'Opportunity',
        value: withdrawal.opportunityTitle
      },
      {
        label: 'Completed Amount',
        value: currency(
          withdrawal.approvedTotal
        )
      },
      {
        label: 'Request Type',
        value: withdrawalRequestTypeLabel(
          withdrawal.requestType
        )
      },
      {
        label: 'Payout',
        value: withdrawalPayoutLabel(
          withdrawal
        )
      }
    ],
    actionLabel: 'View Withdrawal',
    actionUrl: portalUrl(
      '/dashboard/withdrawals'
    )
  })

  const sent = await sendInvestorEmail({
    to: investor.email,
    subject,
    html: email.html,
    text: email.text,
    idempotencyKey:
      `withdrawal/${withdrawal.id}/completed/investor`
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

    const admin = adminClient()

    let role: StaffRole | null = null
    let withdrawal: WithdrawalRecord | null = null

    const withdrawalEvent =
      body.event === 'withdrawal_submitted' ||
      body.event === 'withdrawal_reviewed' ||
      body.event === 'withdrawal_processing' ||
      body.event === 'withdrawal_completed'

    if (withdrawalEvent) {
      withdrawal = await loadWithdrawalRecord(
        admin,
        body.recordId
      )
    }

    if (body.event === 'withdrawal_submitted') {
      if (
        !withdrawal ||
        withdrawal.investorUserId !== user.id ||
        withdrawal.status !== 'submitted'
      ) {
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
    } else {
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

      role = staffData.role as StaffRole

      const allowed =
        body.event === 'application_status'
          ? role === 'reviewer' ||
            role === 'admin'
          : body.event === 'withdrawal_reviewed'
            ? role === 'admin' &&
              withdrawal?.reviewedBy === user.id
            : body.event === 'withdrawal_processing' ||
                body.event === 'withdrawal_completed'
              ? (role === 'finance' ||
                  role === 'admin') &&
                withdrawal?.processedBy === user.id
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

    let result

    if (body.event === 'application_status') {
      result = await sendApplicationStatusEmail(
        admin,
        body.recordId
      )
    } else if (body.event === 'funding_review') {
      result = await sendFundingReviewEmail(
        admin,
        body.recordId
      )
    } else if (
      body.event === 'distribution_recorded'
    ) {
      result = await sendDistributionEmail(
        admin,
        body.recordId
      )
    } else if (
      body.event === 'withdrawal_submitted' &&
      withdrawal
    ) {
      result = await sendWithdrawalSubmittedEmails(
        admin,
        withdrawal
      )
    } else if (
      body.event === 'withdrawal_reviewed' &&
      withdrawal
    ) {
      result = await sendWithdrawalReviewedEmails(
        admin,
        withdrawal
      )
    } else if (
      body.event === 'withdrawal_processing' &&
      withdrawal
    ) {
      result = await sendWithdrawalProcessingEmail(
        admin,
        withdrawal
      )
    } else if (
      body.event === 'withdrawal_completed' &&
      withdrawal
    ) {
      result = await sendWithdrawalCompletedEmail(
        admin,
        withdrawal
      )
    } else {
      return Response.json(
        {
          error: 'Invalid notification request.'
        },
        {
          status: 400
        }
      )
    }

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
